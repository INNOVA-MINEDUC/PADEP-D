<script setup>
/**
 * Unidades: las organizaciones que comparten la instalación (`digecade`, ...).
 * Solo para un global con `unidades.gestionar` (`soloGlobal` en el menú; la API
 * da 403 a cualquier otro).
 *
 * Cada unidad tiene sus usuarios, carreras, cohortes, nóminas y PDF, y no ve
 * los de las demás. Una unidad nueva es: alta aquí → sus usuarios (Usuarios y
 * Roles, eligiendo la unidad) → elegirla en la cabecera → sus carreras → su
 * primer corte → nómina → PDF.
 *
 * - **El código no se cambia nunca**: es la carpeta de sus archivos en el
 *   servidor y el primer tramo del id de cada corte (`digecade-11-car35-t6-c1`).
 *   Por eso solo se escribe en el alta, y la API lo valida: minúsculas,
 *   dígitos y `_`, empezando por letra, sin guion.
 * - **No se borran: se desactivan.** Sus usuarios quedan fuera desde su
 *   siguiente petición; sus archivos y lo cargado en la base siguen ahí, y
 *   reactivarla los devuelve tal cual.
 */
import { ref, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import AvisoError from '@/components/AvisoError.vue'

const { state, pideConfirmacion } = usePadep()

const lista = ref(null)          // null = sin leer o falló
const errorLista = ref('')
const error = ref('')
const aviso = ref('')
const ocupado = ref(false)

const alta = ref(null)           // { codigo, nombre } abierto; null = cerrado
const editando = ref(null)       // { codigo, nombre } renombrando

// Mismo patrón que `rutas.PATRON_UNIDAD` de la API. Solo para avisar antes de
// mandar: quien decide es la API (422).
const PATRON = '[a-z][a-z0-9_]{0,39}'

async function carga() {
  try {
    lista.value = await api.unidades()
    // La cabecera usa la misma lista para el selector: que no se quede vieja.
    state.unidades = lista.value
    errorLista.value = ''
  } catch (e) {
    lista.value = null
    errorLista.value = e.message
  }
}
onMounted(carga)

async function escribe(fn, mensaje) {
  error.value = ''
  aviso.value = ''
  ocupado.value = true
  try {
    await fn()
    aviso.value = mensaje
    return true
  } catch (e) {
    error.value = e.message
    return false
  } finally {
    ocupado.value = false
    await carga()
  }
}

function abreAlta() {
  editando.value = null
  error.value = ''
  alta.value = { codigo: '', nombre: '' }
}

async function crea() {
  const a = alta.value
  const codigo = a.codigo.trim()
  if (await escribe(() => api.creaUnidad(codigo, a.nombre.trim()),
                    `Se creó la unidad ${codigo}. Ahora, sus usuarios en Usuarios y Roles.`)) {
    alta.value = null
  }
}

function abreEdicion(u) {
  alta.value = null
  error.value = ''
  editando.value = { codigo: u.codigo, nombre: u.nombre, estatus: u.estatus }
}

async function renombra() {
  const e = editando.value
  if (await escribe(() => api.editaUnidad(e.codigo, { nombre: e.nombre.trim(), estatus: e.estatus }),
                    `Se guardó ${e.codigo}.`)) {
    editando.value = null
  }
}

const cambiaEstatus = (u) => {
  const desactiva = u.estatus === 'activa'
  pideConfirmacion(
    desactiva ? 'Desactivar unidad' : 'Activar unidad',
    desactiva
      ? `Los ${u.usuarios} usuarios de ${u.nombre} quedan fuera desde su siguiente acción. `
        + 'Sus archivos y lo cargado en la base no se tocan.'
      : `Los usuarios de ${u.nombre} podrán volver a entrar.`,
    desactiva ? 'Desactivar' : 'Activar',
    () => escribe(() => api.editaUnidad(u.codigo, { nombre: u.nombre, estatus: desactiva ? 'inactiva' : 'activa' }),
                  `${u.nombre}: ${desactiva ? 'desactivada' : 'activada'}.`))
}
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Administración</p>
    <h1 class="page-title">Unidades</h1>
    <p class="page-sub">
      Las organizaciones que usan la plataforma. Cada una ve solo sus usuarios,
      carreras, cohortes y documentos.
    </p>

    <AvisoError v-if="!alta && !editando" :mensaje="error" />
    <AvisoError :mensaje="aviso" tono="nota" />
    <AvisoError :mensaje="errorLista" />

    <div class="section-head">
      <h2 class="section-title">Unidades</h2>
      <button type="button" class="btn btn--outline" :disabled="!lista" @click="abreAlta">Crear unidad</button>
    </div>

    <form v-if="alta" class="card formulario" @submit.prevent="crea">
      <p class="formulario__titulo">Unidad nueva</p>
      <AvisoError :mensaje="error" class="formulario__ancho" />
      <label class="field field--tight">
        <span class="formulario__label">Código</span>
        <input v-model="alta.codigo" class="input mono" required :pattern="PATRON" maxlength="40"
               autocomplete="off" title="Minúsculas, dígitos y _, empezando por letra">
        <span class="formulario__ayuda formulario__ayuda--aviso">
          No se puede cambiar después: es la carpeta de sus archivos y va en el id de cada corte.
        </span>
        <span class="formulario__ayuda">Minúsculas, dígitos y _, empezando por letra. Ej.: <span class="mono">efpem</span>.</span>
      </label>
      <label class="field field--tight formulario__doble">
        <span class="formulario__label">Nombre</span>
        <input v-model="alta.nombre" class="input" required>
      </label>
      <div class="btn-row">
        <button class="btn btn--brand" :disabled="ocupado">Crear unidad</button>
        <button type="button" class="btn btn--outline" @click="alta = null">Cancelar</button>
      </div>
    </form>

    <form v-if="editando" class="card formulario" @submit.prevent="renombra">
      <p class="formulario__titulo">Renombrar <span class="mono">{{ editando.codigo }}</span></p>
      <AvisoError :mensaje="error" class="formulario__ancho" />
      <label class="field field--tight formulario__doble">
        <span class="formulario__label">Nombre</span>
        <input v-model="editando.nombre" class="input" required>
        <span class="formulario__ayuda">El código no cambia.</span>
      </label>
      <div class="btn-row">
        <button class="btn btn--brand" :disabled="ocupado">Guardar</button>
        <button type="button" class="btn btn--outline" @click="editando = null">Cancelar</button>
      </div>
    </form>

    <div class="table-wrap table-wrap--scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Código</th><th>Nombre</th><th>Usuarios</th><th>Estado</th>
            <th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="lista === null"><td colspan="5" class="empty">{{ errorLista ? '—' : 'Consultando…' }}</td></tr>
          <tr v-else-if="!lista.length"><td colspan="5" class="empty">Todavía no hay ninguna.</td></tr>
          <tr v-for="u in lista ?? []" :key="u.codigo"
              :class="{ 'is-editando': editando?.codigo === u.codigo, 'is-inactivo': u.estatus !== 'activa' }">
            <td class="mono is-strong">{{ u.codigo }}</td>
            <td>{{ u.nombre }} <span v-if="u.codigo === state.unidad" class="tu">(en uso)</span></td>
            <td>{{ u.usuarios }}</td>
            <td>
              <span class="pill" :class="u.estatus === 'activa' ? 'pill--success' : 'pill--danger'">{{ u.estatus }}</span>
            </td>
            <td class="is-right">
              <span class="acciones">
                <button class="btn-link" :disabled="ocupado" @click="abreEdicion(u)">Renombrar</button>
                <button class="btn-link" :class="{ 'btn-link--danger': u.estatus === 'activa' }"
                        :disabled="ocupado" @click="cambiaEstatus(u)">
                  {{ u.estatus === 'activa' ? 'Desactivar' : 'Activar' }}
                </button>
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
.formulario__ayuda { display: block; margin-top: 6px; font-size: 12px; line-height: 1.45; color: var(--muted); }
.formulario__ayuda--aviso { color: #B45309; font-weight: 600; }
.formulario .input, .formulario .select { border-radius: 10px; padding: 9px 11px; font-size: 14px; }
.formulario .btn-row { grid-column: 1 / -1; }
.field--tight { margin-bottom: 0; }

.acciones { display: inline-flex; gap: 14px; }
.btn-link:disabled { color: var(--muted-2); cursor: not-allowed; }
.table tr.is-editando { background: var(--blue-bg); }
.table tr.is-inactivo td { color: var(--muted); }
.tu { font-weight: 400; color: var(--muted); font-size: 12px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
