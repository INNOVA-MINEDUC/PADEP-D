import { reactive, computed } from 'vue'
import { NAV, MOD1_STEPS } from '@/data/catalog'
import { entra, yo, sal, cambiaPassword } from '@/api/auth'
import { api, contexto } from '@/api/extraccion'
import { guardaToken, hayToken, cuandoExpire } from '@/api/cliente'
import { fijaCatalogo, reiniciaCatalogo, enBase } from '@/data/carreras'

/**
 * Store compartido de la aplicación: el estado vive aquí y cada pantalla
 * deriva lo suyo con `computed`.
 *
 * Es un módulo singleton; si el proyecto crece, migrar a Pinia es directo
 * (mismo shape de state/getters/actions).
 */

/** Un reporte en blanco: resumen de notas, que es lo que más se pide. */
export function reporteVacio() {
  return {
    fuente: 'notas', modo: 'resumen', columnas: [], agrupar: [], medidas: [], filtros: [], orden: [],
    // solo la fuente docentes: limita a esos trimestres las notas y la asistencia
    trimestres: [],
  }
}

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
  // La cohorte de trabajo, de la base (`GET /cohortes`): {codigo, nombre,
  // sedes, enlaces_asignados}. NO sale del corte: la cohorte se configura
  // —sedes, enlaces— meses antes de que exista ningún PDF. Se elige en la
  // pantalla Cohortes; al elegir un corte de otra cohorte, la sigue (ver
  // `sigueCorte`). Vacía si no hay ninguna o MySQL no responde.
  cohorte: { codigo: '' },
  // Las de la unidad de trabajo. null = sin respuesta todavía (o MySQL caído,
  // con el motivo en `errorCohortes`): no es lo mismo que «no hay ninguna».
  cohortes: null,
  errorCohortes: '',

  // --- Unidad ---
  // La unidad (organización) sobre la que se trabaja. Un usuario de unidad no
  // elige: es la suya. El global la elige en la cabecera, y toda la aplicación
  // opera sobre ella —cortes, cohortes, carreras, enlaces, consultas—, que es
  // lo que pide la API: a un global que no dice la unidad le contesta 422 al
  // crear o tocar algo de una cohorte. Ver `fijaUnidad`.
  unidad: '',
  // `GET /unidades`: [{codigo, nombre, estatus, usuarios}]. El global, todas.
  unidades: [],

  // Sedes y personas de la base (MySQL), no del disco. Viven aquí y no en cada
  // pantalla porque las pantallas se remontan al navegar y `CohorteContext`
  // cuenta sobre ellas en las tres.
  sedes: [],    // SedeDeCohorte[] — todas, cada una con su `enlace` o null
  enlaces: [],  // Enlace[] — las personas, para el desplegable de asignar
  // Código con el que el catálogo de carreras abre el formulario de alta ya
  // escrito: lo deja Extracción cuando una carga falla por carrera sin
  // registrar. La pantalla lo consume (y lo vacía) al montarse.
  carreraPorRegistrar: '',

  // --- Listados y filtros (módulo 2, contra `GET /docentes`) ---
  // Viven aquí y no en la pantalla para sobrevivir a la navegación, y porque el
  // buscador de la cabecera escribe en `s9Query`. '' / null = sin filtro.
  s9Query: '',
  s9Cohorte: '',
  s9Dep: null,
  s9Mun: null,
  s9Carrera: '',
  s9Estado: '',
  s9Estatus: '',

  // --- Seguimiento ---
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

  // --- Reportes (S13, S14) ---
  // La especificación que se está armando: es lo que se manda a la API, tal
  // cual (`api/reportes.py`). Vive aquí para sobrevivir a la navegación.
  reporte: reporteVacio(),
  // La plantilla de la que salió, si se abrió una guardada: {id_reporte,
  // nombre, descripcion, compartido, editable}. null = reporte nuevo.
  reportePlantilla: null,

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

/**
 * ¿Es un usuario global? `unidad: null` en su perfil: ve todas las unidades,
 * el único que cambia los roles del sistema y quien da de alta unidades.
 */
const esGlobal = computed(() => !!state.usuario && state.usuario.unidad == null)

/**
 * El menú con solo lo que la sesión puede ver; un módulo vacío no sale.
 * `soloGlobal`: además del permiso, hace falta ser global (la API da 403 al
 * de una unidad aunque tenga el permiso).
 */
const navVisible = computed(() => NAV
  .map(m => ({
    ...m,
    screens: m.screens.filter(sc => puede(sc.permiso) && (!sc.soloGlobal || esGlobal.value)),
  }))
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

const enlacesCount = computed(() => state.sedes.filter(s => s.enlace).length)

/** Checklist de avance del módulo 1, en el orden de `MOD1_STEPS`. */
const checklist = computed(() => [
  { label: 'Carreras registradas', done: !!enBase.codigos?.length },
  { label: 'Cohorte elegida',      done: !!state.cohorte.codigo },
  { label: 'Sedes registradas',    done: state.sedes.length > 0 },
  { label: 'Enlaces asignados',    done: state.sedes.length > 0 && enlacesCount.value >= state.sedes.length },
])

/** Pantalla del primer paso pendiente del módulo 1 (o null si está completo). */
const nextStepId = computed(() => {
  const i = checklist.value.findIndex(c => !c.done)
  return i === -1 ? null : MOD1_STEPS[i].id
})

/* =========================================================
   Acciones
   ========================================================= */

const LLAVE_UNIDAD = 'padep.unidad'
const LLAVE_COHORTE = 'padep.cohorte'

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
      // La unidad va primero: cortes y carreras se piden ya dentro de ella.
      actions.cargaUnidades()
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
        actions.cargaUnidades()
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
    state.cohorte = { codigo: '' }
    state.cohortes = null
    state.errorCohortes = ''
    state.unidad = ''
    state.unidades = []
    contexto.unidad = ''
    state.sedes = []
    state.enlaces = []
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

  // --- Unidad ---
  /**
   * Lee las unidades y fija la de trabajo. El de unidad, la suya y punto. El
   * global, la última que eligió en este navegador si sigue existiendo, o la
   * primera activa. Si `/unidades` falla (MySQL caído), el global se queda sin
   * unidad: las listas salen de todas y lo que crea dará 422 con su motivo, que
   * es mejor que escribir en una unidad adivinada.
   */
  async cargaUnidades() {
    try { state.unidades = await api.unidades() } catch (e) { state.unidades = [] }
    if (!esGlobal.value) return actions.fijaUnidad(state.usuario?.unidad ?? '')
    let guardada = ''
    try { guardada = localStorage.getItem(LLAVE_UNIDAD) || '' } catch (e) { /* sin almacenamiento */ }
    const activas = state.unidades.filter(u => u.estatus === 'activa')
    const u = state.unidades.find(x => x.codigo === guardada) ?? activas[0] ?? state.unidades[0]
    actions.fijaUnidad(u?.codigo ?? '')
  },
  /**
   * Cambia la unidad de trabajo: la apunta en el cliente de API (que la añade a
   * cada petición que la pide), rehace el catálogo de carreras y relee el
   * corte, que tiene que ser de esa unidad. Las pantallas se remontan solas
   * (`App.vue` las monta con la unidad en la `key`).
   */
  fijaUnidad(codigo) {
    state.unidad = codigo
    contexto.unidad = codigo
    if (esGlobal.value) {
      try { localStorage.setItem(LLAVE_UNIDAD, codigo) } catch (e) { /* sin almacenamiento */ }
    }
    reiniciaCatalogo(codigo)
    actions.cargaCohortes()
    actions.cargaCarreras()
  },

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
   * Lee las cohortes de la base y fija la de trabajo: `preferida` si se pide
   * (la recién creada), si no la última elegida en este navegador, si no la
   * del corte elegido, si no la primera. Se llama al arrancar, al cambiar de
   * unidad y tras crear una.
   *
   * No lanza: con MySQL caído deja la lista en null y el motivo en
   * `errorCohortes`, que la pantalla Cohortes enseña. El resto de la
   * aplicación —lo que sale del disco— sigue funcionando.
   */
  async cargaCohortes(preferida = '') {
    try {
      state.cohortes = await api.cohortes()
      state.errorCohortes = ''
    } catch (e) {
      state.cohortes = null
      state.errorCohortes = e.message
    }
    const lista = state.cohortes ?? []
    let guardada = ''
    let delCorte = ''
    try {
      guardada = localStorage.getItem(LLAVE_COHORTE) || ''
      // `digecade-11-car35-t6-c1`: la unidad no lleva guion, así que la
      // cohorte es siempre el segundo tramo.
      delCorte = (localStorage.getItem('padep.corte') || '').split('-')[1] || ''
    } catch (e) { /* sin almacenamiento */ }
    const c = [preferida, guardada, delCorte].map(k => lista.find(x => x.codigo === k)).find(Boolean)
      ?? lista[0]
    actions.fijaCohorte(c)
  },
  /** Elige la cohorte de trabajo por su código (pantalla Cohortes). */
  eligeCohorte(codigo) {
    const c = (state.cohortes ?? []).find(x => x.codigo === codigo)
    if (c) actions.fijaCohorte(c)
  },
  /**
   * Al elegir un corte de otra cohorte, la cohorte de trabajo lo sigue: si no,
   * la barra lateral diría «Cohorte 11» con un corte de la 12 en la cabecera.
   * Si esa cohorte no está en la base (corte creado con MySQL caído), no se
   * toca: no hay sedes que enseñar de ella.
   */
  sigueCorte(corte) {
    if (corte && corte.cohorte !== state.cohorte.codigo) actions.eligeCohorte(corte.cohorte)
  },
  fijaCohorte(c) {
    state.cohorte = c ? { ...c } : { codigo: '' }
    try {
      if (c) localStorage.setItem(LLAVE_COHORTE, c.codigo)
    } catch (e) { /* sin almacenamiento */ }
    actions.cargaConfiguracion().catch(() => {})
  },
  /**
   * Relee sedes y personas de la base para la cohorte elegida. Lanza el error
   * —503 si MySQL no responde— para que la pantalla lo enseñe, y antes vacía
   * las listas: unas sedes viejas serían mentira.
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

  // --- Docentes ---
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
  clearFiltrosDocentes() {
    state.s9Query = ''
    state.s9Cohorte = ''
    state.s9Dep = null
    state.s9Mun = null
    state.s9Carrera = ''
    state.s9Estado = ''
    state.s9Estatus = ''
  },

  // --- Reportes ---
  nuevoReporte() {
    state.reporte = reporteVacio()
    state.reportePlantilla = null
  },
  /** Abre una plantilla guardada en el constructor. */
  abreReporte(g) {
    // Copia vía JSON: structuredClone no admite el proxy reactivo de Vue.
    state.reporte = { ...reporteVacio(), ...JSON.parse(JSON.stringify(g.especificacion)) }
    state.reportePlantilla = {
      id_reporte: g.id_reporte, nombre: g.nombre, descripcion: g.descripcion ?? '',
      compartido: !!g.compartido, editable: !!g.editable,
    }
    actions.goTo(13)
  },
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
    esGlobal,
    crumbScreen,
    enlacesCount,
    checklist,
    nextStepId,
    // acciones
    ...actions,
  }
}

export { NAV }
