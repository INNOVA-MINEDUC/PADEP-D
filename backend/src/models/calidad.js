// Modulo 7: Incidencia (FALTA / REVISAR / SIN_REGISTRO / ...).
export default (sequelize, DataTypes) => {
  const Incidencia = sequelize.define('Incidencia', {
    id_incidencia: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    id_extraccion: { type: DataTypes.INTEGER, allowNull: true },
    id_corte: { type: DataTypes.INTEGER, allowNull: false },
    id_documento: { type: DataTypes.INTEGER, allowNull: true },
    tipo: { type: DataTypes.ENUM('FALTA', 'REVISAR', 'SIN_REGISTRO', 'PAGINA_VACIA', 'FILA_HUERFANA'), allowNull: false },
    id_docente: { type: DataTypes.INTEGER, allowNull: true },
    codigo_padep: { type: DataTypes.STRING(20), allowNull: true },
    pagina: { type: DataTypes.INTEGER, allowNull: true },
    detalle: { type: DataTypes.TEXT, allowNull: true },
    sugerencia: { type: DataTypes.TEXT, allowNull: true },
    resuelta: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'Incidencia',
    indexes: [{ name: 'idx_incidencia_corte_tipo', fields: ['id_corte', 'tipo', 'resuelta'] }],
  });

  return { Incidencia };
};
