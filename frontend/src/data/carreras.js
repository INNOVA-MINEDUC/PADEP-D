/**
 * Códigos de carrera del PADEP.
 *
 * El 35 y el 36 NO son cohortes: son los códigos con los que la universidad
 * nombra la carrera. Las dos nóminas dicen `COHORTE = Onceava` —la cohorte es
 * la 11— y se distinguen por esta columna. Confundirlos fue el error de origen
 * que obligó a cambiar el eje del corte, así que la carrera se enseña siempre.
 *
 * La lista no es cerrada: es un catálogo para poner nombre a lo que ya se usa.
 * Un código que no esté aquí se pinta tal cual, no se rechaza.
 */
export const CARRERAS = {
  35: 'preprimaria intercultural',
  36: 'primaria intercultural',
}

/** `35` -> «Carrera 35 — preprimaria intercultural»; desconocida -> «Carrera 99». */
export function etiquetaCarrera(codigo) {
  const nombre = CARRERAS[codigo]
  return nombre ? `Carrera ${codigo} — ${nombre}` : `Carrera ${codigo}`
}
