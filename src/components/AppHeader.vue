<script setup>
import { usePadep } from '@/stores/padep'
import { iniciales } from '@/utils/format'

const { state, toggleProfile, goHome, logout, submitTopSearch } = usePadep()

const usuario = { nombre: 'Lucía Morán', cargo: 'Supervisora educativa', correo: 'lmoran@mineduc.edu.gt' }
</script>

<template>
  <header class="topbar">
    <div class="topbar__brand">
      <div class="topbar__mark" aria-hidden="true">P</div>
      <div>
        <div class="topbar__name">PADEP/D</div>
        <div class="topbar__sub">Seguimiento de cohortes</div>
      </div>
    </div>

    <div class="topbar__divider" aria-hidden="true" />

    <div class="topbar__search">
      <span class="topbar__search-icon" aria-hidden="true" />
      <input
        v-model="state.s9Query"
        type="search"
        placeholder="Buscar docente, sede o cohorte..."
        aria-label="Buscar docente, sede o cohorte"
        @keydown.enter="submitTopSearch">
    </div>

    <div class="topbar__spacer" />

    <button class="topbar__icon-btn" title="Inicio" aria-label="Inicio" @click="goHome">⌂</button>
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
        <span class="topbar__chevron" aria-hidden="true">{{ state.profileOpen ? '▲' : '▼' }}</span>
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
          <button class="menu__item" role="menuitem" @click="goHome"><span>⌂</span>Inicio</button>
          <button class="menu__item" role="menuitem"><span>⚙</span>Configuración</button>
        </div>
        <div class="menu__group menu__group--top">
          <button class="menu__item menu__item--danger" role="menuitem" @click="logout"><span>⇥</span>Cerrar sesión</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex; align-items: center; gap: 18px; padding: 0 24px; height: 64px;
  flex-shrink: 0; background: var(--navy-deep); border-bottom: 1px solid rgba(255,255,255,.08);
}
.topbar__brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.topbar__mark {
  width: 40px; height: 40px; border-radius: 9px; background: #fff; color: var(--navy-deep);
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;
}
.topbar__name { font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -.01em; line-height: 1.15; }
.topbar__sub { font-size: 10.5px; font-weight: 500; color: #8FA3B2; letter-spacing: .02em; }
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
.topbar__identity-name { display: block; font-size: 12.5px; font-weight: 600; color: #fff; }
.topbar__identity-role { display: block; font-size: 10.5px; color: #8FA3B2; }
.topbar__chevron { color: #8FA3B2; font-size: 10px; margin: 0 4px; }

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
.menu__id-mail { display: block; font-size: 11.5px; color: var(--muted-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu__group { padding: 6px; }
.menu__group--top { border-top: 1px solid var(--border-3); }
.menu__item {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px;
  border: none; background: transparent; border-radius: var(--r-sm);
  font-family: inherit; font-size: 13.5px; color: #374151; text-align: left; cursor: pointer;
}
.menu__item span { width: 16px; text-align: center; }
.menu__item:hover { background: #F3F4F6; }
.menu__item--danger { color: #B91C1C; font-weight: 600; }
.menu__item--danger:hover { background: #FEE2E2; }
</style>
