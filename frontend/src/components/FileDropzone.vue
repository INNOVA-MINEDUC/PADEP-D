<script setup>
defineProps({
  title: { type: String, default: 'Arrastre y suelte su archivo aquí' },
  hint: { type: String, default: 'Formatos aceptados: PDF o Excel · Tamaño hasta 100 MB' },
  /** 'blue' = estilo destacado; 'plain' = variante discreta. */
  variant: { type: String, default: 'blue' },
})
const emit = defineEmits(['select'])
</script>

<template>
  <div class="dropzone" :class="`dropzone--${variant}`" @dragover.prevent @drop.prevent="emit('select')">
    <div v-if="variant === 'blue'" class="dropzone__icon" aria-hidden="true">⬆</div>
    <p class="dropzone__title">{{ title }}</p>
    <div v-if="variant === 'blue'" class="dropzone__or" aria-hidden="true"><span /> o <span /></div>
    <p v-else class="dropzone__hint">{{ hint }}</p>
    <button class="btn" :class="variant === 'blue' ? 'btn--primary' : 'btn--outline'" @click="emit('select')">
      Seleccionar archivo
    </button>
    <p v-if="variant === 'blue'" class="dropzone__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.dropzone {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  text-align: center; border-radius: var(--r-md);
}
.dropzone--blue { max-width: 520px; border: 1.5px dashed #3B82F6; background: #F9FBFE; padding: 36px 26px; }
.dropzone--plain { max-width: 420px; border: 1.5px dashed #C7D0CD; padding: 26px; gap: 8px; border-radius: 10px; }
.dropzone__icon {
  width: 44px; height: 44px; border-radius: 10px; background: var(--blue-bg);
  display: flex; align-items: center; justify-content: center; color: var(--blue); font-size: 22px;
}
.dropzone__title { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.dropzone--plain .dropzone__title { font-size: 13.5px; }
.dropzone__or { display: flex; align-items: center; gap: 10px; width: 180px; color: #9CA3AF; font-size: 12px; }
.dropzone__or span { flex: 1; height: 1px; background: var(--border-3); }
.dropzone__hint { margin: 0; font-size: 11px; color: var(--muted-2); }
.dropzone--plain .dropzone__hint { font-size: 12px; color: var(--muted); }
</style>
