<script setup>
/**
 * Cohortes: darlas de alta en la base y elegir sobre cuál se trabaja.
 *
 * Una cohorte es solo código y nombre (`POST /cohortes`), y es lo que necesitan
 * sus sedes y sus enlaces. Se configura meses antes del primer PDF, así que
 * aquí no se habla de cortes: el corte —carrera + trimestre, la carpeta donde
 * van los PDF de un pago— se crea en Extracción, cuando llega ese pago. Antes
 * esta pantalla creaba cortes y la cohorte salía de ellos: sin un corte en
 * disco no se podía registrar ni una sede.
 *
 * La unidad no se pide: es la de trabajo, y el cliente de API la añade solo.
 * La tarjeta la enseña para que el global sepa dónde está creando.
 *
 * La lista y la elegida viven en el store (`state.cohortes`, `state.cohorte`):
 * las comparten la barra lateral, el panel de la derecha y Sedes y Enlaces.
 */
import { ref } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'
import AvisoError from '@/components/AvisoError.vue'
import { capital, plural } from '@/utils/format'

const { state, esGlobal, puede, cargaCohortes, eligeCohorte } = usePadep()

const error = ref('')
const ocupado = ref(false)
const nueva = ref({ codigo: '', nombre: '' })

// Puede ver la lista quien ve la pantalla; crear la pide la API
// (`cohortes.gestionar`) y aquí solo se esconde el formulario.
const puedeCrear = puede('cohortes.gestionar')

cargaCohortes(state.cohorte.codigo)

async function crea() {
  error.value = ''
  ocupado.value = true
  try {
    const codigo = nueva.value.codigo.trim()
    await api.creaCohorte({ codigo, nombre: nueva.value.nombre.trim() })
    nueva.value = { codigo: '', nombre: '' }
    await cargaCohortes(codigo)
  } catch (e) {
    error.value = e.message
  } finally {
    ocupado.value = false
  }
}
</script>

<template>
  <div>
    <ModuleStepper :active-id="1" />

    <p class="eyebrow eyebrow--plain">Configuración de Cohorte</p>
    <h1 class="page-title">Cohortes</h1>
    <p class="page-sub">
      Dar de alta la cohorte y elegir sobre cuál se trabaja. Sus sedes y enlaces se
      registran en los pasos siguientes; los PDF de cada pago se suben después, en
      Extracción.
    </p>

    <AvisoError :mensaje="error" />
    <AvisoError :mensaje="state.errorCohortes" />

    <div class="grid-main">
      <div class="stack">
        <section class="card card--flat">
          <div class="card__head">Cohortes de la unidad</div>
          <div class="card__body">
            <p v-if="state.cohortes === null && !state.errorCohortes" class="nota">Consultando…</p>
            <p v-else-if="state.cohortes && !state.cohortes.length" class="nota">
              Todavía no hay ninguna.{{ puedeCrear ? ' Crea la primera abajo.' : '' }}
            </p>
            <ul v-else-if="state.cohortes" class="altas">
              <li v-for="c in state.cohortes" :key="c.codigo" class="altas__item">
                <button
                  class="altas__btn"
                  :class="{ 'is-elegida': c.codigo === state.cohorte.codigo }"
                  :aria-pressed="c.codigo === state.cohorte.codigo"
                  @click="eligeCohorte(c.codigo)">
                  <span class="altas__etiqueta">
                    Cohorte {{ c.codigo }}<template v-if="c.nombre"> · {{ c.nombre }}</template>
                  </span>
                  <span class="altas__id">
                    {{ capital(c.estatus) }} · {{ plural(c.sedes, 'sede', 'sedes') }} ·
                    {{ c.enlaces_asignados }} con enlace
                  </span>
                </button>
                <span v-if="c.codigo === state.cohorte.codigo" class="altas__marca">En uso</span>
              </li>
            </ul>
          </div>
        </section>

        <section v-if="puedeCrear" class="card card--flat">
          <div class="card__head">Nueva cohorte</div>
          <div class="card__body">
            <p v-if="esGlobal" class="nota">
              Se crea en la unidad <strong class="mono">{{ state.unidad || '—' }}</strong>;
              se cambia arriba, en la cabecera.
            </p>
            <form class="fila" @submit.prevent="crea">
              <label class="field">
                <span class="field__label">Código</span>
                <input v-model="nueva.codigo" class="input mono" required inputmode="numeric"
                       pattern="[0-9]+" title="Solo dígitos" placeholder="11">
              </label>
              <label class="field">
                <span class="field__label">Nombre (opcional)</span>
                <input v-model="nueva.nombre" class="input" placeholder="Onceava">
              </label>
              <button class="btn btn--primary" type="submit"
                      :disabled="ocupado || (esGlobal && !state.unidad)">Crear</button>
            </form>
            <p class="nota">
              El nombre puede quedar en blanco: la primera carga a la base lo toma de la
              columna <span class="mono">COHORTE</span> de la nómina.
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
.altas__id { font-size: 12px; color: var(--muted-2); }
.altas__marca {
  flex-shrink: 0; font-size: 12px; font-weight: 700; color: #1E40AF;
  text-transform: uppercase; letter-spacing: .04em;
}
</style>
