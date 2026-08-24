import db from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { publicUser } from './auth.controller.js';

const { Usuario, Rol } = db;

// GET /api/usuarios  (solo admin)
export async function listar(_req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      include: [{ model: Rol, attributes: ['nombre'] }],
      order: [['id_usuario', 'ASC']],
    });
    return res.json({
      usuarios: usuarios.map((u) => publicUser(u, u.Rol ? u.Rol.nombre : null)),
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/usuarios  (solo admin) -> crea un usuario con cualquier rol.
export async function crear(req, res, next) {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol) {
      throw ApiError.badRequest('nombre, email, password y rol son obligatorios');
    }

    const rolRow = await Rol.findOne({ where: { nombre: rol } });
    if (!rolRow) throw ApiError.badRequest(`Rol invalido: ${rol}`);

    const usuario = await Usuario.create({
      nombre,
      email,
      password_hash: password, // el hook lo hashea
      id_rol: rolRow.id_rol,
    });
    return res.status(201).json({ usuario: publicUser(usuario, rolRow.nombre) });
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/usuarios/:id/estatus  (solo admin) -> activar/inactivar.
export async function cambiarEstatus(req, res, next) {
  try {
    const { estatus } = req.body;
    if (!['activo', 'inactivo'].includes(estatus)) {
      throw ApiError.badRequest("estatus debe ser 'activo' o 'inactivo'");
    }
    const usuario = await Usuario.findByPk(req.params.id, { include: [{ model: Rol, attributes: ['nombre'] }] });
    if (!usuario) throw ApiError.notFound('Usuario no encontrado');

    usuario.estatus = estatus;
    await usuario.save();
    return res.json({ usuario: publicUser(usuario, usuario.Rol ? usuario.Rol.nombre : null) });
  } catch (err) {
    return next(err);
  }
}
