import { ref, computed } from 'vue'
import { api } from '@/api/extraccion'

const LLAVE = 'padep.corte'

// Los ids de antes —'35-s3-c1' del cambio de eje, '11-car35-t6-c1' de antes de
// las unidades— no casan con el patrón nuevo y la API los rechaza con 422 en
// TODAS las rutas con `{id_corte}`: la pantalla se ve rota sin decir por qué.
// Se descarta el guardado antes de que llegue a usarse, sin esperar a la
// lista, porque las llamadas de las otras pantallas pueden salir antes de que
// `carga()` conteste. La unidad va delante y no lleva guion
// (`digecade-11-car35-t6-c1`).
const PATRON = /^[a-z][a-z0-9_]*-\d+-car\d+-t\d+-c\d+$/

function guardado() {
  const id = localStorage.getItem(LLAVE) || ''
  if (id && !PATRON.test(id)) {
    localStorage.removeItem(LLAVE)
    return ''
  }
  return id
}

/**
 * El corte manda: sin uno elegido no se puede subir nada, porque no habria
 * donde dejarlo. Se recuerda en localStorage o se pierde en cada refresco.
 */
export function usaCortes() {
  const lista = ref([])
  const elegido = ref(guardado())

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
    // Segundo filtro: el patrón solo descarta lo de otra época; esto descarta
    // tambien el corte que se borro, el de otra instalacion y el de otra
    // unidad (`api.cortes` ya trae solo los de la unidad de trabajo).
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
