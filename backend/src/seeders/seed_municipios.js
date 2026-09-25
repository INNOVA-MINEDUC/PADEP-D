// Puebla SOLO `Municipio` con los 340 municipios oficiales.
//   node src/seeders/seed_municipios.js
//
// Hasta ahora el catalogo era «lo que la base ha visto»: lo llenaba la carga de
// nominas y PDF, y la pantalla de Sedes no podia elegir un municipio que aun no
// hubiera llegado en ningun archivo. Con esto se elige cualquiera desde el dia
// uno, antes de cargar nada.
//
// Mismas reglas que `seed_auth.js`: nada de `sync`, y todo con findOrCreate
// por (departamento, nombre), asi que correrlo dos veces no duplica nada y los
// municipios que ya trajo una carga se respetan tal cual. La comparacion la
// hace MySQL con utf8mb4_unicode_ci: 'Coban' encuentra 'Cobán'.
//
// No crea departamentos: los 22 vienen del esquema. Si falta uno, para antes
// de escribir nada.
import db from '../models/index.js';
import MUNICIPIOS from './data/municipios.js';

const { sequelize, Departamento, Municipio } = db;

async function run() {
  const t = await sequelize.transaction();
  let creados = 0;
  try {
    for (const [depto, nombres] of Object.entries(MUNICIPIOS)) {
      const d = await Departamento.findOne({ where: { nombre: depto }, transaction: t });
      if (!d) throw new Error(`no existe el departamento '${depto}'`);
      for (const nombre of nombres) {
        const [, creado] = await Municipio.findOrCreate({
          where: { id_departamento: d.id_departamento, nombre },
          transaction: t,
        });
        if (creado) creados += 1;
      }
    }
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  const total = Object.values(MUNICIPIOS).flat().length;
  console.log(`[municipios] ${creados} creados, ${total - creados} ya existian (${total} en la lista)`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[municipios] fallo:', err.message);
  process.exit(1);
});
