import { pide, pideTexto, encola, abreEnPestana, descarga } from './cliente'

/**
 * API de extraccion (FastAPI) vista a traves del proxy de Express.
 *
 * Las rutas son las mismas del contrato (`frontend/otro/openapi.json`), solo
 * con el prefijo del proxy delante. Si algun dia el frontend vuelve a servirse
 * desde el mismo origen que FastAPI, basta con vaciar RAIZ.
 */
const RAIZ = '/api/extraccion'

const forma = (campos) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.append(k, v)
  return f
}

export const api = {
  ajustes: () => pide(`${RAIZ}/ajustes`),
  tipos: () => pide(`${RAIZ}/tipos`),

  cortes: () => pide(`${RAIZ}/cortes`),
  corte: (id) => pide(`${RAIZ}/cortes/${id}`),
  creaCorte: (campos) => pide(`${RAIZ}/cortes`, { method: 'POST', body: forma(campos) }),
  subeNomina: (id, archivo) =>
    pide(`${RAIZ}/cortes/${id}/nomina`, { method: 'POST', body: forma({ archivo }) }),

  entrega: (id) => encola(`${RAIZ}/cortes/${id}/entrega`),
  carga: (id, campos = {}) => encola(`${RAIZ}/cortes/${id}/carga`, forma(campos)),
  estadoCarga: (id) => pide(`${RAIZ}/cortes/${id}/carga`),
  auditoria: (id) => pide(`${RAIZ}/cortes/${id}/auditoria`),

  pendientes: (id) => pide(`${RAIZ}/cortes/${id}/pendientes`),
  corrige: (id, campos) =>
    pide(`${RAIZ}/cortes/${id}/correcciones`, { method: 'PUT', body: forma(campos) }),
  daDeAlta: (id, campos) =>
    pide(`${RAIZ}/cortes/${id}/altas`, { method: 'PUT', body: forma(campos) }),
  aplica: (id) => encola(`${RAIZ}/cortes/${id}/correcciones/aplicar`),

  // Subida troceada. `parte` espera 202 exacto; `trozosDe` puede fallar sin
  // drama (una subida nueva no tiene estado previo).
  trozosDe: (id, subida) => pide(`${RAIZ}/cortes/${id}/extracciones/parte/${subida}`),
  subeTrozo: (id, cuerpo) => encola(`${RAIZ}/cortes/${id}/extracciones/parte`, cuerpo),
  ensambla: (id, cuerpo) => encola(`${RAIZ}/cortes/${id}/extracciones/ensamblar`, cuerpo),

  trabajos: () => pide(`${RAIZ}/extracciones`),
  borra: (id) => pide(`${RAIZ}/extracciones/${id}`, { method: 'DELETE' }),
  registro: (id) => pideTexto(`${RAIZ}/extracciones/${id}/registro`),

  // Descargas: van por fetch + blob porque el proxy exige el Bearer y un <a>
  // pelado no manda cabeceras.
  bajaSalida: (idTrabajo, nombre) =>
    descarga(`${RAIZ}/extracciones/${idTrabajo}/archivos/${encodeURIComponent(nombre)}`, nombre),
  bajaArchivo: (id, capa, nombre) =>
    descarga(`${RAIZ}/cortes/${id}/archivos/${capa}/${encodeURIComponent(nombre)}`, nombre),

  // Una sola pagina del PDF. Nunca enlazar al PDF entero con #page=N: Chrome
  // aplica el fragmento antes de acabar de cargar y, tras bajar los 40 MB,
  // vuelve a la pagina 1. Esto devuelve una hoja de ~276 KB.
  abrePagina: (id, pdf, n) =>
    abreEnPestana(`${RAIZ}/cortes/${id}/pagina/${encodeURIComponent(pdf)}/${n}`),
}
