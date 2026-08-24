// Modulo 1b: Coordinador, Sede, CohorteSede, Seccion, EnlaceDIDEDUC, CohorteEnlace.
export default (sequelize, DataTypes) => {
  const Coordinador = sequelize.define('Coordinador', {
    id_coordinador: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: true },
    telefono: { type: DataTypes.STRING(30), allowNull: true },
  }, {
    tableName: 'Coordinador',
    indexes: [{ name: 'uq_coordinador', unique: true, fields: ['nombre', 'email'] }],
  });

  const Sede = sequelize.define('Sede', {
    id_sede: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_escuela: { type: DataTypes.INTEGER, allowNull: false },
    id_municipio: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'Sede',
    indexes: [{ name: 'uq_sede', unique: true, fields: ['id_escuela', 'id_municipio'] }],
  });

  const CohorteSede = sequelize.define('CohorteSede', {
    id_cohorte_sede: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_cohorte: { type: DataTypes.INTEGER, allowNull: false },
    id_sede: { type: DataTypes.INTEGER, allowNull: false },
    id_coordinador: { type: DataTypes.INTEGER, allowNull: true },
    correlativo: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'CohorteSede',
    indexes: [{ name: 'uq_cohorte_sede', unique: true, fields: ['id_cohorte', 'id_sede'] }],
  });

  const Seccion = sequelize.define('Seccion', {
    id_seccion: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_cohorte_sede: { type: DataTypes.INTEGER, allowNull: false },
    id_carrera: { type: DataTypes.INTEGER, allowNull: false },
    letra: { type: DataTypes.STRING(5), allowNull: false },
  }, {
    tableName: 'Seccion',
    indexes: [{ name: 'uq_seccion', unique: true, fields: ['id_cohorte_sede', 'id_carrera', 'letra'] }],
  });

  const EnlaceDIDEDUC = sequelize.define('EnlaceDIDEDUC', {
    id_enlace: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    cargo: { type: DataTypes.STRING(120), allowNull: true },
    telefono: { type: DataTypes.STRING(30), allowNull: true },
    email: { type: DataTypes.STRING(150), allowNull: true },
  }, { tableName: 'EnlaceDIDEDUC' });

  const CohorteEnlace = sequelize.define('CohorteEnlace', {
    id_cohorte_enlace: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_cohorte: { type: DataTypes.INTEGER, allowNull: false },
    id_enlace: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'CohorteEnlace',
    indexes: [{ name: 'uq_cohorte_enlace', unique: true, fields: ['id_cohorte', 'id_enlace'] }],
  });

  return { Coordinador, Sede, CohorteSede, Seccion, EnlaceDIDEDUC, CohorteEnlace };
};
