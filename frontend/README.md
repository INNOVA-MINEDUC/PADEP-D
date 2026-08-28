# PADEP/D — Frontend (Vue 3 + Vite)

## Las tres piezas

El frontend habla con **un solo origen**: el backend Express. Ese backend, a su
vez, hace de puerta hacia la API de extracción (FastAPI), que sigue escuchando
solo en `127.0.0.1` y no necesita CORS ni autenticación propia.

```
Vue :5173  ──►  Express :4000  ──┬──►  MySQL          (dominio: cohortes, docentes…)
                                 └──►  FastAPI :8000  (OCR: cortes, extracciones, curador)
```

En desarrollo el proxy de Vite (`vite.config.js`) manda `/api/*` al `:4000`, así
que el navegador ve un solo origen y `VITE_API_URL` se queda vacío.

## Levantarlo

Hacen falta los tres, en este orden:

```bash
# 1) MySQL (contenedor del proyecto de extracción)
docker compose -f ../../PycharmProjects/PADEP/bd/docker-compose.yml up -d

# 2) API de extracción — desde PycharmProjects/PADEP
.venv/Scripts/python.exe -m uvicorn api.main:api --port 8000

# 3) Backend Express — desde backend/
npm run seed     # solo la primera vez: roles, catálogos y el usuario admin
npm run dev

# 4) Este frontend
npm install
npm run dev
```

> La API de extracción **no corre con `--reload`**: después de tocarla hay que
> reiniciarla a mano, o el proceso sigue con el código viejo en memoria.

Si el `:8000` no está arriba, las pantallas de extracción enseñan un aviso con
la orden para levantarlo, en vez de un error opaco.

## Estructura

```
src/
  api/
    cliente.js        envoltorio de fetch: token, errores, descargas
    auth.js           login y /me contra Express
    extraccion.js     las 25 rutas de la API de extracción
  composables/
    usaAjustes.js     qué puede hacer la instalación y de cuánto corta los envíos
    usaCortes.js      lista, elegido (localStorage) y si se puede entregar/cargar
    usaSubida.js      subida troceada con reanudación
    usaTrabajos.js    lista de trabajos con sondeo adaptativo
    usaCurador.js     tareas, altas y volcado
  screens/
    S01..S14          pantallas del prototipo (todavía con datos de catalog.js)
    S15Extraccion     cortes, subida, entrega, carga, trabajos
    S16Curador        corrección celda a celda contra el PDF
```

`src/data/catalog.js` sigue siendo el catálogo estático del prototipo. Las
pantallas S01–S14 todavía leen de ahí; solo S15 y S16 hablan con la API.

## Sesión

El token se guarda en `localStorage` (`padep.token`) y viaja como
`Authorization: Bearer`. Al arrancar se revalida contra `/api/auth/me`; si
caducó, se descarta en silencio y sale el login. Un `401` en cualquier petición
cierra la sesión, en vez de dejar pantallas pidiendo datos que no van a llegar.

Usuario del seed: `admin@mineduc.edu.gt` / `Admin123*` (configurable en el
`.env` del backend).

## Comportamientos que no hay que "simplificar"

Cuatro cosas parecen retorcidas y no lo son. Cada una costó una ronda de
depuración y están comentadas en el código:

1. **La subida va troceada en 8 MB** (`usaSubida.js`). No por el tamaño del
   archivo: Cloudflare limita el cuerpo de *cada petición*, así que un POST
   único de 140 MB muere con `413` antes de llegar a nginx. El id de subida se
   guarda en `sessionStorage` para retomar donde iba, y la llave **solo** se
   borra cuando el ensamblado ha ido bien.
2. **El curador guarda cada celda al salir del campo** (`@change`, sin botón
   «guardar»), y refleja el valor en el modelo local sin recargar la lista.
   Se usa `:value` + `@change` y **nunca `v-model`**: `v-model` reescribe en
   cada pulsación y compite con la respuesta del servidor.
3. **Nunca se enlaza al PDF entero con `#page=N`**. Chrome aplica el fragmento
   antes de acabar de cargar y, tras bajar los 40 MB, vuelve a la página 1. Se
   pide `/pagina/{pdf}/{n}`, que devuelve una hoja de ~276 KB.
4. **El sondeo se reprograma tras cada respuesta**, no con `setInterval`: a
   2 s mientras haya trabajos vivos y a 15 s cuando no. La API de extracción es
   un solo worker y un interval fijo le apila peticiones encima.

Y dos más de presentación:

- **Tema claro fijo.** El modo oscuro se probó y se descartó por petición
  explícita. No añadirlo, ni con `prefers-color-scheme`.
- Los errores de la API se enseñan **tal cual**: ya vienen en español y escritos
  para quien opera. Express los manda en `error` y FastAPI en `detail`; el
  cliente lee los dos.

## Descargas

El proxy exige el `Bearer`, y una etiqueta `<a href>` no manda cabeceras. Por
eso los archivos y las páginas del PDF se bajan con `fetch` y se abren como
blob (`api/cliente.js`). La pestaña se abre **antes** del `await`, todavía
dentro del gesto del usuario, o el navegador la bloquea por popup.

## Referencia

`otro/` guarda el encargo original y el prototipo del que se portó todo esto:

| Archivo | Qué es |
|---|---|
| `TRASPASO_FRONTEND.md` | el encargo: contrato y los porqués |
| `TRASPASO_FRONTEND_VUE.md` | el cliente y los composables, ya escritos |
| `openapi.json` | contrato generado del código, 25 rutas |
| `ejemplos_respuestas.json` | payloads reales; sirven de fixture sin backend |
| `index.html`, `curador.html` | el prototipo. **Referencia, no código a copiar** |
