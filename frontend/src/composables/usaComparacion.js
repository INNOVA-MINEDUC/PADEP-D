import { ref, computed } from 'vue'
import { api } from '@/api/extraccion'

/**
 * Comparación de la nómina de un corte contra la de otro de la misma carrera:
 * bajas, altas y cambios, por carné.
 *
 * El cálculo es de la API y sale del disco; aquí solo se pinta y se guarda la
 * marca de revisión, que sí va a la base. Si la base no responde, la
 * comparación llega igual con `marcas_disponible: false` y no se ofrece marcar.
 */
export function usaComparacion(idCorte, idContra) {
  const datos = ref(null)
  const error = ref('')
  const cargando = ref(false)
  // Qué fila se está guardando, para desactivar su botón mientras viaja.
  const guardando = ref('')

  async function carga() {
    if (!idCorte.value) { datos.value = null; return }
    cargando.value = true
    error.value = ''
    try {
      datos.value = await api.comparacion(idCorte.value, idContra.value)
    } catch (e) {
      error.value = e.message
      datos.value = null
    } finally {
      cargando.value = false
    }
  }

  const clave = (tipo, x) => `${tipo}|${x.carne}`

  /**
   * Marca o desmarca. Se manda `contra` con el id que devolvió la comparación,
   * no con lo elegido en pantalla: si se eligió «el anterior», la marca tiene
   * que quedar atada a ESE corte y no a «el que sea el anterior mañana».
   */
  async function marca(tipo, x, marcada, nota = '') {
    const k = clave(tipo, x)
    guardando.value = k
    error.value = ''
    try {
      await api.marcaRevision(idCorte.value, {
        carne: x.carne, tipo, contra: datos.value.antes.id,
        marcada: marcada ? 'true' : 'false', nota,
      })
      x.marca = marcada ? { nota: nota.trim(), usuario: null, cuando: new Date().toISOString() } : null
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      guardando.value = ''
    }
  }

  const marcadas = computed(() => {
    const d = datos.value
    if (!d) return 0
    return [...d.bajas, ...d.altas, ...d.cambios].filter(x => x.marca).length
  })

  return { datos, error, cargando, guardando, carga, marca, clave, marcadas }
}
