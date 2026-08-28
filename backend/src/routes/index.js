import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usuariosRoutes from './usuarios.routes.js';
import { ROLE_NAMES } from '../config/roles.js';

const router = Router();

// Endpoint informativo (util para probar que la API responde).
router.get('/', (_req, res) => {
  res.json({
    api: 'PADEP',
    version: '1.0.0',
    roles: ROLE_NAMES,
    endpoints: {
      'POST /api/auth/register': 'Registro de usuario comun',
      'POST /api/auth/login': 'Login -> devuelve JWT',
      'GET /api/auth/me': 'Perfil del usuario autenticado (Bearer token)',
      'GET /api/usuarios': 'Listar usuarios (solo admin)',
      'POST /api/usuarios': 'Crear usuario con rol (solo admin)',
      'PATCH /api/usuarios/:id/estatus': 'Activar/inactivar (solo admin)',
      'ALL /api/extraccion/*': 'Proxy a la API de extraccion (FastAPI). Requiere token',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);

export default router;
