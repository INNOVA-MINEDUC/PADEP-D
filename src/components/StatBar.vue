<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'

const { stats } = usePadep()

const items = computed(() => [
  { label: 'Candidatos', value: stats.value.candidatos, tone: 'blue' },
  { label: 'Evaluados',  value: stats.value.evaluados,  tone: 'blue' },
  { label: 'Aprobados',  value: stats.value.aprobados,  tone: 'green' },
  { label: 'Inscritos',  value: stats.value.inscritos,  tone: 'gold' },
])
</script>

<template>
  <div class="stats">
    <div v-for="s in items" :key="s.label" class="stat" :class="`stat--${s.tone}`">
      <span class="stat__label">{{ s.label }}</span>
      <span class="stat__value">{{ s.value }}</span>
    </div>
  </div>
</template>

<style scoped>
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat {
  display: flex; flex-direction: column; gap: 4px; padding: 14px 18px;
  background: #fff; border: 1px solid var(--border-3); border-radius: var(--r-md);
  box-shadow: 0 1px 2px rgba(16,24,40,.05); border-top: 3px solid var(--blue);
}
.stat--green { border-top-color: #16A34A; }
.stat--gold  { border-top-color: #D97706; }
.stat__label { font-size: 11px; color: var(--muted-2); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.stat__value { font-size: 26px; font-weight: 700; color: var(--ink); letter-spacing: -.02em; line-height: 1.1; }
</style>
