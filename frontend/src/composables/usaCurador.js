import { ref, computed } from 'vue'
import { api } from '@/api/extraccion'

/**
 * Curador: lo que ni el OCR ni la nómina resuelven.
 *
 * Dos reglas que no se pueden perder:
 *  - cada celda se guarda al SALIR del campo, sin botón «guardar». Son decenas
 *    de celdas y un botón por tarea se olvida; cerrar la pestaña no puede
 *    perder nada.
 *  - tras guardar, el valor se refleja en el modelo local SIN recargar la
 *    lista, o se pierde el foco a media captura.
 */
export function usaCurador(idCorte) {
  const datos = ref(null)
  const error = ref('')
  const cargando = ref(false)

  // Estado de guardado por celda: 'guardando' | 'ok' | el texto del error.
  // Va aparte del payload para no ensuciar lo que devuelve la API.
  const estadoCelda = ref({})
  const idCelda = (tarea, campo, casilla) => `${tarea.archivo}|${casilla.filas}|${campo.nombre}`

  async function carga() {
    if (!idCorte.value) { datos.value = null; return }
    cargando.value = true
    error.value = ''
    try {
      datos.value = await api.pendientes(idCorte.value)
    } catch (e) {
      error.value = e.message
      datos.value = null
    } finally {
      cargando.value = false
    }
  }

  /** Una tarea está hecha cuando todas sus casillas tienen algo escrito. */
  const hecha = t => t.campos.length > 0 && t.campos.every(c => c.casillas.every(k => k.escrito))

  /** Una persona sin registro está escrita cuando TODAS sus casillas tienen
   *  algo. A medio escribir no cuenta: media fila no es una fila. */
  const escrita = x => x.campos.length > 0 && !x.anulada
    && x.campos.every(c => String(c.escrito).trim())

  // Correcciones: la llave es archivo + filas + campo.
  async function guardaCelda(tarea, campo, casilla, valor) {
    const id = idCelda(tarea, campo, casilla)
    estadoCelda.value = { ...estadoCelda.value, [id]: 'guardando' }
    error.value = ''
    try {
      const d = await api.corrige(idCorte.value, {
        archivo: tarea.archivo,
        filas: casilla.filas,
        campo: campo.nombre,
        valor,
      })
      casilla.escrito = valor.trim()
      datos.value.correcciones = d.correcciones
      marca(id, 'ok')
      return true
    } catch (e) {
      // El error se queda pegado a su celda. Antes salía arriba del todo, a
      // pantallas de distancia de donde se estaba escribiendo, y no se veía.
      marca(id, e.message, false)
      return false
    }
  }

  // 'ok' se borra solo: es un acuse, no un estado. Un error se queda hasta el
  // siguiente intento, que es cuando deja de ser cierto.
  function marca(id, valor, temporal = true) {
    estadoCelda.value = { ...estadoCelda.value, [id]: valor }
    if (!temporal) return
    setTimeout(() => {
      const copia = { ...estadoCelda.value }
      if (copia[id] === valor) { delete copia[id]; estadoCelda.value = copia }
    }, 2500)
  }

  /**
   * Tareas de solo revisión: no falta ningún dato, es que las cuentas del papel
   * no cuadran y alguien tiene que mirarlo y decir si está bien.
   *
   * Confirmar = escribir como corrección el valor que ya leyó el OCR. No es un
   * apaño: es exactamente lo que el curador está afirmando —«el papel dice
   * esto»—, vuelve en el payload al recargar, y sobre los datos es un no-op
   * (`aplicar_correcciones.py` salta las correcciones cuyo valor coincide con
   * lo que ya hay). Sin esto estas tareas no se pueden cerrar nunca salvo
   * reescribiendo a mano valores que ya son correctos.
   */
  const confirmable = t => !!t.solo_revisar && !hecha(t)
    && t.campos.every(c => c.casillas.every(k => String(k.actual ?? '').trim()))

  async function confirma(tarea) {
    error.value = ''
    for (const campo of tarea.campos) {
      for (const casilla of campo.casillas) {
        if (casilla.escrito) continue
        if (!await guardaCelda(tarea, campo, casilla, String(casilla.actual))) return false
      }
    }
    return true
  }

  /**
   * Una ficha confirmada y nada más: todo lo escrito coincide con lo que leyó
   * el OCR. Se comprueba celda a celda en vez de guardar una marca aparte
   * porque una ficha puede tener confirmaciones Y correcciones de verdad, y
   * deshacer no puede llevarse por delante lo segundo.
   */
  const confirmada = t => !!t.solo_revisar && hecha(t)
    && t.campos.every(c => c.casillas.every(k => k.escrito === String(k.actual ?? '').trim()))

  /** Deshace una confirmación: valor vacío borra la corrección. */
  async function desconfirma(tarea) {
    error.value = ''
    for (const campo of tarea.campos) {
      for (const casilla of campo.casillas) {
        if (!await guardaCelda(tarea, campo, casilla, '')) return false
      }
    }
    return true
  }

  // Altas: la llave es el CARNE, no el número de fila. Quien el OCR nunca
  // extrajo no tiene fila a la que apuntar, y el carné de la nómina no se mueve.
  async function guardaAlta(persona, nombreCampo, valor) {
    error.value = ''
    try {
      await api.daDeAlta(idCorte.value, {
        archivo: persona.archivo,
        carne: persona.carne,
        campo: nombreCampo,
        valor,
      })
      // Un alta solo entra en la entrega rehaciéndola entera: el botón lo dice
      // desde ya.
      datos.value.altas_sin_reflejar = true
      if (nombreCampo !== 'ANULADA') {
        const c = persona.campos.find(x => x.nombre === nombreCampo)
        if (c) c.escrito = valor.trim()
      }
      return true
    } catch (e) { error.value = e.message; return false }
  }

  // Un alta equivocada se ANULA, no se borra: quitar la línea correría las
  // filas de detrás y las correcciones caerían sobre la fila equivocada.
  async function anula(persona, si) {
    if (await guardaAlta(persona, 'ANULADA', si ? 'si' : '')) await carga()
  }

  /**
   * Las tareas de varias filas vistas como tabla: personas en filas, campos en
   * columnas. La API las da al revés —un campo con una casilla por persona— y
   * pintarlo así son ocho bloques con el mismo nombre repetido y un campo de
   * ancho completo para escribir un carácter.
   */
  function tablaDe(tarea) {
    const columnas = tarea.campos.filter(c => c.por_fila)
    if (columnas.length < 2) return null
    const filas = columnas[0].casillas.map(k => k.filas)
    return {
      columnas,
      filas: filas.map(f => ({
        filas: f,
        quien: columnas[0].casillas.find(k => k.filas === f)?.quien ?? '',
        celdas: columnas
          .map(campo => ({ campo, casilla: campo.casillas.find(k => k.filas === f) }))
          .filter(c => c.casilla),
      })),
    }
  }

  /** Los campos que no van en la tabla: los de encabezado, uno por tarea. */
  const camposSueltos = tarea => (tablaDe(tarea) ? tarea.campos.filter(c => !c.por_fila) : tarea.campos)

  const rehace = computed(() => !!datos.value?.altas_sin_reflejar)
  const puedeAplicar = computed(() => !!(datos.value?.correcciones || rehace.value))
  const textoAplicar = computed(() => rehace.value ? 'Rehacer la entrega' : 'Aplicar a la entrega')
  const avisoAplicar = computed(() => {
    if (rehace.value) return 'Hay filas dadas de alta: la entrega se rehace entera (tarda unos minutos)'
    return datos.value?.correcciones ? '' : 'Todavía no has escrito nada'
  })

  const listas = computed(() => datos.value?.tareas.filter(hecha).length ?? 0)
  const porcentaje = computed(() => {
    const n = datos.value?.tareas.length ?? 0
    return n ? Math.round(100 * listas.value / n) : 0
  })

  async function aplica() {
    error.value = ''
    try {
      await api.aplica(idCorte.value)
      // Vuelve en 202: el avance real se ve en la pantalla de extracción.
      setTimeout(carga, 4000)
      return true
    } catch (e) { error.value = e.message; return false }
  }

  return {
    datos, error, cargando, carga,
    hecha, escrita, confirmable, confirma, confirmada, desconfirma,
    guardaCelda, guardaAlta, anula,
    estadoCelda, idCelda,
    tablaDe, camposSueltos,
    puedeAplicar, textoAplicar, avisoAplicar, aplica,
    listas, porcentaje,
  }
}
