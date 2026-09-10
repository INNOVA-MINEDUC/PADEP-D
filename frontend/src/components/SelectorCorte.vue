<script setup>
import { etiquetaCarrera } from '@/data/carreras'

defineProps({
  lista: { type: Array, required: true },
  elegido: { type: String, default: '' },
})
const emit = defineEmits(['elige'])

/**
 * La carrera va en la etiqueta porque es lo único que separa dos cortes del
 * mismo trimestre: la 35 y la 36 son las dos de la cohorte 11.
 *
 * El número de corte solo aparece si NO es el 1. Hoy siempre vale 1 —el
 * formulario ni lo pregunta—, así que enseñarlo sería ruido; pero el día que
 * haya una segunda entrega en el mismo trimestre, es lo único que distingue las
 * dos y tiene que verse sin tocar nada.
 */
const etiqueta = (c) => {
  const base = `Cohorte ${c.cohorte} · ${etiquetaCarrera(c.carrera)} · trimestre ${c.trimestre}`
  return c.corte === 1 ? base : `${base} · corte ${c.corte}`
}
</script>

<template>
  <label class="field">
    <span class="field__label">Cohorte · carrera · trimestre</span>
    <select class="select" :value="elegido" @change="emit('elige', $event.target.value)">
      <option v-if="!lista.length" value="">— todavía no hay ninguno —</option>
      <option v-for="c in lista" :key="c.id" :value="c.id">{{ etiqueta(c) }}</option>
    </select>
  </label>
</template>
