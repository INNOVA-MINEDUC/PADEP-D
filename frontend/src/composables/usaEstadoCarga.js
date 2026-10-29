import { ref, watch } from 'vue'
import { api } from '@/api/extraccion'

/**
 * `GET /cortes/{id}/carga`: si el corte ya esta en la base y, si no, por que.
 *
 * Tiene tres formas y las tres llegan con 200:
 *
 *   {disponible: false, motivo, pista}          base caida o esquema viejo
 *   {disponible: true, cargado: false, motivo}  aun no se ha cargado
 *   {disponible: true, cargado: true, cuentas}  cargado
 *
 * `disponible: false` NO es un error: lo normal es que la base no este
 * levantada, y entonces se pinta el motivo y el resto de la pantalla sigue
 * funcionando. Por eso esto no comparte el `error` de la pantalla ni corta
 * nada: lo peor que puede pasar es que no se sepa, y eso tambien se dice.
 */
export function usaEstadoCarga(idCorte) {
  const estado = ref(null) // null = todavia no se ha preguntado

  async function refresca() {
    if (!idCorte.value) { estado.value = null; return }
    try {
      estado.value = await api.estadoCarga(idCorte.value)
    } catch (e) {
      // Un fallo de red o un 502 del proxy se pintan con la misma forma que el
      // «no disponible» del servidor: para quien mira son lo mismo.
      estado.value = { disponible: false, motivo: e.message }
    }
  }

  watch(idCorte, refresca, { immediate: true })

  return { estado, refresca }
}
