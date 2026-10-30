import { ref, computed } from 'vue'
import { api } from '@/api/extraccion'
import { usePadep } from '@/stores/padep'
import { etiquetaCarrera } from '@/data/carreras'

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

// Fuera de la función a propósito: el corte se elige UNA vez, en la cabecera,
// y todas las pantallas que trabajan sobre él (Extracción, Completar a mano,
// Comparación) ven el mismo. Antes cada una tenía su selector y su copia, y
// solo compartían la llave de localStorage: elegir en una no avisaba a las
// demás.
const lista = ref([])
const elegido = ref(guardado())

/**
 * «Cohorte 11 · Carrera 35 — preprimaria intercultural · trimestre 6».
 *
 * La carrera va en la etiqueta porque es lo único que separa dos cortes del
 * mismo trimestre: la 35 y la 36 son las dos de la cohorte 11. El número de
 * corte solo aparece si NO es el 1: hoy siempre vale 1, pero el día que haya
 * una segunda entrega en el mismo trimestre es lo único que las distingue.
 */
export function nombreCorte(c) {
  const base = `Cohorte ${c.cohorte} · ${etiquetaCarrera(c.carrera)} · trimestre ${c.trimestre}`
  return c.corte === 1 ? base : `${base} · corte ${c.corte}`
}

/**
 * El corte manda: sin uno elegido no se puede subir nada, porque no habria
 * donde dejarlo. Se recuerda en localStorage o se pierde en cada refresco.
 */
export function usaCortes() {
  const { sigueCorte } = usePadep()

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
    sigueCorte(lista.value.find(c => c.id === id))
  }

  return { lista, elegido, corte, puedeEntregar, puedeCargar, extraidos, carga, elige }
}
