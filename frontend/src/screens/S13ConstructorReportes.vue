<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import { REPORT_VARIABLES, buildRow } from '@/utils/report'
import { plural } from '@/utils/format'

const { state, docentes, toggleReportVar, clearReportVars, clearReportFiltros, goTo } = usePadep()

const depOptions = ['Todos', ...new Set(SEED.map(d => d.departamento))]
const estatusOptions = ['Todos', 'Activo', 'Retirado', 'Graduado']

const filtrados = computed(() => docentes.value.filter(d =>
  (state.s13Dep === 'Todos' || d.departamento === state.s13Dep) &&
  (state.s13Estatus === 'Todos' || d.estatus === state.s13Estatus)
))

const hayVariables = computed(() => state.reportVars.length > 0)

const previewRows = computed(() =>
  hayVariables.value
    ? filtrados.value.slice(0, 3).map(d => buildRow(d, state.reportVars, state.cohorte.codigo))
    : [])

const previewNota = computed(() =>
  `Mostrando ${Math.min(3, filtrados.value.length)} de ${filtrados.value.length} docentes que cumplen los filtros.`)
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Reportes Dinámicos</p>
    <h1 class="page-title">Constructor de Reportes</h1>
    <p class="page-sub">Seleccionar las variables y filtros para generar un reporte dinámico.</p>

    <!-- Filtros -->
    <div class="filtros">
      <div class="pill-select">
        <span class="pill-select__legend">Departamento</span>
        <span class="pill-select__icon" aria-hidden="true">⚑</span>
        <select v-model="state.s13Dep" class="pill-select__control">
          <option v-for="d in depOptions" :key="d" :value="d">{{ d }}</option>
        </select>
        <span class="pill-select__caret" aria-hidden="true">▼</span>
      </div>

      <div class="pill-select">
        <span class="pill-select__legend">Estatus</span>
        <span class="pill-select__icon" aria-hidden="true">◪</span>
        <select v-model="state.s13Estatus" class="pill-select__control">
          <option v-for="e in estatusOptions" :key="e" :value="e">{{ e }}</option>
        </select>
        <span class="pill-select__caret" aria-hidden="true">▼</span>
      </div>

      <button class="btn-soft" @click="clearReportFiltros"><span aria-hidden="true">⚗</span> Limpiar filtros</button>
    </div>

    <!-- Variables -->
    <section class="card card--flat vars">
      <header class="card__head">
        <span>Variables disponibles</span>
        <span class="count-badge">
          {{ plural(state.reportVars.length, 'seleccionada', 'seleccionadas') }}
        </span>
        <button v-if="hayVariables" class="btn btn--ghost btn--sm vars__clear" @click="clearReportVars">
          ✕ Limpiar variables
        </button>
      </header>
      <div class="vars__body">
        <button
          v-for="v in REPORT_VARIABLES"
          :key="v"
          class="chip"
          :class="{ 'is-on': state.reportVars.includes(v) }"
          :aria-pressed="state.reportVars.includes(v)"
          @click="toggleReportVar(v)">
          <span class="chip__mark" aria-hidden="true">{{ state.reportVars.includes(v) ? '✓' : '' }}</span>{{ v }}
        </button>
      </div>
    </section>

    <!-- Vista previa -->
    <section class="card card--flat preview">
      <header class="card__head">
        <span>Vista previa del reporte</span>
        <span v-if="hayVariables" class="count-badge">{{ previewNota }}</span>
      </header>
      <div class="card__body">
        <p v-if="!hayVariables" class="preview__empty">Agrega al menos una variable para ver la vista previa.</p>

        <div v-else class="preview__table">
          <table class="table">
            <thead>
              <tr>
                <th>Docente</th>
                <th v-for="c in state.reportVars" :key="c">{{ c }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in previewRows" :key="r.id">
                <td class="is-strong">{{ r.nombre }}</td>
                <td v-for="(cell, i) in r.cells" :key="i">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="btn-row">
      <button class="btn btn--primary btn--lg" :disabled="!hayVariables" @click="goTo(14)">
        <span aria-hidden="true">⬇</span> Generar reporte
      </button>
      <span v-if="!hayVariables" class="hint">Selecciona al menos una variable para generar el reporte.</span>
    </div>
  </div>
</template>

<style scoped>
.filtros { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 20px; }
.pill-select { position: relative; flex: 0 0 240px; min-width: 0; }
.pill-select__legend {
  position: absolute; top: -7px; left: 16px; padding: 0 6px; background: #fff;
  font-size: 11px; font-weight: 500; color: #9CA3AF; z-index: 1;
}
.pill-select__icon, .pill-select__caret {
  position: absolute; top: 50%; transform: translateY(-50%);
  color: #9CA3AF; pointer-events: none;
}
.pill-select__icon { left: 16px; font-size: 15px; }
.pill-select__caret { right: 18px; font-size: 10px; }
.pill-select__control {
  width: 100%; appearance: none; background: #fff; border: 1px solid var(--border-3);
  border-radius: var(--r-pill); padding: 13px 40px; font-size: 14px; color: #374151;
  font-family: inherit; outline: none; cursor: pointer;
}
.pill-select__control:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.2); }

.btn-soft {
  display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 22px;
  background: var(--blue-bg); color: var(--blue); border: none; border-radius: var(--r-pill);
  font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;
}
.btn-soft:hover { background: var(--blue-br); }

.vars, .preview { margin-bottom: 20px; }
.vars__clear { margin-left: auto; height: 32px; padding: 0 10px; font-size: 13px; }
.btn--sm { height: 32px; }
.vars__body { padding: 18px 20px; display: flex; flex-wrap: wrap; gap: 10px; }
.chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px;
  border-radius: var(--r-pill); border: 1px solid var(--border-3); background: #fff;
  font-family: inherit; font-size: 13.5px; font-weight: 600; color: #374151;
  cursor: pointer; user-select: none;
}
.chip.is-on { border-color: var(--blue); background: var(--blue-bg); color: #1E40AF; }
.chip__mark {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff;
  border: 1.5px solid #C7CDD6; background: transparent;
}
.chip.is-on .chip__mark { border: none; background: var(--blue); }

.preview__empty { margin: 0; font-size: 14px; color: var(--muted-2); }
.preview__table { border: 1px solid var(--border-3); border-radius: 10px; overflow: hidden; }
.btn--lg { height: 44px; padding: 0 22px; }
.hint { font-size: 12.5px; color: var(--muted-2); }
</style>
