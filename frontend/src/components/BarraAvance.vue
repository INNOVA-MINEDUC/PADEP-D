<script setup>
defineProps({
  /** 0..100. Si es null, la barra va indeterminada. */
  valor: { type: Number, default: null },
})
</script>

<template>
  <!-- Indeterminada cuando no hay porcentaje: una entrega no cuenta páginas y
       sus contadores van a 0. Pintar «0 %» durante minutos parece colgado. -->
  <div class="barra" :class="{ 'barra--indet': valor === null }">
    <i :style="valor === null ? undefined : { width: `${valor}%` }" />
  </div>
</template>

<style scoped>
.barra { height: 6px; background: #EEF1F0; border-radius: var(--r-pill); overflow: hidden; }
.barra i { display: block; height: 100%; background: var(--teal); border-radius: var(--r-pill); transition: width .4s ease; }
.barra--indet i { width: 40%; animation: corre 1.4s ease-in-out infinite; }
@keyframes corre { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }
</style>
