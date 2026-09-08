import mysql from 'mysql2/promise';
import env from '../config/env.js';

// Crea la base de datos si no existe (Sequelize no crea la BD, solo tablas).
//
// En produccion la BD ya esta creada y el usuario de la app normalmente solo
// tiene permisos sobre su esquema, no CREATE global: alli va DB_ENSURE=false y
// esto ni abre la conexion. Sin esa salida temprana el arranque moriria con
// 'Access denied' aunque la base estuviera perfectamente.
export default async function ensureDatabase() {
  if (!env.db.ensure) {
    console.log(`[db] DB_ENSURE=false -> se asume que '${env.db.name}' ya existe`);
    return;
  }

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.pass,
    multipleStatements: false,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` ` +
      'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );
    console.log(`[db] base '${env.db.name}' verificada/creada`);
  } finally {
    await conn.end();
  }
}
