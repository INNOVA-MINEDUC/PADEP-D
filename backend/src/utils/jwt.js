import jwt from 'jsonwebtoken';
import env from '../config/env.js';

// Firma un token con los datos minimos del usuario.
export function signToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

// Verifica y decodifica; lanza si es invalido o expiro.
export function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}
