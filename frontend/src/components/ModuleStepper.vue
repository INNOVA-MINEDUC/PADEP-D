<script setup>
import { MOD1_STEPS } from '@/data/catalog'

defineProps({
  /** Id de la pantalla activa; determina el paso actual. */
  activeId: { type: Number, required: true },
})

function stepState(id, activeId) {
  if (id === activeId) return 'is-current'
  return id < activeId ? 'is-done' : 'is-todo'
}
</script>

<template>
  <ol class="stepper" aria-label="Progreso de configuración">
    <li v-for="(step, i) in MOD1_STEPS" :key="step.id" class="stepper__item">
      <span class="stepper__dot" :class="stepState(step.id, activeId)">{{ step.id }}</span>
      <span class="stepper__label" :class="{ 'is-current': step.id === activeId }">{{ step.label }}</span>
      <span
        v-if="i !== MOD1_STEPS.length - 1"
        class="stepper__line"
        :class="{ 'is-done': step.id < activeId }"
        aria-hidden="true" />
    </li>
  </ol>
</template>

<style scoped>
.stepper { display: flex; align-items: center; gap: 4px; margin: 0 0 20px; padding: 0; max-width: 520px; list-style: none; }
.stepper__item { display: flex; align-items: center; gap: 4px; flex: 1; }
.stepper__item:last-child { flex: 0 0 auto; }
.stepper__dot {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.stepper__dot.is-current { background: var(--gold); color: #fff; }
.stepper__dot.is-done    { background: var(--teal); color: #fff; }
.stepper__dot.is-todo    { background: #fff; color: #9AA6A3; border: 1.5px solid var(--border-2); }
.stepper__label { font-size: 12.5px; font-weight: 500; color: #8C9895; white-space: nowrap; }
.stepper__label.is-current { font-weight: 700; color: var(--navy); }
.stepper__line { flex: 1; height: 2px; background: var(--border); margin: 0 4px; }
.stepper__line.is-done { background: var(--teal); }
</style>
