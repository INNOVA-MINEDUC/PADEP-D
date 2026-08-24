// Modulo 1: Carrera -> Cohorte -> Semestre -> Corte.
export default (sequelize, DataTypes) => {
  const Carrera = sequelize.define('Carrera', {
    id_carrera: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false, unique: 'uq_carrera_nombre' },
    nivel: { type: DataTypes.ENUM('profesorado', 'licenciatura'), allowNull: false },
    especialidad: { type: DataTypes.STRING(120), allowNull: true },
    duracion_semestres: { type: DataTypes.TINYINT, allowNull: true, defaultValue: 4 },
  }, {
    tableName: 'Carrera',
    indexes: [{ name: 'idx_carrera_nivel', fields: ['nivel'] }],
  });

  const Cohorte = sequelize.define('Cohorte', {
    id_cohorte: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: 'uq_cohorte_codigo' },
    nombre: { type: DataTypes.STRING(60), allowNull: true },
    id_direccion: { type: DataTypes.INTEGER, allowNull: true },
    anio_inicio: { type: DataTypes.SMALLINT, allowNull: true },
    anio_fin: { type: DataTypes.SMALLINT, allowNull: true },
    estatus: { type: DataTypes.ENUM('planificacion', 'activa', 'cerrada'), allowNull: false, defaultValue: 'planificacion' },
    fecha_firma_carta: { type: DataTypes.DATEONLY, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'Cohorte' });

  const Semestre = sequelize.define('Semestre', {
    id_semestre: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_cohorte: { type: DataTypes.INTEGER, allowNull: false },
    numero: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 1, max: 8 } },
    anio: { type: DataTypes.SMALLINT, allowNull: true },
    mitad_anio: { type: DataTypes.TINYINT, allowNull: true },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },
    estatus: { type: DataTypes.ENUM('planificado', 'en curso', 'cerrado'), allowNull: false, defaultValue: 'planificado' },
  }, {
    tableName: 'Semestre',
    indexes: [{ name: 'uq_semestre', unique: true, fields: ['id_cohorte', 'numero'] }],
  });

  const Corte = sequelize.define('Corte', {
    id_corte: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_semestre: { type: DataTypes.INTEGER, allowNull: false },
    numero: { type: DataTypes.TINYINT, allowNull: false },
    etiqueta_bimestre: { type: DataTypes.STRING(60), allowNull: true },
    numero_pago: { type: DataTypes.TINYINT, allowNull: true },
    anio_pago: { type: DataTypes.SMALLINT, allowNull: true },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },
    estatus: { type: DataTypes.ENUM('pendiente', 'recibido', 'extraido', 'entregado'), allowNull: false, defaultValue: 'pendiente' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'Corte',
    indexes: [{ name: 'uq_corte', unique: true, fields: ['id_semestre', 'numero'] }],
  });

  return { Carrera, Cohorte, Semestre, Corte };
};
