/** Utilidades de presentación compartidas por las pantallas. */

/** Clase CSS de la píldora según el tono semántico. */
export function pillClass(tone) {
  return ['pill', tone ? `pill--${tone}` : ''].filter(Boolean).join(' ')
}

/**
 * Tono asociado al estatus de un docente. Sin distinguir mayúsculas: la API
 * dice `activo` y la maqueta de S12 todavía dice `Activo`.
 */
export function estatusTone(estatus = '') {
  const e = String(estatus).toLowerCase()
  if (e === 'retirado') return 'danger'
  if (e === 'graduado') return 'success'
  return 'teal'
}

/**
 * Tono del `estado` de una nota. CDR (derecho a recuperación) no es un
 * suspenso: va en ámbar, no en rojo.
 */
export function estadoNotaTone(estado) {
  if (estado === 'APROBADO') return 'success'
  if (estado === 'CDR') return 'clay'
  if (estado === 'REPROBADO') return 'danger'
  return ''
}

/** `activo` -> `Activo`. La API manda los estatus en minúscula. */
export function capital(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : ''
}

/** Iniciales para el avatar (máx. 2 letras). */
export function iniciales(nombre = '') {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

/** Pluraliza sin repetir ternarios por toda la app. */
export function plural(n, singular, plural_) {
  return `${n} ${n === 1 ? singular : plural_}`
}
