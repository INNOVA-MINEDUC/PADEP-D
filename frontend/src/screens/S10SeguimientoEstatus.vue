<script setup>
import { ref, computed, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { CARRERAS } from '@/data/carreras'
import { pillClass, estatusTone, capital, plural } from '@/utils/format'
import AvisoError from '@/components/AvisoError.vue'
import Paginador from '@/components/Paginador.vue'

/**
 * Seguimiento de estatus (`GET /seguimiento/estatus`): los retiros, las
 * graduaciones y las vueltas a activo que alguien registró en una ficha, con
 * su fecha. Es la otra mitad de la comparación de nóminas: aquella dice quién
 * salió de un pago según el papel; esto, qué se decidió y cuándo.
 *
 * El recuento de arriba es la foto de hoy (inscripciones por estatus vigente) y
 * no depende del rango de fechas; la tabla son los cambios del rango. Una fila
 * abre la ficha, y la ficha recorre esta página con «anterior / siguiente».
 */
const POR_PAGINA = 50
const ESTATUS = ['activo', 'retirado', 'graduado']
const { state, openFicha, goTo } = usePadep()

const filtros = () => ({
  carrera: state.s10Carrera,
  estatus: state.s10Estatus,
  desde: state.s10Desde,
  hasta: state.s10Hasta,
})

const filas = ref([])
const resumen = ref(null)
const total = ref(0)
const paginas = ref(0)
const pagina = ref(1)
const cargando = ref(false)
const error = ref('')

// La respuesta que llega después de una más nueva se descarta: con los filtros
// cambiando, una lista vieja pintada encima de la buena sería mentira.
let turno = 0
async function pide() {
  const mio = ++turno
  cargando.value = true
  error.value = ''
  try {
    const r = await api.cambiosEstatus({ ...filtros(), pagina: pagina.value, por_pagina: POR_PAGINA })
    if (mio !== turno) return
    filas.value = r.cambios
    resumen.value = r.resumen
    total.value = r.total
    paginas.value = r.paginas
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
watch(filtros, () => { if (pagina.value === 1) pide(); else pagina.value = 1 }, { deep: true })
watch(pagina, pide)
pide()

const hayFiltros = () => !!(state.s10Carrera || state.s10Estatus || state.s10Desde || state.s10Hasta)
// Nadie retirado ni graduado hoy y la tabla vacía: no es cosa de los filtros,
// es que no se ha registrado nada. (Quien se retiró y volvió a activo deja
// filas, así que ese caso nunca llega a la tabla vacía.)
const ningunCambio = computed(() => !!resumen.value
  && !resumen.value.retirado && !resumen.value.graduado
  && !state.s10Estatus && !state.s10Desde && !state.s10Hasta)
function limpia() {
  state.s10Carrera = ''
  state.s10Estatus = ''
  state.s10Desde = ''
  state.s10Hasta = ''
}

const abre = x => openFicha(x.codigo_padep, { lista: filas.value.map(f => f.codigo_padep) })

// --- Exportar todo el filtro, no solo la página -------------------------
const exportando = ref(false)
async function exporta() {
  exportando.value = true
  try {
    const f = filtros()
    const primera = await api.cambiosEstatus({ ...f, pagina: 1, por_pagina: 200 })
    const todas = [...primera.cambios]
    for (let p = 2; p <= primera.paginas; p++) {
      todas.push(...(await api.cambiosEstatus({ ...f, pagina: p, por_pagina: 200 })).cambios)
    }
    const celda = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const col = ['fecha', 'carne', 'nombre', 'cohorte', 'carrera', 'municipio', 'departamento',
      'antes', 'ahora', 'vigente', 'motivo', 'carta_convenio', 'registrado_por']
    const csv = [col.join(','), ...todas.map(x => [x.fecha, x.codigo_padep, x.nombre, x.cohorte,
      x.carrera, x.municipio, x.departamento, x.antes, x.estatus, x.vigente, x.motivo,
      x.referencia, x.usuario].map(celda).join(','))].join('\r\n')
    // BOM para que Excel lea bien las tildes.
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `seguimiento_estatus${f.desde ? `_desde_${f.desde}` : ''}${f.hasta ? `_hasta_${f.hasta}` : ''}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (e) {
    error.value = e.message
  } finally {
    exportando.value = false
  }
}
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Seguimiento de Estatus</h1>
    <p class="page-sub">
      Los retiros, graduaciones y vueltas a activo registrados en las fichas, con su fecha y quién
      los registró. Para registrar uno, abre la ficha de la persona desde la búsqueda de docentes o
      desde una baja de la comparación de nóminas.
    </p>

    <AvisoError :mensaje="error" />

    <div v-if="resumen" class="resumen">
      <div v-for="e in ESTATUS" :key="e" class="resumen__item">
        <span class="resumen__n mono">{{ resumen[e].toLocaleString('es-GT') }}</span>
        <span :class="pillClass(estatusTone(e))">{{ capital(e) }}</span>
      </div>
      <p class="sub resumen__nota">Inscripciones por estatus vigente hoy{{ state.s10Carrera ? `, carrera ${state.s10Carrera}` : '' }}.</p>
    </div>

    <section class="card card--flat filtros">
      <div class="filtros__grid">
        <label class="field field--tight">
          <span class="field__label">Cambió a</span>
          <select v-model="state.s10Estatus" class="select">
            <option value="">Cualquier estatus</option>
            <option v-for="e in ESTATUS" :key="e" :value="e">{{ capital(e) }}</option>
          </select>
        </label>
        <label class="field field--tight">
          <span class="field__label">Carrera</span>
          <select v-model="state.s10Carrera" class="select">
            <option value="">Todas</option>
            <option v-for="(n, c) in CARRERAS" :key="c" :value="c">{{ c }} — {{ n }}</option>
          </select>
        </label>
        <label class="field field--tight">
          <span class="field__label">Desde</span>
          <input v-model="state.s10Desde" class="input" type="date" :max="state.s10Hasta || undefined">
        </label>
        <label class="field field--tight">
          <span class="field__label">Hasta</span>
          <input v-model="state.s10Hasta" class="input" type="date" :min="state.s10Desde || undefined">
        </label>
      </div>
      <footer class="filtros__foot">
        <span class="count-badge">{{ cargando ? '…' : plural(total, 'cambio', 'cambios') }}</span>
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
          <tr><th>Fecha</th><th>Docente</th><th>Ubicación</th><th>Cambio</th><th>Motivo</th><th>Registró</th></tr>
        </thead>
        <tbody>
          <tr v-if="!cargando && !filas.length">
            <td colspan="6" class="empty">
              <template v-if="error">No se pudo leer el seguimiento.</template>
              <!-- Sin ningún cambio no es un problema de filtros: todos siguen
                   en el «activo» con el que entraron, que no es un cambio. -->
              <template v-else-if="ningunCambio">
                <p class="vacio__titulo">Todavía no se ha registrado ningún retiro ni graduación.</p>
                <p class="sub">
                  Todas las inscripciones siguen activas, que es como entran al cargar. Los cambios se
                  registran en la ficha de cada persona.
                </p>
                <span class="vacio__acciones">
                  <button class="btn btn--outline btn--sm" @click.stop="goTo(11)">Ver las bajas de la comparación</button>
                  <button class="btn btn--ghost btn--sm" @click.stop="goTo(9)">Buscar a un docente</button>
                </span>
              </template>
              <template v-else>Ningún cambio con estos filtros.</template>
            </td>
          </tr>
          <tr
            v-for="(x, i) in filas" :key="i" class="is-clickable" tabindex="0"
            :title="`Abrir la ficha de ${x.nombre}`"
            @click="abre(x)" @keydown.enter="abre(x)">
            <td class="mono">{{ x.fecha }}</td>
            <td>
              <div class="is-strong">{{ x.nombre }}</div>
              <div class="mono sub">{{ x.codigo_padep }} · cohorte {{ x.cohorte }} · carrera {{ x.carrera }}</div>
            </td>
            <td>{{ x.municipio || '—' }}<div class="sub">{{ x.departamento }}</div></td>
            <td>
              <span class="cambio">
                <span :class="pillClass(estatusTone(x.antes))">{{ capital(x.antes) }}</span>
                <span class="cambio__flecha" aria-label="a">→</span>
                <span :class="pillClass(estatusTone(x.estatus))">{{ capital(x.estatus) }}</span>
              </span>
              <div v-if="x.vigente !== x.estatus" class="sub">hoy: {{ x.vigente }}</div>
            </td>
            <td>
              {{ x.motivo || '—' }}
              <div v-if="x.referencia" class="sub">Carta convenio {{ x.referencia }}</div>
            </td>
            <td class="sub">{{ x.usuario || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <Paginador v-model:pagina="pagina" :paginas="paginas" :total="total" :por-pagina="POR_PAGINA" :cargando="cargando" />
    </div>
  </div>
</template>

<style scoped>
.resumen {
  display: flex; align-items: center; gap: 22px; flex-wrap: wrap; margin-bottom: 18px;
}
.resumen__item { display: flex; align-items: center; gap: 8px; }
.resumen__n { font-size: 22px; font-weight: 700; color: var(--ink); }
.resumen__nota { flex-basis: 100%; }

.filtros { padding: 18px; margin-bottom: 20px; }
.filtros__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 900px) { .filtros__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .filtros__grid { grid-template-columns: 1fr; } }
.field--tight { margin-bottom: 0; }
.filtros__foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-3);
}
.filtros__acciones { display: flex; gap: 10px; }
.btn--sm { height: 36px; padding: 0 12px; font-size: 13px; }

.is-clickable { cursor: pointer; }
.is-loading tbody { opacity: .5; }
.is-strong { font-weight: 600; color: var(--ink); }
.sub { font-size: 12px; color: var(--muted-2); margin: 2px 0 0; }
.cambio { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.cambio__flecha { color: var(--muted-2); }
.vacio__titulo { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: var(--ink); }
.vacio__acciones { display: inline-flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 14px; }
</style>
