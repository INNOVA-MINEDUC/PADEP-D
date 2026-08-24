// Modulo 5: Asignatura, CursoImpartido, Nota, Sesion, Asistencia, AsistenciaResumen.
export default (sequelize, DataTypes) => {
  const Asignatura = sequelize.define('Asignatura', {
    id_asignatura: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(30), allowNull: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    id_carrera: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'Asignatura',
    indexes: [{ name: 'uq_asignatura', unique: true, fields: ['nombre', 'id_carrera'] }],
  });

  const CursoImpartido = sequelize.define('CursoImpartido', {
    id_curso_impartido: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_asignatura: { type: DataTypes.INTEGER, allowNull: false },
    id_corte: { type: DataTypes.INTEGER, allowNull: false },
    id_seccion: { type: DataTypes.INTEGER, allowNull: true },
    id_catedratico: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'CursoImpartido',
    indexes: [
      { name: 'uq_curso_impartido', unique: true, fields: ['id_asignatura', 'id_corte', 'id_seccion'] },
      { name: 'idx_curso_corte', fields: ['id_corte'] },
    ],
  });

  const Nota = sequelize.define('Nota', {
    id_nota: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_inscripcion: { type: DataTypes.INTEGER, allowNull: false },
    id_curso_impartido: { type: DataTypes.INTEGER, allowNull: false },
    zona: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    examen_final: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    nota_final: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    estado: { type: DataTypes.ENUM('APROBADO', 'CDR', 'REPROBADO', 'PENDIENTE'), allowNull: true },
    observaciones: { type: DataTypes.STRING(255), allowNull: true },
    // En el esquema v3 es una columna generada STORED. Con sequelize.sync()
    // no se crea como generada, asi que la calculamos por hook (ver associations.js):
    //   1 si zona+examen_final == nota_final (tolerancia 0.01), 0 si no, NULL si falta algun dato.
    cuadra: { type: DataTypes.TINYINT, allowNull: true },
    id_extraccion: { type: DataTypes.INTEGER, allowNull: true },
    pagina_origen: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'Nota',
    indexes: [
      { name: 'uq_nota', unique: true, fields: ['id_inscripcion', 'id_curso_impartido'] },
      { name: 'idx_nota_cuadra', fields: ['cuadra'] },
      { name: 'idx_nota_insc', fields: ['id_inscripcion'] },
      { name: 'idx_nota_curso', fields: ['id_curso_impartido'] },
    ],
  });

  const Sesion = sequelize.define('Sesion', {
    id_sesion: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_corte: { type: DataTypes.INTEGER, allowNull: false },
    numero: { type: DataTypes.TINYINT, allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: true },
  }, {
    tableName: 'Sesion',
    indexes: [{ name: 'uq_sesion', unique: true, fields: ['id_corte', 'numero'] }],
  });

  const Asistencia = sequelize.define('Asistencia', {
    id_asistencia: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_inscripcion: { type: DataTypes.INTEGER, allowNull: false },
    id_sesion: { type: DataTypes.INTEGER, allowNull: false },
    presente: { type: DataTypes.BOOLEAN, allowNull: false },
    id_extraccion: { type: DataTypes.INTEGER, allowNull: true },
    pagina_origen: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'Asistencia',
    indexes: [
      { name: 'uq_asistencia', unique: true, fields: ['id_inscripcion', 'id_sesion'] },
      { name: 'idx_asis_insc', fields: ['id_inscripcion'] },
    ],
  });

  const AsistenciaResumen = sequelize.define('AsistenciaResumen', {
    id_inscripcion: { type: DataTypes.INTEGER, primaryKey: true },
    id_corte: { type: DataTypes.INTEGER, primaryKey: true },
    total_declarado: { type: DataTypes.TINYINT, allowNull: true },
    id_extraccion: { type: DataTypes.INTEGER, allowNull: true },
    pagina_origen: { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'AsistenciaResumen' });

  return { Asignatura, CursoImpartido, Nota, Sesion, Asistencia, AsistenciaResumen };
};
