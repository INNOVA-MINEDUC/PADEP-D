<script setup>
import { MOD1_STEPS } from '@/data/catalog'
import { usePadep } from '@/stores/padep'

defineProps({
  /** Id de la pantalla activa; determina el paso actual. */
  activeId: { type: Number, required: true },
})

// El verde sale del avance real (el mismo checklist del panel derecho), no de
// la posición: estar en Enlaces no significa que haya sedes.
const { checklist, goTo } = usePadep()

// `id` es la pantalla, no la posición: el checklist va por posición.
function stepState(step, i, activeId) {
  if (step.id === activeId) return 'is-current'
  return checklist.value[i].done ? 'is-done' : 'is-todo'
}
</script>

<template>
  <ol class="stepper" aria-label="Progreso de configuración">
    <li v-for="(step, i) in MOD1_STEPS" :key="step.id" class="stepper__item">
      <button
        type="button"
        class="stepper__btn"
        :aria-current="step.id === activeId ? 'step' : undefined"
        @click="goTo(step.id)">
        <span class="stepper__dot" :class="stepState(step, i, activeId)">{{ i + 1 }}</span>
        <span class="stepper__label" :class="{ 'is-current': step.id === activeId }">{{ step.label }}</span>
      </button>
      <span
        v-if="i !== MOD1_STEPS.length - 1"
        class="stepper__line"
        :class="{ 'is-done': checklist[i].done }"
        aria-hidden="true" />
    </li>
  </ol>
</template>

<style scoped>
.stepper { display: flex; align-items: center; gap: 4px; margin: 0 0 20px; padding: 0; max-width: 640px; list-style: none; }
.stepper__item { display: flex; align-items: center; gap: 4px; flex: 1; }
.stepper__item:last-child { flex: 0 0 auto; }
.stepper__btn {
  display: flex; align-items: center; gap: 4px; padding: 2px; border: 0; border-radius: var(--r-md);
  background: none; cursor: pointer; font: inherit;
}
.stepper__btn:hover .stepper__label { color: var(--navy); }
.stepper__dot {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.stepper__dot.is-current { background: var(--gold); color: var(--navy-deep); }
.stepper__dot.is-done    { background: var(--teal); color: #fff; }
.stepper__dot.is-todo    { background: #fff; color: var(--muted); border: 1.5px solid var(--border-2); }
.stepper__label { font-size: 13px; font-weight: 500; color: var(--muted); white-space: nowrap; }
.stepper__label.is-current { font-weight: 700; color: var(--navy); }
.stepper__line { flex: 1; height: 2px; background: var(--border); margin: 0 4px; }
.stepper__line.is-done { background: var(--teal); }
</style>
