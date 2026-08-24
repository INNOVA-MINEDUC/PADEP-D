<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'

const { state, saveCohorte, cancelCohorte } = usePadep()

const codigoValido = computed(() => /^[A-Za-z0-9-]{4,}$/.test(state.cohorteDraft.codigo || ''))
const anioValido   = computed(() => /^20\d{2}$/.test(state.cohorteDraft.anio || ''))

const errCodigo = computed(() =>
  state.s1Touched && !codigoValido.value ? 'Usa el formato COH-AAAA-NN (mínimo 4 caracteres).' : '')
const errAnio = computed(() =>
  state.s1Touched && !anioValido.value ? 'Ingresa un año válido (ej. 2026).' : '')

const guardado = computed(() =>
  state.cohorte.saved &&
  state.cohorteDraft.codigo === state.cohorte.codigo &&
  state.cohorteDraft.anio === state.cohorte.anio)

const guardar = () => saveCohorte(codigoValido.value && anioValido.value)
</script>

<template>
  <div>
    <ModuleStepper :active-id="1" />

    <p class="eyebrow eyebrow--plain">Configuración de Cohorte</p>
    <h1 class="page-title">Alta de Cohorte</h1>
    <p class="page-sub">Crear una nueva cohorte con sus datos básicos.</p>

    <div class="grid-main">
      <form class="card card--flat form" @submit.prevent="guardar">
        <h2 class="form__legend">Datos de la cohorte</h2>

        <label class="field">
          <span class="field__label">Número / código de cohorte</span>
          <input
            v-model="state.cohorteDraft.codigo"
            class="input mono"
            :class="{ 'input--error': errCodigo }"
            :aria-invalid="!!errCodigo"
            placeholder="COH-2026-01">
          <span v-if="errCodigo" class="field__error" role="alert">{{ errCodigo }}</span>
        </label>

        <label class="field field--last">
          <span class="field__label">Año o período</span>
          <input
            v-model="state.cohorteDraft.anio"
            class="input"
            :class="{ 'input--error': errAnio }"
            :aria-invalid="!!errAnio"
            placeholder="2026">
          <span v-if="errAnio" class="field__error" role="alert">{{ errAnio }}</span>
        </label>

        <footer class="form__actions">
          <button type="submit" class="btn btn--primary">Guardar</button>
          <button type="button" class="btn btn--ghost" @click="cancelCohorte">Cancelar</button>
          <span v-if="guardado" class="form__saved">✓ Cohorte {{ state.cohorte.codigo }} guardada</span>
        </footer>
      </form>

      <CohorteContext />
    </div>
  </div>
</template>

<style scoped>
.form { padding: 24px; }
.form__legend {
  margin: 0 0 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-3);
  font-size: 15px; font-weight: 600; color: var(--ink);
}
.field--last { margin-bottom: 24px; }
.form__actions { display: flex; align-items: center; gap: 12px; padding-top: 20px; border-top: 1px solid var(--border-3); }
.form__saved { font-size: 12px; color: #166534; font-weight: 600; margin-left: auto; }
</style>
