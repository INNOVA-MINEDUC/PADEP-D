<script setup>
import { computed, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'

import LoginView from '@/components/LoginView.vue'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import DocenteDrawer from '@/components/DocenteDrawer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

import S01AltaCohorte from '@/screens/S01AltaCohorte.vue'
import S02Sedes from '@/screens/S02Sedes.vue'
import S03Enlaces from '@/screens/S03Enlaces.vue'
import S05CargaCandidatos from '@/screens/S05CargaCandidatos.vue'
import S07ResultadosAdmision from '@/screens/S07ResultadosAdmision.vue'
import S08ListadoInscritos from '@/screens/S08ListadoInscritos.vue'
import S09BusquedaDocentes from '@/screens/S09BusquedaDocentes.vue'
import S10NotasAsistencia from '@/screens/S10NotasAsistencia.vue'
import S11ComparacionNominas from '@/screens/S11ComparacionNominas.vue'
import S12FichaAcademica from '@/screens/S12FichaAcademica.vue'
import S13ConstructorReportes from '@/screens/S13ConstructorReportes.vue'
import S14VistaReporte from '@/screens/S14VistaReporte.vue'
import S15Extraccion from '@/screens/S15Extraccion.vue'
import S16Curador from '@/screens/S16Curador.vue'

const { state, currentModule, crumbScreen, restauraSesion } = usePadep()

// Revalida el token guardado antes de decidir qué pintar.
onMounted(restauraSesion)

/**
 * Mapa pantalla → componente. Los ids conservan la numeración del prototipo
 * (4 y 6 nunca existieron). Al montar vue-router, esto se vuelve el array
 * de rutas casi sin cambios.
 */
const SCREENS = {
  1: S01AltaCohorte,
  2: S02Sedes,
  3: S03Enlaces,
  5: S05CargaCandidatos,
  7: S07ResultadosAdmision,
  8: S08ListadoInscritos,
  9: S09BusquedaDocentes,
  10: S10NotasAsistencia,
  11: S11ComparacionNominas,
  12: S12FichaAcademica,
  13: S13ConstructorReportes,
  14: S14VistaReporte,
  15: S15Extraccion,
  16: S16Curador,
}

const currentScreen = computed(() => SCREENS[state.active] ?? S01AltaCohorte)
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
          <component :is="currentScreen" :key="state.active" />
        </main>
      </div>
    </div>

    <ConfirmDialog />
    <DocenteDrawer />
  </div>
</template>

<style scoped>
.arranque { min-height: 100vh; background: var(--bg); }
.shell { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); color: var(--text); }
.shell__body { display: flex; flex: 1; min-height: 0; }
@media (max-width: 900px) { .shell__body { flex-direction: column; } }
.shell__content { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.crumbs {
  display: flex; align-items: center; gap: 6px; padding: 16px 32px;
  background: #fff; border-bottom: 1px solid var(--border-2);
  box-shadow: 0 1px 3px rgba(11,30,58,.04); font-size: 12.5px; color: var(--muted);
}
.crumbs__sep { color: #B7C0BD; }
.crumbs__current { color: var(--navy); font-weight: 700; }

.shell__main { padding: 32px 36px; max-width: 1180px; width: 100%; }
@media (max-width: 640px) { .shell__main { padding: 24px 18px; } .crumbs { padding: 14px 18px; } }
</style>
