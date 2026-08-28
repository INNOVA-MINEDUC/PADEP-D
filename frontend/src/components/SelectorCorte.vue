<script setup>
defineProps({
  lista: { type: Array, required: true },
  elegido: { type: String, default: '' },
})
const emit = defineEmits(['elige'])

const etiqueta = c => `Cohorte ${c.cohorte} · semestre ${c.semestre} · corte ${c.corte}`
</script>

<template>
  <label class="field">
    <span class="field__label">Cohorte · semestre · corte</span>
    <select class="select" :value="elegido" @change="emit('elige', $event.target.value)">
      <option v-if="!lista.length" value="">— todavía no hay ninguno —</option>
      <option v-for="c in lista" :key="c.id" :value="c.id">{{ etiqueta(c) }}</option>
    </select>
  </label>
</template>
