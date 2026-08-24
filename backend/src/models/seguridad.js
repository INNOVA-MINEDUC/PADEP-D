// Seguridad: Rol / Permiso / RolPermiso / Usuario.
// Se conservan los 5 roles de dominio del esquema v3.
// Para el control de acceso: 'DIGECADE' actua como ADMINISTRADOR y el
// resto como usuarios comunes (ver src/middleware/roles.js).
export default (sequelize, DataTypes) => {
  const Rol = sequelize.define('Rol', {
    id_rol: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: {
      type: DataTypes.ENUM('DIGECADE', 'Mesa Tecnica', 'EFPEM-USAC', 'Enlace DIDEDUC', 'Auditoria Interna'),
      allowNull: false,
      unique: 'uq_rol_nombre',
    },
  }, { tableName: 'Rol' });

  const Permiso = sequelize.define('Permiso', {
    id_permiso: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: 'uq_permiso_codigo' },
    descripcion: { type: DataTypes.STRING(150), allowNull: true },
  }, { tableName: 'Permiso' });

  const RolPermiso = sequelize.define('RolPermiso', {
    id_rol: { type: DataTypes.INTEGER, primaryKey: true },
    id_permiso: { type: DataTypes.INTEGER, primaryKey: true },
  }, { tableName: 'RolPermiso' });

  const Usuario = sequelize.define('Usuario', {
    id_usuario: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: 'uq_usuario_email', validate: { isEmail: true } },
    // Nunca se guarda en texto plano: bcrypt lo llena via hook (ver associations.js).
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    id_rol: { type: DataTypes.INTEGER, allowNull: false },
    estatus: { type: DataTypes.ENUM('activo', 'inactivo'), allowNull: false, defaultValue: 'activo' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'Usuario',
    defaultScope: {
      // Por defecto no exponemos el hash en las respuestas.
      attributes: { exclude: ['password_hash'] },
    },
    scopes: {
      // Scope explicito cuando SI necesitamos el hash (login).
      withPassword: { attributes: { include: ['password_hash'] } },
    },
  });

  return { Rol, Permiso, RolPermiso, Usuario };
};
