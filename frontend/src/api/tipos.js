/**
 * Formas que devuelve la API de extraccion, como typedefs de JSDoc.
 *
 * El proyecto es JavaScript, no TypeScript: no hay `tsc` ni dependencia de
 * TypeScript, asi que el `npx openapi-typescript ... -o src/api/tipos.ts` que
 * pide el encargo dejaria un archivo que nadie compila ni comprueba. Los mismos
 * tipos en JSDoc si los lee el editor, y salen del mismo sitio: se rehacen a
 * mano desde `frontend/openapi.json` y `frontend/ejemplos_respuestas.json`
 * cuando la API los regenere.
 *
 * Dos modulos: la extraccion de cortes y los enlaces de DIDEDUC. El segundo es
 * el unico que escribe en MySQL, y por eso es el unico que puede dar 503.
 *
 * Nada de esto se ejecuta. El archivo se importa solo por sus tipos.
 *
 * Ojo con los tipos de los cuatro datos del corte, que es donde duele:
 * `cohorte` y `carrera` son TEXTO; `trimestre` y `corte`, ENTEROS.
 */

/**
 * Un corte, identificado por cuatro datos: cohorte, carrera, trimestre y corte.
 *
 * El id se arma `<cohorte>-car<carrera>-t<trimestre>-c<corte>` —`11-car35-t6-c1`—
 * pero se trata como opaco: se manda tal cual como viene y no se despieza para
 * sacar sus partes, que ya vienen sueltas en el objeto.
 *
 * @typedef {object} Corte
 * @property {string} id            '11-car35-t6-c1'
 * @property {string} cohorte       '11' — la Onceava. NO es el 35/36
 * @property {string} carrera       '35' | '36' — codigo de carrera, ver CARRERAS
 * @property {number} trimestre     1..12, entero. Lo manda el servidor: no se
 *                                  calcula desde un semestre con una formula
 * @property {number} corte         >= 1, entero
 * @property {string} carpeta       'cortes/11/car35/t6-c1'
 * @property {?string} nomina       nombre del .xlsx, o null si no se ha subido
 * @property {Object<string, DocumentoDelCorte>} documentos  por tipo de documento
 * @property {boolean} entregado
 * @property {boolean} curado
 * @property {string[]} falta_para_entregar  vacia = se puede entregar. Manda
 *                                  esta lista; no se recalcula en el cliente
 */

/**
 * @typedef {object} DocumentoDelCorte
 * @property {string[]} pdfs
 * @property {boolean} extraido
 * @property {number} filas
 */

/**
 * Cuerpo de `POST /cortes` (form-data o urlencoded). Los cuatro son
 * obligatorios y mandar `semestre` da 422.
 *
 * @typedef {object} NuevoCorte
 * @property {string} cohorte    422 si falta
 * @property {string} carrera    422 «falta el código de carrera (35, 36, ...)»
 * @property {number} trimestre  422 «el trimestre va de 1 a 12»
 * @property {number} corte      422 «el corte empieza en 1»
 */

/**
 * `GET /ajustes`.
 *
 * @typedef {object} Ajustes
 * @property {boolean} extraccion   false = esta instalacion no extrae (409 al
 *                                  intentarlo); entrega, curacion y carga si
 * @property {number} trozo_bytes   tamano de trozo de la subida, 8 MiB
 */

/**
 * `GET /tipos`, por nombre de documento ('asistencia', 'docentes', ...).
 *
 * @typedef {object} TipoDeDocumento
 * @property {number} archivos          cuantos PDF pide, en orden
 * @property {string} paginas_tipicas   texto, no numero
 */

/**
 * Un trabajo de la cola: extraccion, entrega o carga. `GET /extracciones`.
 *
 * @typedef {object} Trabajo
 * @property {string} id
 * @property {string} tipo              'asistencia' | 'docentes' | 'entrega' | 'carga' | ...
 * @property {'en_cola'|'extrayendo'|'terminado'|'fallido'|'cancelado'} estado
 * @property {?number} puesto_en_cola
 * @property {?string} iniciado         ISO
 * @property {?number} avance           0..1; sin `paginas_totales` no significa nada
 * @property {?number} paginas_totales
 * @property {?number} paginas_hechas
 * @property {?string} ultima_linea
 * @property {?string} error
 * @property {string[]} archivos
 * @property {string[]} salidas         TODO lo que hay en el corte, acumulado:
 *                                      no solo lo que produjo este trabajo
 */

/**
 * `GET /cortes/{id}/carga`. Tres formas, y la pantalla tiene que aguantar las
 * tres: `disponible: false` NO es un error —lo normal es que la base no este
 * levantada—, se pinta el `motivo` y, si viene, la `pista`.
 *
 * @typedef {object} EstadoCarga
 * @property {boolean} disponible
 * @property {boolean} [cargado]        solo cuando `disponible`
 * @property {string} [motivo]          cuando no esta disponible o no se cargo
 * @property {string} [pista]           que hacer para arreglarlo
 * @property {Object<string, number>} [cuentas]  solo cuando `cargado`
 */

/**
 * `GET /cortes/{id}/pendientes`, lo que consume el curador.
 *
 * @typedef {object} Pendientes
 * @property {boolean} listo
 * @property {TareaPendiente[]} tareas
 * @property {number} [sin_completar]
 * @property {number} [sin_registro_abiertos]
 */

/**
 * @typedef {object} TareaPendiente
 * @property {string} id
 * @property {string} documento
 * @property {string} archivo
 * @property {string} pdf
 * @property {string} pdf_url    ruta de la API, sin el prefijo del proxy
 * @property {string} pagina     texto
 * @property {string} quien
 * @property {string} donde
 * @property {number[]} filas
 * @property {CampoPendiente[]} campos
 * @property {string} [revisar]
 * @property {boolean} [solo_revisar]
 */

/**
 * @typedef {object} CampoPendiente
 * @property {string} nombre
 * @property {string} pista
 * @property {string} nota
 * @property {string} motivo
 * @property {boolean} por_fila
 * @property {{filas: string, quien: string, actual: string, escrito: string}[]} casillas
 */

/**
 * `GET /cortes/{id}/auditoria`. `resumen` y `avisos` son filas de tabla con las
 * columnas tal cual las nombra el Excel, en MAYUSCULAS y con guiones bajos: se
 * pintan como vengan, sin mapear nombre a nombre.
 *
 * @typedef {object} Auditoria
 * @property {boolean} hay
 * @property {?string} cuando    ISO
 * @property {boolean} al_dia
 * @property {Object<string, string>[]} resumen
 * @property {Object<string, string>[]} avisos
 */

/* ---------------------------------------------------------------
   Enlaces de DIDEDUC

   Son DOS recursos y no uno, y de ahi cuelga todo lo demas:

     EnlaceDIDEDUC   la persona: nombre, cargo, telefono, email
     CohorteEnlace   LA ASIGNACION: en esta cohorte, este departamento
                     lo lleva esta persona

   El departamento va en la asignacion y no en la persona porque la misma
   persona puede llevar Huehuetenango en la Onceava y otro departamento en la
   Doceava; como columna de la persona, cambiarlo reescribiria el pasado.

   Una persona sin asignar es un estado legitimo: por eso crearla y asignarla
   son dos llamadas.
   --------------------------------------------------------------- */

/**
 * `GET /departamentos`. Catalogo fijo de 22, ordenado por nombre. El id no es
 * correlativo: no se deduce del orden.
 *
 * @typedef {object} Departamento
 * @property {number} id_departamento
 * @property {string} nombre
 */

/**
 * La persona. `GET /enlaces` y `GET /enlaces/{id}`.
 *
 * Los tres campos opcionales llegan como `null` cuando estan vacios, no como
 * cadena vacia. `asignaciones` viene de TODAS las cohortes, no solo de la que
 * se este mirando: se devuelve junto a la persona para no pedir una ruta mas
 * por cada fila de la lista.
 *
 * @typedef {object} Enlace
 * @property {number} id_enlace
 * @property {string} nombre
 * @property {?string} cargo
 * @property {?string} telefono
 * @property {?string} email
 * @property {AsignacionDeEnlace[]} asignaciones
 */

/**
 * Donde esta asignada una persona, tal como viene dentro de `Enlace`.
 *
 * @typedef {object} AsignacionDeEnlace
 * @property {number} id_cohorte
 * @property {string} cohorte          codigo, '11'
 * @property {number} id_departamento
 * @property {string} departamento
 */

/**
 * Cuerpo de `POST /enlaces` y de `PUT /enlaces/{id}` (form-data o urlencoded).
 *
 * El PUT no es un PATCH: los cuatro campos se escriben tal cual llegan, asi que
 * mandar uno en blanco lo borra. El formulario de edicion tiene que ir
 * precargado con los valores actuales.
 *
 * @typedef {object} EnlaceEscrito
 * @property {string} nombre     obligatorio; vacio da 422
 * @property {string} [cargo]
 * @property {string} [telefono]
 * @property {string} [email]
 */

/**
 * Una fila de `GET /cohortes/{cohorte}/enlaces`: quien lleva ese departamento.
 *
 * Llegan **los 22 departamentos siempre**, con `enlace: null` los que no tienen.
 * La pantalla es «quien lleva cada departamento» y el que esta sin asignar es
 * justo la fila que hay que rellenar, asi que no hay que cruzar nada contra
 * `GET /departamentos`.
 *
 * @typedef {object} DepartamentoConEnlace
 * @property {number} id_departamento
 * @property {string} departamento
 * @property {?PersonaDelDepartamento} enlace
 */

/**
 * La persona dentro de una fila de departamento: como `Enlace` pero sin
 * `asignaciones` (seria redundante: la asignacion es la fila).
 *
 * @typedef {object} PersonaDelDepartamento
 * @property {number} id_enlace
 * @property {string} nombre
 * @property {?string} cargo
 * @property {?string} telefono
 * @property {?string} email
 */

/**
 * Respuesta de `PUT /cohortes/{cohorte}/enlaces/{id_departamento}`.
 *
 * `sustituyo` es a quien se desplazo, y es `null` si el departamento estaba
 * libre o si se reasigno a la misma persona (repetir el PUT no desplaza a
 * nadie). **No es un error**: es el dato para avisar o confirmar antes, en vez
 * de dejar a alguien fuera en silencio.
 *
 * @typedef {object} ResultadoAsignar
 * @property {string} cohorte
 * @property {string} departamento
 * @property {string} enlace             nombre de la persona asignada
 * @property {number} id_enlace
 * @property {number} id_departamento
 * @property {?{id_enlace: number, nombre: string}} sustituyo
 */

/**
 * `DELETE /cohortes/{cohorte}/enlaces/{id_departamento}`. La persona sigue
 * existiendo: lo que se borra es la asignacion.
 *
 * @typedef {object} ResultadoDesasignar
 * @property {string} cohorte
 * @property {string} departamento
 * @property {string} quitado    nombre de quien llevaba el departamento
 */

/**
 * `DELETE /enlaces/{id}`.
 *
 * @typedef {object} ResultadoBorrarEnlace
 * @property {number} borrado    el id que se borro
 * @property {string} nombre
 */

export {}
