import { ref } from 'vue'
import { api } from '@/api/extraccion'
import { usePadep } from '@/stores/padep'

/**
 * Configuracion de cohorte: sedes y enlaces de DIDEDUC (CAMBIOS_FRONTEND §8).
 *
 * La lista vive en el store —`CohorteContext` la cuenta en las tres
 * pantallas—; aqui solo el error y el aviso de cada pantalla, y las escrituras.
 * Nada se guarda «al final»: cada accion es una peticion, y despues se relee la
 * lista entera. Son decenas de filas, y asi el resumen nunca miente.
 *
 * Los `detail` de la API se ensenan tal cual y no se reintenta nada: 409 al
 * quitar una sede con datos cargados o al borrar a alguien asignado, 404 si la
 * cohorte no esta en la base, 503 si MySQL no responde.
 */
export function usaCohorte() {
  const { state, cargaConfiguracion, pideConfirmacion } = usePadep()
  const error = ref('')
  const aviso = ref('')
  const ocupado = ref(false)

  // `||=`: si la escritura ya fallo, su error es el que importa, no el de releer.
  const carga = () => cargaConfiguracion().catch(e => { error.value ||= e.message })

  /** Corre `fn(codigo)` y relee. Devuelve lo que devuelva `fn` (o `true`), o `null` si fallo. */
  async function escribe(fn) {
    error.value = ''
    aviso.value = ''
    ocupado.value = true
    try {
      return (await fn(state.cohorte.codigo)) ?? true
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      ocupado.value = false
      await carga()
    }
  }

  const creaCohorte = (campos) => escribe(() => api.creaCohorte(campos))

  // La escuela va por nombre: si ya existe en el municipio se reutiliza.
  const agregaSede = (campos) => escribe(c => api.agregaSede(c, campos))

  const quitaSede = (s) => pideConfirmacion(
    'Quitar sede de la cohorte',
    `¿Quitar ${s.escuela} de la cohorte ${state.cohorte.codigo}?`
      + (s.enlace ? ` ${s.enlace.nombre} dejará de llevarla.` : ''),
    'Quitar',
    () => escribe(async c => {
      const r = await api.quitaSede(c, s.id_cohorte_sede)
      if (r.enlace_liberado) aviso.value = `Se quitó ${r.quitada}; ${r.enlace_liberado} dejó de llevarla.`
    }))

  // Reasignar desplaza a quien la llevaba: se confirma antes con el dato de la
  // fila y se avisa despues con `sustituyo`, que es lo que dice el servidor.
  function asigna(s, idEnlace) {
    const hecho = () => escribe(async c => {
      const r = await api.asigna(c, s.id_cohorte_sede, idEnlace)
      if (r.sustituyo) aviso.value = `${r.sede}: ahora la lleva ${r.enlace}, en lugar de ${r.sustituyo.nombre}.`
    })
    if (!s.enlace || s.enlace.id_enlace === idEnlace) return hecho()
    pideConfirmacion('Reemplazar enlace', `${s.escuela} la lleva ${s.enlace.nombre}. ¿Reemplazar?`,
      'Reemplazar', hecho)
  }

  const desasigna = (s) => escribe(c => api.desasigna(c, s.id_cohorte_sede))

  // La persona es global: se crea sin sede y sin cohorte. El PUT no es un
  // PATCH, asi que `campos` tiene que ir entero. Devuelve el `Enlace`.
  const guardaEnlace = (campos, id) =>
    escribe(() => (id ? api.editaEnlace(id, campos) : api.creaEnlace(campos)))

  const borraEnlace = (e) => pideConfirmacion(
    'Borrar enlace', `¿Borrar a ${e.nombre}? No se puede deshacer.`, 'Borrar',
    () => escribe(() => api.borraEnlace(e.id_enlace)))

  return { error, aviso, ocupado, carga, creaCohorte, agregaSede, quitaSede,
    asigna, desasigna, guardaEnlace, borraEnlace }
}
