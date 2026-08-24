import { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';
import ApiError from '../utils/ApiError.js';

// 404 para rutas no registradas.
export function notFound(_req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// Manejador central de errores. Traduce errores de Sequelize a HTTP claros.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      error: 'Registro duplicado',
      details: err.errors.map((e) => ({ campo: e.path, mensaje: e.message })),
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Datos invalidos',
      details: err.errors.map((e) => ({ campo: e.path, mensaje: e.message })),
    });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return res.status(409).json({ error: 'Violacion de llave foranea', details: err.index });
  }

  // Errores lanzados desde los hooks (triggers) llegan como Error normal.
  if (err && typeof err.message === 'string' && /obligatorio|4 semestres/.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }

  console.error('[error]', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
