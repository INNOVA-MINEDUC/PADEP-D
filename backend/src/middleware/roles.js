import ApiError from '../utils/ApiError.js';
import { ADMIN_ROLE, isAdminRole } from '../config/roles.js';

// authorize('DIGECADE', 'Auditoria Interna'): pasa si el rol del usuario
// esta en la lista. Debe usarse SIEMPRE despues de authenticate.
export function authorize(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(ApiError.forbidden('Tu rol no tiene acceso a este recurso'));
    }
    return next();
  };
}

// Atajo: solo administrador (DIGECADE).
export function requireAdmin(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  if (!isAdminRole(req.user.rol)) {
    return next(ApiError.forbidden(`Se requiere rol ${ADMIN_ROLE} (administrador)`));
  }
  return next();
}
