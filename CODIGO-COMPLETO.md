# PADEP/D — Código fuente completo (Vue 3)

Todos los archivos del proyecto en un solo documento, en orden de lectura.

## Índice

- `package.json`
- `vite.config.js`
- `index.html`
- `src/main.js`
- `src/App.vue`
- `src/assets/styles.css`
- `src/data/catalog.js`
- `src/stores/padep.js`
- `src/utils/format.js`
- `src/utils/report.js`
- `src/utils/useEscape.js`
- `src/components/LoginView.vue`
- `src/components/AppHeader.vue`
- `src/components/AppSidebar.vue`
- `src/components/ModuleStepper.vue`
- `src/components/CohorteContext.vue`
- `src/components/StatBar.vue`
- `src/components/FileDropzone.vue`
- `src/components/FilePreview.vue`
- `src/components/ConfirmDialog.vue`
- `src/components/DocenteDrawer.vue`
- `src/screens/S01AltaCohorte.vue`
- `src/screens/S02Sedes.vue`
- `src/screens/S03Enlaces.vue`
- `src/screens/S05CargaCandidatos.vue`
- `src/screens/S07ResultadosAdmision.vue`
- `src/screens/S08ListadoInscritos.vue`
- `src/screens/S09BusquedaDocentes.vue`
- `src/screens/S10NotasAsistencia.vue`
- `src/screens/S11ComparacionNominas.vue`
- `src/screens/S12FichaAcademica.vue`
- `src/screens/S13ConstructorReportes.vue`
- `src/screens/S14VistaReporte.vue`


---

## `package.json`

```json
{
  "name": "padep-vue",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.2.0"
  }
}

```

---

## `vite.config.js`

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  }
})

```

---

## `index.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PADEP/D · Seguimiento de cohortes</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>

```

---

## `src/main.js`

```js
import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles.css'

createApp(App).mount('#app')

```

---

## `src/App.vue`

```vue
<script setup>
import { computed } from 'vue'
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

const { state, currentModule, crumbScreen } = usePadep()

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
}

const currentScreen = computed(() => SCREENS[state.active] ?? S01AltaCohorte)
</script>

<template>
  <LoginView v-if="!state.loggedIn" />

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

```

---

## `src/assets/styles.css`

```css
/* ============================================================
   PADEP/D — Design tokens
   Portados 1:1 desde el bloque "Design tokens" del prototipo.
   ============================================================ */
:root {
  /* Marca / chrome */
  --navy:        #0B2E4F;   /* primario */
  --navy-deep:   #0B1E3B;   /* topbar / sidebar */
  --navy-mid:    #0F2A4D;
  --navy-ink:    #0F2440;   /* botones sólidos de pantallas "gris" */
  --gold:        #C08A2E;   /* acento / paso activo */
  --gold-soft:   #F3D9A6;

  /* Semánticos */
  --teal:        #1C5C6E;   --teal-bg:    #EAF2F3;
  --success:     #2F7D4F;   --success-bg: #E8F4EC;
  --warning:     #B3651D;   --warning-bg: #FBF0E4;
  --danger:      #B3261E;   --danger-bg:  #FBEAEA;
  --blue:        #2563EB;   --blue-bg:    #EFF4FB;  --blue-br: #DBEAFE;

  /* Neutros */
  --text:        #22302E;
  --ink:         #111827;
  --muted:       #64726F;
  --muted-2:     #6B7280;
  --border:      #E7EAEE;
  --border-2:    #DDE2DF;
  --border-3:    #E5E7EB;
  --surface:     #ffffff;
  --bg:          #F5F6F4;
  --bg-soft:     #FAFBFA;

  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-pill: 100px;

  --sh-1: 0 1px 2px rgba(11,30,58,.04);
  --sh-2: 0 1px 2px rgba(11,30,58,.04), 0 10px 26px rgba(11,30,58,.05);
  --sh-3: 0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04);
  --sh-btn: 0 4px 12px rgba(11,46,79,.22);

  --font: -apple-system, 'Segoe UI', system-ui, sans-serif;
  --mono: ui-monospace, 'SF Mono', Menlo, monospace;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font); color: var(--text); background: var(--bg); }
::-webkit-scrollbar { width: 7px; height: 7px; }
::-webkit-scrollbar-thumb { background: #C7D0CD; border-radius: 10px; }
:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }

/* ---------- Tipografía ---------- */
.eyebrow {
  display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase; color: var(--teal); background: var(--teal-bg);
  padding: 4px 12px; border-radius: var(--r-pill); margin-bottom: 12px;
}
.eyebrow--plain {
  background: none; padding: 0; color: var(--muted-2); font-weight: 600;
  letter-spacing: .06em; margin-bottom: 8px;
}
.page-title { font-size: 27px; font-weight: 700; color: var(--navy); letter-spacing: -.01em; margin: 0 0 6px; }
.page-sub   { font-size: 14px; line-height: 1.5; color: var(--muted); margin: 0 0 24px; max-width: 620px; }
.mono { font-family: var(--mono); }

/* ---------- Superficies ---------- */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--sh-2); }
.card--flat { box-shadow: var(--sh-1); border-radius: var(--r-md); }
.card__head {
  padding: 16px 20px; border-bottom: 1px solid var(--border-3);
  font-size: 15px; font-weight: 600; color: var(--ink);
  display: flex; align-items: center; gap: 10px;
}
.card__body { padding: 20px; }

/* ---------- Formularios ---------- */
.field { display: block; margin-bottom: 18px; }
.field__label {
  display: block; font-size: 12px; font-weight: 600; letter-spacing: .04em;
  text-transform: uppercase; color: var(--muted-2); margin-bottom: 6px;
}
.input, .select {
  width: 100%; background: var(--surface); border: 1px solid var(--border-2);
  border-radius: var(--r-sm); padding: 10px 12px; font-size: 14px; color: var(--ink);
  font-family: inherit; outline: none; transition: border-color .12s, box-shadow .12s;
}
.input:focus, .select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.25); }
.input--error { border: 1.5px solid #DC2626; }
.input[readonly] { background: #F9FAFB; color: #374151; }
.field__error { font-size: 11px; color: #DC2626; margin-top: 6px; }

/* ---------- Botones ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; padding: 0 18px; border-radius: var(--r-sm); border: none;
  font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: background .12s;
}
.btn--primary { background: var(--navy-ink); color: #fff; }
.btn--primary:hover { background: #14304F; }
.btn--brand { background: var(--navy); color: #fff; box-shadow: var(--sh-btn); border-radius: 10px; }
.btn--brand:hover { background: var(--teal); }
.btn--outline { background: #fff; color: var(--navy); border: 1px solid var(--border-2); }
.btn--outline:hover { background: var(--teal-bg); }
.btn--ghost { background: transparent; color: #374151; }
.btn--ghost:hover { background: #F3F4F6; }
.btn--danger { background: var(--danger); color: #fff; }
.btn:disabled { background: #9CA3AF; cursor: not-allowed; }
.btn-link {
  background: none; border: none; padding: 0; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 600; color: var(--blue);
}
.btn-link--danger { color: var(--danger); font-size: 12.5px; }
.btn-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

/* ---------- Tablas ---------- */
.table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--sh-2); overflow: hidden; }
.table-wrap--scroll { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
  color: var(--muted); font-weight: 700; background: var(--bg-soft);
  padding: 10px 14px; border-bottom: 1px solid var(--border-2); white-space: nowrap;
}
.table td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid var(--border-2); }
.table td.is-strong { font-weight: 600; color: var(--ink); }
.table td.is-right { text-align: right; }
.table tbody tr:hover { background: #F9FAFB; }
.table tr.is-flagged, .table tr.is-flagged:hover { background: var(--danger-bg); }
.table .empty { text-align: center; padding: 40px 20px; }

/* ---------- Píldoras ---------- */
.pill {
  display: inline-block; white-space: nowrap; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; text-transform: uppercase; padding: 3px 10px;
  border-radius: var(--r-pill); background: #EEF1F0; color: var(--muted);
}
.pill--success { background: var(--success-bg); color: var(--success); }
.pill--clay    { background: var(--warning-bg); color: var(--warning); }
.pill--danger  { background: var(--danger-bg);  color: var(--danger); }
.pill--teal    { background: var(--teal-bg);    color: var(--teal); }
.count-badge {
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
  background: var(--blue-bg); border: 1px solid var(--blue-br); color: var(--blue);
}

/* ---------- Estados vacíos ---------- */
.empty-state { padding: 32px; text-align: center; }
.empty-state__icon {
  width: 40px; height: 40px; border-radius: 50%; background: var(--teal-bg); color: var(--teal);
  display: flex; align-items: center; justify-content: center; font-size: 16px; margin: 0 auto 12px;
}
.empty-state__title { font-size: 13.5px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.empty-state__hint  { font-size: 12.5px; color: var(--muted); }

/* ---------- Avisos ---------- */
.notice {
  display: flex; align-items: center; gap: 8px; font-size: 13px;
  padding: 10px 14px; border-radius: var(--r-sm); margin-bottom: 16px;
}
.notice--warn { background: #FEF3C7; color: #92400E; }
.notice--clay { background: var(--warning-bg); color: var(--warning); }

/* ---------- Layout ---------- */
.grid-main { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 24px; align-items: start; }
.grid-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.stack { display: flex; flex-direction: column; gap: 16px; }
@media (max-width: 900px) { .grid-main { grid-template-columns: minmax(0, 1fr); } }

```

---

## `src/data/catalog.js`

```js
/**
 * Catálogo estático del prototipo: geografía, navegación y datos semilla.
 * Reemplazar por llamadas a la API cuando exista backend.
 */

export const GEO = {
  Chimaltenango: {
    Chimaltenango: ['EORM Chimaltenango No.1', 'Colegio San José'],
    'Tecpán Guatemala': ['EORM Tecpán Central'],
  },
  Sololá: {
    Sololá: ['EORM Sololá Casco Urbano'],
    Panajachel: ['Escuela Panajachel'],
  },
  Quetzaltenango: {
    Quetzaltenango: ['EORM Quetzaltenango Norte'],
    Salcajá: ['EORM Salcajá'],
  },
}

/** Módulos y pantallas del sidebar. El id de pantalla es la ruta interna. */
export const NAV = [
  {
    id: 'm1', num: 1, title: 'Configuración de Cohorte',
    screens: [
      { id: 1, title: 'Alta de Cohorte' },
      { id: 2, title: 'Sedes y Centros Educativos' },
      { id: 3, title: 'Asignación de Enlaces DIDEDUC' },
    ],
  },
  {
    id: 'm2', num: 2, title: 'Registro Inicial (Docente)',
    screens: [
      { id: 5, title: 'Carga Inicial de Candidatos' },
      { id: 7, title: 'Carga de Resultados de Admisión' },
      { id: 8, title: 'Listado de Inscritos' },
      { id: 9, title: 'Búsqueda y Consulta de Docentes' },
    ],
  },
  {
    id: 'm3', num: 3, title: 'Ficha Académica / Seguimiento',
    screens: [
      { id: 10, title: 'Carga de Notas y Asistencia' },
      { id: 11, title: 'Comparación de Nóminas' },
      { id: 12, title: 'Ficha Académica (detalle)' },
    ],
  },
  {
    id: 'm4', num: 4, title: 'Reportes Dinámicos',
    screens: [
      { id: 13, title: 'Constructor de Reportes' },
      { id: 14, title: 'Vista y Exportación' },
    ],
  },
]

/** Pasos del stepper del módulo 1. */
export const MOD1_STEPS = [
  { id: 1, label: 'Cohorte' },
  { id: 2, label: 'Sedes' },
  { id: 3, label: 'Enlaces' },
]

/** Variables disponibles en el constructor de reportes. */
export const REPORT_VARIABLES = ['Cohorte', 'Sede', 'Estatus', 'Periodo', 'Notas', 'Asistencia', 'Actas']

export const CURSOS = ['Módulo I: Pedagogía', 'Módulo II: Didáctica', 'Módulo III: Evaluación']
export const PERIODOS = ['2026 - Trimestre 1', '2026 - Trimestre 2']

/** Docentes semilla. */
export const SEED = [
  { id: 'D-001', nombre: 'María Xiquín Xoy',    idioma: 'Kaqchikel',   etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Chimaltenango',  municipio: 'Chimaltenango',      sede: 'EORM Chimaltenango No.1',   escalafon: 'B', dpi: '2451 08812 0101', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '88', asistencia: '96%',  estatus: 'Activo'   },
  { id: 'D-002', nombre: 'Carlos Sicay Bal',    idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Chimaltenango',  municipio: 'Tecpán Guatemala',   sede: 'EORM Tecpán Central',       escalafon: 'A', dpi: '1932 44120 0101', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '76', asistencia: '89%',  estatus: 'Activo'   },
  { id: 'D-003', nombre: 'Ana Lucía Tuy Pop',   idioma: "K'iche'",     etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Sololá',         municipio: 'Sololá',             sede: 'EORM Sololá Casco Urbano',  escalafon: 'C', dpi: '3012 77841 0701', incompleto: true,  resultado: 'No aprobado', inscripcionFinal: false, notas: '-',  asistencia: '-',    estatus: 'Retirado' },
  { id: 'D-004', nombre: 'José Ramírez Coyoy',  idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Sololá',         municipio: 'Panajachel',         sede: 'Escuela Panajachel',        escalafon: 'A', dpi: '1774 90233 0701', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '91', asistencia: '100%', estatus: 'Graduado' },
  { id: 'D-005', nombre: 'Diego Alonzo Ixchop', idioma: "Q'anjob'al",  etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Quetzaltenango', municipio: 'Quetzaltenango',     sede: 'EORM Quetzaltenango Norte', escalafon: 'B', dpi: '2288 10091 1201', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '82', asistencia: '93%',  estatus: 'Activo'   },
  { id: 'D-006', nombre: 'Rosa Elvira Saquic',  idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Quetzaltenango', municipio: 'Salcajá',            sede: 'EORM Salcajá',              escalafon: 'C', dpi: '3390 65214 1201', incompleto: false, resultado: '-',           inscripcionFinal: false, notas: '-',  asistencia: '-',    estatus: 'Activo'   },
  { id: 'D-007', nombre: 'Pedro Esteban Ajpop', idioma: "K'iche'",     etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Chimaltenango',  municipio: 'Tecpán Guatemala',   sede: 'EORM Tecpán Central',       escalafon: 'B', dpi: '2611 33210 0101', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '94', asistencia: '98%',  estatus: 'Graduado' },
  { id: 'D-008', nombre: 'Marta Julia Cotzal',  idioma: 'Kaqchikel',   etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Chimaltenango',  municipio: 'Chimaltenango',      sede: 'Colegio San José',          escalafon: 'A', dpi: '2455 91002 0101', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '79', asistencia: '91%',  estatus: 'Activo'   },
  { id: 'D-009', nombre: 'Byron Estuardo Cuc',  idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Sololá',         municipio: 'Sololá',             sede: 'EORM Sololá Casco Urbano',  escalafon: 'B', dpi: '3055 12897 0701', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '85', asistencia: '94%',  estatus: 'Activo'   },
  { id: 'D-010', nombre: 'Silvia Patricia Chox',idioma: 'Kaqchikel',   etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Sololá',         municipio: 'Panajachel',         sede: 'Escuela Panajachel',        escalafon: 'C', dpi: '3311 44520 0701', incompleto: false, resultado: 'No aprobado', inscripcionFinal: false, notas: '-',  asistencia: '-',    estatus: 'Retirado' },
  { id: 'D-011', nombre: 'Hugo Fernando Batz',  idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Quetzaltenango', municipio: 'Quetzaltenango',     sede: 'EORM Quetzaltenango Norte', escalafon: 'A', dpi: '2299 77341 1201', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '97', asistencia: '100%', estatus: 'Graduado' },
  { id: 'D-012', nombre: 'Claudia Beatriz Us',  idioma: "Q'anjob'al",  etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Quetzaltenango', municipio: 'Salcajá',            sede: 'EORM Salcajá',              escalafon: 'B', dpi: '3398 20044 1201', incompleto: true,  resultado: '-',           inscripcionFinal: false, notas: '-',  asistencia: '-',    estatus: 'Activo'   },
]

```

---

## `src/stores/padep.js`

```js
import { reactive, computed } from 'vue'
import { GEO, NAV, SEED } from '@/data/catalog'

/**
 * Store compartido de la aplicación.
 * Sustituye al `state` + `renderVals()` de la clase DCLogic del prototipo:
 * el estado vive aquí y cada pantalla deriva lo suyo con `computed`.
 *
 * Es un módulo singleton; si el proyecto crece, migrar a Pinia es directo
 * (mismo shape de state/getters/actions).
 */

const state = reactive({
  // --- Sesión ---
  loggedIn: false,
  loginUser: 'admin@mineduc.edu.gt',
  loginPass: '',
  loginError: '',
  showPass: false,
  profileOpen: false,

  // --- Navegación ---
  active: 1,
  openModules: { m1: true, m2: false, m3: false, m4: false },

  // --- Módulo 1: cohorte ---
  cohorte: { codigo: 'COH-2026-01', anio: '2026', saved: true },
  cohorteDraft: { codigo: 'COH-2026-01', anio: '2026' },
  s1Touched: false,

  sedes: [
    { id: 's1', departamento: 'Chimaltenango', municipio: 'Chimaltenango', sede: 'EORM Chimaltenango No.1' },
    { id: 's2', departamento: 'Sololá', municipio: 'Sololá', sede: 'EORM Sololá Casco Urbano' },
  ],
  sedeSel: { dep: 'Chimaltenango', mun: 'Chimaltenango', sede: 'EORM Chimaltenango No.1' },

  enlaces: [
    { sedeId: 's1', nombre: 'Lucía Morán', cargo: 'Supervisora educativa', contacto: 'lmoran@mineduc.gt' },
  ],
  enlaceForm: { sedeId: 's1', nombre: '', cargo: '', contacto: '' },

  // --- Cargas de archivo (simuladas) ---
  s5Uploaded: false,
  s7Uploaded: false,
  s10Uploaded: false,
  s11Uploaded: false,

  // --- Listados y filtros ---
  s8Tab: 'preliminar',
  s9Query: '',
  s9Sede: 'Todas',
  s9Estatus: 'Todos',

  // --- Seguimiento ---
  s10Curso: 'Módulo I: Pedagogía',
  s10Periodo: '2026 - Trimestre 1',
  notasOverrides: {},
  s11Marcados: [],
  fichaId: SEED[0].id,
  statusOverrides: {},
  s12Tab: 'resumen',

  // --- Reportes ---
  reportVars: ['Sede', 'Estatus', 'Notas'],
  s13Dep: 'Todos',
  s13Estatus: 'Todos',

  // --- Overlays ---
  deleteModal: { open: false, sedeId: null, sedeName: '' },
  drawerDocenteId: null,
})

/* =========================================================
   Getters
   ========================================================= */

const currentModule = computed(
  () => NAV.find(m => m.screens.some(s => s.id === state.active)) ?? NAV[0]
)

const currentModuleIndex = computed(() => NAV.findIndex(m => m.id === currentModule.value.id))

const crumbScreen = computed(
  () => currentModule.value.screens.find(s => s.id === state.active)?.title ?? ''
)

/** Docente con los overrides de notas/estatus aplicados. */
function getDocente(id) {
  const base = SEED.find(d => d.id === id) ?? SEED[0]
  const notas = state.notasOverrides[base.id] ?? {}
  return {
    ...base,
    estatus: state.statusOverrides[base.id] ?? base.estatus,
    notas: notas.notas ?? base.notas,
    asistencia: notas.asistencia ?? base.asistencia,
  }
}

/** Todos los docentes con overrides, en orden de catálogo. */
const docentes = computed(() => SEED.map(d => getDocente(d.id)))

const inscritos = computed(() => docentes.value.filter(d => d.inscripcionFinal))

const enlacesCount = computed(() => state.enlaces.length)

/** Checklist de avance del módulo 1. */
const checklist = computed(() => [
  { label: 'Alta de cohorte',   done: state.cohorte.saved },
  { label: 'Sedes registradas', done: state.sedes.length > 0 },
  { label: 'Enlaces asignados', done: state.sedes.length > 0 && enlacesCount.value >= state.sedes.length },
])

/** Primer paso pendiente del módulo 1 (o null si está completo). */
const nextStepId = computed(() => {
  const i = checklist.value.findIndex(c => !c.done)
  return i === -1 ? null : i + 1
})

/** Contadores del panel de estadísticas de los módulos 2 y 3. */
const stats = computed(() => ({
  candidatos: SEED.length,
  evaluados: SEED.filter(d => d.resultado !== '-').length,
  aprobados: SEED.filter(d => d.resultado === 'Aprobado').length,
  inscritos: inscritos.value.length,
}))

/* =========================================================
   Acciones
   ========================================================= */

const actions = {
  // --- Sesión ---
  login() {
    if (!state.loginUser.trim() || !state.loginPass.trim()) {
      state.loginError = 'Ingresa usuario y contraseña.'
      return
    }
    state.loggedIn = true
    state.loginError = ''
  },
  logout() {
    state.loggedIn = false
    state.loginPass = ''
    state.active = 1
    state.profileOpen = false
  },
  toggleShowPass() { state.showPass = !state.showPass },
  toggleProfile()  { state.profileOpen = !state.profileOpen },
  closeProfile()   { state.profileOpen = false },

  // --- Navegación ---
  goTo(id) {
    state.active = id
    state.drawerDocenteId = null
    state.profileOpen = false
  },
  goHome() { actions.goTo(1) },
  toggleModule(id) { state.openModules[id] = !state.openModules[id] },
  submitTopSearch() { state.active = 9 },

  // --- Cohorte ---
  saveCohorte(isValid) {
    state.s1Touched = true
    if (!isValid) return
    state.cohorte = { ...state.cohorteDraft, saved: true }
  },
  cancelCohorte() {
    state.cohorteDraft = { codigo: state.cohorte.codigo, anio: state.cohorte.anio }
    state.s1Touched = false
  },

  // --- Sedes ---
  selectDepartamento(dep) {
    const mun = Object.keys(GEO[dep])[0]
    state.sedeSel = { dep, mun, sede: GEO[dep][mun][0] }
  },
  selectMunicipio(mun) {
    state.sedeSel = { ...state.sedeSel, mun, sede: GEO[state.sedeSel.dep][mun][0] }
  },
  selectCentro(sede) { state.sedeSel = { ...state.sedeSel, sede } },
  addSede() {
    if (state.sedes.some(s => s.sede === state.sedeSel.sede)) return
    state.sedes.push({ id: `s${Date.now()}`, ...state.sedeSel })
  },
  askRemoveSede(id, name) { state.deleteModal = { open: true, sedeId: id, sedeName: name } },
  cancelRemoveSede()      { state.deleteModal = { open: false, sedeId: null, sedeName: '' } },
  confirmRemoveSede() {
    state.sedes = state.sedes.filter(s => s.id !== state.deleteModal.sedeId)
    state.enlaces = state.enlaces.filter(e => e.sedeId !== state.deleteModal.sedeId)
    actions.cancelRemoveSede()
  },

  // --- Enlaces ---
  asignarEnlace() {
    const form = state.enlaceForm
    if (!form.sedeId || !form.nombre.trim()) return
    state.enlaces = [...state.enlaces.filter(e => e.sedeId !== form.sedeId), { ...form }]
    state.enlaceForm = { ...form, nombre: '', cargo: '', contacto: '' }
  },

  // --- Cargas ---
  setUploaded(key, value) { state[key] = value },

  // --- Docentes ---
  getDocente,
  openFicha(id) {
    state.fichaId = id
    state.active = 12
  },
  openDrawer(id)  { state.drawerDocenteId = id },
  closeDrawer()   { state.drawerDocenteId = null },
  drawerToFicha() {
    const id = state.drawerDocenteId
    state.drawerDocenteId = null
    actions.openFicha(id)
  },
  setEstatus(id, estatus) { state.statusOverrides[id] = estatus },
  setNota(id, campo, valor) {
    const actual = state.notasOverrides[id] ?? {}
    state.notasOverrides[id] = { ...actual, [campo]: valor }
  },
  toggleMarcado(id) {
    state.s11Marcados = state.s11Marcados.includes(id)
      ? state.s11Marcados.filter(x => x !== id)
      : [...state.s11Marcados, id]
  },
  clearFiltrosDocentes() {
    state.s9Query = ''
    state.s9Sede = 'Todas'
    state.s9Estatus = 'Todos'
  },

  // --- Reportes ---
  toggleReportVar(v) {
    state.reportVars = state.reportVars.includes(v)
      ? state.reportVars.filter(x => x !== v)
      : [...state.reportVars, v]
  },
  clearReportVars()    { state.reportVars = [] },
  clearReportFiltros() { state.s13Dep = 'Todos'; state.s13Estatus = 'Todos' },
}

export function usePadep() {
  return {
    state,
    // getters
    currentModule,
    currentModuleIndex,
    crumbScreen,
    docentes,
    inscritos,
    enlacesCount,
    checklist,
    nextStepId,
    stats,
    // acciones
    ...actions,
  }
}

export { NAV, GEO, SEED }

```

---

## `src/utils/format.js`

```js
/** Utilidades de presentación compartidas por las pantallas. */

/** Clase CSS de la píldora según el tono semántico. */
export function pillClass(tone) {
  return ['pill', tone ? `pill--${tone}` : ''].filter(Boolean).join(' ')
}

/** Tono asociado al estatus de un docente. */
export function estatusTone(estatus) {
  if (estatus === 'Retirado') return 'danger'
  if (estatus === 'Graduado') return 'success'
  return 'teal'
}

/** Tono asociado al resultado de admisión. */
export function resultadoTone(resultado) {
  if (resultado === 'Aprobado') return 'success'
  if (resultado === 'No aprobado') return 'danger'
  return ''
}

/** Iniciales para el avatar (máx. 2 letras). */
export function iniciales(nombre = '') {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

/** Pluraliza sin repetir ternarios por toda la app. */
export function plural(n, singular, plural_) {
  return `${n} ${n === 1 ? singular : plural_}`
}

```

---

## `src/utils/report.js`

```js
import { REPORT_VARIABLES } from '@/data/catalog'

/**
 * Resolvedores de columna del constructor de reportes.
 * Cada clave corresponde a una variable seleccionable; recibe el docente ya
 * resuelto (con overrides) y el código de cohorte activo.
 */
export const COLUMN_RESOLVERS = {
  Cohorte:    (d, cohorte) => cohorte,
  Sede:       d => d.sede,
  Estatus:    d => d.estatus,
  Periodo:    () => '2026 - T1',
  Notas:      d => d.notas,
  Asistencia: d => d.asistencia,
  Actas:      d => (d.estatus === 'Graduado' ? 'Acta emitida' : '—'),
}

/** Construye las celdas de una fila para las columnas indicadas. */
export function buildRow(docente, columnas, cohorte) {
  return {
    id: docente.id,
    nombre: docente.nombre,
    cells: columnas.map(c => COLUMN_RESOLVERS[c]?.(docente, cohorte) ?? '—'),
  }
}

export { REPORT_VARIABLES }

```

---

## `src/utils/useEscape.js`

```js
import { onMounted, onBeforeUnmount } from 'vue'

/** Ejecuta `handler` cuando se presiona Escape mientras el componente está montado. */
export function useEscape(handler) {
  const onKey = e => { if (e.key === 'Escape') handler() }
  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}

```

---

## `src/components/LoginView.vue`

```vue
<script setup>
import { usePadep } from '@/stores/padep'

const { state, login, toggleShowPass } = usePadep()
</script>

<template>
  <div class="login">
    <!-- Panel de marca -->
    <section class="login__brand">
      <div class="login__blob login__blob--tr" aria-hidden="true" />
      <div class="login__blob login__blob--bl" aria-hidden="true" />

      <div class="login__logo">
        <div class="login__mark" aria-hidden="true">P</div>
        <div>
          <div class="login__wordmark">PADEP</div>
          <div class="login__tagline">Formación Docente</div>
        </div>
      </div>

      <h1 class="login__headline">Sistema de seguimiento<br>de cohortes de formación docente</h1>
      <div class="login__rule" aria-hidden="true" />
      <p class="login__blurb">
        Plataforma para el registro, seguimiento y análisis de cohortes de docentes
        en formación dentro del sistema educativo nacional.
      </p>
    </section>

    <!-- Formulario -->
    <section class="login__panel">
      <form class="login__card" @submit.prevent="login">
        <header class="login__head">
          <h2 class="login__title">Iniciar sesión</h2>
          <p class="login__hint">Ingresa tus credenciales institucionales</p>
        </header>

        <label class="field">
          <span class="field__label">Correo electrónico</span>
          <span class="login__input">
            <span class="login__icon" aria-hidden="true">✉</span>
            <input
              v-model="state.loginUser"
              type="email"
              autocomplete="username"
              placeholder="usuario@mineduc.edu.gt">
          </span>
        </label>

        <label class="field">
          <span class="field__label">Contraseña</span>
          <span class="login__input">
            <span class="login__icon" aria-hidden="true">🔒</span>
            <input
              v-model="state.loginPass"
              :type="state.showPass ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••">
            <button
              type="button"
              class="login__eye"
              :aria-label="state.showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="toggleShowPass">👁</button>
          </span>
        </label>

        <p v-if="state.loginError" class="login__error" role="alert">{{ state.loginError }}</p>

        <button type="submit" class="btn btn--brand login__submit"><span>→</span> Iniciar sesión</button>

        <p class="login__forgot"><a href="#">¿Olvidó su contraseña?</a></p>
        <p class="login__legal">Sistema de uso exclusivo para personal autorizado de MINEDUC</p>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login { min-height: 100vh; display: flex; font-family: var(--font); }
@media (max-width: 860px) { .login { flex-direction: column; } }

.login__brand {
  flex: 1; min-width: 0; position: relative; overflow: hidden; color: #fff;
  background: linear-gradient(160deg, var(--navy-deep) 0%, var(--navy-mid) 55%, #13314F 100%);
  display: flex; flex-direction: column; justify-content: center; padding: 56px 64px;
}
.login__blob { position: absolute; border-radius: 50%; }
.login__blob--tr { top: -80px; right: -60px; width: 280px; height: 280px; background: rgba(255,255,255,.05); }
.login__blob--bl { bottom: -100px; left: -60px; width: 260px; height: 260px; background: rgba(255,255,255,.04); }

.login__logo { display: flex; align-items: center; gap: 16px; margin-bottom: 44px; position: relative; }
.login__mark {
  width: 52px; height: 52px; border-radius: 12px; background: #fff; color: var(--navy-deep);
  display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800;
}
.login__wordmark { font-size: 22px; font-weight: 800; letter-spacing: -.01em; }
.login__tagline { font-size: 11.5px; color: #C7D2D8; letter-spacing: .03em; white-space: nowrap; }
.login__headline {
  font-size: 36px; font-weight: 800; letter-spacing: -.02em; line-height: 1.2;
  margin: 0 0 24px; position: relative;
}
.login__rule { width: 32px; height: 1px; background: rgba(255,255,255,.3); margin-bottom: 24px; }
.login__blurb { font-size: 13.5px; color: #B7C4CA; max-width: 420px; line-height: 1.6; margin: 0; position: relative; }

.login__panel { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 24px; }
.login__card { width: 100%; max-width: 380px; background: #fff; border-radius: var(--r-lg); box-shadow: 0 24px 60px rgba(0,0,0,.08); padding: 36px 32px; }
.login__head { text-align: center; margin-bottom: 22px; }
.login__title { font-size: 21px; font-weight: 800; color: var(--navy); letter-spacing: -.01em; margin: 0; }
.login__hint { font-size: 12.5px; color: var(--muted); margin: 8px 0 0; }

.login .field { margin-bottom: 14px; }
.login .field__label { font-size: 11px; letter-spacing: .03em; font-weight: 700; color: var(--text); margin-bottom: 7px; }
.login__input {
  display: flex; align-items: center; gap: 9px; border: 1px solid var(--border-2);
  border-radius: 10px; padding: 0 12px; background: var(--bg-soft);
}
.login__input:focus-within { border-color: var(--blue); }
.login__input input { flex: 1; min-width: 0; border: none; background: transparent; padding: 10px 0; font-size: 13.5px; font-family: inherit; outline: none; }
.login__icon { color: #8C9895; font-size: 14px; flex-shrink: 0; }
.login__eye { border: none; background: transparent; color: #8C9895; cursor: pointer; font-size: 13px; padding: 4px; }

.login__error { font-size: 12px; color: var(--danger); margin: 0 0 10px; }
.login__submit { width: 100%; margin-top: 10px; }
.login__forgot { text-align: center; margin: 16px 0 0; }
.login__forgot a { font-size: 12.5px; color: var(--teal); text-decoration: none; }
.login__legal {
  text-align: center; margin: 20px 0 0; padding-top: 16px;
  border-top: 1px solid #EEF1F0; font-size: 11px; color: #9AA6A3;
}
</style>

```

---

## `src/components/AppHeader.vue`

```vue
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

```

---

## `src/components/AppSidebar.vue`

```vue
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

```

---

## `src/components/ModuleStepper.vue`

```vue
<script setup>
import { MOD1_STEPS } from '@/data/catalog'

defineProps({
  /** Id de la pantalla activa; determina el paso actual. */
  activeId: { type: Number, required: true },
})

function stepState(id, activeId) {
  if (id === activeId) return 'is-current'
  return id < activeId ? 'is-done' : 'is-todo'
}
</script>

<template>
  <ol class="stepper" aria-label="Progreso de configuración">
    <li v-for="(step, i) in MOD1_STEPS" :key="step.id" class="stepper__item">
      <span class="stepper__dot" :class="stepState(step.id, activeId)">{{ step.id }}</span>
      <span class="stepper__label" :class="{ 'is-current': step.id === activeId }">{{ step.label }}</span>
      <span
        v-if="i !== MOD1_STEPS.length - 1"
        class="stepper__line"
        :class="{ 'is-done': step.id < activeId }"
        aria-hidden="true" />
    </li>
  </ol>
</template>

<style scoped>
.stepper { display: flex; align-items: center; gap: 4px; margin: 0 0 20px; padding: 0; max-width: 520px; list-style: none; }
.stepper__item { display: flex; align-items: center; gap: 4px; flex: 1; }
.stepper__item:last-child { flex: 0 0 auto; }
.stepper__dot {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.stepper__dot.is-current { background: var(--gold); color: #fff; }
.stepper__dot.is-done    { background: var(--teal); color: #fff; }
.stepper__dot.is-todo    { background: #fff; color: #9AA6A3; border: 1.5px solid var(--border-2); }
.stepper__label { font-size: 12.5px; font-weight: 500; color: #8C9895; white-space: nowrap; }
.stepper__label.is-current { font-weight: 700; color: var(--navy); }
.stepper__line { flex: 1; height: 2px; background: var(--border); margin: 0 4px; }
.stepper__line.is-done { background: var(--teal); }
</style>

```

---

## `src/components/CohorteContext.vue`

```vue
<script setup>
import { usePadep, NAV } from '@/stores/padep'

const { state, checklist, nextStepId, enlacesCount, goTo } = usePadep()

const siguiente = () => {
  if (nextStepId.value === null) return
  goTo(nextStepId.value)
}
const siguienteLabel = () =>
  nextStepId.value === null
    ? 'Módulo completo'
    : `Continuar: ${NAV[0].screens[nextStepId.value - 1].title}`
</script>

<template>
  <div class="stack">
    <section class="card card--flat ctx">
      <p class="ctx__eyebrow">Resumen de cohorte</p>
      <p class="ctx__codigo mono">{{ state.cohorte.codigo }}</p>
      <dl class="ctx__list">
        <dt>Año</dt><dd>{{ state.cohorte.anio }}</dd>
        <dt>Sedes</dt><dd>{{ state.sedes.length }}</dd>
        <dt>Enlaces asignados</dt><dd>{{ enlacesCount }}</dd>
      </dl>
    </section>

    <section class="card card--flat ctx">
      <p class="ctx__eyebrow ctx__eyebrow--muted">Progreso del módulo</p>
      <ul class="checklist">
        <li v-for="item in checklist" :key="item.label" class="checklist__item">
          <span class="checklist__dot" :class="{ 'is-done': item.done }">{{ item.done ? '✓' : '' }}</span>
          <span class="checklist__label" :class="{ 'is-done': item.done }">{{ item.label }}</span>
        </li>
      </ul>
    </section>

    <button v-if="nextStepId !== null" class="btn btn--primary ctx__next" @click="siguiente">
      {{ siguienteLabel() }} →
    </button>
  </div>
</template>

<style scoped>
.ctx { padding: 18px; }
.ctx:first-child { background: var(--blue-bg); border-color: var(--border-3); }
.ctx__eyebrow {
  margin: 0 0 10px; font-size: 11px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: #1E40AF;
}
.ctx__eyebrow--muted { color: var(--muted-2); margin-bottom: 14px; }
.ctx__codigo { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: var(--navy-ink); }
.ctx__list { display: grid; grid-template-columns: 1fr auto; row-gap: 8px; margin: 0; font-size: 13px; }
.ctx__list dt { color: var(--muted-2); }
.ctx__list dd { margin: 0; text-align: right; font-weight: 600; color: var(--ink); }

.checklist { list-style: none; margin: 0; padding: 0; }
.checklist__item { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.checklist__item:last-child { margin-bottom: 0; }
.checklist__dot {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1.5px solid var(--border-2); color: #fff; font-size: 10px;
}
.checklist__dot.is-done { background: var(--success); border: none; }
.checklist__label { font-size: 13px; color: #8C9895; }
.checklist__label.is-done { color: var(--text); font-weight: 600; }

.ctx__next { width: 100%; }
</style>

```

---

## `src/components/StatBar.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'

const { stats } = usePadep()

const items = computed(() => [
  { label: 'Candidatos', value: stats.value.candidatos, tone: 'blue' },
  { label: 'Evaluados',  value: stats.value.evaluados,  tone: 'blue' },
  { label: 'Aprobados',  value: stats.value.aprobados,  tone: 'green' },
  { label: 'Inscritos',  value: stats.value.inscritos,  tone: 'gold' },
])
</script>

<template>
  <div class="stats">
    <div v-for="s in items" :key="s.label" class="stat" :class="`stat--${s.tone}`">
      <span class="stat__label">{{ s.label }}</span>
      <span class="stat__value">{{ s.value }}</span>
    </div>
  </div>
</template>

<style scoped>
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat {
  display: flex; flex-direction: column; gap: 4px; padding: 14px 18px;
  background: #fff; border: 1px solid var(--border-3); border-radius: var(--r-md);
  box-shadow: 0 1px 2px rgba(16,24,40,.05); border-top: 3px solid var(--blue);
}
.stat--green { border-top-color: #16A34A; }
.stat--gold  { border-top-color: #D97706; }
.stat__label { font-size: 11px; color: var(--muted-2); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.stat__value { font-size: 26px; font-weight: 700; color: var(--ink); letter-spacing: -.02em; line-height: 1.1; }
</style>

```

---

## `src/components/FileDropzone.vue`

```vue
<script setup>
defineProps({
  title: { type: String, default: 'Arrastre y suelte su archivo aquí' },
  hint: { type: String, default: 'Formatos aceptados: PDF o Excel · Tamaño hasta 100 MB' },
  /** 'blue' = estilo destacado; 'plain' = variante discreta. */
  variant: { type: String, default: 'blue' },
})
const emit = defineEmits(['select'])
</script>

<template>
  <div class="dropzone" :class="`dropzone--${variant}`" @dragover.prevent @drop.prevent="emit('select')">
    <div v-if="variant === 'blue'" class="dropzone__icon" aria-hidden="true">⬆</div>
    <p class="dropzone__title">{{ title }}</p>
    <div v-if="variant === 'blue'" class="dropzone__or" aria-hidden="true"><span /> o <span /></div>
    <p v-else class="dropzone__hint">{{ hint }}</p>
    <button class="btn" :class="variant === 'blue' ? 'btn--primary' : 'btn--outline'" @click="emit('select')">
      Seleccionar archivo
    </button>
    <p v-if="variant === 'blue'" class="dropzone__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.dropzone {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  text-align: center; border-radius: var(--r-md);
}
.dropzone--blue { max-width: 520px; border: 1.5px dashed #3B82F6; background: #F9FBFE; padding: 36px 26px; }
.dropzone--plain { max-width: 420px; border: 1.5px dashed #C7D0CD; padding: 26px; gap: 8px; border-radius: 10px; }
.dropzone__icon {
  width: 44px; height: 44px; border-radius: 10px; background: var(--blue-bg);
  display: flex; align-items: center; justify-content: center; color: var(--blue); font-size: 22px;
}
.dropzone__title { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.dropzone--plain .dropzone__title { font-size: 13.5px; }
.dropzone__or { display: flex; align-items: center; gap: 10px; width: 180px; color: #9CA3AF; font-size: 12px; }
.dropzone__or span { flex: 1; height: 1px; background: var(--border-3); }
.dropzone__hint { margin: 0; font-size: 11px; color: var(--muted-2); }
.dropzone--plain .dropzone__hint { font-size: 12px; color: var(--muted); }
</style>

```

---

## `src/components/FilePreview.vue`

```vue
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

```

---

## `src/components/ConfirmDialog.vue`

```vue
<script setup>
import { usePadep } from '@/stores/padep'
import { useEscape } from '@/utils/useEscape'

const { state, cancelRemoveSede, confirmRemoveSede } = usePadep()

useEscape(() => { if (state.deleteModal.open) cancelRemoveSede() })
</script>

<template>
  <div
    v-if="state.deleteModal.open"
    class="overlay"
    @click.self="cancelRemoveSede">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <h2 id="confirm-title" class="dialog__title">Quitar sede de la cohorte</h2>
      <p class="dialog__body">
        ¿Seguro que deseas quitar <strong>{{ state.deleteModal.sedeName }}</strong>?
        Esta acción no elimina al docente, solo su sede en esta cohorte.
      </p>
      <div class="dialog__actions">
        <button class="btn btn--outline" @click="cancelRemoveSede">Cancelar</button>
        <button class="btn btn--danger" @click="confirmRemoveSede">Quitar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 50; background: rgba(11,20,35,.45);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.dialog { background: #fff; border-radius: var(--r-lg); box-shadow: 0 24px 60px rgba(0,0,0,.25); padding: 26px; width: 100%; max-width: 360px; }
.dialog__title { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: var(--navy); }
.dialog__body { margin: 0 0 20px; font-size: 13px; color: var(--muted); line-height: 1.5; }
.dialog__actions { display: flex; gap: 8px; justify-content: flex-end; }
.dialog__actions .btn { height: 38px; border-radius: 10px; font-size: 13px; }
</style>

```

---

## `src/components/DocenteDrawer.vue`

```vue
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

```

---

## `src/screens/S01AltaCohorte.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'

const { state, saveCohorte, cancelCohorte } = usePadep()

const codigoValido = computed(() => /^[A-Za-z0-9-]{4,}$/.test(state.cohorteDraft.codigo || ''))
const anioValido   = computed(() => /^20\d{2}$/.test(state.cohorteDraft.anio || ''))

const errCodigo = computed(() =>
  state.s1Touched && !codigoValido.value ? 'Usa el formato COH-AAAA-NN (mínimo 4 caracteres).' : '')
const errAnio = computed(() =>
  state.s1Touched && !anioValido.value ? 'Ingresa un año válido (ej. 2026).' : '')

const guardado = computed(() =>
  state.cohorte.saved &&
  state.cohorteDraft.codigo === state.cohorte.codigo &&
  state.cohorteDraft.anio === state.cohorte.anio)

const guardar = () => saveCohorte(codigoValido.value && anioValido.value)
</script>

<template>
  <div>
    <ModuleStepper :active-id="1" />

    <p class="eyebrow eyebrow--plain">Configuración de Cohorte</p>
    <h1 class="page-title">Alta de Cohorte</h1>
    <p class="page-sub">Crear una nueva cohorte con sus datos básicos.</p>

    <div class="grid-main">
      <form class="card card--flat form" @submit.prevent="guardar">
        <h2 class="form__legend">Datos de la cohorte</h2>

        <label class="field">
          <span class="field__label">Número / código de cohorte</span>
          <input
            v-model="state.cohorteDraft.codigo"
            class="input mono"
            :class="{ 'input--error': errCodigo }"
            :aria-invalid="!!errCodigo"
            placeholder="COH-2026-01">
          <span v-if="errCodigo" class="field__error" role="alert">{{ errCodigo }}</span>
        </label>

        <label class="field field--last">
          <span class="field__label">Año o período</span>
          <input
            v-model="state.cohorteDraft.anio"
            class="input"
            :class="{ 'input--error': errAnio }"
            :aria-invalid="!!errAnio"
            placeholder="2026">
          <span v-if="errAnio" class="field__error" role="alert">{{ errAnio }}</span>
        </label>

        <footer class="form__actions">
          <button type="submit" class="btn btn--primary">Guardar</button>
          <button type="button" class="btn btn--ghost" @click="cancelCohorte">Cancelar</button>
          <span v-if="guardado" class="form__saved">✓ Cohorte {{ state.cohorte.codigo }} guardada</span>
        </footer>
      </form>

      <CohorteContext />
    </div>
  </div>
</template>

<style scoped>
.form { padding: 24px; }
.form__legend {
  margin: 0 0 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-3);
  font-size: 15px; font-weight: 600; color: var(--ink);
}
.field--last { margin-bottom: 24px; }
.form__actions { display: flex; align-items: center; gap: 12px; padding-top: 20px; border-top: 1px solid var(--border-3); }
.form__saved { font-size: 12px; color: #166534; font-weight: 600; margin-left: auto; }
</style>

```

---

## `src/screens/S02Sedes.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep, GEO } from '@/stores/padep'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'

const { state, selectDepartamento, selectMunicipio, selectCentro, addSede, askRemoveSede } = usePadep()

const departamentos = Object.keys(GEO)
const municipios = computed(() => Object.keys(GEO[state.sedeSel.dep]))
const centros = computed(() => GEO[state.sedeSel.dep][state.sedeSel.mun] ?? [])
</script>

<template>
  <div>
    <ModuleStepper :active-id="2" />

    <p class="eyebrow">Configuración de Cohorte</p>
    <h1 class="page-title">Sedes y Centros Educativos</h1>
    <p class="page-sub">Seleccionar los departamentos, municipios y centros educativos de la cohorte.</p>

    <div class="grid-main">
      <div>
        <section class="card picker">
          <div class="grid-auto">
            <label class="field field--tight">
              <span class="picker__label">Departamento</span>
              <select
                class="select"
                :value="state.sedeSel.dep"
                @change="selectDepartamento($event.target.value)">
                <option v-for="d in departamentos" :key="d" :value="d">{{ d }}</option>
              </select>
            </label>

            <label class="field field--tight">
              <span class="picker__label">Municipio</span>
              <select
                class="select"
                :value="state.sedeSel.mun"
                @change="selectMunicipio($event.target.value)">
                <option v-for="m in municipios" :key="m" :value="m">{{ m }}</option>
              </select>
            </label>

            <label class="field field--tight">
              <span class="picker__label">Sede / centro educativo</span>
              <select
                class="select"
                :value="state.sedeSel.sede"
                @change="selectCentro($event.target.value)">
                <option v-for="c in centros" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
          </div>

          <button class="btn btn--outline" @click="addSede">+ Agregar sede</button>
        </section>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Municipio</th>
                <th>Sede</th>
                <th><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="state.sedes.length === 0">
                <td colspan="4" class="empty">
                  <div class="empty-state__icon" aria-hidden="true">📍</div>
                  <p class="empty-state__title">Aún no hay sedes agregadas</p>
                  <p class="empty-state__hint">Usa el formulario de arriba para agregar la primera sede de esta cohorte.</p>
                </td>
              </tr>
              <tr v-for="row in state.sedes" :key="row.id">
                <td>{{ row.departamento }}</td>
                <td>{{ row.municipio }}</td>
                <td class="is-strong">{{ row.sede }}</td>
                <td class="is-right">
                  <button class="btn-link btn-link--danger" @click="askRemoveSede(row.id, row.sede)">Quitar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="btn-row save-row">
          <button class="btn btn--brand">Guardar</button>
        </div>
      </div>

      <CohorteContext />
    </div>
  </div>
</template>

<style scoped>
.picker { padding: 22px; margin-bottom: 22px; }
.picker .grid-auto { margin-bottom: 16px; }
.picker__label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.field--tight { margin-bottom: 0; }
.picker .select { border-radius: 10px; padding: 9px 11px; font-size: 13.5px; }
.save-row { margin-top: 16px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>

```

---

## `src/screens/S03Enlaces.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'

const { state, asignarEnlace } = usePadep()

/** Cada sede con su enlace asignado (o marcador de pendiente). */
const filas = computed(() => state.sedes.map(sede => {
  const enlace = state.enlaces.find(e => e.sedeId === sede.id)
  return {
    id: sede.id,
    sedeName: sede.sede,
    nombre: enlace?.nombre ?? 'Sin asignar',
    asignado: !!enlace,
    cargo: enlace?.cargo || '—',
    contacto: enlace?.contacto || '—',
  }
}))
</script>

<template>
  <div>
    <ModuleStepper :active-id="3" />

    <p class="eyebrow">Configuración de Cohorte</p>
    <h1 class="page-title">Asignación de Enlaces DIDEDUC</h1>
    <p class="page-sub">Asignar el profesional enlace responsable de cada sede de la cohorte.</p>

    <div class="grid-main">
      <div>
        <template v-if="state.sedes.length > 0">
          <form class="card asignar" @submit.prevent="asignarEnlace">
            <label class="field field--tight">
              <span class="asignar__label">Sede</span>
              <select v-model="state.enlaceForm.sedeId" class="select">
                <option v-for="s in state.sedes" :key="s.id" :value="s.id">{{ s.sede }}</option>
              </select>
            </label>
            <label class="field field--tight">
              <span class="asignar__label">Nombre del enlace</span>
              <input v-model="state.enlaceForm.nombre" class="input" placeholder="Nombre completo">
            </label>
            <label class="field field--tight">
              <span class="asignar__label">Cargo</span>
              <input v-model="state.enlaceForm.cargo" class="input" placeholder="Ej. Supervisor educativo">
            </label>
            <label class="field field--tight">
              <span class="asignar__label">Contacto</span>
              <input v-model="state.enlaceForm.contacto" class="input" placeholder="Teléfono o correo">
            </label>
          </form>

          <div class="btn-row asignar__actions">
            <button class="btn btn--brand" @click="asignarEnlace">Asignar</button>
            <button class="btn btn--outline">Registrar enlace nuevo</button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Sede</th><th>Enlace</th><th>Cargo</th><th>Contacto</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in filas" :key="row.id">
                  <td class="is-strong">{{ row.sedeName }}</td>
                  <td :class="{ 'is-pending': !row.asignado }">{{ row.nombre }}</td>
                  <td>{{ row.cargo }}</td>
                  <td>{{ row.contacto }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="btn-row save-row"><button class="btn btn--brand">Guardar</button></div>
        </template>

        <div v-else class="card empty-state">
          <div class="empty-state__icon" aria-hidden="true">👤</div>
          <p class="empty-state__title">Sin sedes disponibles</p>
          <p class="empty-state__hint">Primero agrega sedes en la pantalla anterior para poder asignarles un enlace.</p>
        </div>
      </div>

      <CohorteContext />
    </div>
  </div>
</template>

<style scoped>
.asignar {
  padding: 22px; margin-bottom: 18px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; align-items: end;
}
.asignar__label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.asignar .input, .asignar .select { border-radius: 10px; padding: 9px 11px; font-size: 13.5px; }
.field--tight { margin-bottom: 0; }
.asignar__actions { margin-bottom: 22px; }
.save-row { margin-top: 16px; }
.is-pending { color: var(--warning); }
</style>

```

---

## `src/screens/S05CargaCandidatos.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import StatBar from '@/components/StatBar.vue'
import FileDropzone from '@/components/FileDropzone.vue'
import FilePreview from '@/components/FilePreview.vue'
import { pillClass, plural } from '@/utils/format'

const { state, setUploaded, goTo } = usePadep()

const incompletos = computed(() => SEED.filter(d => d.incompleto).length)
const aviso = computed(() =>
  `${plural(incompletos.value, 'registro', 'registros')} con datos incompletos — revísalos antes de confirmar.`)
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Registro Inicial (Docente)</p>
    <h1 class="page-title">Carga Inicial de Candidatos</h1>
    <p class="page-sub">Importar el listado inicial de docentes candidatos a partir de un archivo.</p>

    <StatBar />

    <FileDropzone v-if="!state.s5Uploaded" @select="setUploaded('s5Uploaded', true)" />

    <template v-else>
      <FilePreview filename="candidatos_preinscritos.xlsx" />

      <p v-if="incompletos" class="notice notice--warn">⚠ {{ aviso }}</p>

      <div class="table-wrap table-wrap--scroll">
        <table class="table table--wide">
          <thead>
            <tr>
              <th>Nombre</th><th>Idioma</th><th>Etnia</th><th>Sede</th>
              <th>Escalafón</th><th>DPI</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in SEED" :key="c.id">
              <td class="is-strong">{{ c.nombre }}</td>
              <td>{{ c.idioma }}</td>
              <td>{{ c.etnia }}</td>
              <td>{{ c.sede }}</td>
              <td>{{ c.escalafon }}</td>
              <td class="mono">{{ c.dpi }}</td>
              <td>
                <span :class="pillClass(c.incompleto ? 'clay' : 'success')">
                  {{ c.incompleto ? 'Incompleto' : 'Completo' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <label class="field cohorte-field">
        <span class="field__label">Cohorte</span>
        <select class="select"><option>{{ state.cohorte.codigo }} (preseleccionada)</option></select>
      </label>

      <div class="btn-row">
        <button class="btn btn--primary" @click="goTo(8)">Confirmar carga</button>
        <button class="btn btn--ghost" @click="setUploaded('s5Uploaded', false)">Subir otro archivo</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.table--wide { min-width: 960px; }
.table-wrap { margin-bottom: 20px; }
.cohorte-field { max-width: 320px; margin-bottom: 20px; }
</style>

```

---

## `src/screens/S07ResultadosAdmision.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import StatBar from '@/components/StatBar.vue'
import FileDropzone from '@/components/FileDropzone.vue'
import FilePreview from '@/components/FilePreview.vue'
import { pillClass, resultadoTone, plural } from '@/utils/format'

const { state, setUploaded } = usePadep()

const sinDatos = computed(() => SEED.filter(d => d.resultado === '-').length)
const aviso = computed(() =>
  `${plural(sinDatos.value, 'docente no reconocido', 'docentes no reconocidos')} en el archivo cargado.`)
</script>

<template>
  <div>
    <p class="eyebrow">Registro Inicial (Docente)</p>
    <h1 class="page-title">Carga de Resultados de Admisión</h1>
    <p class="page-sub">Importar el archivo con los resultados de la prueba de admisión.</p>

    <StatBar />

    <FileDropzone
      v-if="!state.s7Uploaded"
      variant="plain"
      title="Resultados de admisión"
      hint="Formato aceptado: PDF o Excel"
      @select="setUploaded('s7Uploaded', true)" />

    <template v-else>
      <FilePreview filename="resultados_admision.pdf" accent="#B3261E" badge="" />

      <p v-if="sinDatos" class="notice notice--clay">{{ aviso }}</p>

      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Docente</th><th>Sede</th><th>Resultado</th></tr></thead>
          <tbody>
            <tr v-for="c in SEED" :key="c.id">
              <td class="is-strong">{{ c.nombre }}</td>
              <td>{{ c.sede }}</td>
              <td>
                <span :class="pillClass(resultadoTone(c.resultado))">
                  {{ c.resultado === '-' ? 'Sin datos' : c.resultado }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="btn btn--brand">Confirmar carga</button>
        <button class="btn btn--outline" @click="setUploaded('s7Uploaded', false)">Subir otro archivo</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.table-wrap { margin-bottom: 16px; }
</style>

```

---

## `src/screens/S08ListadoInscritos.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import { pillClass, resultadoTone } from '@/utils/format'

const { state, inscritos } = usePadep()

const filas = computed(() => state.s8Tab === 'preliminar' ? SEED : inscritos.value)
</script>

<template>
  <div>
    <p class="eyebrow">Registro Inicial (Docente)</p>
    <h1 class="page-title">Listado de Docentes Inscritos</h1>
    <p class="page-sub">Listado preliminar de preinscritos y listado final/oficial de inscritos confirmados.</p>

    <div class="segmented" role="tablist">
      <button
        class="segmented__tab" :class="{ 'is-active': state.s8Tab === 'preliminar' }"
        role="tab" :aria-selected="state.s8Tab === 'preliminar'"
        @click="state.s8Tab = 'preliminar'">
        Preliminar ({{ SEED.length }})
      </button>
      <button
        class="segmented__tab" :class="{ 'is-active': state.s8Tab === 'final' }"
        role="tab" :aria-selected="state.s8Tab === 'final'"
        @click="state.s8Tab = 'final'">
        Final ({{ inscritos.length }})
      </button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Docente</th><th>Sede</th><th>Resultado</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="c in filas" :key="c.id">
            <td class="is-strong">{{ c.nombre }}</td>
            <td>{{ c.sede }}</td>
            <td>
              <span :class="pillClass(resultadoTone(c.resultado))">
                {{ c.resultado === '-' ? '—' : c.resultado }}
              </span>
            </td>
            <td>
              <span :class="pillClass(c.inscripcionFinal ? 'teal' : '')">
                {{ c.inscripcionFinal ? 'Inscrito' : 'Preinscrito' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="btn btn--brand">Confirmar inscripción final</button>
      <button class="btn btn--outline">Exportar listado</button>
    </div>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex; gap: 2px; padding: 4px; border-radius: 9px;
  background: var(--teal-bg); margin-bottom: 18px;
}
.segmented__tab {
  padding: 7px 16px; border-radius: 7px; border: none; cursor: pointer;
  font-family: inherit; font-size: 13.5px; font-weight: 600;
  background: transparent; color: var(--teal);
}
.segmented__tab.is-active { background: #fff; color: var(--navy); }
.table-wrap { margin-bottom: 18px; }
</style>

```

---

## `src/screens/S09BusquedaDocentes.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import { pillClass, estatusTone, plural } from '@/utils/format'

const { state, docentes, openDrawer, openFicha, clearFiltrosDocentes } = usePadep()

const sedeOptions = ['Todas', ...new Set(SEED.map(d => d.sede))]
const estatusOptions = ['Todos', ...new Set(SEED.map(d => d.estatus))]

const filtrados = computed(() => docentes.value.filter(d =>
  d.nombre.toLowerCase().includes(state.s9Query.toLowerCase()) &&
  (state.s9Sede === 'Todas' || d.sede === state.s9Sede) &&
  (state.s9Estatus === 'Todos' || d.estatus === state.s9Estatus)
))

const hayFiltros = computed(() =>
  !!state.s9Query || state.s9Sede !== 'Todas' || state.s9Estatus !== 'Todos')
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Registro Inicial (Docente)</p>
    <h1 class="page-title">Búsqueda y Consulta de Docentes</h1>
    <p class="page-sub">Buscar y filtrar docentes registrados.</p>

    <section class="card card--flat filtros">
      <header class="filtros__head">
        <span aria-hidden="true">⛃</span>
        <h2 class="filtros__title">Filtrar información</h2>
        <span class="count-badge">{{ plural(filtrados.length, 'docente', 'docentes') }}</span>
      </header>

      <div class="filtros__grid">
        <label class="field field--tight">
          <span class="field__label">Nombre</span>
          <input v-model="state.s9Query" class="input" type="search" placeholder="Buscar por nombre...">
        </label>
        <label class="field field--tight">
          <span class="field__label">Sede</span>
          <select v-model="state.s9Sede" class="select">
            <option v-for="o in sedeOptions" :key="o" :value="o">{{ o }}</option>
          </select>
        </label>
        <label class="field field--tight">
          <span class="field__label">Estatus</span>
          <select v-model="state.s9Estatus" class="select">
            <option v-for="o in estatusOptions" :key="o" :value="o">{{ o }}</option>
          </select>
        </label>
      </div>

      <footer v-if="hayFiltros" class="filtros__foot">
        <button class="btn btn--ghost btn--sm" @click="clearFiltrosDocentes">Limpiar filtros</button>
      </footer>
    </section>

    <div class="table-wrap card--flat">
      <table class="table">
        <thead>
          <tr>
            <th>Docente</th><th>Sede</th><th>Cohorte</th><th>Estatus</th>
            <th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtrados.length === 0">
            <td colspan="5" class="empty">Sin resultados para esta búsqueda.</td>
          </tr>
          <tr v-for="d in filtrados" :key="d.id" class="is-clickable" @click="openDrawer(d.id)">
            <td>
              <div class="cell-name">{{ d.nombre }}</div>
              <div class="cell-dpi mono">{{ d.dpi }}</div>
            </td>
            <td>{{ d.sede }}</td>
            <td class="mono">{{ state.cohorte.codigo }}</td>
            <td><span :class="pillClass(estatusTone(d.estatus))">{{ d.estatus }}</span></td>
            <td class="is-right">
              <button class="btn-link" @click.stop="openFicha(d.id)">Ver ficha →</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.filtros { padding: 18px; margin-bottom: 20px; }
.filtros__head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; color: var(--muted-2); }
.filtros__title { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.filtros__grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
@media (max-width: 720px) { .filtros__grid { grid-template-columns: 1fr; } }
.field--tight { margin-bottom: 0; }
.filtros__foot { display: flex; justify-content: flex-end; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-3); }
.btn--sm { height: 36px; padding: 0 12px; font-size: 13px; }

.is-clickable { cursor: pointer; }
.cell-name { font-size: 13px; font-weight: 600; color: var(--ink); }
.cell-dpi { font-size: 11px; color: var(--muted-2); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>

```

---

## `src/screens/S10NotasAsistencia.vue`

```vue
<script setup>
import { usePadep } from '@/stores/padep'
import FileDropzone from '@/components/FileDropzone.vue'
import FilePreview from '@/components/FilePreview.vue'

const { state, inscritos, setUploaded, goTo } = usePadep()
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Carga de Notas y Asistencia</h1>
    <p class="page-sub">Importar el archivo de notas y asistencia por docente, curso/módulo y periodo.</p>

    <label class="field cohorte-field">
      <span class="field__label">Cohorte</span>
      <select class="select"><option>{{ state.cohorte.codigo }} (preseleccionada)</option></select>
    </label>

    <FileDropzone v-if="!state.s10Uploaded" @select="setUploaded('s10Uploaded', true)" />

    <template v-else>
      <FilePreview filename="notas_asistencia.xlsx" />

      <div class="table-wrap table-wrap--scroll">
        <table class="table">
          <thead>
            <tr><th>Docente</th><th>Sede</th><th class="col-num">Nota</th><th class="col-num">Asistencia</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in inscritos" :key="d.id">
              <td class="is-strong">{{ d.nombre }}</td>
              <td>{{ d.sede }}</td>
              <td>{{ d.notas }}</td>
              <td>{{ d.asistencia }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="btn btn--primary" @click="goTo(12)">Confirmar carga</button>
        <button class="btn btn--ghost" @click="setUploaded('s10Uploaded', false)">Subir otro archivo</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cohorte-field { max-width: 320px; margin-bottom: 24px; }
.table-wrap { margin-bottom: 20px; }
.col-num { width: 110px; }
</style>

```

---

## `src/screens/S11ComparacionNominas.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import FileDropzone from '@/components/FileDropzone.vue'
import FilePreview from '@/components/FilePreview.vue'
import { pillClass } from '@/utils/format'

const { state, inscritos, setUploaded, toggleMarcado } = usePadep()

/**
 * El prototipo marca como ausente al tercer inscrito para demostrar la
 * detección de retiros. Sustituir por el diff real contra la nómina cargada.
 */
const AUSENTE_INDEX = 2

const filas = computed(() => inscritos.value.map((d, i) => ({
  id: d.id,
  nombre: d.nombre,
  ausente: i === AUSENTE_INDEX,
  marcado: state.s11Marcados.includes(d.id),
})))
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Comparación de Nóminas</h1>
    <p class="page-sub">
      Importar la nómina reportada para compararla contra la nómina vigente y detectar posibles retiros.
    </p>

    <FileDropzone
      v-if="!state.s11Uploaded"
      title="Arrastre y suelte la nómina reportada aquí"
      @select="setUploaded('s11Uploaded', true)" />

    <template v-else>
      <FilePreview filename="nomina_reportada.xlsx" />

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Docente</th><th>Nómina vigente</th><th>Nómina reportada</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filas" :key="r.id" :class="{ 'is-flagged': r.ausente }">
              <td class="is-strong">{{ r.nombre }}</td>
              <td><span :class="pillClass('success')">Presente</span></td>
              <td><span :class="pillClass(r.ausente ? 'danger' : 'success')">{{ r.ausente ? 'Ausente' : 'Presente' }}</span></td>
              <td class="is-right">
                <button v-if="r.ausente" class="btn-link" @click="toggleMarcado(r.id)">
                  {{ r.marcado ? 'Marcado para revisión ✓' : 'Marcar para revisión' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="btn btn--ghost btn--bordered" @click="setUploaded('s11Uploaded', false)">Subir otra nómina</button>
        <span class="hint">Las filas resaltadas indican docentes ausentes en la nómina reportada frente a la vigente.</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.table-wrap { margin-bottom: 16px; }
.btn--bordered { background: #fff; border: 1px solid #D1D5DB; }
.hint { font-size: 12.5px; color: var(--muted-2); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>

```

---

## `src/screens/S12FichaAcademica.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import { iniciales, pillClass, estatusTone } from '@/utils/format'

const { state, getDocente, setEstatus } = usePadep()

const docente = computed(() => getDocente(state.fichaId))

/** Línea de tiempo derivada del avance real del expediente. */
const timeline = computed(() => {
  const d = docente.value
  const final = d.estatus === 'Retirado' ? 'Retirado'
    : d.estatus === 'Graduado' ? 'Graduado'
    : 'En seguimiento'
  return [
    { label: 'Preinscrito', done: true },
    { label: 'Evaluación aprobada', done: d.resultado === 'Aprobado' },
    { label: 'Inscripción final', done: d.inscripcionFinal },
    { label: final, done: true },
  ]
})
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Ficha Académica del Docente</h1>
    <p class="page-sub">Ver y actualizar el estatus del docente durante la cohorte.</p>

    <header class="ficha-head">
      <span class="ficha-head__avatar">{{ iniciales(docente.nombre) }}</span>
      <div class="ficha-head__meta">
        <p class="ficha-head__name">{{ docente.nombre }}</p>
        <p class="ficha-head__id mono">{{ docente.id }} · {{ docente.sede }}</p>
      </div>
      <span :class="pillClass(estatusTone(docente.estatus))">{{ docente.estatus }}</span>
    </header>

    <div class="tabs" role="tablist">
      <button
        class="tabs__tab" :class="{ 'is-active': state.s12Tab === 'resumen' }"
        role="tab" :aria-selected="state.s12Tab === 'resumen'"
        @click="state.s12Tab = 'resumen'">Resumen</button>
      <button
        class="tabs__tab" :class="{ 'is-active': state.s12Tab === 'estatus' }"
        role="tab" :aria-selected="state.s12Tab === 'estatus'"
        @click="state.s12Tab = 'estatus'">Actualizar estatus</button>
    </div>

    <div class="ficha-grid">
      <div>
        <!-- Pestaña: resumen -->
        <section v-if="state.s12Tab === 'resumen'" class="card card--flat">
          <h2 class="card__head">Datos del expediente</h2>
          <dl class="expediente">
            <div><dt>Sede</dt><dd>{{ docente.sede }}</dd></div>
            <div><dt>Departamento</dt><dd>{{ docente.departamento }}</dd></div>
            <div><dt>Escalafón</dt><dd>{{ docente.escalafon }}</dd></div>
            <div><dt>Nota actual</dt><dd>{{ docente.notas }}</dd></div>
            <div><dt>Asistencia</dt><dd>{{ docente.asistencia }}</dd></div>
          </dl>
        </section>

        <!-- Pestaña: actualizar estatus -->
        <section v-else class="card card--flat">
          <h2 class="card__head">Actualizar estatus</h2>
          <div class="card__body">
            <label class="field estatus-field">
              <span class="field__label">Estatus</span>
              <select
                class="select"
                :value="docente.estatus"
                @change="setEstatus(docente.id, $event.target.value)">
                <option>Activo</option><option>Retirado</option><option>Graduado</option>
              </select>
            </label>

            <div v-if="docente.estatus === 'Retirado'" class="sub-grid sub-grid--3">
              <label class="field field--tight">
                <span class="field__label">Motivo (opcional)</span>
                <input class="input" placeholder="Motivo del retiro">
              </label>
              <label class="field field--tight">
                <span class="field__label">Fecha (opcional)</span>
                <input class="input" type="date">
              </label>
              <label class="field field--tight">
                <span class="field__label">Ref. carta convenio</span>
                <input class="input" placeholder="N.° de referencia">
              </label>
            </div>

            <div v-else-if="docente.estatus === 'Graduado'" class="sub-grid sub-grid--2">
              <label class="field field--tight">
                <span class="field__label">Número de acta</span>
                <input class="input" placeholder="Acta N.°">
              </label>
              <label class="field field--tight">
                <span class="field__label">Fecha</span>
                <input class="input" type="date">
              </label>
              <label class="field field--tight">
                <span class="field__label">Cohorte</span>
                <input class="input" :value="state.cohorte.codigo" readonly>
              </label>
              <label class="field field--tight">
                <span class="field__label">Título obtenido</span>
                <input class="input" placeholder="Ej. Profesorado de Enseñanza Media">
              </label>
            </div>

            <button class="btn btn--primary estatus-submit">Actualizar estatus</button>
          </div>
        </section>
      </div>

      <!-- Historial -->
      <aside class="card card--flat historial">
        <p class="historial__title">Historial de estatus</p>
        <ol class="historial__list">
          <li v-for="t in timeline" :key="t.label" class="historial__item">
            <span class="historial__dot" :class="{ 'is-done': t.done }" aria-hidden="true" />
            <span class="historial__label" :class="{ 'is-done': t.done }">{{ t.label }}</span>
          </li>
        </ol>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.ficha-head {
  display: flex; align-items: center; gap: 16px; margin-bottom: 22px;
  background: var(--blue-bg); border: 1px solid var(--blue-br); border-radius: var(--r-md); padding: 18px 20px;
}
.ficha-head__avatar {
  width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
  background: #fff; border: 1px solid var(--blue-br); color: var(--blue);
  display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700;
}
.ficha-head__meta { flex: 1; min-width: 0; }
.ficha-head__name { margin: 0; font-size: 17px; font-weight: 700; color: var(--ink); line-height: 1.2; }
.ficha-head__id { margin: 2px 0 0; font-size: 12px; color: var(--muted-2); }

.tabs { display: flex; border-bottom: 1px solid var(--border-3); margin-bottom: 22px; }
.tabs__tab {
  padding: 10px 4px; margin-right: 20px; border: none; background: none; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 600; color: var(--muted-2);
  border-bottom: 2px solid transparent;
}
.tabs__tab.is-active { color: var(--ink); border-bottom-color: var(--blue); }

.ficha-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 22px; align-items: start; }
@media (max-width: 900px) { .ficha-grid { grid-template-columns: 1fr; } }

.expediente {
  margin: 0; padding: 20px; display: grid; grid-template-columns: 1fr 1fr;
  row-gap: 16px; column-gap: 20px; font-size: 13px;
}
.expediente dt { font-size: 11px; color: var(--muted-2); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; margin-bottom: 4px; }
.expediente dd { margin: 0; color: var(--ink); }

.estatus-field { max-width: 260px; }
.sub-grid { display: grid; gap: 14px; }
.sub-grid--3 { grid-template-columns: repeat(3, 1fr); }
.sub-grid--2 { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 720px) { .sub-grid { grid-template-columns: 1fr; } }
.field--tight { margin-bottom: 0; }
.estatus-submit { margin-top: 18px; }

.historial { padding: 20px; }
.historial__title {
  margin: 0 0 16px; font-size: 11px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: var(--muted-2);
}
.historial__list { list-style: none; margin: 0; padding: 0 0 0 6px; position: relative; }
.historial__list::before {
  content: ''; position: absolute; left: 13px; top: 6px; bottom: 12px;
  width: 2px; background: var(--border-3);
}
.historial__item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; position: relative; }
.historial__dot {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 2px;
  background: #fff; border: 2px solid var(--border-2);
}
.historial__dot.is-done { background: var(--success); border: none; }
.historial__label { font-size: 13px; line-height: 1.4; color: var(--muted); }
.historial__label.is-done { color: var(--text); font-weight: 600; }
</style>

```

---

## `src/screens/S13ConstructorReportes.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import { REPORT_VARIABLES, buildRow } from '@/utils/report'
import { plural } from '@/utils/format'

const { state, docentes, toggleReportVar, clearReportVars, clearReportFiltros, goTo } = usePadep()

const depOptions = ['Todos', ...new Set(SEED.map(d => d.departamento))]
const estatusOptions = ['Todos', 'Activo', 'Retirado', 'Graduado']

const filtrados = computed(() => docentes.value.filter(d =>
  (state.s13Dep === 'Todos' || d.departamento === state.s13Dep) &&
  (state.s13Estatus === 'Todos' || d.estatus === state.s13Estatus)
))

const hayVariables = computed(() => state.reportVars.length > 0)

const previewRows = computed(() =>
  hayVariables.value
    ? filtrados.value.slice(0, 3).map(d => buildRow(d, state.reportVars, state.cohorte.codigo))
    : [])

const previewNota = computed(() =>
  `Mostrando ${Math.min(3, filtrados.value.length)} de ${filtrados.value.length} docentes que cumplen los filtros.`)
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Reportes Dinámicos</p>
    <h1 class="page-title">Constructor de Reportes</h1>
    <p class="page-sub">Seleccionar las variables y filtros para generar un reporte dinámico.</p>

    <!-- Filtros -->
    <div class="filtros">
      <div class="pill-select">
        <span class="pill-select__legend">Departamento</span>
        <span class="pill-select__icon" aria-hidden="true">⚑</span>
        <select v-model="state.s13Dep" class="pill-select__control">
          <option v-for="d in depOptions" :key="d" :value="d">{{ d }}</option>
        </select>
        <span class="pill-select__caret" aria-hidden="true">▼</span>
      </div>

      <div class="pill-select">
        <span class="pill-select__legend">Estatus</span>
        <span class="pill-select__icon" aria-hidden="true">◪</span>
        <select v-model="state.s13Estatus" class="pill-select__control">
          <option v-for="e in estatusOptions" :key="e" :value="e">{{ e }}</option>
        </select>
        <span class="pill-select__caret" aria-hidden="true">▼</span>
      </div>

      <button class="btn-soft" @click="clearReportFiltros"><span aria-hidden="true">⚗</span> Limpiar filtros</button>
    </div>

    <!-- Variables -->
    <section class="card card--flat vars">
      <header class="card__head">
        <span>Variables disponibles</span>
        <span class="count-badge">
          {{ plural(state.reportVars.length, 'seleccionada', 'seleccionadas') }}
        </span>
        <button v-if="hayVariables" class="btn btn--ghost btn--sm vars__clear" @click="clearReportVars">
          ✕ Limpiar variables
        </button>
      </header>
      <div class="vars__body">
        <button
          v-for="v in REPORT_VARIABLES"
          :key="v"
          class="chip"
          :class="{ 'is-on': state.reportVars.includes(v) }"
          :aria-pressed="state.reportVars.includes(v)"
          @click="toggleReportVar(v)">
          <span class="chip__mark" aria-hidden="true">{{ state.reportVars.includes(v) ? '✓' : '' }}</span>{{ v }}
        </button>
      </div>
    </section>

    <!-- Vista previa -->
    <section class="card card--flat preview">
      <header class="card__head">
        <span>Vista previa del reporte</span>
        <span v-if="hayVariables" class="count-badge">{{ previewNota }}</span>
      </header>
      <div class="card__body">
        <p v-if="!hayVariables" class="preview__empty">Agrega al menos una variable para ver la vista previa.</p>

        <div v-else class="preview__table">
          <table class="table">
            <thead>
              <tr>
                <th>Docente</th>
                <th v-for="c in state.reportVars" :key="c">{{ c }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in previewRows" :key="r.id">
                <td class="is-strong">{{ r.nombre }}</td>
                <td v-for="(cell, i) in r.cells" :key="i">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="btn-row">
      <button class="btn btn--primary btn--lg" :disabled="!hayVariables" @click="goTo(14)">
        <span aria-hidden="true">⬇</span> Generar reporte
      </button>
      <span v-if="!hayVariables" class="hint">Selecciona al menos una variable para generar el reporte.</span>
    </div>
  </div>
</template>

<style scoped>
.filtros { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 20px; }
.pill-select { position: relative; flex: 0 0 240px; min-width: 0; }
.pill-select__legend {
  position: absolute; top: -7px; left: 16px; padding: 0 6px; background: #fff;
  font-size: 11px; font-weight: 500; color: #9CA3AF; z-index: 1;
}
.pill-select__icon, .pill-select__caret {
  position: absolute; top: 50%; transform: translateY(-50%);
  color: #9CA3AF; pointer-events: none;
}
.pill-select__icon { left: 16px; font-size: 15px; }
.pill-select__caret { right: 18px; font-size: 10px; }
.pill-select__control {
  width: 100%; appearance: none; background: #fff; border: 1px solid var(--border-3);
  border-radius: var(--r-pill); padding: 13px 40px; font-size: 14px; color: #374151;
  font-family: inherit; outline: none; cursor: pointer;
}
.pill-select__control:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.2); }

.btn-soft {
  display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 22px;
  background: var(--blue-bg); color: var(--blue); border: none; border-radius: var(--r-pill);
  font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;
}
.btn-soft:hover { background: var(--blue-br); }

.vars, .preview { margin-bottom: 20px; }
.vars__clear { margin-left: auto; height: 32px; padding: 0 10px; font-size: 13px; }
.btn--sm { height: 32px; }
.vars__body { padding: 18px 20px; display: flex; flex-wrap: wrap; gap: 10px; }
.chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px;
  border-radius: var(--r-pill); border: 1px solid var(--border-3); background: #fff;
  font-family: inherit; font-size: 13.5px; font-weight: 600; color: #374151;
  cursor: pointer; user-select: none;
}
.chip.is-on { border-color: var(--blue); background: var(--blue-bg); color: #1E40AF; }
.chip__mark {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff;
  border: 1.5px solid #C7CDD6; background: transparent;
}
.chip.is-on .chip__mark { border: none; background: var(--blue); }

.preview__empty { margin: 0; font-size: 14px; color: var(--muted-2); }
.preview__table { border: 1px solid var(--border-3); border-radius: 10px; overflow: hidden; }
.btn--lg { height: 44px; padding: 0 22px; }
.hint { font-size: 12.5px; color: var(--muted-2); }
</style>

```

---

## `src/screens/S14VistaReporte.vue`

```vue
<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import { buildRow } from '@/utils/report'

const { state, docentes } = usePadep()

/** Si no hay variables seleccionadas, el reporte cae a un set mínimo. */
const columnas = computed(() => state.reportVars.length ? state.reportVars : ['Sede', 'Estatus'])

const filtrados = computed(() => docentes.value.filter(d =>
  (state.s13Dep === 'Todos' || d.departamento === state.s13Dep) &&
  (state.s13Estatus === 'Todos' || d.estatus === state.s13Estatus)
))

const filas = computed(() =>
  filtrados.value.map(d => buildRow(d, columnas.value, state.cohorte.codigo)))
</script>

<template>
  <div>
    <p class="eyebrow">Reportes Dinámicos</p>
    <h1 class="page-title">Vista y Exportación del Reporte</h1>
    <p class="page-sub">Reporte generado a partir de las variables y filtros aplicados.</p>

    <section class="card chips">
      <span class="chips__label">Variables aplicadas:</span>
      <span v-for="c in columnas" :key="c" class="chips__item">{{ c }}</span>
    </section>

    <div class="table-wrap table-wrap--scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Docente</th>
            <th v-for="c in columnas" :key="c">{{ c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filas" :key="r.id">
            <td class="is-strong">{{ r.nombre }}</td>
            <td v-for="(cell, i) in r.cells" :key="i">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="btn btn--brand">Exportar (PDF)</button>
      <button class="btn btn--outline">Exportar (Excel)</button>
      <button class="btn btn--outline">Guardar como plantilla</button>
    </div>
  </div>
</template>

<style scoped>
.chips {
  padding: 14px 18px; margin-bottom: 16px;
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px;
}
.chips__label { color: var(--muted); }
.chips__item {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em;
  padding: 3px 10px; border-radius: var(--r-pill); background: var(--teal-bg); color: var(--navy);
}
.table-wrap { margin-bottom: 20px; }
</style>

```