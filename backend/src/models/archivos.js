// Modulo 2: Archivos del corte y trazabilidad de la extraccion.
export default (sequelize, DataTypes) => {
  const TipoDocumento = sequelize.define('TipoDocumento', {
    id_tipo: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(40), allowNull: false, unique: 'uq_tipodoc_codigo' },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    extraible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    script: { type: DataTypes.STRING(120), allowNull: true },
  }, { tableName: 'TipoDocumento' });

  const Documento = sequelize.define('Documento', {
    id_documento: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_corte: { type: DataTypes.INTEGER, allowNull: true },
    id_cohorte: { type: DataTypes.INTEGER, allowNull: false },
    id_tipo: { type: DataTypes.INTEGER, allowNull: false },
    nombre_archivo: { type: DataTypes.STRING(255), allowNull: false },
    almacenamiento: { type: DataTypes.ENUM('local', 'bucket'), allowNull: false, defaultValue: 'local' },
    ruta: { type: DataTypes.STRING(500), allowNull: false },
    sha256: { type: DataTypes.CHAR(64), allowNull: true },
    bytes: { type: DataTypes.BIGINT, allowNull: true },
    paginas: { type: DataTypes.INTEGER, allowNull: true },
    fecha_carga: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    id_usuario: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'Documento',
    indexes: [
      { name: 'uq_documento', unique: true, fields: ['id_cohorte', 'id_corte', 'id_tipo', 'nombre_archivo'] },
      { name: 'idx_documento_sha', fields: ['sha256'] },
      { name: 'idx_documento_corte', fields: ['id_corte', 'id_tipo'] },
    ],
  });

  const Extraccion = sequelize.define('Extraccion', {
    id_extraccion: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_documento: { type: DataTypes.INTEGER, allowNull: false },
    script: { type: DataTypes.STRING(120), allowNull: false },
    version_script: { type: DataTypes.STRING(40), allowNull: true },
    inicio: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    fin: { type: DataTypes.DATE, allowNull: true },
    estatus: { type: DataTypes.ENUM('en curso', 'ok', 'error'), allowNull: false, defaultValue: 'en curso' },
    filas: { type: DataTypes.INTEGER, allowNull: true },
    filas_flag: { type: DataTypes.INTEGER, allowNull: true },
    paginas_cero: { type: DataTypes.INTEGER, allowNull: true },
    ruta_log: { type: DataTypes.STRING(500), allowNull: true },
    vigente: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
  }, {
    tableName: 'Extraccion',
    indexes: [{ name: 'uq_extraccion_vigente', unique: true, fields: ['id_documento', 'vigente'] }],
  });

  return { TipoDocumento, Documento, Extraccion };
};
