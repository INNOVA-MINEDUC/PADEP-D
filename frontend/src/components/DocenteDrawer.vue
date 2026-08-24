<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import { iniciales, pillClass, estatusTone } from '@/utils/format'
import { useEscape } from '@/utils/useEscape'

const { state, getDocente, closeDrawer, drawerToFicha } = usePadep()

const docente = computed(() => state.drawerDocenteId ? getDocente(state.drawerDocenteId) : null)

useEscape(() => { if (state.drawerDocenteId) closeDrawer() })
</script>

<template>
  <div v-if="docente" class="drawer-root">
    <div class="drawer__scrim" @click="closeDrawer" />
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Consulta rápida de docente">
      <header class="drawer__head">
        <span class="drawer__eyebrow">Consulta rápida</span>
        <button class="drawer__close" aria-label="Cerrar" @click="closeDrawer">✕</button>
      </header>

      <div class="drawer__body">
        <div class="drawer__identity">
          <span class="drawer__avatar">{{ iniciales(docente.nombre) }}</span>
          <span>
            <span class="drawer__name">{{ docente.nombre }}</span>
            <span class="drawer__dpi mono">{{ docente.dpi }}</span>
          </span>
        </div>

        <dl class="drawer__rows">
          <div class="drawer__row"><dt>Sede</dt><dd>{{ docente.sede }}</dd></div>
          <div class="drawer__row"><dt>Escalafón</dt><dd>{{ docente.escalafon }}</dd></div>
          <div class="drawer__row">
            <dt>Estatus</dt>
            <dd><span :class="pillClass(estatusTone(docente.estatus))">{{ docente.estatus }}</span></dd>
          </div>
          <div class="drawer__row"><dt>Nota actual</dt><dd>{{ docente.notas }}</dd></div>
          <div class="drawer__row"><dt>Asistencia</dt><dd>{{ docente.asistencia }}</dd></div>
        </dl>
      </div>

      <footer class="drawer__foot">
        <button class="btn btn--primary drawer__cta" @click="drawerToFicha">Ver expediente completo</button>
        <button class="btn btn--ghost" @click="closeDrawer">Cerrar</button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.drawer-root { position: fixed; inset: 0; z-index: 60; }
.drawer__scrim { position: absolute; inset: 0; background: rgba(15,36,64,.45); }
.drawer {
  position: absolute; top: 0; right: 0; height: 100%; width: 420px; max-width: 90vw;
  background: #fff; box-shadow: 0 12px 32px rgba(16,24,40,.16); display: flex; flex-direction: column;
}
.drawer__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid var(--border-3); flex-shrink: 0;
}
.drawer__eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-2); }
.drawer__close {
  width: 32px; height: 32px; border: none; background: transparent; border-radius: var(--r-sm);
  color: var(--muted-2); font-size: 18px; cursor: pointer;
}
.drawer__close:hover { background: #F3F4F6; }

.drawer__body { flex: 1; overflow-y: auto; padding: 22px; }
.drawer__identity { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.drawer__avatar {
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
  background: var(--blue-bg); color: var(--blue);
  display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;
}
.drawer__name { display: block; font-size: 16px; font-weight: 700; color: var(--ink); line-height: 1.2; }
.drawer__dpi { display: block; font-size: 12px; color: var(--muted-2); margin-top: 3px; }

.drawer__rows {
  margin: 0; display: flex; flex-direction: column; gap: 1px;
  background: var(--border-3); border: 1px solid var(--border-3); border-radius: 10px; overflow: hidden;
}
.drawer__row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; background: #fff; }
.drawer__row dt { font-size: 12px; color: var(--muted-2); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; }
.drawer__row dd { margin: 0; font-size: 13px; color: var(--ink); text-align: right; }

.drawer__foot { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--border-3); flex-shrink: 0; }
.drawer__cta { flex: 1; height: 42px; }
.drawer__foot .btn--ghost { height: 42px; }
</style>
