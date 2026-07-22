<script setup>
import { usePadep, NAV } from '@/stores/padep'

const { state, checklist, nextStepId, enlacesCount, goTo } = usePadep()

const siguiente = () => {
  if (nextStepId.value === null) return
  goTo(nextStepId.value)
}
const siguienteLabel = () =>
  nextStepId.value === null
    ? 'Módulo completo'
    : `Continuar: ${NAV[0].screens[nextStepId.value - 1].title}`
</script>

<template>
  <div class="stack">
    <section class="card card--flat ctx">
      <p class="ctx__eyebrow">Resumen de cohorte</p>
      <p class="ctx__codigo mono">{{ state.cohorte.codigo }}</p>
      <dl class="ctx__list">
        <dt>Año</dt><dd>{{ state.cohorte.anio }}</dd>
        <dt>Sedes</dt><dd>{{ state.sedes.length }}</dd>
        <dt>Enlaces asignados</dt><dd>{{ enlacesCount }}</dd>
      </dl>
    </section>

    <section class="card card--flat ctx">
      <p class="ctx__eyebrow ctx__eyebrow--muted">Progreso del módulo</p>
      <ul class="checklist">
        <li v-for="item in checklist" :key="item.label" class="checklist__item">
          <span class="checklist__dot" :class="{ 'is-done': item.done }">{{ item.done ? '✓' : '' }}</span>
          <span class="checklist__label" :class="{ 'is-done': item.done }">{{ item.label }}</span>
        </li>
      </ul>
    </section>

    <button v-if="nextStepId !== null" class="btn btn--primary ctx__next" @click="siguiente">
      {{ siguienteLabel() }} →
    </button>
  </div>
</template>

<style scoped>
.ctx { padding: 18px; }
.ctx:first-child { background: var(--blue-bg); border-color: var(--border-3); }
.ctx__eyebrow {
  margin: 0 0 10px; font-size: 11px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: #1E40AF;
}
.ctx__eyebrow--muted { color: var(--muted-2); margin-bottom: 14px; }
.ctx__codigo { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: var(--navy-ink); }
.ctx__list { display: grid; grid-template-columns: 1fr auto; row-gap: 8px; margin: 0; font-size: 13px; }
.ctx__list dt { color: var(--muted-2); }
.ctx__list dd { margin: 0; text-align: right; font-weight: 600; color: var(--ink); }

.checklist { list-style: none; margin: 0; padding: 0; }
.checklist__item { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.checklist__item:last-child { margin-bottom: 0; }
.checklist__dot {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1.5px solid var(--border-2); color: #fff; font-size: 10px;
}
.checklist__dot.is-done { background: var(--success); border: none; }
.checklist__label { font-size: 13px; color: #8C9895; }
.checklist__label.is-done { color: var(--text); font-weight: 600; }

.ctx__next { width: 100%; }
</style>
