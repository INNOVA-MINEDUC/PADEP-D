// Modulo 1: Carrera -> Cohorte -> Trimestre -> Corte (esquema v4).
export default (sequelize, DataTypes) => {
  const Carrera = sequelize.define('Carrera', {
    id_carrera: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // '35', '36': el codigo de la universidad. NULL mientras no se sepa.
    codigo: { type: DataTypes.STRING(30), allowNull: true, unique: 'uq_carrera_codigo' },
    nombre: { type: DataTypes.STRING(200), allowNull: false, unique: 'uq_carrera_nombre' },
    nivel: { type: DataTypes.ENUM('profesorado', 'licenciatura'), allowNull: false },
    especialidad: { type: DataTypes.STRING(120), allowNull: true },
    // Sin valor por defecto: cuantos trimestres dura no se sabe.
    duracion_trimestres: { type: DataTypes.TINYINT, allowNull: true },
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

  const Trimestre = sequelize.define('Trimestre', {
    id_trimestre: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_cohorte: { type: DataTypes.INTEGER, allowNull: false },
    // El CHECK 1..12 de la tabla solo ataja el numero absurdo: no es la duracion.
    numero: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 1, max: 12 } },
    anio: { type: DataTypes.SMALLINT, allowNull: true },
    parte_anio: { type: DataTypes.TINYINT, allowNull: true },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },
    estatus: { type: DataTypes.ENUM('planificado', 'en curso', 'cerrado'), allowNull: false, defaultValue: 'planificado' },
  }, {
    tableName: 'Trimestre',
    indexes: [{ name: 'uq_trimestre', unique: true, fields: ['id_cohorte', 'numero'] }],
  });

  const Corte = sequelize.define('Corte', {
    id_corte: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_trimestre: { type: DataTypes.INTEGER, allowNull: false },
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
    indexes: [{ name: 'uq_corte', unique: true, fields: ['id_trimestre', 'numero'] }],
  });

  return { Carrera, Cohorte, Trimestre, Corte };
};
