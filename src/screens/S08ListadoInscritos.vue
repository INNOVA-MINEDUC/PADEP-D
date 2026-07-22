<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import { pillClass, resultadoTone } from '@/utils/format'

const { state, inscritos } = usePadep()

const filas = computed(() => state.s8Tab === 'preliminar' ? SEED : inscritos.value)
</script>

<template>
  <div>
    <p class="eyebrow">Registro Inicial (Docente)</p>
    <h1 class="page-title">Listado de Docentes Inscritos</h1>
    <p class="page-sub">Listado preliminar de preinscritos y listado final/oficial de inscritos confirmados.</p>

    <div class="segmented" role="tablist">
      <button
        class="segmented__tab" :class="{ 'is-active': state.s8Tab === 'preliminar' }"
        role="tab" :aria-selected="state.s8Tab === 'preliminar'"
        @click="state.s8Tab = 'preliminar'">
        Preliminar ({{ SEED.length }})
      </button>
      <button
        class="segmented__tab" :class="{ 'is-active': state.s8Tab === 'final' }"
        role="tab" :aria-selected="state.s8Tab === 'final'"
        @click="state.s8Tab = 'final'">
        Final ({{ inscritos.length }})
      </button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Docente</th><th>Sede</th><th>Resultado</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="c in filas" :key="c.id">
            <td class="is-strong">{{ c.nombre }}</td>
            <td>{{ c.sede }}</td>
            <td>
              <span :class="pillClass(resultadoTone(c.resultado))">
                {{ c.resultado === '-' ? '—' : c.resultado }}
              </span>
            </td>
            <td>
              <span :class="pillClass(c.inscripcionFinal ? 'teal' : '')">
                {{ c.inscripcionFinal ? 'Inscrito' : 'Preinscrito' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="btn btn--brand">Confirmar inscripción final</button>
      <button class="btn btn--outline">Exportar listado</button>
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
</style>
