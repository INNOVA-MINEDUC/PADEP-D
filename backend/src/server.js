import app from './app.js';
import env from './config/env.js';
import db from './models/index.js';
import ensureDatabase from './scripts/ensureDatabase.js';

// Aplica sequelize.sync() segun DB_SYNC / DB_SYNC_MODE.
async function syncDatabase() {
  if (!env.db.sync) {
    console.log('[db] DB_SYNC=false -> no se ejecuta sync()');
    return;
  }
  const opts = {};
  if (env.db.syncMode === 'alter') opts.alter = true;
  else if (env.db.syncMode === 'force') opts.force = true;
  // 'none' -> {} : crea las tablas que no existan, sin tocar las existentes.

  console.log(`[db] sync(${JSON.stringify(opts)}) ...`);
  await db.sequelize.sync(opts);
  console.log('[db] tablas sincronizadas');
}

async function start() {
  try {
    await ensureDatabase();
    await db.sequelize.authenticate();
    console.log(`[db] conectado a ${env.db.name}@${env.db.host}:${env.db.port}`);

    await syncDatabase();

    const server = app.listen(env.port, () => {
      console.log(`[api] escuchando en http://localhost:${env.port}`);
      console.log(`[api] endpoints en http://localhost:${env.port}/api`);
    });

    // Manejo claro cuando el puerto ya esta ocupado (evita el stack crash).
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `[fatal] el puerto ${env.port} ya esta en uso.\n` +
          '        Ya hay otra instancia corriendo, o quedo un proceso node zombie.\n' +
          '        Soluciones:\n' +
          `          - Windows: netstat -ano | findstr :${env.port}  ->  taskkill /F /PID <PID>\n` +
          '          - o cambia PORT en el archivo .env por otro puerto.',
        );
      } else {
        console.error('[fatal] error del servidor:', err.message);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('[fatal] no se pudo arrancar el servidor:', err.message);
    process.exit(1);
  }
}

start();
