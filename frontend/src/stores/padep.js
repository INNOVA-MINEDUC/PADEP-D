import { reactive, computed } from 'vue'
import { NAV, SEED } from '@/data/catalog'
import { entra, yo, sal, cambiaPassword } from '@/api/auth'
import { api } from '@/api/extraccion'
import { guardaToken, hayToken, cuandoExpire } from '@/api/cliente'
import { fijaCatalogo } from '@/data/carreras'

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
  // Vacío: un correo precargado le dice a cualquiera cuál es la cuenta admin.
  loginUser: '',
  loginPass: '',
  loginError: '',
  loginCargando: false,
  // Falso hasta que se resuelve el /auth/me del arranque: sin esto la pantalla
  // de login parpadea un instante en cada recarga aunque haya sesión válida.
  sesionResuelta: false,
  showPass: false,
  profileOpen: false,
  // Diálogo de «Cambiar contraseña», que se abre desde el menú del perfil.
  cambioPassword: false,

  // --- Navegación ---
  active: 1,
  openModules: { m1: true, m2: false, m3: false, m4: false, m5: false, m6: false },
  // Menú lateral en pantallas estrechas: escondido, se abre con el botón de la
  // cabecera. En escritorio no se usa.
  menuMovil: false,

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
  // ¿Está la cohorte en MySQL? El corte en disco no basta para registrar sedes.
  // true/false según responda `/sedes` (404 = no está); null = no se sabe (503).
  enBase: null,
  // Código con el que el catálogo de carreras abre el formulario de alta ya
  // escrito: lo deja Extracción cuando una carga falla por carrera sin
  // registrar. La pantalla lo consume (y lo vacía) al montarse.
  carreraPorRegistrar: '',

  // --- Listados y filtros (módulo 2, contra `GET /docentes`) ---
  // Viven aquí y no en la pantalla para sobrevivir a la navegación, y porque el
  // buscador de la cabecera escribe en `s9Query`. '' / null = sin filtro.
  s8Carrera: '',
  s9Query: '',
  s9Dep: null,
  s9Mun: null,
  s9Carrera: '',
  s9Estado: '',
  s9Estatus: '',

  // --- Seguimiento ---
  notasOverrides: {},
  // La ficha (S12) abierta: código PADEP, o null si se llegó sin elegir a nadie.
  fichaCodigo: null,
  // Con qué estatus abrir el formulario: la comparación de nóminas abre la
  // ficha de una baja ya en «retirado». null = la pestaña de resumen.
  fichaEstatus: null,
  // De qué pantalla se vino (para «Volver») y los códigos de la lista que se
  // estaba mirando (para «anterior / siguiente» sin volver a ella).
  fichaOrigen: null,
  fichaLista: [],

  // Seguimiento de estatus (S10). '' = sin filtro.
  s10Estatus: '',
  s10Carrera: '',
  s10Desde: '',
  s10Hasta: '',
  // Solo para las maquetas de reportes (S13, S14), que aún pintan el SEED.
  statusOverrides: {},

  // --- Reportes ---
  reportVars: ['Sede', 'Estatus', 'Notas'],
  s13Dep: 'Todos',
  s13Estatus: 'Todos',

  // --- Overlays ---
  // Un solo diálogo para todo lo que pide confirmar (quitar sede, reemplazar
  // enlace, borrar persona): la acción viaja con él.
  confirmacion: { open: false },
})

/* =========================================================
   Getters
   ========================================================= */

/**
 * ¿Tiene la sesión ese permiso? `p` es un código o una lista (basta uno); sin
 * `p`, sí. Es para no OFRECER lo que se va a rechazar: quien decide es la API,
 * que pide el suyo en cada ruta.
 */
function puede(p) {
  if (!p) return true
  const tiene = state.usuario?.permisos ?? []
  return (Array.isArray(p) ? p : [p]).some(x => tiene.includes(x))
}

/** El menú con solo lo que la sesión puede ver; un módulo vacío no sale. */
const navVisible = computed(() => NAV
  .map(m => ({ ...m, screens: m.screens.filter(sc => puede(sc.permiso)) }))
  .filter(m => m.screens.length))

const pantallaPermitida = id => navVisible.value.some(m => m.screens.some(sc => sc.id === id))
const primeraPantalla = () => navVisible.value[0]?.screens[0]?.id ?? null

const currentModule = computed(
  () => navVisible.value.find(m => m.screens.some(s => s.id === state.active))
    ?? navVisible.value[0] ?? NAV[0]
)

const currentModuleIndex = computed(() => navVisible.value.findIndex(m => m.id === currentModule.value.id))

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
  // Hecho cuando la cohorte está en la base, no solo el corte en disco: sin
  // ella, Sedes contesta 404.
  { label: 'Alta de cohorte',   done: state.enBase === true },
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
      actions.aPantallaPermitida()
      // Sin await: el proxy de extracción exige el token, así que esto no podía
      // salir antes del login, pero tampoco tiene por qué retrasar la entrada.
      actions.refrescaCohorte()
      actions.cargaCarreras()
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
        actions.aPantallaPermitida()
        actions.refrescaCohorte()
        actions.cargaCarreras()
      } catch (e) {
        guardaToken('')
      }
    }
    state.sesionResuelta = true
  },
  /**
   * Cerrar sesión de verdad: la API anula el token (y los de los demás
   * dispositivos). Si falla —red caída, token ya muerto— se sale igual: lo
   * que no puede pasar es que el botón no saque a nadie.
   */
  async logout() {
    try { await sal() } catch (e) { /* se sale igual */ }
    actions.limpiaSesion()
  },
  /** Solo el lado del navegador. Es lo que hace un 401: no hay a quién avisar. */
  limpiaSesion() {
    guardaToken('')
    state.loggedIn = false
    state.usuario = null
    state.loginPass = ''
    state.active = 1
    state.profileOpen = false
    state.menuMovil = false
    state.cambioPassword = false
    state.cohorte = { codigo: '', carrera: '', trimestre: null, id: '' }
    state.sedes = []
    state.enlaces = []
    state.enBase = null
  },
  /**
   * Cambia la contraseña propia. La API devuelve un token nuevo (el cliente ya
   * lo guardó) y cierra las demás sesiones. Lanza el error para el diálogo.
   */
  async cambiaMiPassword(actual, nueva) {
    state.usuario = await cambiaPassword(actual, nueva)
  },
  abreCambioPassword()  { state.profileOpen = false; state.cambioPassword = true },
  cierraCambioPassword() { state.cambioPassword = false },
  /** Si la pantalla actual no está permitida, a la primera que sí. */
  aPantallaPermitida() {
    if (!pantallaPermitida(state.active)) state.active = primeraPantalla()
    actions.abreModuloDe(state.active)
  },
  toggleShowPass() { state.showPass = !state.showPass },
  toggleProfile()  { state.profileOpen = !state.profileOpen },
  closeProfile()   { state.profileOpen = false },

  // --- Navegación ---
  // Una pantalla que la sesión no puede ver no se abre ni por un enlace interno
  // (p. ej. «registrar carrera» desde Extracción): se queda donde está.
  goTo(id) {
    if (!pantallaPermitida(id)) return
    state.active = id
    state.profileOpen = false
    state.menuMovil = false
    actions.abreModuloDe(id)
  },
  goHome() { actions.goTo(primeraPantalla()) },
  /** Al catálogo de carreras con el alta abierta y `codigo` ya escrito. */
  registraCarrera(codigo = '') {
    state.carreraPorRegistrar = String(codigo)
    actions.goTo(4)
  },
  /**
   * Acordeón: abrir un módulo cierra los demás. Antes se quedaban todos
   * abiertos y el menú acababa más alto que la pantalla.
   */
  toggleModule(id) {
    const abrir = !state.openModules[id]
    for (const k of Object.keys(state.openModules)) state.openModules[k] = false
    state.openModules[id] = abrir
  },
  /** Deja abierto (solo) el módulo de esa pantalla, p. ej. al llegar por un enlace. */
  abreModuloDe(idPantalla) {
    const m = NAV.find(x => x.screens.some(sc => sc.id === idPantalla))
    if (!m) return
    for (const k of Object.keys(state.openModules)) state.openModules[k] = k === m.id
  },
  toggleMenuMovil() { state.menuMovil = !state.menuMovil },
  cierraMenuMovil() { state.menuMovil = false },
  submitTopSearch() { actions.goTo(9) },

  // --- Carreras ---
  /**
   * Suma el catálogo de la base a las etiquetas de carrera (ver
   * `data/carreras.js`). En silencio si falla: quedan los nombres de siempre.
   */
  async cargaCarreras() {
    try { fijaCatalogo(await api.carreras()) } catch (e) { /* respaldo fijo */ }
  },

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
      state.enBase = c ? true : null
    } catch (e) {
      state.sedes = []
      state.enlaces = []
      state.enBase = e.estado === 404 ? false : null
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

  // --- Docentes ---
  getDocente,
  /**
   * Abre la ficha (S12). `estatus` deja el formulario ya preparado; `lista`,
   * los códigos de la tabla de la que se viene, en su orden.
   */
  openFicha(codigo, { estatus = null, lista = [] } = {}) {
    state.fichaOrigen = state.active === 12 ? state.fichaOrigen : state.active
    state.fichaLista = [...new Set(lista.length ? lista : [codigo])]
    state.fichaCodigo = codigo
    state.fichaEstatus = estatus
    actions.goTo(12)
  },
  /** Otra persona de la misma lista, sin salir de la ficha. */
  fichaVecina(codigo) {
    state.fichaEstatus = null
    state.fichaCodigo = codigo
  },
  volverDeFicha() { actions.goTo(state.fichaOrigen ?? 9) },
  setNota(id, campo, valor) {
    const actual = state.notasOverrides[id] ?? {}
    state.notasOverrides[id] = { ...actual, [campo]: valor }
  },
  clearFiltrosDocentes() {
    state.s9Query = ''
    state.s9Dep = null
    state.s9Mun = null
    state.s9Carrera = ''
    state.s9Estado = ''
    state.s9Estatus = ''
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
cuandoExpire(() => actions.limpiaSesion())

export function usePadep() {
  return {
    state,
    // getters
    currentModule,
    currentModuleIndex,
    navVisible,
    puede,
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
