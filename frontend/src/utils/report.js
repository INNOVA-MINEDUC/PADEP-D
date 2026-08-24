import { REPORT_VARIABLES } from '@/data/catalog'

/**
 * Resolvedores de columna del constructor de reportes.
 * Cada clave corresponde a una variable seleccionable; recibe el docente ya
 * resuelto (con overrides) y el código de cohorte activo.
 */
export const COLUMN_RESOLVERS = {
  Cohorte:    (d, cohorte) => cohorte,
  Sede:       d => d.sede,
  Estatus:    d => d.estatus,
  Periodo:    () => '2026 - T1',
  Notas:      d => d.notas,
  Asistencia: d => d.asistencia,
  Actas:      d => (d.estatus === 'Graduado' ? 'Acta emitida' : '—'),
}

/** Construye las celdas de una fila para las columnas indicadas. */
export function buildRow(docente, columnas, cohorte) {
  return {
    id: docente.id,
    nombre: docente.nombre,
    cells: columnas.map(c => COLUMN_RESOLVERS[c]?.(docente, cohorte) ?? '—'),
  }
}

export { REPORT_VARIABLES }
