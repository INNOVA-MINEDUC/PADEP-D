import { ref, computed, watch } from 'vue'
import { api } from '@/api/extraccion'
import { usePadep } from '@/stores/padep'

/**
 * El constructor de reportes contra `api/reportes.py`.
 *
 * Lo que se arma es la ESPECIFICACIÓN (`state.reporte`) y se manda tal cual:
 * el navegador no escribe SQL ni decide qué se puede cruzar. El catálogo
 * (`GET /reportes/catalogo`) dice qué campos hay en cada fuente, de qué tipo
 * son y qué operadores admiten; sin el permiso de datos personales ni trae
 * nombre, CUI, DPI ni partida.
 *
 * La vista previa se pide sola al cambiar algo, 400 ms después, y descarta la
 * respuesta que llegue detrás de una más nueva. Un filtro a medio escribir no
 * se manda —daría 422 en cada tecla—; se enseña como pendiente.
 */
const POR_PAGINA = 50
const SIN_VALOR = new Set(['vacio', 'no_vacio'])
const LISTA = new Set(['en', 'no_en'])

let catalogoCache = null

export function usaReporte() {
  const { state } = usePadep()

  const catalogo = ref(catalogoCache)
  const errorCatalogo = ref('')
  async function cargaCatalogo() {
    try {
      catalogo.value = catalogoCache = await api.catalogoReportes()
    } catch (e) {
      errorCatalogo.value = e.message
    }
  }

  const fuente = computed(() => catalogo.value?.fuentes.find(f => f.id === state.reporte.fuente) ?? null)
  const campos = computed(() => Object.fromEntries((fuente.value?.campos ?? []).map(c => [c.id, c])))
  const deRol = (...roles) => (fuente.value?.campos ?? []).filter(c => roles.includes(c.rol))

  /** Agrupados para los selectores: [{grupo, campos}] en el orden del catálogo. */
  function porGrupo(lista) {
    const grupos = []
    for (const c of lista) {
      let g = grupos.find(x => x.grupo === c.grupo)
      if (!g) grupos.push(g = { grupo: c.grupo, campos: [] })
      g.campos.push(c)
    }
    return grupos
  }

  // Al cambiar de fuente se quedan los campos que la nueva también tiene
  // (cohorte, carrera, sexo...) y se van los que no. No basta el nombre: el
  // mismo id puede tener otro papel —«% de asistencia» es una columna en
  // docentes y una medida en asistencia— y conservarlo dejaba el reporte en
  // 422. Un filtro cuyo operador no vale para el tipo nuevo vuelve a empezar.
  // Lo que el último cambio de fuente tuvo que quitar, para decirlo: sin el
  // aviso, el reporte se quedaba vacío y parecía que la combinación no
  // funcionaba.
  const quitados = ref({ fuente: '', etiquetas: [] })
  let etiquetasAntes = {}
  watch(fuente, (_, anterior) => {
    etiquetasAntes = Object.fromEntries((anterior?.campos ?? []).map(c => [c.id, c.etiqueta]))
  }, { flush: 'sync' })
  watch(() => state.reporte.fuente, () => {
    const r = state.reporte
    const antes = [...r.columnas, ...r.agrupar, ...r.medidas, ...r.filtros.map(f => f.campo)]
    const con = (...roles) => id => roles.includes(campos.value[id]?.rol)
    r.columnas = r.columnas.filter(con('dim', 'valor'))
    r.agrupar = r.agrupar.filter(con('dim'))
    r.medidas = r.medidas.filter(con('medida'))
    const enFiltro = con('dim', 'valor', ...(r.modo === 'resumen' ? ['medida'] : []))
    r.filtros = r.filtros.filter(f => enFiltro(f.campo))
    for (const f of r.filtros) {
      const c = campos.value[f.campo]
      const ops = catalogo.value?.operadores[c.tipo] ?? []
      const opcionInvalida = c.tipo === 'enum' && [f.valor].flat().some(v => v != null && !c.opciones.includes(v))
      if (!ops.includes(f.op) || opcionInvalida) {
        f.op = ops[0]
        f.valor = valorInicial(c, f.op)
      }
    }
    if (!fuente.value?.periodo) r.trimestres = []
    const despues = new Set([...r.columnas, ...r.agrupar, ...r.medidas, ...r.filtros.map(f => f.campo)])
    const fuera = [...new Set(antes.filter(id => !despues.has(id)))]
    quitados.value = {
      fuente: fuente.value?.etiqueta ?? '',
      etiquetas: fuera.map(id => etiquetasAntes[id] ?? id),
    }
  })
  // Un filtro sobre una medida solo tiene sentido en resumen.
  watch(() => state.reporte.modo, modo => {
    if (modo === 'listado') {
      state.reporte.filtros = state.reporte.filtros.filter(f => campos.value[f.campo]?.rol !== 'medida')
    }
  })

  // --- Filtros ---------------------------------------------------------------
  function valorInicial(campo, op) {
    if (SIN_VALOR.has(op)) return null
    if (LISTA.has(op)) return []
    if (op === 'entre') return ['', '']
    return campo?.tipo === 'enum' ? (campo.opciones?.[0] ?? '') : ''
  }
  function agregaFiltro() {
    const c = deRol('dim', 'valor', ...(state.reporte.modo === 'resumen' ? ['medida'] : []))[0]
    const op = catalogo.value.operadores[c.tipo][0]
    state.reporte.filtros.push({ campo: c.id, op, valor: valorInicial(c, op) })
  }
  function cambiaCampoFiltro(f, id) {
    const c = campos.value[id]
    f.campo = id
    if (!catalogo.value.operadores[c.tipo].includes(f.op)) f.op = catalogo.value.operadores[c.tipo][0]
    f.valor = valorInicial(c, f.op)
  }
  function cambiaOpFiltro(f, op) {
    const antes = f.op
    f.op = op
    const forma = o => (SIN_VALOR.has(o) ? 'nada' : LISTA.has(o) ? 'lista' : o === 'entre' ? 'par' : 'uno')
    if (forma(antes) !== forma(op)) f.valor = valorInicial(campos.value[f.campo], op)
  }
  const completo = f => {
    if (!campos.value[f.campo]) return false
    if (SIN_VALOR.has(f.op)) return true
    if (LISTA.has(f.op)) return Array.isArray(f.valor) && f.valor.length > 0
    if (f.op === 'entre') return Array.isArray(f.valor) && f.valor.every(v => String(v).trim() !== '')
    return String(f.valor ?? '').trim() !== ''
  }

  // Los valores de un campo de texto, para sugerir en el filtro. Una petición
  // por campo y fuente, y se guardan.
  const valores = ref({})
  async function pideValores(id) {
    const c = campos.value[id]
    const llave = `${state.reporte.fuente}|${id}`
    if (!c || c.tipo !== 'texto' || c.rol !== 'dim' || llave in valores.value) return
    valores.value = { ...valores.value, [llave]: [] }
    try {
      const v = await api.valoresReporte(state.reporte.fuente, id)
      valores.value = { ...valores.value, [llave]: v }
    } catch { /* sin sugerencias; se escribe a mano */ }
  }
  const sugerencias = id => valores.value[`${state.reporte.fuente}|${id}`] ?? []

  // --- La especificación que se manda --------------------------------------
  const listo = computed(() => !!fuente.value && (state.reporte.modo === 'listado'
    ? state.reporte.columnas.length > 0
    : state.reporte.medidas.length > 0))

  const especificacion = computed(() => {
    const r = state.reporte
    const numero = (c, v) => (c?.tipo === 'numero' && v !== '' && v != null ? Number(v) : v)
    const e = {
      fuente: r.fuente, modo: r.modo,
      filtros: r.filtros.filter(completo).map(f => {
        const c = campos.value[f.campo]
        const v = Array.isArray(f.valor) ? f.valor.map(x => numero(c, x)) : numero(c, f.valor)
        return { campo: f.campo, op: f.op, valor: v }
      }),
    }
    if (r.modo === 'listado') e.columnas = r.columnas
    else { e.agrupar = r.agrupar; e.medidas = r.medidas }
    // Solo se ordena por lo que sale en el reporte; lo demás se ignora.
    const salida = r.modo === 'listado' ? r.columnas : [...r.agrupar, ...r.medidas]
    e.orden = r.orden.filter(o => salida.includes(o.campo))
    if (fuente.value?.periodo && r.trimestres?.length) e.trimestres = r.trimestres
    return e
  })
  const pendientes = computed(() => state.reporte.filtros.filter(f => !completo(f)).length)

  // --- Vista previa -----------------------------------------------------------
  const resultado = ref(null)
  const error = ref('')
  const cargando = ref(false)
  const pagina = ref(1)
  let turno = 0
  let espera = null

  async function pide() {
    const mio = ++turno
    if (!listo.value) { resultado.value = null; error.value = ''; return }
    cargando.value = true
    error.value = ''
    try {
      const r = await api.consultaReporte(especificacion.value, pagina.value, POR_PAGINA)
      if (mio === turno) resultado.value = r
    } catch (e) {
      if (mio === turno) { resultado.value = null; error.value = e.message }
    } finally {
      if (mio === turno) cargando.value = false
    }
  }
  function programa() {
    clearTimeout(espera)
    espera = setTimeout(pide, 400)
  }
  watch(especificacion, () => { pagina.value === 1 ? programa() : (pagina.value = 1) }, { deep: true })
  watch(pagina, pide)

  /** Clic en una cabecera: ascendente, descendente, sin orden. */
  function ordena(id) {
    const actual = state.reporte.orden[0]
    if (actual?.campo !== id) state.reporte.orden = [{ campo: id, dir: 'asc' }]
    else if (actual.dir === 'asc') state.reporte.orden = [{ campo: id, dir: 'desc' }]
    else state.reporte.orden = []
  }
  const direccion = id => (state.reporte.orden[0]?.campo === id ? state.reporte.orden[0].dir : null)

  // --- Exportar y guardar -----------------------------------------------------
  const exportando = ref('')
  async function exporta(formato) {
    exportando.value = formato
    error.value = ''
    try {
      await api.exportaReporte(especificacion.value, formato)
    } catch (e) {
      error.value = e.message
    } finally {
      exportando.value = ''
    }
  }

  async function guarda({ nombre, descripcion, compartido }, comoNueva) {
    const cuerpo = { nombre, descripcion, compartido, especificacion: especificacion.value }
    const p = state.reportePlantilla
    const r = p && !comoNueva ? await api.editaReporte(p.id_reporte, cuerpo) : await api.guardaReporte(cuerpo)
    state.reportePlantilla = { id_reporte: r.id_reporte, nombre, descripcion, compartido, editable: true }
  }

  // Los trimestres que hay cargados, para el selector de periodo.
  const trimestres = ref([])
  async function pideTrimestres() {
    try {
      trimestres.value = await api.valoresReporte('notas', 'trimestre')
    } catch { trimestres.value = [] }
  }

  return {
    quitados,
    trimestres, pideTrimestres,
    catalogo, errorCatalogo, cargaCatalogo, fuente, campos, deRol, porGrupo,
    agregaFiltro, cambiaCampoFiltro, cambiaOpFiltro, completo, pideValores, sugerencias,
    listo, especificacion, pendientes,
    resultado, error, cargando, pagina, pide, ordena, direccion, POR_PAGINA,
    exportando, exporta, guarda,
  }
}
