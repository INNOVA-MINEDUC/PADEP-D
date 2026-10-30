<script setup>
/**
 * Catálogo de Carreras.
 *
 * La carrera se registra a mano ANTES de su primer corte: la carga a la base
 * (`POST /cortes/{id}/carga`) ya no la crea a partir del nombre de la nómina
 * —una tilde distinta daba dos veces la misma carrera— y el trabajo termina
 * `fallido` si no la encuentra por código.
 *
 * Es el primer paso del asistente: la cohorte y sus cortes la necesitan
 * registrada. No lleva `CohorteContext`: una carrera no es de ninguna cohorte
 * y sirve para varias.
 *
 * Los `detail` de la API se enseñan tal cual: ya vienen pensados para quien
 * opera (409 por duplicado o por datos cargados, 422, 404). El 503 es «la base
 * no responde», nunca una tabla vacía.
 */
import { ref, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import AvisoError from '@/components/AvisoError.vue'
import Icono from '@/components/Icono.vue'
import ModuleStepper from '@/components/ModuleStepper.vue'
import { fijaCatalogo } from '@/data/carreras'

const { state, pideConfirmacion } = usePadep()

const NIVELES = ['profesorado', 'licenciatura']
// Sin nivel preseleccionado a propósito: que se elija. La duración vacía es un
// estado normal —no siempre se sabe cuánto dura—, no un 0.
const VACIA = { codigo: '', nombre: '', nivel: '', especialidad: '', duracion: '' }

/** @type {import('vue').Ref<import('@/api/tipos').Carrera[] | null>} */
const lista = ref(null)        // null = sin leer o la base no respondió
const errorLista = ref('')
const caida = ref(false)       // 503: la base no responde
const error = ref('')          // de una escritura
const aviso = ref('')
const ocupado = ref(false)
const form = ref(null)         // formulario abierto; null = cerrado
const editando = ref('')       // código de la que se edita; '' = alta

async function carga() {
  try {
    lista.value = await api.carreras()
    fijaCatalogo(lista.value)   // las etiquetas del resto de pantallas, al día
    errorLista.value = ''
    caida.value = false
  } catch (e) {
    lista.value = null
    errorLista.value = e.message
    caida.value = e.estado === 503
  }
}

onMounted(() => {
  // Viene de Extracción con una carga fallida por carrera sin registrar.
  if (state.carreraPorRegistrar) {
    abreAlta(state.carreraPorRegistrar)
    state.carreraPorRegistrar = ''
  }
  carga()
})

const raya = v => (v == null || v === '' ? '—' : v)
const tieneDatos = c => c.inscripciones > 0 || c.documentos > 0

function abreAlta(codigo = '') {
  error.value = ''
  editando.value = ''
  form.value = { ...VACIA, codigo }
}

// El PUT no es un PATCH: se precarga entero. Los null pasan a '', que FormData
// mandaría como el texto «null».
function abreEdicion(c) {
  error.value = ''
  editando.value = c.codigo
  form.value = {
    codigo: c.codigo, nombre: c.nombre, nivel: c.nivel,
    especialidad: c.especialidad ?? '', duracion: c.duracion_trimestres ?? '',
  }
}

const cierra = () => { form.value = null; editando.value = ''; error.value = '' }

async function escribe(fn) {
  error.value = ''
  aviso.value = ''
  ocupado.value = true
  try {
    await fn()
    return true
  } catch (e) {
    error.value = e.message
    return false
  } finally {
    ocupado.value = false
    await carga()
  }
}

async function guarda() {
  const f = form.value
  // Los cuatro editables van siempre (una especialidad vacía se borra); la
  // duración vacía NO se manda: ni 0 ni cadena vacía.
  const campos = { nombre: f.nombre.trim(), nivel: f.nivel, especialidad: f.especialidad.trim() }
  if (f.duracion !== '' && f.duracion != null) campos.duracion_trimestres = f.duracion
  const codigo = editando.value
  const ok = await escribe(() => (codigo
    ? api.editaCarrera(codigo, campos)
    : api.creaCarrera({ codigo: f.codigo.trim(), ...campos })))
  if (!ok) return
  aviso.value = codigo ? `Se guardó la carrera ${codigo}.` : `Se registró la carrera ${f.codigo.trim()}.`
  cierra()
}

// El botón ya sale deshabilitado con datos cargados, pero la lista puede estar
// vieja: el 409 se enseña igual, con su `detail`.
const borra = (c) => pideConfirmacion(
  'Borrar carrera',
  `¿Borrar la carrera ${c.codigo} (${c.nombre})? No se puede deshacer.`,
  'Borrar',
  async () => {
    if (await escribe(() => api.borraCarrera(c.codigo))) {
      aviso.value = `Se borró la carrera ${c.codigo}.`
      if (editando.value === c.codigo) cierra()
    }
  })
</script>

<template>
  <div>
    <ModuleStepper :active-id="4" />

    <p class="eyebrow eyebrow--plain">Configuración de Cohorte</p>
    <h1 class="page-title">Catálogo de Carreras</h1>
    <p class="page-sub">
      Registrar cada carrera antes de cargar su primer corte a la base: la carga
      falla si la carrera no está aquí. Una misma carrera sirve para varias cohortes.
    </p>

    <!-- El de borrar: con el formulario cerrado no tiene otro sitio. -->
    <AvisoError v-if="!form" :mensaje="error" />
    <AvisoError :mensaje="aviso" tono="nota" />

    <div class="section-head">
      <h2 class="section-title">Carreras</h2>
      <button type="button" class="btn btn--outline" :disabled="caida" @click="abreAlta()">
        Registrar carrera nueva
      </button>
    </div>

    <form v-if="form" class="card formulario" @submit.prevent="guarda">
      <p class="formulario__titulo">
        {{ editando ? `Editar la carrera ${editando}` : 'Nueva carrera' }}
      </p>
      <AvisoError :mensaje="error" class="formulario__ancho" />

      <!-- El código no se edita: es la clave con la que el cargador y la
           carpeta del corte (`car35`) encuentran la carrera. Si está mal y no
           tiene nada cargado, se borra y se registra otra. -->
      <label class="field field--tight">
        <span class="formulario__label">Código</span>
        <input v-model="form.codigo" class="input mono" required :readonly="!!editando"
               inputmode="numeric" pattern="[0-9]+" title="Solo dígitos" placeholder="37">
        <span class="formulario__ayuda">
          El número que va en el nombre del PDF (<span class="mono">..._DIGECADE_37.pdf</span>)
          y en la columna <span class="mono">codigo</span> de la nómina.
        </span>
      </label>
      <label class="field field--tight formulario__doble">
        <span class="formulario__label">Nombre</span>
        <input v-model="form.nombre" class="input" required>
        <span class="formulario__ayuda">Como lo escribe la nómina en su columna <span class="mono">Carrera</span>.</span>
      </label>
      <label class="field field--tight">
        <span class="formulario__label">Nivel</span>
        <select v-model="form.nivel" class="select" required>
          <option value="" disabled>Elegir…</option>
          <option v-for="n in NIVELES" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <label class="field field--tight">
        <span class="formulario__label">Especialidad <span class="formulario__opcional">(opcional)</span></span>
        <input v-model="form.especialidad" class="input">
      </label>
      <label class="field field--tight">
        <span class="formulario__label">Duración en trimestres <span class="formulario__opcional">(opcional)</span></span>
        <input v-model="form.duracion" class="input" type="number" min="1" max="12" step="1"
               placeholder="Sin saber">
      </label>

      <div class="btn-row">
        <button class="btn btn--brand" :disabled="ocupado">
          {{ editando ? 'Guardar cambios' : 'Registrar carrera' }}
        </button>
        <button type="button" class="btn btn--outline" @click="cierra">Cancelar</button>
      </div>
    </form>

    <!-- 503: la base no responde. NO es «no hay carreras». -->
    <div v-if="caida" class="card empty-state">
      <div class="empty-state__icon"><Icono nombre="aviso" /></div>
      <p class="empty-state__title">La base de datos no responde</p>
      <p class="empty-state__hint">
        No se puede leer el catálogo ahora mismo. {{ errorLista }}
        <button type="button" class="btn-link" @click="carga">Reintentar</button>
      </p>
    </div>

    <AvisoError v-else-if="errorLista" :mensaje="errorLista" />

    <div v-else class="table-wrap table-wrap--scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Código</th><th>Nombre</th><th>Nivel</th><th>Especialidad</th>
            <th class="is-right">Duración</th><th class="is-right">Inscripciones</th>
            <th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="lista === null">
            <td colspan="7" class="empty">Consultando…</td>
          </tr>
          <tr v-else-if="lista.length === 0">
            <td colspan="7" class="empty">Todavía no hay carreras registradas.</td>
          </tr>
          <tr v-for="c in lista ?? []" :key="c.codigo" :class="{ 'is-editando': editando === c.codigo }">
            <td class="mono is-strong">{{ c.codigo }}</td>
            <td class="is-strong">{{ c.nombre }}</td>
            <td>{{ c.nivel }}</td>
            <td>{{ raya(c.especialidad) }}</td>
            <td class="is-right mono">{{ c.duracion_trimestres == null ? '—' : `${c.duracion_trimestres} trim.` }}</td>
            <td class="is-right mono">{{ c.inscripciones.toLocaleString('es-GT') }}</td>
            <td class="is-right">
              <span class="acciones">
                <button class="btn-link" @click="abreEdicion(c)">Editar</button>
                <!-- El title va en el span: un botón deshabilitado no siempre
                     enseña el suyo. -->
                <span :title="tieneDatos(c) ? 'Tiene datos cargados' : ''">
                  <button class="btn-link btn-link--danger" :disabled="ocupado || tieneDatos(c)"
                          @click="borra(c)">Borrar</button>
                </span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.section-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--navy-ink); }

.formulario {
  padding: 22px; margin-bottom: 18px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; align-items: start;
}
.formulario__titulo { grid-column: 1 / -1; margin: 0; font-size: 14px; font-weight: 700; color: var(--navy-ink); }
.formulario__ancho { grid-column: 1 / -1; margin: 0; }
.formulario__doble { grid-column: span 2; }
@media (max-width: 640px) { .formulario__doble { grid-column: 1 / -1; } }
.formulario__label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.formulario__opcional { font-weight: 400; color: var(--muted-2); }
.formulario__ayuda { display: block; margin-top: 6px; font-size: 12px; line-height: 1.45; color: var(--muted); }
.formulario .input, .formulario .select { border-radius: 10px; padding: 9px 11px; font-size: 14px; }
.formulario .btn-row { grid-column: 1 / -1; }
.field--tight { margin-bottom: 0; }

.empty-state { margin-bottom: 26px; }
.acciones { display: inline-flex; gap: 14px; }
.btn-link:disabled { color: var(--muted-2); cursor: not-allowed; }
.table tr.is-editando { background: var(--blue-bg); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
