import { reactive } from 'vue'

/**
 * Códigos de carrera del PADEP.
 *
 * El 35 y el 36 NO son cohortes: son los códigos con los que la universidad
 * nombra la carrera. Las dos nóminas dicen `COHORTE = Onceava` —la cohorte es
 * la 11— y se distinguen por esta columna. Confundirlos fue el error de origen
 * que obligó a cambiar el eje del corte, así que la carrera se enseña siempre.
 *
 * La lista ya no es fija: arranca con los nombres cortos de siempre y la store
 * le suma lo que haya en el catálogo de la base (`GET /carreras`) al entrar.
 * Es reactiva, así que las pantallas montadas se repintan cuando llega. Si la
 * API no responde se queda con estas dos, como antes.
 *
 * **El código es de la unidad**: la «35» de otra unidad es otra carrera. Por
 * eso la lista es la de la unidad de trabajo y se rehace al cambiar de unidad
 * (`reiniciaCatalogo`), y los nombres cortos van por unidad: son los que conoce
 * la gente de DIGECADE y no valen para la 35 de nadie más.
 */
const CORTOS = {
  digecade: {
    35: 'preprimaria intercultural',
    36: 'primaria intercultural',
  },
}

export const CARRERAS = reactive({ ...CORTOS.digecade })

// Códigos que trae la base. Antes de leerla, null: no se sabe, y las pestañas
// de S08 siguen enseñando las de arriba.
export const enBase = reactive({ codigos: null })

/** Vacía la lista y deja solo los nombres cortos de esa unidad (si los tiene). */
export function reiniciaCatalogo(unidad) {
  for (const k of Object.keys(CARRERAS)) delete CARRERAS[k]
  Object.assign(CARRERAS, CORTOS[unidad] ?? {})
  enBase.codigos = null
}

/**
 * Suma el catálogo de la base (ya limitado a la unidad de trabajo, ver
 * `api.carreras`). Los nombres cortos no se pisan —son los que ya conoce la
 * gente—; las carreras nuevas entran con el suyo.
 * @param {import('@/api/tipos').Carrera[]} lista
 */
export function fijaCatalogo(lista) {
  for (const c of lista) {
    if (!(c.codigo in CARRERAS)) CARRERAS[c.codigo] = c.nombre
  }
  enBase.codigos = lista.map(c => String(c.codigo))
}

/** `35` -> «Carrera 35 — preprimaria intercultural»; desconocida -> «Carrera 99». */
export function etiquetaCarrera(codigo) {
  const nombre = CARRERAS[codigo]
  return nombre ? `Carrera ${codigo} — ${nombre}` : `Carrera ${codigo}`
}
