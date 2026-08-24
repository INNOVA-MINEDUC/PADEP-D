import { verifyToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';

// Exige un JWT valido en Authorization: Bearer <token>.
// Deja el payload decodificado en req.user = { id, email, rol, id_rol }.
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Falta el token Bearer'));
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token invalido';
    return next(ApiError.unauthorized(msg));
  }
}
