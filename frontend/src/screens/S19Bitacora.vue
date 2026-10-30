<script setup>
import { ref, watch, onMounted } from 'vue'
import { api } from '@/api/extraccion'
import { pillClass, plural } from '@/utils/format'
import AvisoError from '@/components/AvisoError.vue'
import Paginador from '@/components/Paginador.vue'

/**
 * Bitácora (`GET /bitacora`): quién hizo qué, cuándo y con qué resultado.
 *
 * La escribe la API sola —un middleware anota cada escritura, también las
 * rechazadas, y cada inicio de sesión— así que aquí no hay nada que registrar
 * ni que editar: solo filtrar, leer y exportar. El de una unidad ve lo de la
 * suya; un global, todo. Lo pide `bitacora.ver`.
 *
 * Los filtros viven en la pantalla y no en el store: es una consulta de
 * auditoría, no un listado al que se vuelve desde otra pantalla.
 */
const POR_PAGINA = 50
const VACIOS = { usuario: '', accion: '', objeto: '', desde: '', hasta: '', resultado: '' }
const filtros = ref({ ...VACIOS })

const acciones = ref([])
const filas = ref([])
const total = ref(0)
const paginas = ref(0)
const pagina = ref(1)
const pendientes = ref(0)
const cargando = ref(false)
const exportando = ref(false)
const error = ref('')
const abierta = ref(null)

// La respuesta que llega después de una más nueva se descarta, y el texto
// espera 300 ms: una petición por tecla en «usuario» u «objeto» no hace falta.
let turno = 0
let espera = null
async function pide() {
  const mio = ++turno
  cargando.value = true
  error.value = ''
  try {
    const r = await api.bitacora({ ...filtros.value, pagina: pagina.value, por_pagina: POR_PAGINA })
    if (mio !== turno) return
    filas.value = r.filas
    total.value = r.total
    paginas.value = r.paginas
    pendientes.value = r.pendientes
  } catch (e) {
    if (mio !== turno) return
    filas.value = []
    total.value = 0
    paginas.value = 0
    error.value = e.message
  } finally {
    if (mio === turno) cargando.value = false
  }
}
watch(filtros, () => {
  clearTimeout(espera)
  espera = setTimeout(() => { if (pagina.value === 1) pide(); else pagina.value = 1 }, 300)
}, { deep: true })
watch(pagina, pide)

onMounted(async () => {
  pide()
  try { acciones.value = await api.accionesBitacora() } catch (e) { /* el filtro queda vacío */ }
})

const hayFiltros = () => Object.values(filtros.value).some(Boolean)
const limpia = () => { filtros.value = { ...VACIOS } }

async function exporta() {
  exportando.value = true
  error.value = ''
  try {
    await api.exportaBitacora(filtros.value)
  } catch (e) {
    error.value = e.message
  } finally {
    exportando.value = false
  }
}

// La base guarda UTC; aquí, la hora de quien mira.
const fecha = (iso) => new Date(iso).toLocaleString('es-GT', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
})

// El código HTTP dicho en palabras. El número queda en el `title`.
function resultado(estado) {
  if (estado < 400) return { texto: 'hecho', tono: 'success' }
  if (estado === 401 || estado === 403) return { texto: 'rechazado', tono: 'danger' }
  if (estado >= 500) return { texto: 'falló', tono: 'danger' }
  return { texto: 'no se aplicó', tono: 'clay' }
}

/**
 * El detalle en una línea legible. Lo que más se mira —una celda corregida—
 * sale como «fila 3: X → Y»; lo demás, «clave: valor». Los parámetros de la
 * ruta no se repiten: ya están en la columna Objeto.
 */
function resumenDetalle(d) {
  const partes = []
  for (const [k, v] of Object.entries(d || {})) {
    if (k === 'ruta') continue
    if (k === 'filas' && Array.isArray(v)) {
      for (const f of v) {
        const antes = f.escrito_antes ?? f.papel ?? '—'
        partes.push(`fila ${f.fila}: ${antes} → ${d.valor ?? '(borrado)'}`)
      }
      continue
    }
    if (k === 'valor' && Array.isArray(d.filas)) continue
    if (Array.isArray(v)) partes.push(`${k}: ${v.map(x => (typeof x === 'object' ? x.nombre ?? JSON.stringify(x) : x)).join(', ')}`)
    else if (v && typeof v === 'object') partes.push(`${k}: ${JSON.stringify(v)}`)
    else partes.push(`${k}: ${v}`)
  }
  return partes.join(' · ')
}
const alterna = id => { abierta.value = abierta.value === id ? null : id }
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Administración</p>
    <h1 class="page-title">Bitácora</h1>
    <p class="page-sub">
      Quién hizo qué y cuándo: cada cambio que pasa por la aplicación —también los que se
      rechazaron— y cada inicio de sesión. Se anota sola; no se puede editar ni borrar.
    </p>

    <AvisoError :mensaje="error" />
    <AvisoError
      v-if="pendientes"
      tono="nota"
      :mensaje="`${plural(pendientes, 'anotación espera', 'anotaciones esperan')} en el servidor a que la base vuelva a responder: todavía no salen aquí.`" />

    <section class="card card--flat filtros">
      <div class="filtros__grid">
        <label class="field field--tight">
          <span class="field__label">Usuario</span>
          <input v-model.trim="filtros.usuario" class="input" type="search" placeholder="Nombre o correo">
        </label>
        <label class="field field--tight">
          <span class="field__label">Acción</span>
          <select v-model="filtros.accion" class="select">
            <option value="">Todas</option>
            <option v-for="a in acciones" :key="a.accion" :value="a.accion">{{ a.nombre }}</option>
          </select>
        </label>
        <label class="field field--tight">
          <span class="field__label">Objeto</span>
          <input v-model.trim="filtros.objeto" class="input" type="search" placeholder="Corte, usuario, rol…">
        </label>
        <label class="field field--tight">
          <span class="field__label">Desde</span>
          <input v-model="filtros.desde" class="input" type="date" :max="filtros.hasta || undefined">
        </label>
        <label class="field field--tight">
          <span class="field__label">Hasta</span>
          <input v-model="filtros.hasta" class="input" type="date" :min="filtros.desde || undefined">
        </label>
        <label class="field field--tight">
          <span class="field__label">Resultado</span>
          <select v-model="filtros.resultado" class="select">
            <option value="">Todos</option>
            <option value="ok">Hechos</option>
            <option value="error">Rechazados o fallidos</option>
          </select>
        </label>
      </div>
      <footer class="filtros__foot">
        <span class="count-badge">{{ cargando ? '…' : plural(total, 'anotación', 'anotaciones') }}</span>
        <span class="filtros__acciones">
          <button v-if="hayFiltros()" class="btn btn--ghost btn--sm" @click="limpia">Limpiar filtros</button>
          <button class="btn btn--outline btn--sm" :disabled="!total || exportando" @click="exporta">
            {{ exportando ? 'Exportando…' : 'Exportar CSV' }}
          </button>
        </span>
      </footer>
    </section>

    <div class="table-wrap table-wrap--scroll card--flat" :class="{ 'is-loading': cargando }">
      <table class="table">
        <thead>
          <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Objeto</th><th>Resultado</th><th>Detalle</th></tr>
        </thead>
        <tbody>
          <tr v-if="!cargando && !filas.length">
            <td colspan="6" class="empty">
              {{ error ? 'No se pudo leer la bitácora.' : hayFiltros() ? 'Nada con estos filtros.' : 'Todavía no hay nada anotado.' }}
            </td>
          </tr>
          <template v-for="f in filas" :key="f.id_bitacora">
            <tr>
              <td class="mono nowrap">{{ fecha(f.fecha) }}</td>
              <td>
                <div class="is-strong">{{ f.nombre || f.email || '—' }}</div>
                <div v-if="f.nombre && f.email" class="sub">{{ f.email }}</div>
              </td>
              <td>
                {{ f.accion }}
                <div class="sub mono">{{ f.metodo }} {{ f.ruta }}</div>
              </td>
              <td class="mono">
                {{ f.objeto || '—' }}
                <div v-if="f.unidad" class="sub">{{ f.unidad }}</div>
              </td>
              <td>
                <span :class="pillClass(resultado(f.estado).tono)" :title="`HTTP ${f.estado}`">
                  {{ resultado(f.estado).texto }}
                </span>
              </td>
              <td class="detalle">
                <span class="detalle__texto">{{ resumenDetalle(f.detalle) || '—' }}</span>
                <button v-if="Object.keys(f.detalle || {}).length" class="btn-link" @click="alterna(f.id_bitacora)">
                  {{ abierta === f.id_bitacora ? 'menos' : 'todo' }}
                </button>
              </td>
            </tr>
            <tr v-if="abierta === f.id_bitacora" class="abierta">
              <td colspan="6">
                <pre class="json">{{ JSON.stringify(f.detalle, null, 2) }}</pre>
                <p class="sub">IP {{ f.ip || '—' }} · HTTP {{ f.estado }}</p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <Paginador v-model:pagina="pagina" :paginas="paginas" :total="total" :por-pagina="POR_PAGINA" :cargando="cargando" />
    </div>
  </div>
</template>

<style scoped>
.filtros { padding: 18px; margin-bottom: 20px; }
.filtros__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 900px) { .filtros__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .filtros__grid { grid-template-columns: 1fr; } }
.field--tight { margin-bottom: 0; }
.filtros__foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-3);
}
.filtros__acciones { display: flex; gap: 10px; }
.btn--sm { height: 36px; padding: 0 12px; font-size: 13px; }

.is-loading tbody { opacity: .5; }
.is-strong { font-weight: 600; color: var(--ink); }
.nowrap { white-space: nowrap; }
.sub { font-size: 12px; color: var(--muted-2); margin: 2px 0 0; }
.detalle { max-width: 380px; }
.detalle__texto {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-bottom: 2px;
}
.abierta td { background: var(--bg-soft); }
.json {
  margin: 0; padding: 12px; max-height: 320px; overflow: auto; font-size: 12px;
  background: #fff; border: 1px solid var(--border-2); border-radius: var(--r-sm);
}
</style>
