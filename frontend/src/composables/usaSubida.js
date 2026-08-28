import { ref } from 'vue'
import { api } from '@/api/extraccion'

/**
 * Subida troceada.
 *
 * **Va troceada por el proxy, no por el tamano del archivo.** Cloudflare limita
 * el cuerpo de CADA peticion, no el del archivo: el reporte de resultados
 * (140 MB) moria con 413 antes de llegar a nginx, asi que el
 * `client_max_body_size` del servidor no pintaba nada porque el corte pasaba un
 * salto mas arriba. Trocear no depende de nadie y sobrevive al proxy que metan
 * manana. **No simplificar a un solo POST.**
 */

const hex = n => [...crypto.getRandomValues(new Uint8Array(n))]
  .map(b => b.toString(16).padStart(2, '0')).join('')

export function usaSubida(idCorte, trozo) {
  const subiendo = ref(false)
  const avance = ref(0)          // 0..100
  const error = ref('')

  /** Sube un archivo en trozos y devuelve {id, llave}. */
  async function subeUno(f, avisa) {
    // El id se guarda por archivo: si la subida se corta, al reintentar el
    // mismo archivo se retoma donde iba en vez de empezar de cero.
    const llave = `subida:${idCorte.value}:${f.name}:${f.size}:${f.lastModified}`
    let id = sessionStorage.getItem(llave)
    if (!id) {
      // Solo hexadecimal: la API lo rechaza si no, porque acaba siendo un
      // nombre de carpeta.
      id = hex(16)
      sessionStorage.setItem(llave, id)
    }

    const n = Math.max(1, Math.ceil(f.size / trozo.value))

    // Lo que ya este en el servidor no se vuelve a mandar. Se compara el
    // TAMANO y no solo la presencia: un trozo a medio escribir no vale por
    // bueno. Y solo se reutiliza si el total coincide, por si cambio el tamano
    // de trozo entre intentos.
    let hay = {}
    try {
      const d = await api.trozosDe(idCorte.value, id)
      if (d.total === n) hay = d.trozos || {}
    } catch (e) {
      /* sin estado previo se sube entero, que es lo de siempre */
    }

    let subido = 0
    for (let i = 0; i < n; i++) {
      const pedazo = f.slice(i * trozo.value, Math.min((i + 1) * trozo.value, f.size))
      if (hay[i] === pedazo.size) { subido += pedazo.size; avisa(subido); continue }

      const cuerpo = new FormData()
      cuerpo.append('subida', id)
      cuerpo.append('indice', i)
      cuerpo.append('total', n)
      cuerpo.append('trozo', pedazo, f.name)
      await api.subeTrozo(idCorte.value, cuerpo)

      subido += pedazo.size
      avisa(subido)
    }

    // La llave NO se borra aqui sino cuando el ensamblado ha ido bien: si
    // fallara justo tras subir el ultimo trozo, borrarla ahora obligaria a
    // mandar los 140 MB otra vez teniendolos ya todos en el servidor.
    return { id, llave }
  }

  /** Sube todos los archivos EN ORDEN y encola la extraccion. */
  async function envia(archivos, tipo) {
    subiendo.value = true
    error.value = ''
    avance.value = 0

    const total = archivos.reduce((s, f) => s + f.size, 0) || 1
    let hechos = 0
    const pinta = n => { avance.value = Math.round(100 * Math.min(n, total) / total) }

    try {
      const subidas = []
      // En serie y en orden: el orden de las ranuras empareja cada archivo con
      // su parte, que es como el extractor aplica su rango de paginas. Nada de
      // Promise.all aqui.
      for (const f of archivos) {
        subidas.push(await subeUno(f, n => pinta(hechos + n)))
        hechos += f.size
        pinta(hechos)
      }

      const cuerpo = new FormData()
      cuerpo.append('tipo', tipo)
      for (let i = 0; i < archivos.length; i++) {
        cuerpo.append('subidas', subidas[i].id)
        cuerpo.append('nombres', archivos[i].name)
      }
      await api.ensambla(idCorte.value, cuerpo)

      // Ahora si: el servidor ya tiene el PDF armado.
      for (const s of subidas) sessionStorage.removeItem(s.llave)
      return true
    } catch (e) {
      error.value = e.message || 'no se pudo contactar con el servidor'
      return false
    } finally {
      subiendo.value = false
      avance.value = 0
    }
  }

  return { subiendo, avance, error, envia }
}
