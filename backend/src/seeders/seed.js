// Poblado inicial: roles (los 5 del esquema), permisos base, catalogos
// minimos del esquema v3 y el usuario administrador.
//   npm run seed
import db from '../models/index.js';
import env from '../config/env.js';
import ensureDatabase from '../scripts/ensureDatabase.js';
import { ROLE_NAMES, ADMIN_ROLE } from '../config/roles.js';

const {
  Rol, Permiso, RolPermiso, Usuario,
  Departamento, DireccionMineduc, Jornada, TipoDocumento,
} = db;

const PERMISOS = [
  { codigo: 'usuarios.gestionar', descripcion: 'Crear y administrar usuarios' },
  { codigo: 'cohortes.gestionar', descripcion: 'Gestionar cohortes y semestres' },
  { codigo: 'documentos.cargar', descripcion: 'Cargar documentos de un corte' },
  { codigo: 'extraccion.ejecutar', descripcion: 'Ejecutar extracciones' },
  { codigo: 'reportes.ver', descripcion: 'Ver reportes y consultas' },
  { codigo: 'incidencias.resolver', descripcion: 'Resolver incidencias de calidad' },
];

const DEPARTAMENTOS = [
  'Guatemala', 'El Progreso', 'Sacatepequez', 'Chimaltenango', 'Escuintla',
  'Santa Rosa', 'Solola', 'Totonicapan', 'Quetzaltenango', 'Suchitepequez',
  'Retalhuleu', 'San Marcos', 'Huehuetenango', 'Quiche', 'Baja Verapaz',
  'Alta Verapaz', 'Peten', 'Izabal', 'Zacapa', 'Chiquimula', 'Jalapa', 'Jutiapa',
];

const DIRECCIONES = [
  { codigo: 'DIGECADE', nombre: 'Direccion General de Gestion de Calidad Educativa' },
  { codigo: 'DIGEBI', nombre: 'Direccion General de Educacion Bilingue Intercultural' },
];

const JORNADAS = ['Matutina', 'Vespertina', 'Doble', 'Nocturna'];

const TIPOS_DOC = [
  { codigo: 'asistencia', nombre: 'Control de asistencia', extraible: true, script: 'extraer_asistencia.py' },
  { codigo: 'control_academico', nombre: 'Control academico', extraible: true, script: 'extraer_control_academico.py' },
  { codigo: 'reporte_resultados', nombre: 'Reporte de resultados', extraible: true, script: 'extraer_reporte_resultados.py' },
  { codigo: 'ubicacion_sedes', nombre: 'Ubicacion de sedes', extraible: true, script: 'extraer_ubicacion_sedes.py' },
  { codigo: 'listado_docentes', nombre: 'Listado de catedraticos', extraible: true, script: 'extraer_docentes.py' },
  { codigo: 'nomina', nombre: 'Nomina del pago', extraible: true, script: null },
  { codigo: 'calendario', nombre: 'Calendario del corte', extraible: false, script: null },
  { codigo: 'carta_convenio', nombre: 'Carta convenio', extraible: false, script: null },
  { codigo: 'acta', nombre: 'Acta', extraible: false, script: null },
  { codigo: 'otro', nombre: 'Otro documento', extraible: false, script: null },
];

async function run() {
  await ensureDatabase();
  await db.sequelize.authenticate();
  // Asegura que existan las tablas antes de poblar.
  await db.sequelize.sync({ alter: true });

  // ---- Roles ----
  for (const nombre of ROLE_NAMES) {
    await Rol.findOrCreate({ where: { nombre }, defaults: { nombre } });
  }
  console.log(`[seed] roles: ${ROLE_NAMES.join(', ')}`);

  // ---- Permisos ----
  for (const p of PERMISOS) {
    await Permiso.findOrCreate({ where: { codigo: p.codigo }, defaults: p });
  }

  // ---- El admin (DIGECADE) recibe todos los permisos ----
  const rolAdmin = await Rol.findOne({ where: { nombre: ADMIN_ROLE } });
  const permisos = await Permiso.findAll();
  for (const permiso of permisos) {
    await RolPermiso.findOrCreate({
      where: { id_rol: rolAdmin.id_rol, id_permiso: permiso.id_permiso },
      defaults: { id_rol: rolAdmin.id_rol, id_permiso: permiso.id_permiso },
    });
  }
  console.log(`[seed] permisos asignados al rol ${ADMIN_ROLE}`);

  // ---- Catalogos base ----
  for (const nombre of DEPARTAMENTOS) {
    await Departamento.findOrCreate({ where: { nombre }, defaults: { nombre } });
  }
  for (const d of DIRECCIONES) {
    await DireccionMineduc.findOrCreate({ where: { codigo: d.codigo }, defaults: d });
  }
  for (const nombre of JORNADAS) {
    await Jornada.findOrCreate({ where: { nombre }, defaults: { nombre } });
  }
  for (const t of TIPOS_DOC) {
    await TipoDocumento.findOrCreate({ where: { codigo: t.codigo }, defaults: t });
  }
  console.log('[seed] catalogos base cargados');

  // ---- Usuario administrador ----
  const { nombre, email, password } = env.auth.seedAdmin;
  const [, creado] = await Usuario.findOrCreate({
    where: { email },
    defaults: { nombre, email, password_hash: password, id_rol: rolAdmin.id_rol },
  });
  if (creado) {
    console.log(`[seed] admin creado -> ${email} / ${password} (rol ${ADMIN_ROLE})`);
  } else {
    console.log(`[seed] admin ya existia -> ${email}`);
  }

  console.log('[seed] listo');
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] fallo:', err);
  process.exit(1);
});
