import { ref, computed, watch, onUnmounted, unref } from 'vue'
import { api } from '@/api/extraccion'

// Los cinco estados de la API. Solo los dos primeros siguen vivos.
const VIVOS = ['en_cola', 'extrayendo']

/**
 * El histórico de trabajos.
 *
 * `GET /extracciones` los devuelve todos; con `?corte=<id>` solo los de ese
 * corte. Aquí se filtra por defecto —quien mira un corte quiere los suyos— pero
 * el interruptor `soloDelCorte` deja ver el histórico entero.
 *
 * **El filtro no puede ser permanente**, y ese es el motivo de que la API lo
 * haga opcional: la cola es UNA y global —un trabajo a la vez, porque una
 * extracción ocupa todos los núcleos—. Si la pantalla filtrase siempre y
 * hubiera una extracción de otro corte en marcha, el usuario vería su trabajo
 * «en cola» sin nada que explicara por qué no arranca.
 *
 * @param {import('vue').Ref<string>} [idCorte] corte por el que filtrar. Sin
 *   él no se filtra nunca y el interruptor no sirve de nada.
 */
export function usaTrabajos(idCorte) {
  const lista = ref([])
  const registroDe = ref(null)
  const registro = ref('')
  // Filtrado de entrada: es lo que quiere ver quien acaba de subir un PDF.
  const soloDelCorte = ref(true)
  let timer = null
  let parado = false

  const filtrando = computed(() => soloDelCorte.value && !!unref(idCorte))

  /**
   * La cola está ocupada por un trabajo que no se está viendo.
   *
   * Se deduce de la lista filtrada en vez de pedir la global: si hay algo
   * nuestro esperando y nada nuestro extrayendo, lo que corre es de otro corte,
   * porque la cola es una sola. Así el aviso no cuesta una segunda petición.
   */
  const bloqueadaPorOtro = computed(() =>
    filtrando.value
    && lista.value.some(t => t.estado === 'en_cola')
    && !lista.value.some(t => t.estado === 'extrayendo'))

  async function refresca() {
    try {
      lista.value = await api.trabajos(filtrando.value ? unref(idCorte) : '')
      if (registroDe.value) {
        registro.value = await api.registro(registroDe.value).catch(() => 'todavia no hay registro')
      }
    } catch (e) {
      /* el servidor se cayo; el siguiente intento lo dira */
    }
    programa()
  }

  // Se reprograma tras cada respuesta, no con setInterval: si el servidor va
  // lento, un interval fijo apila peticiones sobre un backend de un solo worker.
  function programa() {
    clearTimeout(timer)
    if (parado) return
    const hayVivos = lista.value.some(t => VIVOS.includes(t.estado))
    timer = setTimeout(refresca, hayVivos ? 2000 : 15000)
  }

  function verRegistro(id) {
    registroDe.value = registroDe.value === id ? null : id
    registro.value = ''
    if (registroDe.value) refresca()
  }

  // Cambiar de corte o de interruptor relanza la consulta ya: esperar al
  // siguiente tick dejaría en pantalla los trabajos del corte anterior.
  watch([() => unref(idCorte), soloDelCorte], () => { refresca() })

  onUnmounted(() => { parado = true; clearTimeout(timer) })

  return {
    lista, registroDe, registro, soloDelCorte, filtrando, bloqueadaPorOtro,
    refresca, verRegistro, vivo: t => VIVOS.includes(t.estado),
  }
}
