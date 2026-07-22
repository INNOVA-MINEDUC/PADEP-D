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
