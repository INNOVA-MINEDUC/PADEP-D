/**
 * Envoltorio de fetch para la API de PADEP.
 *
 * Todo pasa por el backend Express (`:4000`), que ademas hace de puerta hacia
 * la API de extraccion (FastAPI). Por eso aqui hay que tragar las DOS formas de
 * error: Express dice `{error}` y FastAPI dice `{detail}`. Los dos textos vienen
 * ya en espanol y escritos para quien opera, asi que se propagan tal cual en vez
 * de inventar uno propio.
 *
 * No lleva `credentials: 'include'`: el auth_basic que pudiera haber delante del
 * FastAPI lo pone Express desde el servidor, no el navegador.
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
   Las descargas NO pueden ser un <a href> pelado: el proxy exige el Bearer y
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
