// El esquema v3 define 5 roles de dominio. Para el control de acceso de
// la API los agrupamos en dos categorias, como se acordo:
//   ADMIN   -> 'DIGECADE'
//   USUARIO -> el resto ('Enlace DIDEDUC' es el usuario comun tipico)
export const ROLES = {
  DIGECADE: 'DIGECADE',
  MESA_TECNICA: 'Mesa Tecnica',
  EFPEM_USAC: 'EFPEM-USAC',
  ENLACE_DIDEDUC: 'Enlace DIDEDUC',
  AUDITORIA_INTERNA: 'Auditoria Interna',
};

export const ROLE_NAMES = Object.values(ROLES);

// Rol tratado como administrador del sistema.
export const ADMIN_ROLE = ROLES.DIGECADE;

// Rol por defecto cuando alguien se auto-registra (usuario comun).
export const DEFAULT_ROLE = ROLES.ENLACE_DIDEDUC;

export const isAdminRole = (nombre) => nombre === ADMIN_ROLE;
