/**
 * Envoltorio de fetch para la API de PADEP.
 *
 * Todo va a la API de PADEP (FastAPI), que desde octubre de 2026 pone tambien
 * el login: el backend Express que hacia de puerta se retiro. Los errores
 * llegan en `{detail}`; se sigue leyendo `{error}` por si algo viejo lo manda.
 * Los textos vienen ya en espanol y escritos para quien opera, asi que se
 * propagan tal cual en vez de inventar uno propio.
 *
 * Sin `credentials: 'include'`: la sesion es el Bearer, no una cookie.
 */

const BASE = import.meta.env.VITE_API_URL ?? ''

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje)
    this.estado = estado
  }
}

/* ---------------------------------------------------------------
   Token
   --------------------------------------------------------------- */

const LLAVE = 'padep.token'
let token = localStorage.getItem(LLAVE) || ''
let alExpirar = () => {}

export function guardaToken(nuevo) {
  token = nuevo || ''
  if (token) localStorage.setItem(LLAVE, token)
  else localStorage.removeItem(LLAVE)
}

export const hayToken = () => !!token

/** La store registra aqui su logout: un 401 tiene que sacar al usuario. */
export function cuandoExpire(fn) { alExpirar = fn }

/* ---------------------------------------------------------------
   Peticiones
   --------------------------------------------------------------- */

async function crudo(ruta, opciones = {}) {
  const cabeceras = { ...(opciones.headers || {}) }
  if (token) cabeceras.Authorization = `Bearer ${token}`
  const r = await fetch(`${BASE}${ruta}`, { ...opciones, headers: cabeceras })
  // Un token caducado a media sesion no puede quedarse callado: se limpia y se
  // avisa a la store, o la pantalla se queda pidiendo datos que nunca llegan.
  if (r.status === 401) { guardaToken(''); alExpirar() }
  return r
}

async function fallo(r) {
  const d = await r.json().catch(() => ({}))
  return new ErrorApi(d.detail || d.error || `Error ${r.status}`, r.status)
}

export async function pide(ruta, opciones) {
  const r = await crudo(ruta, opciones)
  if (!r.ok) throw await fallo(r)
  return r.status === 204 ? null : r.json()
}

export async function pideTexto(ruta) {
  const r = await crudo(ruta)
  if (!r.ok) throw await fallo(r)
  return r.text()
}

/**
 * Para lo que encola. Exige **202 exacto** y no un `ok` generico: el codigo es
 * parte del contrato de la API de extraccion y un 200 aqui significaria que
 * paso otra cosa.
 */
export async function encola(ruta, cuerpo) {
  const r = await crudo(ruta, cuerpo ? { method: 'POST', body: cuerpo } : { method: 'POST' })
  if (r.status !== 202) throw await fallo(r)
  return r.json().catch(() => null)
}

/* ---------------------------------------------------------------
   Archivos
   ---------------------------------------------------------------
   Las descargas NO pueden ser un <a href> pelado: la API exige el Bearer y
   una etiqueta <a> no manda cabeceras. Se bajan con fetch y se abren como blob.
   Una pagina suelta del PDF son ~276 KB, asi que no duele.
   --------------------------------------------------------------- */

async function comoBlob(ruta) {
  const r = await crudo(ruta)
  if (!r.ok) throw await fallo(r)
  return URL.createObjectURL(await r.blob())
}

/**
 * Abre un archivo en otra pestana.
 *
 * La pestana se abre ANTES del await, todavia dentro del gesto del usuario: si
 * se abriera despues, el navegador lo tomaria por un popup y lo bloquearia.
 */
export async function abreEnPestana(ruta) {
  // Sin 'noopener' aqui: con esa opcion window.open devuelve null y no queda
  // handle al que asignarle el blob, asi que la pestana se queda en blanco.
  // Se corta la referencia despues, que consigue lo mismo.
  const pestana = window.open('', '_blank')
  try {
    const url = await comoBlob(ruta)
    if (pestana) {
      pestana.opener = null
      pestana.location = url
    }
    // Tarde a proposito: revocar en el acto deja la pestana en blanco.
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (e) {
    if (pestana) pestana.close()
    throw e
  }
}

/**
 * Un POST con cuerpo JSON cuya respuesta es un archivo (los reportes). El
 * nombre lo pone la API en Content-Disposition; `porDefecto` por si no llega.
 */
export async function descargaPost(ruta, cuerpo, porDefecto) {
  const r = await crudo(ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
  })
  if (!r.ok) throw await fallo(r)
  const nombre = /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '')?.[1] || porDefecto
  const url = URL.createObjectURL(await r.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export async function descarga(ruta, nombre) {
  const url = await comoBlob(ruta)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
