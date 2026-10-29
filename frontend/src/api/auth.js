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

// Cada administrador ve y toca solo los usuarios de su unidad; el global, todos.
// `unidad` en el alta: el de una unidad crea en la suya (no hace falta mandarla);
// el global SIN ella crea otro global. En la edicion solo la manda el global:
// `undefined` = no se toca (no va en el JSON), '' = pasa a global.
export const usuarios = {
  lista: () => pide('/api/usuarios').then(d => d.usuarios),
  crea: (u) => pide('/api/usuarios', json('POST', u)).then(d => d.usuario),
  edita: (id, nombre, rol, unidad) =>
    pide(`/api/usuarios/${id}`, json('PUT', unidad === undefined ? { nombre, rol } : { nombre, rol, unidad }))
      .then(d => d.usuario),
  estatus: (id, estatus) => pide(`/api/usuarios/${id}/estatus`, json('PATCH', { estatus })).then(d => d.usuario),
  restablece: (id, password) => pide(`/api/usuarios/${id}/password`, json('PUT', { password })).then(d => d.usuario),
}

/*
 * Roles (v4.10). Un rol es del sistema (`unidad: null`: lo ven todas, solo lo
 * cambia un global) o de una unidad (lo crea su administrador; nadie más lo
 * ve). Cada uno trae `editable`: si quien pide puede cambiarlo.
 *
 * El nombre solo es único dentro de lo que ve una unidad, así que el global
 * dice de qué unidad es el rol que toca (`?unidad=`); sin ella, la API lo busca
 * entre los del sistema. El de unidad no la manda: se le pone la suya.
 */
const deRol = (rol, unidad, resto = '') =>
  `/api/roles/${encodeURIComponent(rol)}${resto}${unidad ? `?unidad=${encodeURIComponent(unidad)}` : ''}`

export const roles = {
  lista: () => pide('/api/roles'),
  // `unidad` vacía: el de unidad crea en la suya; el global, uno del sistema.
  crea: (nombre, unidad, permisos = []) =>
    pide('/api/roles', json('POST', unidad ? { nombre, permisos, unidad } : { nombre, permisos }))
      .then(d => d.rol),
  renombra: (r, nombre) => pide(deRol(r.rol, r.unidad), json('PUT', { nombre })).then(d => d.rol),
  borra: (r) => pide(deRol(r.rol, r.unidad), { method: 'DELETE' }),
  fijaPermisos: (r, permisos) => pide(deRol(r.rol, r.unidad, '/permisos'), json('PUT', { permisos })),
}
