import rateLimit from 'express-rate-limit';

// Limitador general de la API.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta mas tarde.' },
});

// Limitador estricto para login/registro (mitiga fuerza bruta).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticacion, espera unos minutos.' },
});
