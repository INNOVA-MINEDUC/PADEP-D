import { pide, pideTexto, encola, abreEnPestana, descarga, descargaPost } from './cliente'

/**
 * API de PADEP (FastAPI, PycharmProjects/PADEP/api). Ya no hay Express en
 * medio: el login tambien es suyo.
 *
 * Las rutas son las mismas del contrato —`frontend/openapi.json`, regenerado
 * del codigo de la API—, con `/api` delante. Ese prefijo lo quita el proxy (el
 * de Vite en desarrollo, el nginx de la imagen en el servidor): la API sirve
 * `/cortes`, el navegador pide `/api/cortes`.
 */
const RAIZ = '/api'

const json = (cuerpo, metodo = 'POST') => ({
  method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
})

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
  // `{archivo, fila, carne}`; carne vacio deshace el vinculo. 422 si el carne
  // no esta en la nomina o la fila es de otra persona.
  vincula: (id, campos) =>
    pide(`${RAIZ}/cortes/${id}/vinculos`, { method: 'PUT', body: forma(campos) }),
  aplica: (id) => encola(`${RAIZ}/cortes/${id}/correcciones/aplicar`),

  // Comparacion de nominas: se calcula del disco, sin MySQL. Sin `contra`, el
  // corte anterior de la misma carrera (409 si no hay). Las marcas si son de la
  // base: si no responde, `marcas_disponible: false` y la comparacion igual.
  comparacion: (id, contra = '') =>
    pide(`${RAIZ}/cortes/${id}/comparacion${contra ? `?contra=${encodeURIComponent(contra)}` : ''}`),
  // `{carne, tipo: baja|alta|cambio, contra, marcada: 'true'|'false', nota}`.
  // `marcada` va EXPLICITO: un campo vacio del formulario cuenta como ausente
  // y la API marcaria en vez de quitar.
  marcaRevision: (id, campos) =>
    pide(`${RAIZ}/cortes/${id}/comparacion/revision`, { method: 'PUT', body: forma(campos) }),

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

  // Catalogo de carreras (MySQL). Se registra ANTES del primer corte: la carga
  // a la base ya no las crea y falla si no esta. El codigo no se edita (es la
  // clave del cargador y de la carpeta `car35`). 409 por duplicado o con datos.
  carreras: () => pide(`${RAIZ}/carreras`),
  creaCarrera: (campos) => pide(`${RAIZ}/carreras`, { method: 'POST', body: forma(campos) }),
  editaCarrera: (codigo, campos) =>
    pide(`${RAIZ}/carreras/${encodeURIComponent(codigo)}`, { method: 'PUT', body: forma(campos) }),
  borraCarrera: (codigo) => pide(`${RAIZ}/carreras/${encodeURIComponent(codigo)}`, { method: 'DELETE' }),

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

  // Consulta de docentes (MySQL, solo lectura: no hay PUT ni DELETE a
  // proposito, la base se rehace en cada carga). Una fila por INSCRIPCION, no
  // por persona. 422 si un filtro no vale, 503 si MySQL no responde.
  docentes: (filtros = {}) => pide(`${RAIZ}/docentes${consulta(filtros)}`),
  // `codigo`: el codigo PADEP (11 digitos) o el CUI (13). 404 si no existe.
  docente: (codigo) => pide(`${RAIZ}/docentes/${encodeURIComponent(codigo)}`),
  // La excepcion: el estatus academico (activo, retirado, graduado) no esta en
  // ningun papel y se escribe aqui. Solo añade al historial, no lo edita.
  // `campos`: cohorte, carrera, estatus, fecha, motivo, referencia, acta.
  // Reportes dinamicos (api/reportes.py). Se manda una ESPECIFICACION, nunca
  // SQL: {fuente, modo, columnas | agrupar + medidas, filtros, orden}. El
  // catalogo dice que se puede pedir; sin `reportes.datos_personales` no trae
  // nombre, CUI, DPI ni partida, y pedirlos es un 403.
  catalogoReportes: () => pide(`${RAIZ}/reportes/catalogo`),
  valoresReporte: (fuente, campo, q = '') =>
    pide(`${RAIZ}/reportes/valores${consulta({ fuente, campo, q })}`),
  consultaReporte: (especificacion, pagina = 1, porPagina = 50) =>
    pide(`${RAIZ}/reportes/consulta`, json({ especificacion, pagina, por_pagina: porPagina })),
  // Queda en la bitacora antes de bajar; 422 si pasa de 50 000 filas.
  exportaReporte: (especificacion, formato) =>
    descargaPost(`${RAIZ}/reportes/exportar`, { especificacion, formato }, `reporte.${formato}`),
  reportesGuardados: () => pide(`${RAIZ}/reportes/guardados`),
  guardaReporte: (plantilla) => pide(`${RAIZ}/reportes/guardados`, json(plantilla)),
  editaReporte: (id, plantilla) => pide(`${RAIZ}/reportes/guardados/${id}`, json(plantilla, 'PUT')),
  borraReporte: (id) => pide(`${RAIZ}/reportes/guardados/${id}`, { method: 'DELETE' }),

  // Los cambios registrados, del mas reciente al mas viejo, con `resumen` (las
  // inscripciones por estatus vigente). Filtros: cohorte, carrera, estatus,
  // desde, hasta (AAAA-MM-DD), pagina, por_pagina.
  cambiosEstatus: (filtros = {}) => pide(`${RAIZ}/seguimiento/estatus${consulta(filtros)}`),
  cambiaEstatus: (codigo, campos) =>
    pide(`${RAIZ}/docentes/${encodeURIComponent(codigo)}/estatus`, { method: 'POST', body: forma(campos) }),
}

/** `{a: 1, b: '', c: null}` -> `?a=1`. Un filtro vacio no se manda. */
function consulta(filtros) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) if (v !== '' && v != null) q.append(k, v)
  const s = q.toString()
  return s ? `?${s}` : ''
}
