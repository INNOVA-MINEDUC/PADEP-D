<script setup>
/** Pie de tabla paginada: «1–50 de 1077» y anterior / siguiente. */
const props = defineProps({
  pagina: { type: Number, required: true },
  paginas: { type: Number, required: true },
  total: { type: Number, required: true },
  porPagina: { type: Number, required: true },
  cargando: { type: Boolean, default: false },
})
const emit = defineEmits(['update:pagina'])

const ir = (p) => { if (p >= 1 && p <= props.paginas && p !== props.pagina) emit('update:pagina', p) }
</script>

<template>
  <nav v-if="total > 0" class="paginador" aria-label="Paginación">
    <span class="paginador__rango">
      {{ (pagina - 1) * porPagina + 1 }}–{{ Math.min(pagina * porPagina, total) }}
      de {{ total.toLocaleString('es-GT') }}
    </span>
    <span class="paginador__botones">
      <button class="btn btn--ghost btn--sm" :disabled="cargando || pagina <= 1" @click="ir(pagina - 1)">← Anterior</button>
      <span class="paginador__pagina">Página {{ pagina }} de {{ paginas }}</span>
      <button class="btn btn--ghost btn--sm" :disabled="cargando || pagina >= paginas" @click="ir(pagina + 1)">Siguiente →</button>
    </span>
  </nav>
</template>

<style scoped>
.paginador {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 12px 16px; border-top: 1px solid var(--border-3); font-size: 13px; color: var(--muted-2);
}
.paginador__botones { display: flex; align-items: center; gap: 8px; }
.paginador__pagina { min-width: 110px; text-align: center; }
.btn--sm { height: 34px; padding: 0 12px; font-size: 13px; }
</style>
