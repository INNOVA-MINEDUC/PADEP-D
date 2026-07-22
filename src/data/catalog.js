/**
 * Catálogo estático del prototipo: geografía, navegación y datos semilla.
 * Reemplazar por llamadas a la API cuando exista backend.
 */

export const GEO = {
  Chimaltenango: {
    Chimaltenango: ['EORM Chimaltenango No.1', 'Colegio San José'],
    'Tecpán Guatemala': ['EORM Tecpán Central'],
  },
  Sololá: {
    Sololá: ['EORM Sololá Casco Urbano'],
    Panajachel: ['Escuela Panajachel'],
  },
  Quetzaltenango: {
    Quetzaltenango: ['EORM Quetzaltenango Norte'],
    Salcajá: ['EORM Salcajá'],
  },
}

/** Módulos y pantallas del sidebar. El id de pantalla es la ruta interna. */
export const NAV = [
  {
    id: 'm1', num: 1, title: 'Configuración de Cohorte',
    screens: [
      { id: 1, title: 'Alta de Cohorte' },
      { id: 2, title: 'Sedes y Centros Educativos' },
      { id: 3, title: 'Asignación de Enlaces DIDEDUC' },
    ],
  },
  {
    id: 'm2', num: 2, title: 'Registro Inicial (Docente)',
    screens: [
      { id: 5, title: 'Carga Inicial de Candidatos' },
      { id: 7, title: 'Carga de Resultados de Admisión' },
      { id: 8, title: 'Listado de Inscritos' },
      { id: 9, title: 'Búsqueda y Consulta de Docentes' },
    ],
  },
  {
    id: 'm3', num: 3, title: 'Ficha Académica / Seguimiento',
    screens: [
      { id: 10, title: 'Carga de Notas y Asistencia' },
      { id: 11, title: 'Comparación de Nóminas' },
      { id: 12, title: 'Ficha Académica (detalle)' },
    ],
  },
  {
    id: 'm4', num: 4, title: 'Reportes Dinámicos',
    screens: [
      { id: 13, title: 'Constructor de Reportes' },
      { id: 14, title: 'Vista y Exportación' },
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

export const CURSOS = ['Módulo I: Pedagogía', 'Módulo II: Didáctica', 'Módulo III: Evaluación']
export const PERIODOS = ['2026 - Trimestre 1', '2026 - Trimestre 2']

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
