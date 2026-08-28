import { ref, computed } from 'vue'
import { api } from '@/api/extraccion'

const LLAVE = 'padep.corte'

/**
 * El corte manda: sin uno elegido no se puede subir nada, porque no habria
 * donde dejarlo. Se recuerda en localStorage o se pierde en cada refresco.
 */
export function usaCortes() {
  const lista = ref([])
  const elegido = ref(localStorage.getItem(LLAVE) || '')

  const corte = computed(() => lista.value.find(c => c.id === elegido.value))

  // `falta_para_entregar` es una lista de textos y vacia significa que se puede
  // entregar. No se recalcula mirando documentos y nomina: lo resuelve el
  // backend y puede cambiar de criterio.
  const puedeEntregar = computed(() => !!corte.value && !corte.value.falta_para_entregar.length)
  const puedeCargar = computed(() => !!corte.value?.entregado)

  const extraidos = computed(() =>
    corte.value ? Object.values(corte.value.documentos).filter(d => d.extraido).length : 0)

  async function carga() {
    lista.value = await api.cortes()
    if (!lista.value.some(c => c.id === elegido.value)) {
      elige(lista.value.length ? lista.value[0].id : '')
    }
  }

  function elige(id) {
    elegido.value = id
    if (id) localStorage.setItem(LLAVE, id)
    else localStorage.removeItem(LLAVE)
  }

  return { lista, elegido, corte, puedeEntregar, puedeCargar, extraidos, carga, elige }
}
