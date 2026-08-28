import http from 'node:http';
import https from 'node:https';
import env from '../config/env.js';

/**
 * Proxy hacia la API de extraccion (FastAPI, ver PycharmProjects/PADEP/api).
 *
 * Se escribe a mano con `node:http` en vez de tirar de http-proxy-middleware
 * porque lo unico que hace falta es encanar el cuerpo tal cual, y aqui eso es
 * justo lo delicado: los PDF se suben en trozos de 8 MB y cargarlos en memoria
 * para reenviarlos seria peor que no proxiar. `req.pipe(arriba)` no toca el
 * cuerpo, asi que da igual que sea multipart, JSON o un PDF de una pagina.
 *
 * Se monta ANTES de express.json()/urlencoded() (ver app.js): en cuanto un
 * body parser lee el cuerpo, ya no queda stream que encanar.
 */

const destino = new URL(env.extraccion.url);
const esSegura = destino.protocol === 'https:';
const cliente = esSegura ? https : http;

// `new URL()` deja `port` vacio cuando es el de por defecto ('' en
// https://host sin puerto), y eso no vale como opcion de http.request.
const puerto = destino.port || (esSegura ? 443 : 80);

// Sin keep-alive a proposito. La API de extraccion es un solo proceso que hay
// que reiniciar a mano cada vez que se toca (no corre con --reload), y cada
// reinicio deja los sockets del pool muertos: la primera peticion de despues
// moriria con 'socket hang up' aunque el servidor ya este arriba otra vez. Y
// no se puede reintentar, porque el cuerpo ya se encano y no hay como
// rebobinarlo. Abrir conexion nueva contra 127.0.0.1 cuesta decimas de ms.
const agente = new cliente.Agent({ keepAlive: false });

// El auth_basic de nginx, precalculado: no cambia entre peticiones.
const basic = env.extraccion.basicUser
  ? `Basic ${Buffer.from(`${env.extraccion.basicUser}:${env.extraccion.basicPass}`).toString('base64')}`
  : null;

// Cabeceras que no se reenvian:
//   host          apunta a Express, no a la API de extraccion
//   authorization lleva el Bearer de ESTE backend; la API de extraccion no lo
//                 entiende y reenviarlo confundiria a su nginx. Si hace falta
//                 credencial arriba, es la basic de arriba y la ponemos aqui.
//   cookie        misma razon: la sesion es de Express
//   connection    la gestiona cada salto por separado
const NO_REENVIAR = new Set(['host', 'authorization', 'cookie', 'connection']);

export default function extraccionProxy(req, res, next) {
  const cabeceras = {};
  for (const [nombre, valor] of Object.entries(req.headers)) {
    if (!NO_REENVIAR.has(nombre.toLowerCase())) cabeceras[nombre] = valor;
  }
  cabeceras.host = destino.host;
  if (basic) cabeceras.authorization = basic;

  // Montado con app.use('/api/extraccion', ...), req.url ya viene sin el
  // prefijo y con la query: '/cortes/35-s3-c1/pendientes?x=1'.
  const arriba = cliente.request(
    {
      protocol: destino.protocol,
      hostname: destino.hostname,
      port: puerto,
      method: req.method,
      path: req.url,
      headers: cabeceras,
      agent: agente,
    },
    (respuesta) => {
      // Se copia el estado tal cual: el 202 de todo lo que encola y el 409 de
      // la instalacion que no extrae son parte del contrato, no ruido.
      res.writeHead(respuesta.statusCode, respuesta.headers);
      respuesta.pipe(res);
    },
  );

  arriba.setTimeout(env.extraccion.timeoutMs, () => {
    arriba.destroy(new Error('tiempo de espera agotado'));
  });

  arriba.on('error', (err) => {
    // Si ya empezo a llegar la respuesta no se puede reescribir la cabecera;
    // se corta y el cliente ve una descarga truncada, que es lo unico posible.
    if (res.headersSent) return res.destroy(err);

    // En `detail` y no en `error`: estas rutas hablan la forma de FastAPI.
    const caida = err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET';
    const motivo = caida
      ? `La API de extraccion no responde en ${env.extraccion.url}. `
        + 'Levantala con: .venv/Scripts/python.exe -m uvicorn api.main:api --port 8000'
      : `No se pudo contactar con la API de extraccion: ${err.message}`;
    return res.status(502).json({ detail: motivo });
  });

  // Si el navegador aborta a mitad de un trozo, se corta tambien arriba en vez
  // de dejar la peticion colgada ocupando el unico worker de FastAPI.
  res.on('close', () => { if (!res.writableFinished) arriba.destroy(); });

  req.pipe(arriba);
}
