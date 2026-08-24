import { Router } from 'express';
import { listar, crear, cambiarEstatus } from '../controllers/usuarios.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = Router();

// Toda la gestion de usuarios es solo para administrador (DIGECADE).
router.use(authenticate, requireAdmin);

router.get('/', listar);
router.post('/', crear);
router.patch('/:id/estatus', cambiarEstatus);

export default router;
