/**
 * Navegación: módulos, pantallas y pasos del asistente de configuración. Los
 * datos salen todos de la API; aquí solo está la forma del menú.
 */

/**
 * Módulos y pantallas del sidebar. El id de pantalla es la ruta interna; el
 * orden del menú es el de esta lista, no el del id.
 *
 * `permiso` es el que hace falta para VER la pantalla: uno, o una lista de la
 * que basta cualquiera. La API pide el suyo en cada ruta y devuelve 403 de
 * todos modos; esto es para no enseñar lo que no se va a poder usar. Un
 * módulo sin ninguna pantalla visible no sale.
 *
 * `oculta: true` = pantalla de detalle: permitida, pero fuera del menú.
 *
 * `soloGlobal: true` = además del permiso, solo para un usuario global (sin
 * unidad). Ver `esGlobal` en la store.
 */
export const NAV = [
  {
    // Se hace una vez por cohorte, meses antes del primer PDF, y en este orden:
    // la cohorte necesita su carrera registrada, las sedes su cohorte y los
    // enlaces sus sedes. Nada de aquí depende de un corte.
    id: 'm1', num: 1, title: 'Configuración de Cohorte',
    screens: [
      { id: 4, title: 'Catálogo de Carreras', permiso: 'reportes.ver' },
      { id: 1, title: 'Cohortes', permiso: 'reportes.ver' },
      { id: 2, title: 'Sedes y Centros Educativos', permiso: 'reportes.ver' },
      { id: 3, title: 'Asignación de Enlaces DIDEDUC', permiso: 'reportes.ver' },
    ],
  },
  {
    // Un solo listado de docentes: buscar, filtrar, exportar y abrir la ficha.
    id: 'm2', num: 2, title: 'Docentes',
    screens: [
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
    // Cada pago: se crea el corte, se suben nómina y PDF, se cura y se carga.
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
      { id: 19, title: 'Bitácora', permiso: 'bitacora.ver' },
      // Las unidades (organizaciones) las da de alta solo un global: un
      // usuario de unidad con el permiso sigue recibiendo 403.
      { id: 18, title: 'Unidades', permiso: 'unidades.gestionar', soloGlobal: true },
    ],
  },
]

/**
 * Pasos del asistente del módulo 1, en orden. `id` es la pantalla; el número
 * que se pinta es la posición. Cada paso tiene su casilla en `checklist`, en
 * el mismo orden.
 */
export const MOD1_STEPS = [
  { id: 4, label: 'Carreras', title: 'Catálogo de Carreras' },
  { id: 1, label: 'Cohorte', title: 'Cohortes' },
  { id: 2, label: 'Sedes', title: 'Sedes y Centros Educativos' },
  { id: 3, label: 'Enlaces', title: 'Asignación de Enlaces' },
]
