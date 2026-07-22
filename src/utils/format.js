/** Utilidades de presentación compartidas por las pantallas. */

/** Clase CSS de la píldora según el tono semántico. */
export function pillClass(tone) {
  return ['pill', tone ? `pill--${tone}` : ''].filter(Boolean).join(' ')
}

/** Tono asociado al estatus de un docente. */
export function estatusTone(estatus) {
  if (estatus === 'Retirado') return 'danger'
  if (estatus === 'Graduado') return 'success'
  return 'teal'
}

/** Tono asociado al resultado de admisión. */
export function resultadoTone(resultado) {
  if (resultado === 'Aprobado') return 'success'
  if (resultado === 'No aprobado') return 'danger'
  return ''
}

/** Iniciales para el avatar (máx. 2 letras). */
export function iniciales(nombre = '') {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

/** Pluraliza sin repetir ternarios por toda la app. */
export function plural(n, singular, plural_) {
  return `${n} ${n === 1 ? singular : plural_}`
}
