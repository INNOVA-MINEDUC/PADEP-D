<script setup>
import { computed, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'

import LoginView from '@/components/LoginView.vue'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CambioPassword from '@/components/CambioPassword.vue'
import Icono from '@/components/Icono.vue'

import S01AltaCohorte from '@/screens/S01AltaCohorte.vue'
import S02Sedes from '@/screens/S02Sedes.vue'
import S03Enlaces from '@/screens/S03Enlaces.vue'
import S04Carreras from '@/screens/S04Carreras.vue'
import S08ListadoInscritos from '@/screens/S08ListadoInscritos.vue'
import S09BusquedaDocentes from '@/screens/S09BusquedaDocentes.vue'
import S10SeguimientoEstatus from '@/screens/S10SeguimientoEstatus.vue'
import S11ComparacionNominas from '@/screens/S11ComparacionNominas.vue'
import S12FichaAcademica from '@/screens/S12FichaAcademica.vue'
import S13ConstructorReportes from '@/screens/S13ConstructorReportes.vue'
import S14VistaReporte from '@/screens/S14VistaReporte.vue'
import S15Extraccion from '@/screens/S15Extraccion.vue'
import S16Curador from '@/screens/S16Curador.vue'
import S17Usuarios from '@/screens/S17Usuarios.vue'

const { state, currentModule, crumbScreen, restauraSesion } = usePadep()

// Revalida el token guardado antes de decidir qué pintar.
onMounted(restauraSesion)

/**
 * Mapa pantalla → componente. Los ids conservan la numeración del prototipo,
 * con huecos: 6 nunca existió (el 4 lo ocupó después el catálogo de
 * carreras), y 5 y 7 se retiraron al centralizar
 * la extracción en el módulo 5 (subían un archivo de mentira y pintaban SEED;
 * lo que de verdad extraen esos documentos es S15). El 10 era otro de esos y
 * hoy es el seguimiento de estatus. Al montar vue-router, esto
 * se vuelve el array de rutas casi sin cambios.
 */
const SCREENS = {
  1: S01AltaCohorte,
  2: S02Sedes,
  3: S03Enlaces,
  4: S04Carreras,
  8: S08ListadoInscritos,
  9: S09BusquedaDocentes,
  10: S10SeguimientoEstatus,
  11: S11ComparacionNominas,
  12: S12FichaAcademica,
  13: S13ConstructorReportes,
  14: S14VistaReporte,
  15: S15Extraccion,
  16: S16Curador,
  17: S17Usuarios,
}

// `active` null = la sesión no puede ver ninguna pantalla (un rol sin permisos).
const currentScreen = computed(() => SCREENS[state.active] ?? null)

// Pantallas que todavía pintan datos de ejemplo (`maqueta` en el catálogo).
const esMaqueta = computed(() => currentModule.value.screens.some(s => s.id === state.active && s.maqueta))
</script>

<template>
  <!-- Nada hasta saber si hay sesión: pintar el login y quitarlo medio segundo
       después, en cada recarga, parece un fallo. -->
  <div v-if="!state.sesionResuelta" class="arranque" />

  <LoginView v-else-if="!state.loggedIn" />

  <div v-else class="shell">
    <AppHeader />

    <div class="shell__body">
      <AppSidebar />

      <div class="shell__content">
        <nav class="crumbs" aria-label="Ruta de navegación">
          <span>PADEP</span>
          <span class="crumbs__sep" aria-hidden="true">›</span>
          <span>{{ currentModule.title }}</span>
          <span class="crumbs__sep" aria-hidden="true">›</span>
          <span class="crumbs__current" aria-current="page">{{ crumbScreen }}</span>
        </nav>

        <main class="shell__main">
          <p v-if="esMaqueta" class="preview-banner" role="note">
            <Icono nombre="aviso" :tam="18" />
            <span>
              <strong>Vista previa con datos de ejemplo.</strong>
              Esta pantalla todavía no lee la base: los docentes, notas y totales que
              aparecen aquí son inventados y no deben usarse para decidir nada.
            </span>
          </p>
          <component :is="currentScreen" v-if="currentScreen" :key="state.active" />
          <!-- Un rol sin ningún permiso entra y no ve nada: se le dice por qué
               en vez de dejarle una pantalla en blanco. -->
          <div v-else class="card empty-state">
            <div class="empty-state__icon"><Icono nombre="candado" /></div>
            <p class="empty-state__title">Tu rol todavía no tiene permisos</p>
            <p class="empty-state__hint">
              Entraste como <strong>{{ state.usuario?.rol }}</strong>, pero ese rol no tiene
              asignada ninguna pantalla. Pide a un administrador que te los asigne.
            </p>
          </div>
        </main>
      </div>
    </div>

    <ConfirmDialog />
    <CambioPassword />
  </div>
</template>

<style scoped>
.arranque { min-height: 100vh; background: var(--bg); }
.shell { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); color: var(--text); }
.shell__body { display: flex; flex: 1; min-height: 0; }
.shell__content { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.crumbs {
  display: flex; align-items: center; gap: 6px; padding: 16px 32px;
  background: #fff; border-bottom: 1px solid var(--border-2);
  box-shadow: 0 1px 3px rgba(11,30,58,.04); font-size: 13px; color: var(--muted);
  flex-wrap: wrap;
}
.crumbs__sep { color: var(--muted); }
.crumbs__current { color: var(--navy); font-weight: 700; }

.shell__main { padding: 32px 36px; max-width: 1320px; width: 100%; }
@media (max-width: 640px) { .shell__main { padding: 24px 18px; } .crumbs { padding: 14px 18px; } }
</style>
