# PADEP/D — Frontend (Vue 3 + Vite)

## Las dos piezas

El frontend habla con **un solo backend**: la API de PADEP (FastAPI,
`PycharmProjects/PADEP`). Pone el login, la extracción, la curación y las
consultas a MySQL. Hasta octubre de 2026 había un Express en medio que ponía el
login y reenviaba; se retiró y su login pasó a la API con las mismas tablas y
los mismos usuarios.

```
Vue :5173  ──►  FastAPI :8000  ──►  MySQL
   /api/cortes      /cortes
```

Todas las llamadas van a `/api/<ruta>`. El proxy —Vite en desarrollo
(`vite.config.js`), el nginx de la imagen en el servidor (`nginx.conf`)— **quita
`/api`** y lo manda a la API. Así el navegador ve un solo origen y
`VITE_API_URL` se queda vacío.

## Levantarlo

```bash
# 1) MySQL — desde PycharmProjects/PADEP
docker compose -f bd/docker-compose.yml up -d

# 2) La API — desde PycharmProjects/PADEP. Sin PADEP_JWT_SECRET va abierta
#    y el login responde 503: para usar esta pantalla hace falta.
PADEP_JWT_SECRET=<32+ caracteres> .venv/Scripts/python.exe -m uvicorn api.main:api --port 8000

#    Solo con una base nueva: roles y el primer admin.
PADEP_ADMIN_EMAIL=... PADEP_ADMIN_PASSWORD=... .venv/Scripts/python.exe -m api.sembrar_usuarios

# 3) Este frontend
npm install
npm run dev
```

> La API **no corre con `--reload`**: después de tocarla hay que reiniciarla a
> mano, o el proceso sigue con el código viejo en memoria.

Si el `:8000` no está arriba, las pantallas de extracción enseñan un aviso con
la orden para levantarlo, en vez de un error opaco.

## Estructura

```
src/
  api/
    cliente.js        envoltorio de fetch: token, errores, descargas
    auth.js           login y /me (POST /auth/login, GET /auth/me)
    extraccion.js     el resto de rutas de la API
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

## Sesión, roles y permisos

La API manda en `usuario.permisos` qué puede hacer la sesión (seis códigos:
`reportes.ver`, `documentos.cargar`, `extraccion.ejecutar`,
`incidencias.resolver`, `cohortes.gestionar`, `usuarios.gestionar`). El menú
solo enseña las pantallas cuyo `permiso` (en `data/catalog.js`) tiene la sesión
—`puede()` y `navVisible` en la store—, y `goTo` no abre las demás. **Es solo
para no ofrecer lo que se va a rechazar**: quien decide es la API, que pide su
permiso en cada ruta y devuelve 403. Los botones de dentro de cada pantalla
todavía no se esconden por permiso; si alguien sin permiso los pulsa, ve el
mensaje del 403.

«Cerrar sesión» anula el token **en el servidor** (`POST /auth/salir`), no solo
en el navegador. «Cambiar contraseña» (menú del perfil) cierra las demás
sesiones y guarda el token nuevo que devuelve la API. Usuarios y matriz de
permisos: módulo 6, `S17Usuarios.vue`.


El token se guarda en `localStorage` (`padep.token`) y viaja como
`Authorization: Bearer`. Al arrancar se revalida contra `/api/auth/me`; si
caducó, se descarta en silencio y sale el login. Un `401` en cualquier petición
cierra la sesión, en vez de dejar pantallas pidiendo datos que no van a llegar.

Los usuarios los crea un administrador (`DIGECADE`) con `POST /usuarios`; no
hay registro público.

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
  para quien opera. Llegan en `detail`; el cliente lee también `error` por si
  algo viejo lo manda.

## Descargas

La API exige el `Bearer`, y una etiqueta `<a href>` no manda cabeceras. Por
eso los archivos y las páginas del PDF se bajan con `fetch` y se abren como
blob (`api/cliente.js`). La pestaña se abre **antes** del `await`, todavía
dentro del gesto del usuario, o el navegador la bloquea por popup.

## Referencia

Los documentos de traspaso y el contrato viven junto a este README:

| Archivo | Qué es |
|---|---|
| `TRASPASO_FRONTEND.md` | el encargo: contrato y los porqués |
| `TRASPASO_FRONTEND_VUE.md` | el cliente y los composables, ya escritos |
| `CAMBIOS_FRONTEND.md` | el delta pedido después del traspaso |
| `CONSULTA_DOCENTES.md` | la consulta de docentes (módulo 2) |
| `openapi.json` | contrato generado del código de la API |
| `ejemplos_respuestas.json` | payloads reales; sirven de fixture sin backend |
