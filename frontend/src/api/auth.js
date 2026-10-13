import { pide, guardaToken } from './cliente'

/**
 * Sesión, usuarios y roles (`api/auth.py` en el repo de la API).
 *
 * Van en JSON, no en FormData como las rutas de extracción: así las declara la
 * API. Quien decide de verdad qué puede hacer cada uno es la API —cada ruta
 * pide su permiso y devuelve 403 si no—; `usuario.permisos` solo sirve para no
 * ofrecer en pantalla lo que se va a rechazar.
 */
const json = (method, cuerpo) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
})

/** Login. Devuelve el usuario (con `permisos`) y deja el token guardado. */
export async function entra(email, password) {
  const d = await pide('/api/auth/login', json('POST', { email, password }))
  guardaToken(d.token)
  return d.usuario
}

/** Perfil del token actual. Sirve para revalidar la sesion al recargar. */
export async function yo() {
  const d = await pide('/api/auth/me')
  return d.usuario
}

/**
 * Cierra la sesión EN EL SERVIDOR (en todos los dispositivos). Borrar el token
 * del navegador no basta: seguiría valiendo hasta caducar.
 */
export async function sal() {
  await pide('/api/auth/salir', { method: 'POST' })
}

/**
 * Cambia la contraseña propia. La API cierra las demás sesiones y devuelve un
 * token nuevo: hay que guardarlo, o esta sesión cae con las otras.
 */
export async function cambiaPassword(actual, nueva) {
  const d = await pide('/api/auth/password', json('POST', { actual, nueva }))
  guardaToken(d.token)
  return d.usuario
}

/* --- administración (permiso usuarios.gestionar) --------------------------- */

export const usuarios = {
  lista: () => pide('/api/usuarios').then(d => d.usuarios),
  crea: (u) => pide('/api/usuarios', json('POST', u)).then(d => d.usuario),
  edita: (id, nombre, rol) => pide(`/api/usuarios/${id}`, json('PUT', { nombre, rol })).then(d => d.usuario),
  estatus: (id, estatus) => pide(`/api/usuarios/${id}/estatus`, json('PATCH', { estatus })).then(d => d.usuario),
  restablece: (id, password) => pide(`/api/usuarios/${id}/password`, json('PUT', { password })).then(d => d.usuario),
  roles: () => pide('/api/roles'),
  fijaPermisos: (rol, permisos) =>
    pide(`/api/roles/${encodeURIComponent(rol)}/permisos`, json('PUT', { permisos })),
}
