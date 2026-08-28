import rateLimit from 'express-rate-limit';

// Limitador general de la API.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta mas tarde.' },
});

// La subida troceada manda un POST por cada 8 MB: un PDF de 140 MB son 18
// peticiones, y el sondeo de trabajos aporta otras 30 por minuto. Con el
// limitador general (300 / 15 min) una sola sesion de trabajo lo agota, asi
// que el proxy de extraccion lleva el suyo, por minuto y mucho mas holgado.
// El mensaje va en `detail` y no en `error`: estas rutas devuelven la forma
// de FastAPI y el cliente lee un solo campo.
export const extraccionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Demasiadas peticiones a la API de extraccion, espera un momento.' },
});

// Limitador estricto para login/registro (mitiga fuerza bruta).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticacion, espera unos minutos.' },
});
