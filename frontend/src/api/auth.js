import { pide, guardaToken } from './cliente'

/** Login contra Express. Devuelve el usuario y deja el token guardado. */
export async function entra(email, password) {
  const d = await pide('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  guardaToken(d.token)
  return d.usuario
}

/** Perfil del token actual. Sirve para revalidar la sesion al recargar. */
export async function yo() {
  const d = await pide('/api/auth/me')
  return d.usuario
}
