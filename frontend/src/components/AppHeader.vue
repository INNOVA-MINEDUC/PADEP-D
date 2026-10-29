<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import { iniciales } from '@/utils/format'
import Icono from '@/components/Icono.vue'

const { state, esGlobal, fijaUnidad, toggleProfile, goHome, logout, submitTopSearch, abreCambioPassword, toggleMenuMovil } = usePadep()

// La unidad sobre la que se trabaja. El de una unidad solo la ve (no elige);
// el global la cambia aquí y toda la aplicación pasa a operar sobre ella.
// Con una sola unidad no hay nada que elegir, pero se enseña igual: así nadie
// duda de dónde está escribiendo el día que haya dos.
const nombreUnidad = computed(() => {
  const u = state.unidades.find(x => x.codigo === state.unidad)
  return u?.nombre || state.unidad || '—'
})

// Del token, no inventado: nombre, rol y correo vienen de /api/auth/me.
const usuario = computed(() => ({
  nombre: state.usuario?.nombre ?? '—',
  cargo: state.usuario?.rol ?? '',
  correo: state.usuario?.email ?? '',
}))
</script>

<template>
  <header class="topbar">
    <!-- Solo en pantallas estrechas: abre el menú lateral como cajón. -->
    <button
      class="topbar__icon-btn topbar__menu"
      :aria-expanded="state.menuMovil"
      aria-controls="menu-principal"
      :aria-label="state.menuMovil ? 'Cerrar menú' : 'Abrir menú'"
      @click="toggleMenuMovil">
      <Icono :nombre="state.menuMovil ? 'cerrar' : 'menu'" :tam="20" />
    </button>

    <div class="topbar__brand">
      <div class="topbar__mark" aria-hidden="true">P</div>
      <div>
        <div class="topbar__name">PADEP/D</div>
        <div class="topbar__sub">Seguimiento de cohortes</div>
      </div>
    </div>

    <div class="topbar__divider" aria-hidden="true" />

    <!-- Busca docentes y nada más (escribe en el filtro de S09): el texto de
         antes prometía también sedes y cohortes. -->
    <div class="topbar__search">
      <span class="topbar__search-icon" aria-hidden="true" />
      <input
        v-model="state.s9Query"
        type="search"
        placeholder="Buscar docente por nombre, código o CUI…"
        aria-label="Buscar docente por nombre, código PADEP o CUI"
        @keydown.enter="submitTopSearch">
    </div>

    <div class="topbar__spacer" />

    <label v-if="esGlobal && state.unidades.length" class="topbar__unidad" title="Unidad sobre la que se trabaja">
      <span class="topbar__unidad-rotulo">Unidad</span>
      <select :value="state.unidad" aria-label="Unidad sobre la que se trabaja"
              @change="fijaUnidad($event.target.value)">
        <option v-for="u in state.unidades" :key="u.codigo" :value="u.codigo">
          {{ u.nombre || u.codigo }}{{ u.estatus === 'activa' ? '' : ' (inactiva)' }}
        </option>
      </select>
    </label>
    <span v-else-if="state.unidad" class="topbar__unidad" title="Tu unidad">
      <span class="topbar__unidad-rotulo">Unidad</span>
      <span class="topbar__unidad-nombre">{{ nombreUnidad }}</span>
    </span>

    <button class="topbar__home" @click="goHome">
      <Icono nombre="inicio" :tam="17" /><span class="topbar__home-text">Inicio</span>
    </button>
    <div class="topbar__divider topbar__divider--sm" aria-hidden="true" />

    <div class="topbar__profile">
      <button
        class="topbar__profile-btn"
        :class="{ 'is-open': state.profileOpen }"
        :aria-expanded="state.profileOpen"
        @click="toggleProfile">
        <span class="topbar__avatar">{{ iniciales(usuario.nombre) }}</span>
        <span class="topbar__identity">
          <span class="topbar__identity-name">{{ usuario.nombre }}</span>
          <span class="topbar__identity-role">{{ usuario.cargo }}</span>
        </span>
        <span class="topbar__chevron" :class="{ 'is-open': state.profileOpen }" aria-hidden="true">›</span>
      </button>

      <div v-if="state.profileOpen" class="menu" role="menu">
        <div class="menu__head">
          <span class="menu__avatar">{{ iniciales(usuario.nombre) }}</span>
          <span class="menu__id">
            <span class="menu__id-name">{{ usuario.nombre }}</span>
            <span class="menu__id-mail">{{ usuario.correo }}</span>
          </span>
        </div>
        <div class="menu__group">
          <button class="menu__item" role="menuitem" @click="goHome"><Icono nombre="inicio" />Inicio</button>
          <button class="menu__item" role="menuitem" @click="abreCambioPassword"><Icono nombre="llave" />Cambiar contraseña</button>
        </div>
        <div class="menu__group menu__group--top">
          <button class="menu__item menu__item--danger" role="menuitem" @click="logout"><Icono nombre="salir" />Cerrar sesión</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex; align-items: center; gap: 18px; padding: 0 24px; height: 64px;
  flex-shrink: 0; background: var(--navy-deep); border-bottom: 1px solid rgba(255,255,255,.08);
  /* Fija arriba: en las pantallas largas no se pierde ni la cabecera ni el
     menú (que es sticky debajo de ella). */
  position: sticky; top: 0; z-index: 90;
}
.topbar__brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.topbar__mark {
  width: 40px; height: 40px; border-radius: 9px; background: #fff; color: var(--navy-deep);
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;
}
.topbar__name { font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -.01em; line-height: 1.15; }
.topbar__sub { font-size: 12px; font-weight: 500; color: #8FA3B2; letter-spacing: .02em; }
.topbar__divider { width: 1px; height: 28px; background: rgba(255,255,255,.1); }
.topbar__divider--sm { height: 26px; margin: 0 4px; }
.topbar__spacer { flex: 1; }

.topbar__search { flex: 1; max-width: 440px; position: relative; }
.topbar__search input {
  width: 100%; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.13);
  border-radius: var(--r-pill); padding: 9px 14px 9px 36px; font-size: 13px; color: #fff;
  font-family: inherit; outline: none;
}
.topbar__search input::placeholder { color: #8FA3B2; }
.topbar__search input:focus { border-color: rgba(96,165,250,.6); background: rgba(255,255,255,.1); }
.topbar__search-icon {
  position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
  width: 13px; height: 13px; border: 1.5px solid #8FA3B2; border-radius: 50%; pointer-events: none;
}

.topbar__icon-btn {
  width: 36px; height: 36px; border-radius: 9px; background: transparent; border: none;
  color: #C7D2D8; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
}
.topbar__icon-btn:hover { background: rgba(255,255,255,.08); }
.topbar__menu { display: none; margin-left: -8px; }

.topbar__home {
  display: flex; align-items: center; gap: 7px; height: 36px; padding: 0 12px;
  border-radius: 9px; background: transparent; border: none; cursor: pointer;
  color: #C7D2D8; font-family: inherit; font-size: 13px; font-weight: 600;
}
.topbar__home:hover { background: rgba(255,255,255,.08); color: #fff; }

.topbar__unidad {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
  font-size: 13px; color: #C7D2D8;
}
.topbar__unidad-rotulo { font-size: 12px; color: #8FA3B2; letter-spacing: .02em; }
.topbar__unidad-nombre { font-weight: 600; color: #fff; }
.topbar__unidad select {
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.13);
  border-radius: var(--r-pill); padding: 6px 10px; font-size: 13px; color: #fff;
  font-family: inherit; outline: none; max-width: 200px;
}
.topbar__unidad select option { color: var(--ink); }

/* Estrecho: menú de hamburguesa, sin el buscador ni el texto del perfil (el
   buscador sigue en S09). Antes la cabecera medía 554 px en un móvil de 390. */
@media (max-width: 900px) {
  .topbar { gap: 10px; padding: 0 14px; }
  .topbar__menu { display: flex; }
}
@media (max-width: 720px) {
  .topbar__search, .topbar__divider, .topbar__home-text, .topbar__identity, .topbar__chevron { display: none; }
  .topbar__unidad-rotulo { display: none; }
  .topbar__unidad select { max-width: 120px; }
  .topbar__sub { display: none; }
  .topbar__profile-btn { padding: 3px; }
}

.topbar__profile { position: relative; }
.topbar__profile-btn {
  display: flex; align-items: center; gap: 10px; padding: 5px 8px 5px 5px;
  border-radius: var(--r-pill); background: transparent; border: 1px solid rgba(255,255,255,.08);
  cursor: pointer; font-family: inherit;
}
.topbar__profile-btn:hover, .topbar__profile-btn.is-open { background: rgba(255,255,255,.1); }
.topbar__avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--blue), #1E3A5F); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
}
.topbar__identity { line-height: 1.2; text-align: left; }
.topbar__identity-name { display: block; font-size: 13px; font-weight: 600; color: #fff; }
.topbar__identity-role { display: block; font-size: 12px; color: #8FA3B2; }
.topbar__chevron { color: #8FA3B2; font-size: 16px; margin: 0 4px; transform: rotate(90deg); transition: transform .15s; }
.topbar__chevron.is-open { transform: rotate(-90deg); }

.menu {
  position: absolute; top: calc(100% + 8px); right: 0; width: 248px; z-index: 70;
  background: #fff; border: 1px solid var(--border-3); border-radius: var(--r-md);
  box-shadow: 0 12px 32px rgba(16,24,40,.16); overflow: hidden;
}
.menu__head { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border-3); }
.menu__avatar {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--blue), #1E3A5F); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;
}
.menu__id { line-height: 1.3; min-width: 0; }
.menu__id-name { display: block; font-size: 14px; font-weight: 600; color: var(--ink); }
.menu__id-mail { display: block; font-size: 12px; color: var(--muted-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu__group { padding: 6px; }
.menu__group--top { border-top: 1px solid var(--border-3); }
.menu__item {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px;
  border: none; background: transparent; border-radius: var(--r-sm);
  font-family: inherit; font-size: 14px; color: #374151; text-align: left; cursor: pointer;
}
.menu__item:hover { background: #F3F4F6; }
.menu__item--danger { color: #B91C1C; font-weight: 600; }
.menu__item--danger:hover { background: #FEE2E2; }
</style>
