import db from '../models/index.js';
import { signToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { isAdminRole, DEFAULT_ROLE } from '../config/roles.js';

const { Usuario, Rol } = db;

// Arma el payload publico del usuario (sin hash).
export function publicUser(usuario, rolNombre) {
  return {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    email: usuario.email,
    id_rol: usuario.id_rol,
    rol: rolNombre,
    es_admin: isAdminRole(rolNombre),
    estatus: usuario.estatus,
  };
}

// POST /api/auth/register
// Alta de usuario. Por defecto crea un usuario comun (Enlace DIDEDUC).
// Solo un administrador podria crear otros roles vía /api/usuarios.
export async function register(req, res, next) {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      throw ApiError.badRequest('nombre, email y password son obligatorios');
    }
    if (String(password).length < 6) {
      throw ApiError.badRequest('El password debe tener al menos 6 caracteres');
    }

    const rol = await Rol.findOne({ where: { nombre: DEFAULT_ROLE } });
    if (!rol) throw ApiError.badRequest('No existe el rol por defecto; corre el seed primero');

    // password_hash recibe el texto plano: el hook beforeCreate lo hashea.
    const usuario = await Usuario.create({
      nombre,
      email,
      password_hash: password,
      id_rol: rol.id_rol,
    });

    const token = signToken({ id: usuario.id_usuario, email: usuario.email, rol: rol.nombre, id_rol: rol.id_rol });
    return res.status(201).json({ token, usuario: publicUser(usuario, rol.nombre) });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw ApiError.badRequest('email y password son obligatorios');
    }

    // scope withPassword para poder comparar el hash.
    const usuario = await Usuario.scope('withPassword').findOne({
      where: { email },
      include: [{ model: Rol, attributes: ['id_rol', 'nombre'] }],
    });

    // Mensaje generico: no revelamos si fallo el email o el password.
    if (!usuario || !(await usuario.validPassword(password))) {
      throw ApiError.unauthorized('Credenciales invalidas');
    }
    if (usuario.estatus !== 'activo') {
      throw ApiError.forbidden('Usuario inactivo');
    }

    const rolNombre = usuario.Rol ? usuario.Rol.nombre : null;
    const token = signToken({ id: usuario.id_usuario, email: usuario.email, rol: rolNombre, id_rol: usuario.id_rol });
    return res.json({ token, usuario: publicUser(usuario, rolNombre) });
  } catch (err) {
    return next(err);
  }
}

// GET /api/auth/me  (requiere token)
export async function me(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      include: [{ model: Rol, attributes: ['id_rol', 'nombre'] }],
    });
    if (!usuario) throw ApiError.notFound('Usuario no encontrado');
    const rolNombre = usuario.Rol ? usuario.Rol.nombre : null;
    return res.json({ usuario: publicUser(usuario, rolNombre) });
  } catch (err) {
    return next(err);
  }
}
