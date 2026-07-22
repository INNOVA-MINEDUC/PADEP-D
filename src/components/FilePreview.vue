<script setup>
defineProps({
  filename: { type: String, required: true },
  /** Color de la barra superior de la miniatura (verde Excel / rojo PDF). */
  accent: { type: String, default: '#16A34A' },
  badge: { type: String, default: 'Cargado' },
})
</script>

<template>
  <div class="preview">
    <div class="preview__thumb" aria-hidden="true">
      <span class="preview__bar" :style="{ background: accent }" />
      <span class="preview__line" style="width: 100%" />
      <span class="preview__line" style="width: 85%" />
      <span class="preview__line" style="width: 92%" />
      <span class="preview__line" style="width: 60%" />
    </div>
    <div class="preview__meta">
      <p class="preview__name">{{ filename }}</p>
      <p class="preview__note mono">Vista previa simulada del documento</p>
    </div>
    <span v-if="badge" class="preview__badge">{{ badge }}</span>
  </div>
</template>

<style scoped>
.preview {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  background: #F9FAFB; border: 1px solid var(--border-3); border-radius: var(--r-md); margin-bottom: 16px;
}
.preview__thumb {
  width: 52px; height: 66px; flex-shrink: 0; padding: 8px 7px;
  background: #fff; border: 1px solid var(--border-3); border-radius: 6px;
  box-shadow: 0 1px 3px rgba(16,24,40,.08);
}
.preview__bar { display: block; height: 5px; width: 70%; border-radius: 2px; margin-bottom: 6px; }
.preview__line { display: block; height: 3px; background: var(--border-3); border-radius: 2px; margin-bottom: 4px; }
.preview__meta { flex: 1; min-width: 0; }
.preview__name { margin: 0 0 2px; font-size: 14px; font-weight: 600; color: var(--ink); }
.preview__note { margin: 0; font-size: 11px; color: var(--muted-2); }
.preview__badge {
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
  background: #DCFCE7; color: #166534;
}
</style>
