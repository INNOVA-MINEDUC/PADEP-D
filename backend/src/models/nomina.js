// Modulo 6: NominaRegistro (la nomina de cada pago, tal cual llego).
export default (sequelize, DataTypes) => {
  const NominaRegistro = sequelize.define('NominaRegistro', {
    id_nomina_registro: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_documento: { type: DataTypes.INTEGER, allowNull: false },
    id_corte: { type: DataTypes.INTEGER, allowNull: false },
    correlativo: { type: DataTypes.INTEGER, allowNull: true },
    codigo_padep: { type: DataTypes.STRING(20), allowNull: false },
    nombre_completo: { type: DataTypes.STRING(200), allowNull: false },
    sexo: { type: DataTypes.ENUM('F', 'M'), allowNull: true },
    cohorte_codigo: { type: DataTypes.STRING(30), allowNull: true },
    cohorte_nombre: { type: DataTypes.STRING(60), allowNull: true },
    carrera_texto: { type: DataTypes.STRING(200), allowNull: true },
    municipio_texto: { type: DataTypes.STRING(120), allowNull: true },
    departamento_texto: { type: DataTypes.STRING(120), allowNull: true },
    direccion_texto: { type: DataTypes.STRING(60), allowNull: true },
    partida: { type: DataTypes.STRING(120), allowNull: true },
    jornada_texto: { type: DataTypes.STRING(40), allowNull: true },
    codigo_escuela: { type: DataTypes.STRING(30), allowNull: true },
    escalafon_texto: { type: DataTypes.STRING(120), allowNull: true },
    id_docente: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'NominaRegistro',
    indexes: [
      { name: 'uq_nomina_registro', unique: true, fields: ['id_corte', 'codigo_padep'] },
      { name: 'idx_nomina_codigo', fields: ['codigo_padep'] },
    ],
  });

  return { NominaRegistro };
};
