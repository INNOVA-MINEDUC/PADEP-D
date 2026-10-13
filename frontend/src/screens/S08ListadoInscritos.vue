<script setup>
import { ref, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { usaDocentes } from '@/composables/usaDocentes'
import { CARRERAS } from '@/data/carreras'
import { pillClass, estatusTone, capital } from '@/utils/format'
import AvisoError from '@/components/AvisoError.vue'
import Paginador from '@/components/Paginador.vue'

/**
 * Inscritos de la cohorte activa, leídos de MySQL (`GET /docentes`).
 *
 * Ya no hay «preliminar» y «final»: la base solo guarda a quien entró por la
 * nómina, así que todos están inscritos. Las pestañas separan por carrera.
 * Tampoco hay «Confirmar inscripción»: la API no escribe docentes a propósito
 * —la base se rehace en cada carga—.
 */
const POR_PAGINA = 50
const { state } = usePadep()

const filtros = () => ({ cohorte: state.cohorte.codigo, carrera: state.s8Carrera })
const { filas, total, paginas, pagina, cargando, error, todas } = usaDocentes(filtros, POR_PAGINA)

// Cuántos hay por carrera, para las pestañas. Tres peticiones de una fila.
const cuenta = ref({})
async function cuenta_() {
  const c = state.cohorte.codigo
  const n = async (carrera) => (await api.docentes({ cohorte: c, carrera, por_pagina: 1 })).total
  try {
    const [todas_, ...porCarrera] = await Promise.all([n(''), ...Object.keys(CARRERAS).map(n)])
    cuenta.value = { '': todas_, ...Object.fromEntries(Object.keys(CARRERAS).map((k, i) => [k, porCarrera[i]])) }
  } catch { cuenta.value = {} }   // el error ya lo enseña la lista
}
watch(() => state.cohorte.codigo, cuenta_, { immediate: true })

const pestanas = [{ id: '', label: 'Todas' }, ...Object.keys(CARRERAS).map(k => ({ id: k, label: `Carrera ${k}` }))]

// --- Exportar: el filtro entero, no la página que se ve ---
const exportando = ref(false)
const COLUMNAS = ['codigo_padep', 'cui', 'nombre', 'sexo', 'cohorte', 'carrera', 'carrera_nombre',
  'departamento', 'municipio', 'escalafon', 'estatus_academico']

async function exporta() {
  exportando.value = true
  error.value = ''
  try {
    const filas_ = await todas()
    const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [COLUMNAS.join(','), ...filas_.map(f => COLUMNAS.map(k => celda(f[k])).join(','))].join('\r\n')
    // BOM para que Excel lea bien las tildes.
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `inscritos_cohorte${state.cohorte.codigo || '-todas'}${state.s8Carrera ? `_car${state.s8Carrera}` : ''}.csv`
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
    <p class="eyebrow">Registro Inicial (Docente)</p>
    <h1 class="page-title">Listado de Docentes Inscritos</h1>
    <p class="page-sub">
      Inscritos de la cohorte <strong class="mono">{{ state.cohorte.codigo || '—' }}</strong>,
      tal como quedaron en la base tras la última carga.
    </p>

    <AvisoError v-if="!state.cohorte.codigo" tono="nota"
      mensaje="No hay cohorte elegida: se listan los inscritos de todas las cohortes." />
    <AvisoError :mensaje="error" />

    <div class="segmented" role="tablist">
      <button
        v-for="p in pestanas" :key="p.id"
        class="segmented__tab" :class="{ 'is-active': state.s8Carrera === p.id }"
        role="tab" :aria-selected="state.s8Carrera === p.id"
        @click="state.s8Carrera = p.id">
        {{ p.label }}<template v-if="cuenta[p.id] != null"> ({{ cuenta[p.id].toLocaleString('es-GT') }})</template>
      </button>
    </div>

    <div class="table-wrap table-wrap--scroll" :class="{ 'is-loading': cargando }">
      <table class="table">
        <thead>
          <tr>
            <th>Código PADEP</th><th>Docente</th><th>Carrera</th><th>Departamento</th>
            <th>Municipio</th><th>Escalafón</th><th>Estatus</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!cargando && filas.length === 0">
            <td colspan="7" class="empty">{{ error ? 'No se pudo leer la lista.' : 'No hay inscritos con este filtro.' }}</td>
          </tr>
          <tr v-for="d in filas" :key="`${d.codigo_padep}-${d.cohorte}-${d.carrera}`">
            <td class="mono">{{ d.codigo_padep }}</td>
            <td class="is-strong">{{ d.nombre }}</td>
            <td class="mono" :title="d.carrera_nombre">{{ d.carrera }}</td>
            <td>{{ d.departamento || '—' }}</td>
            <td>{{ d.municipio || '—' }}</td>
            <td>{{ d.escalafon || '—' }}</td>
            <td><span :class="pillClass(estatusTone(d.estatus_academico))">{{ capital(d.estatus_academico) }}</span></td>
          </tr>
        </tbody>
      </table>
      <Paginador v-model:pagina="pagina" :paginas="paginas" :total="total" :por-pagina="POR_PAGINA" :cargando="cargando" />
    </div>

    <div class="btn-row">
      <button class="btn btn--outline" :disabled="exportando || total === 0" @click="exporta">
        {{ exportando ? 'Exportando…' : 'Exportar listado (CSV)' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex; gap: 2px; padding: 4px; border-radius: 9px;
  background: var(--teal-bg); margin-bottom: 18px;
}
.segmented__tab {
  padding: 7px 16px; border-radius: 7px; border: none; cursor: pointer;
  font-family: inherit; font-size: 13.5px; font-weight: 600;
  background: transparent; color: var(--teal);
}
.segmented__tab.is-active { background: #fff; color: var(--navy); }
.table-wrap { margin-bottom: 18px; }
.is-loading tbody { opacity: .5; }
</style>
