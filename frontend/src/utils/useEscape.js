import { onMounted, onBeforeUnmount } from 'vue'

/** Ejecuta `handler` cuando se presiona Escape mientras el componente está montado. */
export function useEscape(handler) {
  const onKey = e => { if (e.key === 'Escape') handler() }
  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
