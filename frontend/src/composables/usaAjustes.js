import { ref } from 'vue'
import { api } from '@/api/extraccion'

const TROZO_POR_DEFECTO = 8 * 1024 * 1024

/** Arranque: que puede hacer esta instalacion y de cuanto corta los envios. */
export function usaAjustes() {
  const puedeExtraer = ref(true)
  const trozo = ref(TROZO_POR_DEFECTO)
  const tipos = ref({})

  async function carga() {
    try {
      const a = await api.ajustes()
      // Si la instalacion no extrae hay que OCULTAR el formulario, no solo
      // deshabilitarlo: el servidor recibe los 140 MB enteros antes de poder
      // rechazarlos con 409.
      puedeExtraer.value = a.extraccion !== false
      if (a.trozo_bytes) trozo.value = a.trozo_bytes
    } catch (e) {
      /* instalacion vieja sin /ajustes: se deja como estaba */
    }
    tipos.value = await api.tipos()
  }

  return { puedeExtraer, trozo, tipos, carga }
}
