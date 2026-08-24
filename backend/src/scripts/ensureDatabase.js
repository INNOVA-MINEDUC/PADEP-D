import mysql from 'mysql2/promise';
import env from '../config/env.js';

// Crea la base de datos si no existe (Sequelize no crea la BD, solo tablas).
export default async function ensureDatabase() {
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
