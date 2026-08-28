// Carga .env una sola vez y expone la configuracion validada.
import 'dotenv/config';

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined || val === '') {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return val;
}

function bool(name, fallback = false) {
  const val = process.env[name];
  if (val === undefined) return fallback;
  return String(val).toLowerCase() === 'true';
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),

  db: {
    host: required('DB_HOST', '127.0.0.1'),
    port: Number(process.env.DB_PORT || 3306),
    name: required('DB_NAME', 'padep'),
    user: required('DB_USER', 'root'),
    pass: process.env.DB_PASS ?? 'root',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: bool('DB_LOGGING', false),
    sync: bool('DB_SYNC', true),
    // 'alter' | 'force' | 'none'
    syncMode: (process.env.DB_SYNC_MODE || 'alter').toLowerCase(),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  auth: {
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
    seedAdmin: {
      nombre: process.env.SEED_ADMIN_NOMBRE || 'Administrador PADEP',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@mineduc.edu.gt',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin123*',
    },
  },

  // API de extraccion (FastAPI). Este backend hace de puerta unica: el
  // navegador solo habla con Express y Express reenvia /api/extraccion/*.
  extraccion: {
    url: process.env.EXTRACCION_URL || 'http://127.0.0.1:8000',
    // Solo si la API de extraccion vive tras un nginx con auth_basic.
    basicUser: process.env.EXTRACCION_BASIC_USER || '',
    basicPass: process.env.EXTRACCION_BASIC_PASS || '',
    // Inactividad del socket, no duracion total: las rutas que encolan
    // responden 202 al instante y el trabajo largo va por su cuenta.
    timeoutMs: Number(process.env.EXTRACCION_TIMEOUT_MS || 30000),
  },

  corsOrigin: process.env.CORS_ORIGIN || '*',
};

export default env;
