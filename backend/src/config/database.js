import { Sequelize } from 'sequelize';
import env from './env.js';

// Instancia unica de Sequelize para toda la app.
const sequelize = new Sequelize(env.db.name, env.db.user, env.db.pass, {
  host: env.db.host,
  port: env.db.port,
  dialect: env.db.dialect,
  logging: env.db.logging ? (msg) => console.log(`[sql] ${msg}`) : false,
  define: {
    // El esquema v3 usa nombres PascalCase y snake_case en columnas;
    // no dejamos que Sequelize pluralice ni invente tablas.
    freezeTableName: true,
    timestamps: false,
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

export default sequelize;
