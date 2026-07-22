<script setup>
import { usePadep, NAV } from '@/stores/padep'

const { state, currentModuleIndex, toggleModule, goTo } = usePadep()

/** Estado visual del badge: completado, actual o pendiente. */
function badgeState(index) {
  if (index === currentModuleIndex.value) return 'is-current'
  return index < currentModuleIndex.value ? 'is-done' : 'is-todo'
}
</script>

<template>
  <aside class="sidebar">
    <p class="sidebar__label">Seguimiento de cohorte</p>
    <p class="sidebar__cohorte mono">{{ state.cohorte.codigo }}</p>

    <nav class="sidebar__nav" aria-label="Módulos del sistema">
      <div v-for="(mod, i) in NAV" :key="mod.id" class="sidebar__module">
        <button
          class="sidebar__toggle"
          :aria-expanded="state.openModules[mod.id]"
          @click="toggleModule(mod.id)">
          <span class="sidebar__badge" :class="badgeState(i)">{{ mod.num }}</span>
          <span class="sidebar__title" :class="{ 'is-current': i === currentModuleIndex }">{{ mod.title }}</span>
          <span class="sidebar__chevron" aria-hidden="true">{{ state.openModules[mod.id] ? '▾' : '▸' }}</span>
        </button>

        <div v-if="state.openModules[mod.id]" class="sidebar__screens">
          <button
            v-for="scr in mod.screens"
            :key="scr.id"
            class="sidebar__screen"
            :class="{ 'is-active': state.active === scr.id }"
            :aria-current="state.active === scr.id ? 'page' : undefined"
            @click="goTo(scr.id)">
            {{ scr.title }}
          </button>
        </div>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 288px; flex-shrink: 0; min-height: 660px; padding: 22px 0 20px;
  display: flex; flex-direction: column; position: relative; overflow: hidden;
  background:
    radial-gradient(circle at 88% 6%, rgba(255,255,255,.08), transparent 42%),
    linear-gradient(165deg, var(--navy-deep) 0%, var(--navy-mid) 55%, #13314F 100%);
}
@media (max-width: 900px) { .sidebar { width: 100%; min-height: auto; } }

.sidebar__label { padding: 0 22px 14px; margin: 0; font-size: 11px; color: #7E93A0; letter-spacing: .03em; }
.sidebar__cohorte {
  margin: 0; padding: 0 22px 18px; font-size: 13px; color: #E7ECEF; font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,.1);
}
.sidebar__nav { padding: 4px 14px; overflow-y: auto; flex: 1; }
.sidebar__module { margin-bottom: 2px; }

.sidebar__toggle {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 8px;
  border-radius: var(--r-sm); background: transparent; border: none;
  text-align: left; cursor: pointer; font-family: inherit;
}
.sidebar__toggle:hover { background: rgba(255,255,255,.06); }

.sidebar__badge {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.sidebar__badge.is-current { background: var(--gold); color: #fff; }
.sidebar__badge.is-done    { background: var(--teal); color: #fff; }
.sidebar__badge.is-todo    { background: rgba(255,255,255,.08); color: #9FB0BC; }

.sidebar__title { flex: 1; font-size: 13.5px; font-weight: 600; color: #C7D2D8; }
.sidebar__title.is-current { font-weight: 700; color: #fff; }
.sidebar__chevron { color: #7E93A0; font-size: 11px; width: 14px; text-align: center; }

.sidebar__screens { margin: 2px 0 8px 34px; padding-left: 14px; border-left: 2px solid rgba(255,255,255,.12); }
.sidebar__screen {
  display: block; width: 100%; text-align: left; border: none; cursor: pointer;
  padding: 7px 10px 7px 12px; border-radius: 7px; margin-bottom: 2px;
  font-family: inherit; font-size: 12.5px; font-weight: 500;
  background: transparent; color: #B7C4CA; border-left: 2.5px solid transparent;
}
.sidebar__screen:hover { background: rgba(255,255,255,.08); }
.sidebar__screen.is-active {
  background: rgba(192,138,46,.18); color: var(--gold-soft);
  font-weight: 700; border-left-color: var(--gold);
}
</style>
