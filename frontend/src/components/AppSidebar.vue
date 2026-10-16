<script setup>
import { usePadep } from '@/stores/padep'

// Solo los módulos y pantallas que la sesión puede ver (ver `navVisible`).
const { state, navVisible, currentModuleIndex, toggleModule, goTo, cierraMenuMovil } = usePadep()

// El número del módulo solo marca dónde se está. Antes pintaba «hecho» todo lo
// que quedaba arriba del actual, sin saber si se había hecho algo: el progreso
// real vive en el panel de cada pantalla.
</script>

<template>
  <!-- En pantallas estrechas es un cajón sobre el contenido; el velo lo cierra. -->
  <div v-if="state.menuMovil" class="sidebar__velo" aria-hidden="true" @click="cierraMenuMovil" />

  <aside id="menu-principal" class="sidebar" :class="{ 'is-open': state.menuMovil }">
    <p class="sidebar__label">Seguimiento de cohorte</p>
    <!-- Sale del corte elegido, no de un formulario. Vacío mientras no haya
         ninguno, en vez de un código de mentira que no existe en la base. -->
    <p class="sidebar__cohorte">
      {{ state.cohorte.codigo ? `Cohorte ${state.cohorte.codigo}` : 'Sin cohorte' }}
    </p>

    <nav class="sidebar__nav" aria-label="Módulos del sistema">
      <div v-for="(mod, i) in navVisible" :key="mod.id" class="sidebar__module">
        <button
          class="sidebar__toggle"
          :aria-expanded="state.openModules[mod.id]"
          @click="toggleModule(mod.id)">
          <span class="sidebar__badge" :class="{ 'is-current': i === currentModuleIndex }">{{ mod.num }}</span>
          <span class="sidebar__title" :class="{ 'is-current': i === currentModuleIndex }">{{ mod.title }}</span>
          <span class="sidebar__chevron" :class="{ 'is-open': state.openModules[mod.id] }" aria-hidden="true">›</span>
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
            <span v-if="scr.maqueta" class="sidebar__tag">Vista previa</span>
          </button>
        </div>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 288px; flex-shrink: 0; padding: 22px 0 20px;
  display: flex; flex-direction: column; overflow: hidden;
  /* Se queda quieto al bajar por una pantalla larga (Extracción). */
  position: sticky; top: 64px; height: calc(100vh - 64px);
  background:
    radial-gradient(circle at 88% 6%, rgba(255,255,255,.08), transparent 42%),
    linear-gradient(165deg, var(--navy-deep) 0%, var(--navy-mid) 55%, #13314F 100%);
}

/* Estrecho: cajón fuera de la pantalla hasta que se abre desde la cabecera. */
@media (max-width: 900px) {
  .sidebar {
    position: fixed; top: 64px; left: 0; bottom: 0; height: auto; z-index: 80;
    width: min(300px, 86vw); transform: translateX(-100%); transition: transform .2s ease;
    box-shadow: 0 12px 32px rgba(16,24,40,.3);
  }
  .sidebar.is-open { transform: none; }
}
.sidebar__velo { position: fixed; inset: 64px 0 0 0; z-index: 79; background: rgba(11,30,59,.45); }
@media (min-width: 901px) { .sidebar__velo { display: none; } }

.sidebar__label { padding: 0 22px 6px; margin: 0; font-size: 12px; color: #9FB0BC; letter-spacing: .03em; }
.sidebar__cohorte {
  margin: 0; padding: 0 22px 18px; font-size: 14px; color: #E7ECEF; font-weight: 700;
  border-bottom: 1px solid rgba(255,255,255,.1);
}
.sidebar__nav { padding: 10px 14px; overflow-y: auto; flex: 1; }
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
  background: rgba(255,255,255,.1); color: #C7D2D8;
}
/* Texto azul oscuro sobre dorado: el blanco daba 3:1. */
.sidebar__badge.is-current { background: var(--gold); color: var(--navy-deep); }

.sidebar__title { flex: 1; font-size: 14px; font-weight: 600; color: #C7D2D8; }
.sidebar__title.is-current { font-weight: 700; color: #fff; }
.sidebar__chevron { color: #9FB0BC; font-size: 16px; width: 14px; text-align: center; transition: transform .15s; }
.sidebar__chevron.is-open { transform: rotate(90deg); }

.sidebar__screens { margin: 2px 0 8px 34px; padding-left: 14px; border-left: 2px solid rgba(255,255,255,.12); }
.sidebar__screen {
  display: block; width: 100%; text-align: left; border: none; cursor: pointer;
  padding: 7px 10px 7px 12px; border-radius: 7px; margin-bottom: 2px;
  font-family: inherit; font-size: 13px; font-weight: 500; line-height: 1.35;
  background: transparent; color: #C7D2D8; border-left: 2.5px solid transparent;
}
.sidebar__screen:hover { background: rgba(255,255,255,.08); }
.sidebar__screen.is-active {
  background: rgba(192,138,46,.18); color: var(--gold-soft);
  font-weight: 700; border-left-color: var(--gold);
}
.sidebar__tag {
  display: inline-block; margin-left: 4px; padding: 1px 6px; border-radius: var(--r-pill);
  font-size: 12px; font-weight: 600; line-height: 1.4; white-space: nowrap;
  background: rgba(243,217,166,.14); color: var(--gold-soft);
}
</style>
