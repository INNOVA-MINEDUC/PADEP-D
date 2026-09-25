import { pide, pideTexto, encola, abreEnPestana, descarga } from './cliente'

/**
 * API de extraccion (FastAPI) vista a traves del proxy de Express.
 *
 * Las rutas son las mismas del contrato —`frontend/openapi.json`, regenerado
 * del codigo de la API—, solo con el prefijo del proxy delante. Si algun dia el
 * frontend vuelve a servirse desde el mismo origen que FastAPI, basta con vaciar
 * RAIZ.
 *
 * `frontend/otro/` guarda el contrato de ANTES del cambio de eje del corte (el
 * que aun hablaba de semestres): esta ahi como historia, no como referencia.
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

  // Sin `corte`, el histórico entero. Con él, solo los de ese corte. El filtro
  // es opcional a propósito: la cola es UNA y global —un trabajo a la vez—, así
  // que hace falta poder ver los de fuera, o un trabajo «en cola» que no arranca
  // no tiene explicación en pantalla. Un corte mal escrito da 422.
  trabajos: (corte = '') =>
    pide(`${RAIZ}/extracciones${corte ? `?corte=${encodeURIComponent(corte)}` : ''}`),
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

  // Configuracion de cohorte (MySQL). `c` es el CODIGO de la cohorte ('11'), no
  // su id ni el del corte. Si la base no responde, 503: nunca una lista vacia.
  cohortes: () => pide(`${RAIZ}/cohortes`),
  creaCohorte: (campos) => pide(`${RAIZ}/cohortes`, { method: 'POST', body: forma(campos) }),

  departamentos: () => pide(`${RAIZ}/departamentos`),
  municipios: (idDep) => pide(`${RAIZ}/departamentos/${idDep}/municipios`),
  escuelas: (idMun) => pide(`${RAIZ}/municipios/${idMun}/escuelas`),

  sedes: (c) => pide(`${RAIZ}/cohortes/${c}/sedes`),
  agregaSede: (c, campos) => pide(`${RAIZ}/cohortes/${c}/sedes`, { method: 'POST', body: forma(campos) }),
  quitaSede: (c, idCs) => pide(`${RAIZ}/cohortes/${c}/sedes/${idCs}`, { method: 'DELETE' }),

  enlaces: () => pide(`${RAIZ}/enlaces`),
  creaEnlace: (campos) => pide(`${RAIZ}/enlaces`, { method: 'POST', body: forma(campos) }),
  editaEnlace: (id, campos) => pide(`${RAIZ}/enlaces/${id}`, { method: 'PUT', body: forma(campos) }),
  borraEnlace: (id) => pide(`${RAIZ}/enlaces/${id}`, { method: 'DELETE' }),

  // La asignacion ES la sede: asignar y reasignar son el mismo PUT.
  asigna: (c, idCs, idEnlace) =>
    pide(`${RAIZ}/cohortes/${c}/enlaces/${idCs}`, { method: 'PUT', body: forma({ id_enlace: idEnlace }) }),
  desasigna: (c, idCs) => pide(`${RAIZ}/cohortes/${c}/enlaces/${idCs}`, { method: 'DELETE' }),
}
