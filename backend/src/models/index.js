import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import applyAssociations from './associations.js';

import defineCatalogos from './catalogos.js';
import defineSeguridad from './seguridad.js';
import definePrograma from './programa.js';
import defineSedes from './sedes.js';
import defineArchivos from './archivos.js';
import definePersonas from './personas.js';
import defineInscripcion from './inscripcion.js';
import defineOferta from './oferta.js';
import defineNomina from './nomina.js';
import defineCalidad from './calidad.js';

// Cada modulo exporta una fabrica (sequelize, DataTypes) => { Modelos }.
const moduleFactories = [
  defineCatalogos,
  defineSeguridad,
  definePrograma,
  defineSedes,
  defineArchivos,
  definePersonas,
  defineInscripcion,
  defineOferta,
  defineNomina,
  defineCalidad,
];

// db reune todos los modelos + la instancia de Sequelize.
const db = { sequelize, Sequelize: sequelize.Sequelize };

for (const factory of moduleFactories) {
  Object.assign(db, factory(sequelize, DataTypes));
}

applyAssociations(db);

export default db;
