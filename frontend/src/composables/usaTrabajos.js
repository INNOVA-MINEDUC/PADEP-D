import { ref, onUnmounted } from 'vue'
import { api } from '@/api/extraccion'

// Los cinco estados de la API. Solo los dos primeros siguen vivos.
const VIVOS = ['en_cola', 'extrayendo']

export function usaTrabajos() {
  const lista = ref([])
  const registroDe = ref(null)
  const registro = ref('')
  let timer = null
  let parado = false

  async function refresca() {
    try {
      lista.value = await api.trabajos()
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

  onUnmounted(() => { parado = true; clearTimeout(timer) })

  return { lista, registroDe, registro, refresca, verRegistro, vivo: t => VIVOS.includes(t.estado) }
}
