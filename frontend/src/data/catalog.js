/**
 * Catálogo estático del prototipo: navegación y datos semilla. La geografía ya
 * sale de la API (`/departamentos`, `/municipios`), no de aquí.
 */

/**
 * Módulos y pantallas del sidebar. El id de pantalla es la ruta interna.
 *
 * `permiso` es el que hace falta para VER la pantalla: uno, o una lista de la
 * que basta cualquiera. La API pide el suyo en cada ruta y devuelve 403 de
 * todos modos; esto es para no enseñar lo que no se va a poder usar. Un
 * módulo sin ninguna pantalla visible no sale.
 *
 * `maqueta: true` = la pantalla todavía pinta datos de ejemplo (`SEED`), no la
 * base. El menú le pone la etiqueta «Vista previa» y la pantalla un aviso,
 * para que nadie tome por reales un docente o un reporte inventados.
 *
 * `oculta: true` = pantalla de detalle: permitida, pero fuera del menú.
 */
export const NAV = [
  {
    id: 'm1', num: 1, title: 'Configuración de Cohorte',
    screens: [
      { id: 1, title: 'Alta de Cohorte', permiso: 'reportes.ver' },
      { id: 2, title: 'Sedes y Centros Educativos', permiso: 'reportes.ver' },
      { id: 3, title: 'Asignación de Enlaces DIDEDUC', permiso: 'reportes.ver' },
      // Junto al asistente y no dentro (no está en MOD1_STEPS): una carrera no
      // es de ninguna cohorte, y la próxima puede volver a tener la 35 y la 36.
      { id: 4, title: 'Catálogo de Carreras', permiso: 'reportes.ver' },
    ],
  },
  // Los módulos 2 y 3 ya no cargan archivos: «Carga Inicial de Candidatos»,
  // «Carga de Resultados de Admisión» y «Carga de Notas y Asistencia» (5, 7 y
  // 10) se retiraron porque duplicaban la extracción del módulo 5 —los mismos
  // documentos, pero con una subida simulada—. Aquí solo quedan las pantallas
  // de consulta.
  {
    id: 'm2', num: 2, title: 'Registro Inicial (Docente)',
    screens: [
      { id: 8, title: 'Listado de Inscritos', permiso: 'reportes.ver' },
      { id: 9, title: 'Búsqueda y Consulta de Docentes', permiso: 'reportes.ver' },
    ],
  },
  {
    id: 'm3', num: 3, title: 'Ficha Académica / Seguimiento',
    screens: [
      { id: 11, title: 'Comparación de Nóminas', permiso: 'reportes.ver' },
      { id: 10, title: 'Seguimiento de Estatus', permiso: 'reportes.ver' },
      // La ficha es un detalle: se abre desde la búsqueda, la comparación o el
      // seguimiento, con una persona ya elegida. No va en el menú (`oculta`),
      // pero sigue aquí para que `goTo` la permita y la miga diga dónde está.
      { id: 12, title: 'Ficha del docente', permiso: 'reportes.ver', oculta: true },
    ],
  },
  {
    id: 'm4', num: 4, title: 'Reportes Dinámicos',
    screens: [
      { id: 13, title: 'Constructor de Reportes', permiso: 'reportes.ver' },
      { id: 14, title: 'Reportes Guardados', permiso: 'reportes.ver' },
    ],
  },
  {
    id: 'm5', num: 5, title: 'Extracción y Carga',
    screens: [
      { id: 15, title: 'Extracción de Documentos', permiso: ['documentos.cargar', 'extraccion.ejecutar'] },
      { id: 16, title: 'Completar a Mano', permiso: 'incidencias.resolver' },
    ],
  },
  {
    id: 'm6', num: 6, title: 'Administración',
    screens: [
      { id: 17, title: 'Usuarios y Roles', permiso: 'usuarios.gestionar' },
    ],
  },
]

/** Pasos del stepper del módulo 1. */
export const MOD1_STEPS = [
  { id: 1, label: 'Cohorte' },
  { id: 2, label: 'Sedes' },
  { id: 3, label: 'Enlaces' },
]
