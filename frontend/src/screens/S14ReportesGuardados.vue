<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import AvisoError from '@/components/AvisoError.vue'
import { pillClass, plural } from '@/utils/format'

/**
 * Reportes guardados: las plantillas propias y las que otros compartieron
 * (`/reportes/guardados`). Se abren en el constructor (S13) para verlas o
 * cambiarlas, o se exportan directamente con los datos de hoy: una plantilla
 * guarda la pregunta, no la respuesta.
 *
 * Una plantilla que pide datos personales que esta sesión no puede ver sale
 * «bloqueada» con el motivo que da la API, en vez de esconderse: así quien la
 * busca sabe que existe y por qué no puede abrirla.
 */
const { state, abreReporte, nuevoReporte, goTo, pideConfirmacion } = usePadep()

const lista = ref([])
const cargando = ref(false)
const error = ref('')
const exportando = ref(null)
const filtro = ref('todas')

async function carga() {
  cargando.value = true
  error.value = ''
  try {
    lista.value = await api.reportesGuardados()
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}
onMounted(carga)

const visibles = computed(() => lista.value.filter(g =>
  filtro.value === 'todas' || (filtro.value === 'mias' ? g.mia : !g.mia)))

const FUENTE = { docentes: 'Docentes', notas: 'Notas', asistencia: 'Asistencia', nomina: 'Nómina por pago' }
function resumen(e) {
  const partes = [FUENTE[e.fuente] ?? e.fuente, e.modo === 'resumen' ? 'resumen' : 'listado']
  if (e.modo === 'resumen' && e.agrupar?.length) partes.push(`por ${plural(e.agrupar.length, 'campo', 'campos')}`)
  if (e.trimestres?.length) partes.push(`trimestre ${e.trimestres.join(', ')}`)
  if (e.filtros?.length) partes.push(plural(e.filtros.length, 'filtro', 'filtros'))
  return partes.join(' · ')
}

async function exporta(g) {
  exportando.value = g.id_reporte
  error.value = ''
  try {
    await api.exportaReporte(g.especificacion, 'xlsx')
  } catch (e) {
    error.value = e.message
  } finally {
    exportando.value = null
  }
}

function borra(g) {
  pideConfirmacion(
    'Borrar reporte guardado',
    `Se borra la plantilla «${g.nombre}»${g.compartido ? ', que otros usuarios también ven' : ''}. Los datos no se tocan.`,
    'Borrar',
    async () => {
      try {
        await api.borraReporte(g.id_reporte)
        if (state.reportePlantilla?.id_reporte === g.id_reporte) state.reportePlantilla = null
        await carga()
      } catch (e) {
        error.value = e.message
      }
    })
}

function nuevo() {
  nuevoReporte()
  goTo(13)
}
const fecha = f => (f ? String(f).slice(0, 10) : '')
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Reportes Dinámicos</p>
    <h1 class="page-title">Reportes Guardados</h1>
    <p class="page-sub">
      Las plantillas guardadas desde el constructor. Una plantilla guarda la pregunta, no la
      respuesta: al abrirla o exportarla sale con los datos de hoy.
    </p>

    <AvisoError :mensaje="error" />

    <div class="cabeza">
      <div class="segmented" role="radiogroup" aria-label="Qué plantillas ver">
        <button
          v-for="o in [['todas', 'Todas'], ['mias', 'Mías'], ['compartidas', 'Compartidas conmigo']]" :key="o[0]"
          role="radio" class="segmented__tab" :class="{ 'is-active': filtro === o[0] }"
          :aria-checked="filtro === o[0]" @click="filtro = o[0]">{{ o[1] }}</button>
      </div>
      <button class="btn btn--primary btn--sm" @click="nuevo">+ Reporte nuevo</button>
    </div>

    <div class="table-wrap table-wrap--scroll card--flat" :class="{ 'is-loading': cargando }">
      <table class="table">
        <thead>
          <tr><th>Reporte</th><th>Qué es</th><th>Autor</th><th>Actualizado</th><th class="is-right">Acciones</th></tr>
        </thead>
        <tbody>
          <tr v-if="!cargando && !visibles.length">
            <td colspan="5" class="empty">
              <template v-if="lista.length">Ninguna plantilla en esta vista.</template>
              <template v-else>
                Todavía no hay reportes guardados. Arma uno en el constructor y pulsa «Guardar como plantilla».
              </template>
            </td>
          </tr>
          <tr v-for="g in visibles" :key="g.id_reporte">
            <td>
              <div class="is-strong">{{ g.nombre }}</div>
              <div v-if="g.descripcion" class="sub">{{ g.descripcion }}</div>
              <div v-if="g.bloqueada" class="sub sub--aviso">No disponible para tu rol: {{ g.bloqueada }}</div>
            </td>
            <td>{{ resumen(g.especificacion) }}</td>
            <td>
              {{ g.mia ? 'Tú' : g.autor || '—' }}
              <span v-if="g.compartido" :class="pillClass('teal')">compartida</span>
            </td>
            <td class="mono">{{ fecha(g.updated_at) }}</td>
            <td class="is-right">
              <span class="acciones">
                <button class="btn-link" :disabled="!!g.bloqueada" @click="abreReporte(g)">Abrir</button>
                <button
                  class="btn-link" :disabled="!!g.bloqueada || exportando === g.id_reporte"
                  @click="exporta(g)">{{ exportando === g.id_reporte ? 'Exportando…' : 'Excel' }}</button>
                <button v-if="g.editable" class="btn-link btn-link--danger" @click="borra(g)">Borrar</button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.cabeza { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.segmented {
  display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 4px; border-radius: 9px; background: var(--teal-bg);
}
.segmented__tab {
  padding: 7px 16px; border-radius: 7px; border: none; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 600; background: transparent; color: var(--teal);
}
.segmented__tab.is-active { background: #fff; color: var(--navy); }
.btn--sm { height: 36px; padding: 0 12px; font-size: 13px; }
.is-strong { font-weight: 600; color: var(--ink); }
.sub { font-size: 12px; color: var(--muted-2); margin-top: 2px; }
.sub--aviso { color: var(--warning); }
.acciones { display: inline-flex; gap: 14px; }
.is-loading tbody { opacity: .5; }
</style>
