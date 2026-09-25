<script setup>
import { usePadep } from '@/stores/padep'
import { useEscape } from '@/utils/useEscape'

const { state, cierraConfirmacion, aceptaConfirmacion } = usePadep()

useEscape(() => { if (state.confirmacion.open) cierraConfirmacion() })
</script>

<template>
  <div
    v-if="state.confirmacion.open"
    class="overlay"
    @click.self="cierraConfirmacion">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <h2 id="confirm-title" class="dialog__title">{{ state.confirmacion.titulo }}</h2>
      <p class="dialog__body">{{ state.confirmacion.mensaje }}</p>
      <div class="dialog__actions">
        <button class="btn btn--outline" @click="cierraConfirmacion">Cancelar</button>
        <button class="btn btn--danger" @click="aceptaConfirmacion">{{ state.confirmacion.boton }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 50; background: rgba(11,20,35,.45);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.dialog { background: #fff; border-radius: var(--r-lg); box-shadow: 0 24px 60px rgba(0,0,0,.25); padding: 26px; width: 100%; max-width: 360px; }
.dialog__title { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: var(--navy); }
.dialog__body { margin: 0 0 20px; font-size: 13px; color: var(--muted); line-height: 1.5; }
.dialog__actions { display: flex; gap: 8px; justify-content: flex-end; }
.dialog__actions .btn { height: 38px; border-radius: 10px; font-size: 13px; }
</style>
