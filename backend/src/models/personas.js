// Modulo 3: Docente, Catedratico, CatedraticoNivel, CatedraticoSede.
export default (sequelize, DataTypes) => {
  const Docente = sequelize.define('Docente', {
    id_docente: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo_padep: { type: DataTypes.STRING(20), allowNull: false, unique: 'uq_docente_codigo' },
    cui: { type: DataTypes.STRING(20), allowNull: true, unique: 'uq_docente_cui' },
    dpi: { type: DataTypes.STRING(20), allowNull: true, unique: 'uq_docente_dpi' },
    nombre_completo: { type: DataTypes.STRING(200), allowNull: false },
    fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
    sexo: { type: DataTypes.ENUM('F', 'M'), allowNull: true },
    id_idioma: { type: DataTypes.INTEGER, allowNull: true },
    id_etnia: { type: DataTypes.INTEGER, allowNull: true },
    nivel_educativo: { type: DataTypes.ENUM('preprimaria', 'primaria'), allowNull: true },
    id_municipio_residencia: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'Docente',
    indexes: [{ name: 'idx_docente_muni', fields: ['id_municipio_residencia'] }],
  });

  const Catedratico = sequelize.define('Catedratico', {
    id_catedratico: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre_completo: { type: DataTypes.STRING(200), allowNull: false, unique: 'uq_catedratico' },
    grado_academico: { type: DataTypes.STRING(80), allowNull: true },
    carrera_pregrado: { type: DataTypes.STRING(200), allowNull: true },
    otros_cursos: { type: DataTypes.TEXT, allowNull: true },
    sexo: { type: DataTypes.ENUM('F', 'M'), allowNull: true },
    anios_experiencia: { type: DataTypes.TINYINT, allowNull: true },
    id_departamento: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'Catedratico' });

  const CatedraticoNivel = sequelize.define('CatedraticoNivel', {
    id_catedratico: { type: DataTypes.INTEGER, primaryKey: true },
    nivel: { type: DataTypes.ENUM('preprimario', 'primario', 'medio', 'superior'), primaryKey: true },
  }, { tableName: 'CatedraticoNivel' });

  const CatedraticoSede = sequelize.define('CatedraticoSede', {
    id_catedratico: { type: DataTypes.INTEGER, primaryKey: true },
    id_sede: { type: DataTypes.INTEGER, primaryKey: true },
  }, { tableName: 'CatedraticoSede' });

  return { Docente, Catedratico, CatedraticoNivel, CatedraticoSede };
};
