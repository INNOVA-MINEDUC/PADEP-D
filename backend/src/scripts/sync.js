// Crea/ajusta todas las tablas sin arrancar el servidor.
//   node src/scripts/sync.js          -> sync({ alter: true })
//   node src/scripts/sync.js --force  -> sync({ force: true }) (BORRA y recrea)
import db from '../models/index.js';
import ensureDatabase from './ensureDatabase.js';

async function run() {
  const force = process.argv.includes('--force');
  try {
    await ensureDatabase();
    await db.sequelize.authenticate();
    await db.sequelize.sync(force ? { force: true } : { alter: true });
    console.log(`[db] sync completo (${force ? 'force' : 'alter'})`);
    process.exit(0);
  } catch (err) {
    console.error('[db] sync fallo:', err.message);
    process.exit(1);
  }
}

run();
