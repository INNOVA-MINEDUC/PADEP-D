<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import { buildRow } from '@/utils/report'

const { state, docentes } = usePadep()

/** Si no hay variables seleccionadas, el reporte cae a un set mínimo. */
const columnas = computed(() => state.reportVars.length ? state.reportVars : ['Sede', 'Estatus'])

const filtrados = computed(() => docentes.value.filter(d =>
  (state.s13Dep === 'Todos' || d.departamento === state.s13Dep) &&
  (state.s13Estatus === 'Todos' || d.estatus === state.s13Estatus)
))

const filas = computed(() =>
  filtrados.value.map(d => buildRow(d, columnas.value, state.cohorte.codigo)))
</script>

<template>
  <div>
    <p class="eyebrow">Reportes Dinámicos</p>
    <h1 class="page-title">Vista y Exportación del Reporte</h1>
    <p class="page-sub">Reporte generado a partir de las variables y filtros aplicados.</p>

    <section class="card chips">
      <span class="chips__label">Variables aplicadas:</span>
      <span v-for="c in columnas" :key="c" class="chips__item">{{ c }}</span>
    </section>

    <div class="table-wrap table-wrap--scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Docente</th>
            <th v-for="c in columnas" :key="c">{{ c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filas" :key="r.id">
            <td class="is-strong">{{ r.nombre }}</td>
            <td v-for="(cell, i) in r.cells" :key="i">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="btn btn--brand">Exportar (PDF)</button>
      <button class="btn btn--outline">Exportar (Excel)</button>
      <button class="btn btn--outline">Guardar como plantilla</button>
    </div>
  </div>
</template>

<style scoped>
.chips {
  padding: 14px 18px; margin-bottom: 16px;
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px;
}
.chips__label { color: var(--muted); }
.chips__item {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em;
  padding: 3px 10px; border-radius: var(--r-pill); background: var(--teal-bg); color: var(--navy);
}
.table-wrap { margin-bottom: 20px; }
</style>
