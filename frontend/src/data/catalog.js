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
      { id: 11, title: 'Comparación de Nóminas', permiso: 'reportes.ver', maqueta: true },
      { id: 12, title: 'Ficha Académica (detalle)', permiso: 'reportes.ver', maqueta: true },
    ],
  },
  {
    id: 'm4', num: 4, title: 'Reportes Dinámicos',
    screens: [
      { id: 13, title: 'Constructor de Reportes', permiso: 'reportes.ver', maqueta: true },
      { id: 14, title: 'Vista y Exportación', permiso: 'reportes.ver', maqueta: true },
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

/** Variables disponibles en el constructor de reportes. */
export const REPORT_VARIABLES = ['Cohorte', 'Sede', 'Estatus', 'Periodo', 'Notas', 'Asistencia', 'Actas']

/** Docentes semilla. */
export const SEED = [
  { id: 'D-001', nombre: 'María Xiquín Xoy',    idioma: 'Kaqchikel',   etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Chimaltenango',  municipio: 'Chimaltenango',      sede: 'EORM Chimaltenango No.1',   escalafon: 'B', dpi: '2451 08812 0101', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '88', asistencia: '96%',  estatus: 'Activo'   },
  { id: 'D-002', nombre: 'Carlos Sicay Bal',    idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Chimaltenango',  municipio: 'Tecpán Guatemala',   sede: 'EORM Tecpán Central',       escalafon: 'A', dpi: '1932 44120 0101', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '76', asistencia: '89%',  estatus: 'Activo'   },
  { id: 'D-003', nombre: 'Ana Lucía Tuy Pop',   idioma: "K'iche'",     etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Sololá',         municipio: 'Sololá',             sede: 'EORM Sololá Casco Urbano',  escalafon: 'C', dpi: '3012 77841 0701', incompleto: true,  resultado: 'No aprobado', inscripcionFinal: false, notas: '-',  asistencia: '-',    estatus: 'Retirado' },
  { id: 'D-004', nombre: 'José Ramírez Coyoy',  idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Sololá',         municipio: 'Panajachel',         sede: 'Escuela Panajachel',        escalafon: 'A', dpi: '1774 90233 0701', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '91', asistencia: '100%', estatus: 'Graduado' },
  { id: 'D-005', nombre: 'Diego Alonzo Ixchop', idioma: "Q'anjob'al",  etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Quetzaltenango', municipio: 'Quetzaltenango',     sede: 'EORM Quetzaltenango Norte', escalafon: 'B', dpi: '2288 10091 1201', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '82', asistencia: '93%',  estatus: 'Activo'   },
  { id: 'D-006', nombre: 'Rosa Elvira Saquic',  idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Quetzaltenango', municipio: 'Salcajá',            sede: 'EORM Salcajá',              escalafon: 'C', dpi: '3390 65214 1201', incompleto: false, resultado: '-',           inscripcionFinal: false, notas: '-',  asistencia: '-',    estatus: 'Activo'   },
  { id: 'D-007', nombre: 'Pedro Esteban Ajpop', idioma: "K'iche'",     etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Chimaltenango',  municipio: 'Tecpán Guatemala',   sede: 'EORM Tecpán Central',       escalafon: 'B', dpi: '2611 33210 0101', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '94', asistencia: '98%',  estatus: 'Graduado' },
  { id: 'D-008', nombre: 'Marta Julia Cotzal',  idioma: 'Kaqchikel',   etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Chimaltenango',  municipio: 'Chimaltenango',      sede: 'Colegio San José',          escalafon: 'A', dpi: '2455 91002 0101', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '79', asistencia: '91%',  estatus: 'Activo'   },
  { id: 'D-009', nombre: 'Byron Estuardo Cuc',  idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Sololá',         municipio: 'Sololá',             sede: 'EORM Sololá Casco Urbano',  escalafon: 'B', dpi: '3055 12897 0701', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '85', asistencia: '94%',  estatus: 'Activo'   },
  { id: 'D-010', nombre: 'Silvia Patricia Chox',idioma: 'Kaqchikel',   etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Sololá',         municipio: 'Panajachel',         sede: 'Escuela Panajachel',        escalafon: 'C', dpi: '3311 44520 0701', incompleto: false, resultado: 'No aprobado', inscripcionFinal: false, notas: '-',  asistencia: '-',    estatus: 'Retirado' },
  { id: 'D-011', nombre: 'Hugo Fernando Batz',  idioma: 'Español',     etnia: 'Ladino', nivel: 'Diversificado', departamento: 'Quetzaltenango', municipio: 'Quetzaltenango',     sede: 'EORM Quetzaltenango Norte', escalafon: 'A', dpi: '2299 77341 1201', incompleto: false, resultado: 'Aprobado',    inscripcionFinal: true,  notas: '97', asistencia: '100%', estatus: 'Graduado' },
  { id: 'D-012', nombre: 'Claudia Beatriz Us',  idioma: "Q'anjob'al",  etnia: 'Maya',   nivel: 'Diversificado', departamento: 'Quetzaltenango', municipio: 'Salcajá',            sede: 'EORM Salcajá',              escalafon: 'B', dpi: '3398 20044 1201', incompleto: true,  resultado: '-',           inscripcionFinal: false, notas: '-',  asistencia: '-',    estatus: 'Activo'   },
]
