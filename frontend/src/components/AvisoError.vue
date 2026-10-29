<script setup>
defineProps({
  /**
   * Texto de la API. Se enseña tal cual: ya viene en español y escrito para
   * quien opera, así que reescribirlo solo lo empeora.
   */
  mensaje: { type: String, default: '' },
  tono: { type: String, default: 'mal' }, // 'mal' | 'nota'
})
</script>

<template>
  <p v-if="mensaje" class="aviso" :class="`aviso--${tono}`" role="alert">{{ mensaje }}</p>
</template>

<style scoped>
.aviso { font-size: 13px; padding: 10px 14px; border-radius: var(--r-sm); margin: 0 0 16px; }
.aviso--mal  { background: var(--danger-bg); color: var(--danger); }
.aviso--nota { background: var(--bg-soft); color: var(--muted); border: 1px solid var(--border-2); }
</style>
