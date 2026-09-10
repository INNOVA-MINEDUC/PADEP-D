// Puebla SOLO las tablas de autenticacion: Rol, Permiso, RolPermiso y Usuario.
//   node src/seeders/seed_auth.js
//
// Existe aparte de `seed.js` por una linea: aquel empieza con
// `sequelize.sync({ alter: true })` y aqui no se sincroniza nada.
//
// El motivo. Los modelos de este backend todavia describen el esquema v3
// —`models/programa.js` define `Semestre` y `Corte.id_semestre`— y la base ya
// esta en v4: no hay `Semestre`, hay `Trimestre`, y `Corte` lleva
// `id_trimestre`. Un `alter: true` intentaria reconciliar las dos cosas
// recreando `Semestre` y reformando `Corte` encima de datos ya cargados.
//
// Las cuatro tablas de auth son de este backend y coinciden con sus modelos,
// asi que insertar en ellas no toca nada del esquema de extraccion. Todo va con
// findOrCreate: correrlo dos veces no duplica ni pisa nada.
//
// Cuando los modelos se pasen a v4, esto vuelve a ser innecesario y `seed.js`
// sirve otra vez.
import db from '../models/index.js';
import env from '../config/env.js';
import { ROLE_NAMES, ADMIN_ROLE } from '../config/roles.js';

const { Rol, Permiso, RolPermiso, Usuario } = db;

const PERMISOS = [
  { codigo: 'usuarios.gestionar', descripcion: 'Crear y administrar usuarios' },
  { codigo: 'cohortes.gestionar', descripcion: 'Gestionar cohortes y trimestres' },
  { codigo: 'documentos.cargar', descripcion: 'Cargar documentos de un corte' },
  { codigo: 'extraccion.ejecutar', descripcion: 'Ejecutar extracciones' },
  { codigo: 'reportes.ver', descripcion: 'Ver reportes y consultas' },
  { codigo: 'incidencias.resolver', descripcion: 'Resolver incidencias de calidad' },
];

async function run() {
  await db.sequelize.authenticate();

  for (const nombre of ROLE_NAMES) {
    await Rol.findOrCreate({ where: { nombre }, defaults: { nombre } });
  }
  console.log(`[auth] roles: ${ROLE_NAMES.join(', ')}`);

  for (const p of PERMISOS) {
    await Permiso.findOrCreate({ where: { codigo: p.codigo }, defaults: p });
  }

  const rolAdmin = await Rol.findOne({ where: { nombre: ADMIN_ROLE } });
  if (!rolAdmin) throw new Error(`no se creo el rol ${ADMIN_ROLE}`);

  for (const permiso of await Permiso.findAll()) {
    await RolPermiso.findOrCreate({
      where: { id_rol: rolAdmin.id_rol, id_permiso: permiso.id_permiso },
      defaults: { id_rol: rolAdmin.id_rol, id_permiso: permiso.id_permiso },
    });
  }
  console.log(`[auth] permisos asignados al rol ${ADMIN_ROLE}`);

  // El hook beforeCreate del modelo hashea `password_hash`, asi que aqui va en
  // claro: escribirlo ya hasheado lo hashearia dos veces.
  const { nombre, email, password } = env.auth.seedAdmin;
  const [, creado] = await Usuario.findOrCreate({
    where: { email },
    defaults: { nombre, email, password_hash: password, id_rol: rolAdmin.id_rol },
  });
  console.log(creado
    ? `[auth] admin creado -> ${email} (rol ${ADMIN_ROLE})`
    : `[auth] admin ya existia -> ${email}`);

  console.log('[auth] listo');
  process.exit(0);
}

run().catch((err) => {
  console.error('[auth] fallo:', err);
  process.exit(1);
});
