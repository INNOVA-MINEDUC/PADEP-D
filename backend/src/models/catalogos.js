// Catalogos geograficos y categoricos (Modulo de catalogos del esquema v3).
export default (sequelize, DataTypes) => {
  const Departamento = sequelize.define('Departamento', {
    id_departamento: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: 'uq_departamento_nombre' },
  }, { tableName: 'Departamento' });

  const Municipio = sequelize.define('Municipio', {
    id_municipio: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_departamento: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
  }, {
    tableName: 'Municipio',
    indexes: [{ name: 'uq_municipio', unique: true, fields: ['id_departamento', 'nombre'] }],
  });

  const Idioma = sequelize.define('Idioma', {
    id_idioma: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(80), allowNull: false, unique: 'uq_idioma_nombre' },
  }, { tableName: 'Idioma' });

  const Etnia = sequelize.define('Etnia', {
    id_etnia: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(80), allowNull: false, unique: 'uq_etnia_nombre' },
  }, { tableName: 'Etnia' });

  const Escalafon = sequelize.define('Escalafon', {
    id_escalafon: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(20), allowNull: false, unique: 'uq_escalafon_codigo' },
    descripcion: { type: DataTypes.STRING(120), allowNull: true },
  }, { tableName: 'Escalafon' });

  const Jornada = sequelize.define('Jornada', {
    id_jornada: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(40), allowNull: false, unique: 'uq_jornada_nombre' },
  }, { tableName: 'Jornada' });

  const DireccionMineduc = sequelize.define('DireccionMineduc', {
    id_direccion: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: 'uq_direccion_codigo' },
    nombre: { type: DataTypes.STRING(150), allowNull: true },
  }, { tableName: 'DireccionMineduc' });

  const TipoEscuela = sequelize.define('TipoEscuela', {
    id_tipo_escuela: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(80), allowNull: false, unique: 'uq_tipo_escuela_nombre' },
  }, { tableName: 'TipoEscuela' });

  const Escuela = sequelize.define('Escuela', {
    id_escuela: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    codigo_escuela: { type: DataTypes.STRING(30), allowNull: true },
    id_tipo_escuela: { type: DataTypes.INTEGER, allowNull: true },
    id_municipio: { type: DataTypes.INTEGER, allowNull: false },
    direccion: { type: DataTypes.STRING(300), allowNull: true },
  }, {
    tableName: 'Escuela',
    indexes: [
      { name: 'uq_escuela', unique: true, fields: ['nombre', 'id_municipio'] },
      { name: 'idx_escuela_codigo', fields: ['codigo_escuela'] },
      { name: 'idx_escuela_muni', fields: ['id_municipio'] },
    ],
  });

  return { Departamento, Municipio, Idioma, Etnia, Escalafon, Jornada, DireccionMineduc, TipoEscuela, Escuela };
};
