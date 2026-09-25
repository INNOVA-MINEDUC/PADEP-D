<script setup>
/**
 * Alta de Cohorte.
 *
 * El formulario que hay aquí es el que vivía en la pantalla de Extracción: es
 * el que habla con la API de verdad (`POST /cortes`). El de antes era maqueta
 * —guardaba «COH-2026-01» en memoria y se perdía al recargar—, así que se
 * cambió de sitio el que funciona y se tiró el falso.
 *
 * Un corte se identifica con CUATRO datos: cohorte, carrera, trimestre y corte.
 * De esos, aquí solo se piden tres: el `corte` va fijo en 1 y escondido (ver
 * abajo). El id resultante lo arma el servidor: `11-car35-t6-c1`.
 *
 * Crear es idempotente: `POST /cortes` sobre uno que ya existe devuelve su
 * estado en vez de un error, así que pulsar «Crear» encima de uno existente
 * simplemente lo selecciona.
 */
import { ref, computed, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { usaCortes } from '@/composables/usaCortes'
import { usaCohorte } from '@/composables/usaCohorte'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'
import AvisoError from '@/components/AvisoError.vue'
import { CARRERAS, etiquetaCarrera } from '@/data/carreras'

const { state, goTo, refrescaCohorte } = usePadep()
const { lista: cortes, elegido, carga: cargaCortes, elige } = usaCortes()

const error = ref('')
const ocupado = ref(false)
const cargando = ref(true)

// Valores, no placeholders: en gris nadie los escribe y el POST sale con la
// carrera vacia -> 422. El `corte` va aqui pero no en la pantalla: hoy siempre
// vale 1, y fijarlo hace que reenviar el formulario reseleccione el corte en
// vez de crear uno nuevo. NO se calcula con `hermanos.length + 1`: eso crearia
// un corte 2 vacio cada vez que alguien reenvia el mismo formulario.
const CORTE_POR_DEFECTO = { cohorte: '11', carrera: '35', trimestre: 6, corte: 1 }
const nuevo = ref({ ...CORTE_POR_DEFECTO })
// Salida de emergencia por si algun dia hay dos entregas en el mismo trimestre.
const corteVisible = ref(false)

// La cohorte en la BASE (MySQL) es otra cosa que el corte en disco: solo lleva
// codigo y nombre, y hace falta para registrar sedes y enlaces meses antes de
// que exista ningun PDF. Nace sola al crear el corte (ver `crea`); la tarjeta
// solo ofrece el alta a mano como respaldo. `null` = sin respuesta todavia (o
// MySQL caido): no se ofrece darla de alta sin saber si ya esta.
const { error: errorBase, ocupado: ocupadoBase, creaCohorte } = usaCohorte()
const cohortesBase = ref(null)
const enBase = computed(() => cohortesBase.value?.find(c => c.codigo === state.cohorte.codigo))

const cargaBase = () => api.cohortes()
  .then(l => { cohortesBase.value = l })
  .catch(e => { errorBase.value = e.message })

// Respaldo para cortes creados antes de que la cohorte naciera con ellos, o si
// la base no respondio entonces. Un 409 («ya existe») tambien acaba bien: al
// releer, aparece.
async function altaBase() {
  await creaCohorte({ codigo: state.cohorte.codigo })
  await cargaBase()
}

onMounted(async () => {
  cargaBase()
  try {
    await cargaCortes()
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
})

async function conError(fn) {
  error.value = ''
  ocupado.value = true
  try {
    await fn()
  } catch (e) {
    error.value = e.message
  } finally {
    ocupado.value = false
  }
  await cargaCortes().catch(() => {})
  refrescaCohorte()
}

const crea = () => conError(async () => {
  const d = await api.creaCorte({ ...nuevo.value })
  elige(d.id)
  // La misma «11» no se pide dos veces: la cohorte en la base nace aqui. Sin
  // nombre, que lo rellena la primera carga (solo completa lo vacio). Aparte
  // del corte a proposito: si MySQL falla, el corte ya esta creado y la tarjeta
  // ofrece reintentar. El 409 es el caso normal —ya existia— y no se ensena.
  errorBase.value = ''
  await api.creaCohorte({ codigo: d.cohorte })
    .catch(e => { if (e.estado !== 409) errorBase.value = e.message })
  cargaBase()
  nuevo.value = { ...CORTE_POR_DEFECTO }
  corteVisible.value = false
})

// Elegir aquí es lo mismo que elegir en Extracción: las dos pantallas comparten
// la llave de localStorage, no un estado en memoria.
const selecciona = (id) => { elige(id); refrescaCohorte() }

const etiqueta = (c) => {
  const base = `Cohorte ${c.cohorte} · ${etiquetaCarrera(c.carrera)} · trimestre ${c.trimestre}`
  return c.corte === 1 ? base : `${base} · corte ${c.corte}`
}
</script>

<template>
  <div>
    <ModuleStepper :active-id="1" />

    <p class="eyebrow eyebrow--plain">Configuración de Cohorte</p>
    <h1 class="page-title">Alta de Cohorte</h1>
    <p class="page-sub">
      Dar de alta la entrega de una carrera en un trimestre. Todo lo que se suba
      después vive en la carpeta de su corte.
    </p>

    <AvisoError :mensaje="error" />

    <div class="grid-main">
      <div class="stack">
        <section class="card card--flat">
          <div class="card__head">Nueva alta</div>
          <div class="card__body">
            <form class="fila" @submit.prevent="crea">
              <label class="field">
                <span class="field__label">Cohorte</span>
                <input v-model="nuevo.cohorte" class="input" required>
              </label>
              <!-- Desplegable y no texto libre: la carrera es justo donde se
                   vuelve a colar el error de confundirla con la cohorte. Las
                   dos son de la Onceava y se separan por este codigo. -->
              <label class="field">
                <span class="field__label">Carrera</span>
                <select v-model="nuevo.carrera" class="select" required>
                  <option v-for="(nombre, codigo) in CARRERAS" :key="codigo" :value="codigo">
                    {{ codigo }} — {{ nombre }}
                  </option>
                </select>
              </label>
              <!-- El tope de 12 solo ataja el numero absurdo: no dice cuantos
                   trimestres dura una cohorte, que no se sabe. -->
              <label class="field">
                <span class="field__label">Trimestre (1-12)</span>
                <input v-model.number="nuevo.trimestre" class="input" type="number" min="1" max="12" required>
              </label>
              <!-- Normalmente no esta: hoy el corte siempre vale 1 y quien usa
                   la pantalla no sabe que es. Se revela con el enlace de abajo. -->
              <label v-if="corteVisible" class="field">
                <span class="field__label">Corte</span>
                <input v-model.number="nuevo.corte" class="input" type="number" min="1" required>
              </label>
              <button class="btn btn--primary" type="submit" :disabled="ocupado">Crear</button>
            </form>

            <p v-if="!corteVisible" class="nota nota--suelta">
              <button type="button" class="btn-link" @click="corteVisible = true">
                Otra entrega en este trimestre →
              </button>
            </p>
          </div>
        </section>

        <section class="card card--flat">
          <div class="card__head">Altas existentes</div>
          <div class="card__body">
            <p v-if="cargando" class="nota">Consultando…</p>
            <p v-else-if="!cortes.length" class="nota">
              Todavía no hay ninguna. Crea la primera arriba.
            </p>
            <ul v-else class="altas">
              <li v-for="c in cortes" :key="c.id" class="altas__item">
                <button
                  class="altas__btn"
                  :class="{ 'is-elegida': c.id === elegido }"
                  @click="selecciona(c.id)">
                  <span class="altas__etiqueta">{{ etiqueta(c) }}</span>
                  <span class="altas__id mono">{{ c.id }}</span>
                </button>
                <span v-if="c.id === elegido" class="altas__marca">En uso</span>
              </li>
            </ul>

            <p v-if="cortes.length" class="nota nota--suelta">
              La marcada «En uso» es sobre la que trabajan Extracción y el resto
              de pantallas.
              <button type="button" class="btn-link" @click="goTo(15)">
                Ir a Extracción →
              </button>
            </p>
          </div>
        </section>

        <section v-if="state.cohorte.codigo" class="card card--flat">
          <div class="card__head">Cohorte {{ state.cohorte.codigo }} en la base de datos</div>
          <div class="card__body">
            <AvisoError :mensaje="errorBase" />
            <p v-if="enBase" class="nota">
              {{ enBase.nombre || 'Sin nombre' }} · {{ enBase.sedes }} sedes ·
              {{ enBase.enlaces_asignados }} con enlace.
              <button type="button" class="btn-link" @click="goTo(2)">Configurar sedes →</button>
            </p>
            <p v-else-if="cohortesBase" class="nota">
              Todavía no está: hace falta para registrar sus sedes y enlaces.
              <button type="button" class="btn-link" :disabled="ocupadoBase" @click="altaBase">
                Dar de alta en la base →
              </button>
            </p>
          </div>
        </section>
      </div>

      <CohorteContext />
    </div>
  </div>
</template>

<style scoped>
.stack { display: flex; flex-direction: column; gap: 20px; }
.card__head {
  padding: 14px 20px; border-bottom: 1px solid var(--border-3);
  font-size: 15px; font-weight: 600; color: var(--ink);
}
.card__body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }

.fila { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.fila .field { flex: 1 1 150px; margin: 0; }

.nota { margin: 0; font-size: 13px; color: var(--muted); }
.nota--suelta { margin-top: 2px; }

.altas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.altas__item { display: flex; align-items: center; gap: 10px; }
.altas__btn {
  flex: 1; display: flex; flex-direction: column; gap: 3px; text-align: left;
  padding: 10px 14px; border: 1px solid var(--border-2); border-radius: var(--r-md);
  background: #fff; cursor: pointer;
}
.altas__btn:hover { border-color: var(--blue); }
.altas__btn.is-elegida { border-color: var(--blue); background: var(--blue-bg); }
.altas__etiqueta { font-size: 13px; font-weight: 600; color: var(--ink); }
.altas__id { font-size: 11.5px; color: var(--muted-2); }
.altas__marca {
  flex-shrink: 0; font-size: 11px; font-weight: 700; color: #1E40AF;
  text-transform: uppercase; letter-spacing: .04em;
}
</style>
