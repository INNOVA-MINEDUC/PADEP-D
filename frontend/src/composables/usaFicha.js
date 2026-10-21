import { ref } from 'vue'
import { api } from '@/api/extraccion'

/**
 * La ficha de un docente (`GET /docentes/{codigo}`) y su estatus académico
 * (`POST /docentes/{codigo}/estatus`).
 *
 * Todo lo de la ficha sale del papel —la base se rehace en cada carga— salvo
 * el estatus, que es una decisión de quien da seguimiento. Por eso el estatus
 * no se edita: cada cambio es una fila más del historial, y lo que devuelve la
 * API (vigente, historial, graduación) sustituye a lo de la inscripción sin
 * volver a pedir la ficha entera.
 */
export function usaFicha() {
  /** @type {import('vue').Ref<import('@/api/tipos').FichaDocente | null>} */
  const ficha = ref(null)
  const error = ref('')
  const cargando = ref(false)
  const guardando = ref(false)

  let turno = 0
  async function carga(codigo) {
    const mio = ++turno
    ficha.value = null
    error.value = ''
    if (!codigo) return
    cargando.value = true
    try {
      const f = await api.docente(codigo)
      if (mio === turno) ficha.value = f
    } catch (e) {
      if (mio === turno) error.value = e.message
    } finally {
      if (mio === turno) cargando.value = false
    }
  }

  /** `ins` es la inscripción de `ficha`; `campos`, lo del formulario. */
  async function cambiaEstatus(ins, campos) {
    guardando.value = true
    try {
      const r = await api.cambiaEstatus(ficha.value.docente.codigo_padep, {
        ...campos, cohorte: ins.cohorte, carrera: ins.carrera,
      })
      ins.estatus_academico = r.estatus_academico
      ins.historial = r.historial
      ins.graduacion = r.graduacion
      return true
    } finally {
      guardando.value = false
    }
  }

  return { ficha, error, cargando, guardando, carga, cambiaEstatus }
}
