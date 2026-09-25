import { reactive, computed } from 'vue'
import { NAV, SEED } from '@/data/catalog'
import { entra, yo } from '@/api/auth'
import { api } from '@/api/extraccion'
import { guardaToken, hayToken, cuandoExpire } from '@/api/cliente'

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
  // El token vive en el cliente de API (localStorage); aquí solo el usuario.
  loggedIn: false,
  usuario: null,
  loginUser: 'admin@mineduc.edu.gt',
  loginPass: '',
  loginError: '',
  loginCargando: false,
  // Falso hasta que se resuelve el /auth/me del arranque: sin esto la pantalla
  // de login parpadea un instante en cada recarga aunque haya sesión válida.
  sesionResuelta: false,
  showPass: false,
  profileOpen: false,

  // --- Navegación ---
  active: 1,
  openModules: { m1: true, m2: false, m3: false, m4: false, m5: false },

  // --- Módulo 1: cohorte ---
  // Ya no es un borrador que se teclea: sale del corte elegido en la API de
  // extracción, que es donde vive el dato de verdad. Vacío mientras no haya
  // ninguno —la API puede estar caída o no haber cortes todavía—, y las
  // pantallas que lo enseñan pintan una raya en vez de un código inventado.
  cohorte: { codigo: '', carrera: '', trimestre: null, id: '' },

  // Sedes y personas de la base (MySQL), no del disco. Viven aquí y no en cada
  // pantalla porque las pantallas se remontan al navegar y `CohorteContext`
  // cuenta sobre ellas en las tres.
  sedes: [],    // SedeDeCohorte[] — todas, cada una con su `enlace` o null
  enlaces: [],  // Enlace[] — las personas, para el desplegable de asignar

  // --- Carga de archivo (simulada) ---
  // Solo queda la de S11: las de las pantallas 5, 7 y 10 se fueron con ellas al
  // centralizar la extracción en el módulo 5.
  s11Uploaded: false,

  // --- Listados y filtros ---
  s8Tab: 'preliminar',
  s9Query: '',
  s9Sede: 'Todas',
  s9Estatus: 'Todos',

  // --- Seguimiento ---
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
  // Un solo diálogo para todo lo que pide confirmar (quitar sede, reemplazar
  // enlace, borrar persona): la acción viaja con él.
  confirmacion: { open: false },
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

const enlacesCount = computed(() => state.sedes.filter(s => s.enlace).length)

/** Checklist de avance del módulo 1. */
const checklist = computed(() => [
  // Hecho cuando existe un corte de verdad, no cuando alguien pulsó «Guardar»
  // en un formulario que no guardaba en ningún sitio.
  { label: 'Alta de cohorte',   done: !!state.cohorte.codigo },
  { label: 'Sedes registradas', done: state.sedes.length > 0 },
  { label: 'Enlaces asignados', done: state.sedes.length > 0 && enlacesCount.value >= state.sedes.length },
])

/** Primer paso pendiente del módulo 1 (o null si está completo). */
const nextStepId = computed(() => {
  const i = checklist.value.findIndex(c => !c.done)
  return i === -1 ? null : i + 1
})

/* =========================================================
   Acciones
   ========================================================= */

const actions = {
  // --- Sesión ---
  async login() {
    if (!state.loginUser.trim() || !state.loginPass.trim()) {
      state.loginError = 'Ingresa usuario y contraseña.'
      return
    }
    state.loginCargando = true
    state.loginError = ''
    try {
      state.usuario = await entra(state.loginUser.trim(), state.loginPass)
      state.loggedIn = true
      state.loginPass = ''
      // Sin await: el proxy de extracción exige el token, así que esto no podía
      // salir antes del login, pero tampoco tiene por qué retrasar la entrada.
      actions.refrescaCohorte()
    } catch (e) {
      // El backend contesta «Credenciales invalidas» sin decir si falló el
      // correo o la contraseña; se enseña tal cual.
      state.loginError = e.message
    } finally {
      state.loginCargando = false
    }
  },
  /**
   * Revalida el token guardado al arrancar. Si caducó se descarta en silencio:
   * el usuario ve el login, que es lo correcto, no un error que no puede
   * arreglar.
   */
  async restauraSesion() {
    if (hayToken()) {
      try {
        state.usuario = await yo()
        state.loggedIn = true
        actions.refrescaCohorte()
      } catch (e) {
        guardaToken('')
      }
    }
    state.sesionResuelta = true
  },
  logout() {
    guardaToken('')
    state.loggedIn = false
    state.usuario = null
    state.loginPass = ''
    state.active = 1
    state.profileOpen = false
    state.cohorte = { codigo: '', carrera: '', trimestre: null, id: '' }
    state.sedes = []
    state.enlaces = []
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
  /**
   * Relee la cohorte a partir del corte elegido. La comparten el sidebar y las
   * pantallas de consulta, que no piden cortes por su cuenta, así que se llama
   * al arrancar y cada vez que S01 crea o cambia el corte.
   *
   * Falla en silencio a propósito: la API de extracción puede estar caída y eso
   * no debe tumbar el resto de la aplicación —solo deja la cohorte vacía—.
   *
   * `elegido` se lee de localStorage, la misma llave que usa `usaCortes`: no
   * hay un estado compartido entre pantallas, se comparte la llave.
   */
  async refrescaCohorte() {
    try {
      const cortes = await api.cortes()
      const id = localStorage.getItem('padep.corte')
      const c = cortes.find(x => x.id === id) ?? cortes[0]
      state.cohorte = c
        ? { codigo: c.cohorte, carrera: c.carrera, trimestre: c.trimestre, id: c.id }
        : { codigo: '', carrera: '', trimestre: null, id: '' }
    } catch (e) {
      state.cohorte = { codigo: '', carrera: '', trimestre: null, id: '' }
    }
    actions.cargaConfiguracion().catch(() => {})
  },
  /**
   * Relee sedes y personas de la base para la cohorte elegida. Lanza el error
   * —404 si la cohorte no está en MySQL, 503 si MySQL no responde— para que la
   * pantalla lo enseñe, y antes vacía las listas: unas sedes viejas serían
   * mentira.
   */
  async cargaConfiguracion() {
    const c = state.cohorte.codigo
    try {
      [state.sedes, state.enlaces] = c ? await Promise.all([api.sedes(c), api.enlaces()]) : [[], []]
    } catch (e) {
      state.sedes = []
      state.enlaces = []
      throw e
    }
  },

  // --- Confirmación ---
  /** Abre el diálogo; `alConfirmar` solo corre si el usuario acepta. */
  pideConfirmacion(titulo, mensaje, boton, alConfirmar) {
    state.confirmacion = { open: true, titulo, mensaje, boton, alConfirmar }
  },
  cierraConfirmacion() { state.confirmacion = { open: false } },
  aceptaConfirmacion() {
    const fn = state.confirmacion.alConfirmar
    actions.cierraConfirmacion()
    fn?.()
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

// Un 401 en cualquier petición saca al usuario: el token caducó a media sesión
// y seguir pintando pantallas que no pueden traer datos solo confunde.
cuandoExpire(() => actions.logout())

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
    // acciones
    ...actions,
  }
}

export { NAV, SEED }
