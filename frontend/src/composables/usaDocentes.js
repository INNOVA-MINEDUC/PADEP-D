import { ref, watch } from 'vue'
import { api } from '@/api/extraccion'

/**
 * Lista paginada de `GET /docentes` (CONSULTA_DOCENTES.md).
 *
 * `filtros` es una funcion que devuelve los parametros —sin `pagina`—: se
 * vigila y, al cambiar, se vuelve a la pagina 1. Espera 300 ms antes de pedir
 * para no lanzar una peticion por tecla en el buscador, y descarta la respuesta
 * que llegue despues de una mas nueva: con el filtro cambiando, una lista vieja
 * pintada encima de la buena seria mentira.
 *
 * Un 503 (MySQL caido) NO es una lista vacia: se vacia la tabla y el `detail`
 * va a `error`, que la pantalla enseña tal cual.
 */
export function usaDocentes(filtros, porPagina = 50) {
  const filas = ref([])
  const total = ref(0)
  const paginas = ref(0)
  const pagina = ref(1)
  const cargando = ref(false)
  const error = ref('')

  let turno = 0
  let espera = null

  async function pideLista() {
    const mio = ++turno
    cargando.value = true
    error.value = ''
    try {
      const r = await api.docentes({ ...filtros(), pagina: pagina.value, por_pagina: porPagina })
      if (mio !== turno) return
      filas.value = r.docentes
      total.value = r.total
      paginas.value = r.paginas
    } catch (e) {
      if (mio !== turno) return
      filas.value = []
      total.value = 0
      paginas.value = 0
      error.value = e.message
    } finally {
      if (mio === turno) cargando.value = false
    }
  }

  function programa() {
    clearTimeout(espera)
    espera = setTimeout(pideLista, 300)
  }

  watch(filtros, () => { pagina.value = 1; programa() }, { deep: true })
  watch(pagina, pideLista)
  pideLista()

  /**
   * Todas las filas del filtro, de 200 en 200 (el maximo que acepta la API).
   * Para exportar: la cohorte 11 son ~1.100 inscripciones, seis peticiones.
   */
  async function todas() {
    const f = filtros()
    const primera = await api.docentes({ ...f, pagina: 1, por_pagina: 200 })
    const resto = []
    for (let p = 2; p <= primera.paginas; p++) {
      resto.push(...(await api.docentes({ ...f, pagina: p, por_pagina: 200 })).docentes)
    }
    return [...primera.docentes, ...resto]
  }

  return { filas, total, paginas, pagina, cargando, error, recarga: pideLista, todas }
}
