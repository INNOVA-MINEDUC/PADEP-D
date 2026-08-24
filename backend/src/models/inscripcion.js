// Modulo 4: Inscripcion, SituacionLaboral, HistorialEstatus, Graduacion.
export default (sequelize, DataTypes) => {
  const Inscripcion = sequelize.define('Inscripcion', {
    id_inscripcion: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_docente: { type: DataTypes.INTEGER, allowNull: false },
    id_cohorte: { type: DataTypes.INTEGER, allowNull: false },
    id_carrera: { type: DataTypes.INTEGER, allowNull: false },
    id_seccion: { type: DataTypes.INTEGER, allowNull: true },
    correlativo: { type: DataTypes.INTEGER, allowNull: true },
    fecha_inscripcion: { type: DataTypes.DATEONLY, allowNull: true },
    resultado_admision: { type: DataTypes.ENUM('aprobado', 'no aprobado', 'pendiente'), allowNull: false, defaultValue: 'pendiente' },
    estatus_registro: { type: DataTypes.ENUM('preinscrito', 'inscrito'), allowNull: false, defaultValue: 'preinscrito' },
    estatus_academico: { type: DataTypes.ENUM('activo', 'retirado', 'graduado'), allowNull: false, defaultValue: 'activo' },
    id_extraccion: { type: DataTypes.INTEGER, allowNull: true },
    pagina_origen: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'Inscripcion',
    indexes: [
      { name: 'uq_inscripcion', unique: true, fields: ['id_docente', 'id_cohorte', 'id_carrera'] },
      { name: 'idx_insc_cohorte', fields: ['id_cohorte', 'id_carrera'] },
      { name: 'idx_insc_seccion', fields: ['id_seccion'] },
    ],
  });

  const SituacionLaboral = sequelize.define('SituacionLaboral', {
    id_situacion: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_inscripcion: { type: DataTypes.INTEGER, allowNull: false },
    id_semestre: { type: DataTypes.INTEGER, allowNull: true },
    id_escuela: { type: DataTypes.INTEGER, allowNull: true },
    id_escalafon: { type: DataTypes.INTEGER, allowNull: true },
    id_jornada: { type: DataTypes.INTEGER, allowNull: true },
    partida: { type: DataTypes.STRING(120), allowNull: true },
    fecha_registro: { type: DataTypes.DATEONLY, allowNull: true },
  }, {
    tableName: 'SituacionLaboral',
    indexes: [
      { name: 'uq_situacion', unique: true, fields: ['id_inscripcion', 'id_semestre'] },
      { name: 'idx_sitlab_escuela', fields: ['id_escuela'] },
    ],
  });

  const HistorialEstatus = sequelize.define('HistorialEstatus', {
    id_historial: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_inscripcion: { type: DataTypes.INTEGER, allowNull: false },
    estatus: { type: DataTypes.ENUM('activo', 'retirado', 'graduado'), allowNull: false },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    motivo: { type: DataTypes.STRING(255), allowNull: true },
    referencia_carta_convenio: { type: DataTypes.STRING(150), allowNull: true },
    id_usuario: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'HistorialEstatus',
    indexes: [{ name: 'idx_hist_insc_fecha', fields: ['id_inscripcion', 'fecha'] }],
  });

  const Graduacion = sequelize.define('Graduacion', {
    id_graduacion: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_inscripcion: { type: DataTypes.INTEGER, allowNull: false, unique: 'uq_grad_inscripcion' },
    numero_acta: { type: DataTypes.STRING(80), allowNull: true, unique: 'uq_grad_acta' },
    fecha: { type: DataTypes.DATEONLY, allowNull: true },
  }, { tableName: 'Graduacion' });

  return { Inscripcion, SituacionLaboral, HistorialEstatus, Graduacion };
};
