# Traspaso del frontend PADEP a un frontend propio

Este documento es el **encargo completo** para portar la interfaz que hoy sirve
la propia API a un frontend aparte. Está escrito para que otra sesión de Claude
Code lo lea y trabaje sin volver a preguntar nada al backend.

Lee entero antes de escribir código. Las cuatro trampas de la sección
«Comportamientos que hay que conservar» ya costaron una ronda de depuración cada
una y ninguna se deduce mirando el HTML.

---

## Qué es esto

PADEP extrae por OCR los PDF escaneados del PADEP/D (EFPEM-USAC) a CSV/Excel.
Son cinco documentos por corte, 1077 docentes, hasta 351 páginas por PDF. El
frontend actual hace dos trabajos:

| Pantalla | Qué hace |
|---|---|
| `index.html` | crea cortes, sube PDF, lanza extracción, entrega y carga a MySQL |
| `curador.html` | corrección manual celda a celda contra el PDF |

Backend: FastAPI + uvicorn, un solo proceso, un solo worker.

**La imagen de Docker ya no lleva frontend: es la API sola.** `.dockerignore`
deja `api/estatico/` fuera del contexto, y `api/main.py` solo registra las rutas
`/` y `/curador` **si la carpeta existe** —se mira el disco y no una bandera,
para que no haya dos verdades—. Dentro de la imagen no está, así que ahí la API
es 29 rutas JSON y nada más; las dos pantallas dan 404.

Los HTML se quedan en el repo del backend a propósito: son la referencia viva
del comportamiento y permiten probar en local sin levantar el front. No son el
frontend de producción.

---

## Archivos a copiar

Copia estos seis al repo del frontend nuevo:

```
api/estatico/index.html          referencia: pantalla de extracción
api/estatico/curador.html        referencia: pantalla de curación
api/openapi.json                 contrato completo, 34 rutas
api/ejemplos_respuestas.json     payloads reales de los GET, recortados
api/TRASPASO_FRONTEND.md         este documento
api/TRASPASO_FRONTEND_VUE.md     el cliente y los composables, ya escritos
api/CAMBIOS_FRONTEND.md          el delta del 7-sep: el corte pasó a 4 campos
```

**Si el frontend ya existe, empieza por `CAMBIOS_FRONTEND.md`**: es el encargo
corto de lo que hay que tocar. Este documento es el contexto completo, para
escribirlo desde cero.

`api/generar_contrato.py` se queda en el backend: es quien rehace los dos JSON.

**El frontend destino es Vue**, así que `TRASPASO_FRONTEND_VUE.md` trae el
código concreto: envoltorio de `fetch`, los cinco composables (ajustes, cortes,
subida troceada, trabajos, curador) y el proxy de Vite que ahorra el CORS en
desarrollo. Este documento explica el porqué; ese otro, el cómo.

Los dos HTML son **referencia, no código a copiar**. Llevan la lógica correcta y
los comentarios que explican el porqué de cada decisión rara — léelos antes de
reescribir. Lo que se porta es el comportamiento, no el marcado.

**Los dos JSON se generan, no se editan:**

```bash
.venv/Scripts/python.exe api/generar_contrato.py
```

Correrlo después de cada cambio de la API y volver a copiarlos. La primera
versión se hizo a mano y se quedó vieja sin que nada lo dijera: era del 27 de
agosto, el eje del corte cambió el 7 de septiembre, y el contrato siguió
diciendo `35-s3-c1` y `semestre` cuando la API ya pedía `carrera` y `trimestre`.
Un frontend escrito contra eso recibe 422 en todas partes sin pista de por qué.

`openapi.json` está generado del código, no escrito a mano. Genera el cliente
tipado con él en vez de escribir interfaces:

```bash
npx openapi-typescript api/openapi.json -o src/api/tipos.ts
```

`ejemplos_respuestas.json` trae la forma real de `/ajustes`, `/tipos`, `/cortes`,
`/cortes/{id}`, `/cortes/{id}/pendientes`, `/cortes/{id}/auditoria`,
`/cortes/{id}/carga` y `/extracciones`. Las listas largas van recortadas a 2
elementos con una marca `... N mas (recortado)`. Sirve de fixture para tests y
para maquetar sin backend.

---

## Los dos cambios obligatorios

### 1. URL base de la API

Hoy **no existe**. Todas las llamadas son relativas (`fetch('/cortes')`) porque
el HTML lo sirve el mismo origen que la API. En cuanto el frontend viva aparte,
cada `fetch` tiene que llevar base configurable:

```js
// src/api/cliente.js
const API = import.meta.env.VITE_API_URL ?? '';   // '' = mismo origen
export const url = ruta => `${API}${ruta}`;
```

```
# .env.development
VITE_API_URL=http://127.0.0.1:8000
```

Deja `''` como valor por defecto: así el frontend sigue funcionando si algún día
se vuelve a servir desde el mismo origen (que es como corre en el servidor, tras
nginx).

### 2. CORS en el backend

**Ya está hecho en el backend.** El middleware está en `api/main.py` y los
orígenes se configuran por entorno, porque el origen lo sabe la instalación y no
el código:

```bash
PADEP_ORIGENES=http://localhost:5173                 # desarrollo (Vite)
PADEP_ORIGENES=https://padep.midominio.com           # el servidor
PADEP_ORIGENES=http://localhost:5173,http://localhost:3000   # varios, por coma
```

En el compose es la variable `PADEP_ORIGENES`. **Vacío = no se añade el
middleware**, que es lo correcto cuando el front va tras el mismo nginx: ahí es
el mismo origen y no hay preflight que pasar.

**Lista explícita de orígenes, nunca `*`.** La API no tiene autenticación propia
y los PDF llevan nombre, carné, sede y notas de 1077 docentes; con el comodín
cualquier página abierta en el navegador se los podría leer. Además, con
`allow_credentials=True` el navegador rechaza el comodín de todas formas.

Comprobado: un origen de la lista pasa el preflight con
`access-control-allow-origin`; uno que no está recibe **400 «Disallowed CORS
origin»**.

---

## Contrato de la API

Base local: `http://127.0.0.1:8000`. Documentación viva en `/docs`.

El id de un corte es `11-car35-t6-c1` (cohorte-carrera-trimestre-corte). Con
barras habría que escaparlo y la ruta se volvería ambigua.

**El 35 y el 36 son códigos de CARRERA, no de cohorte.** Es el error que más
lejos llegó y el frontend tiene que llevarlo bien desde el principio: las dos
nóminas dicen `COHORTE = Onceava` (la cohorte es `11`) y se distinguen por su
columna `codigo` — 35 es preprimaria intercultural (1077 personas), 36 primaria
intercultural (2557). Y la unidad temporal es el **trimestre**, no el semestre:
el papel cuenta bimestres («NOVENO BIMESTRE»), 9 bimestres son 18 meses = 6
trimestres, así que el corte que se llamaba `s3-c1` es el `t6-c1`.

Un corte trae por tanto cuatro campos: `cohorte`, `carrera`, `trimestre`,
`corte`. `POST /cortes` los pide los cuatro; mandar `semestre` da **422**, y un
id con la forma vieja (`35-s3-c1`) no casa con el patrón y da **422** en todas
las rutas con `{id_corte}`.

En la base las dos carreras **comparten una sola fila de `Corte`** —el mismo
bimestre del mismo pago— y en disco cada una tiene su carpeta, porque cada una
trae sus propios PDF y su propia nómina. Para el frontend eso significa: la
carrera es parte de la identidad del corte, no un filtro que se pueda ignorar.

### Arranque

```
GET /ajustes    -> {"extraccion": true, "trozo_bytes": 8388608}
GET /tipos      -> {"asistencia": {"archivos": 1, "paginas_tipicas": "135"}, ...}
```

`/ajustes` primero, siempre. `extraccion: false` significa instalación en modo
solo consulta: **hay que ocultar el formulario de subida**, no solo deshabilitar
el botón. FastAPI recibe el cuerpo entero —140 MB— antes de que la ruta pueda
rechazarlo con 409. `trozo_bytes` lo decide la instalación, no el navegador.

`/tipos` da los cinco documentos y **cuántos archivos pide cada uno**. `docentes`
pide 2 y el resto 1. Genera una ranura de `<input type=file>` por archivo, sin
nombrar asignatura: las materias cambian de una cohorte a otra. **Lo único que
cuenta es el orden**, que es como el extractor aplica su rango de páginas.

### Cortes

```
GET  /cortes              lista, cada uno con falta_para_entregar
POST /cortes              crea la carpeta
GET  /cortes/{id}         estado de uno
POST /cortes/{id}/nomina  sube el Excel de la nómina del pago
```

Un corte trae `documentos` (los cinco, con `pdfs`, `extraido`, `filas`),
`nomina`, `entregado`, `curado` y `falta_para_entregar`. Ese último es una lista
de textos: **vacía = se puede entregar**. No recalcules la condición en el
cliente, úsala tal cual.

El estado se deriva del disco en cada petición, así que no hay ningún campo que
pueda quedar mintiendo — pero tampoco hay caché: no lo pidas en bucle apretado.

Reglas de la pantalla, tomadas del HTML actual:
- sin corte elegido no se puede subir nada (no habría dónde dejarlo)
- «entregar» habilitado solo si `falta_para_entregar` está vacío
- «cargar a la base» habilitado solo si `entregado`
- el corte elegido se recuerda en `localStorage` (`padep.corte`), o se pierde en
  cada refresco de 2 s

### Subida y extracción

```
POST /cortes/{id}/extracciones                  PDF chico, de una vez (202)
POST /cortes/{id}/extracciones/parte            un trozo (202)
GET  /cortes/{id}/extracciones/parte/{subida}   qué trozos hay ya
POST /cortes/{id}/extracciones/ensamblar        junta y encola (202)
```

Ver «Subida troceada» más abajo. `/extracciones` a secas se queda para archivos
chicos y para probar desde `/docs`.

### Trabajos

```
GET    /extracciones                 todos, del más nuevo al más viejo
GET    /extracciones/{id}            estado y avance
GET    /extracciones/{id}/registro   el log, texto plano
GET    /extracciones/{id}/archivos/{nombre}
DELETE /extracciones/{id}            cancela si corre, borra si terminó
```

**Un trabajo a la vez**: una extracción ya ocupa todos los núcleos. Borrar un
trabajo no borra sus archivos, que son del corte.

Tiempos reales, para dimensionar la espera: el reporte de resultados (351 págs)
tarda ~21 min en la máquina de desarrollo; los demás entre 40 s y 4 min. En el
servidor (4 vCPU) bastante más. La interfaz tiene que asumir que esto son
minutos, no segundos.

### Entrega, curación y carga

```
POST /cortes/{id}/entrega              curar + entrega + reaplicar + auditar (202)
GET  /cortes/{id}/pendientes           lo que queda por completar a mano
PUT  /cortes/{id}/correcciones         guarda UNA celda
PUT  /cortes/{id}/altas                guarda UNA casilla de una fila no extraída
PUT  /cortes/{id}/vinculos             ata una fila extraída con el nombre ilegible a su persona
POST /cortes/{id}/correcciones/aplicar vuelca lo escrito sobre la entrega (202)
POST /cortes/{id}/carga                a MySQL (202)
GET  /cortes/{id}/carga                qué hay de ese corte en la base
GET  /cortes/{id}/auditoria            lo que encontró la última auditoría
```

`GET /cortes/{id}/carga` devuelve `{"disponible": false, "motivo": ..., "pista":
...}` si MySQL no responde, **no un error**. Lo normal es que Docker no esté
levantado y la pantalla tiene que pintarse igual. Trátalo como estado, no como
fallo.

`/pendientes` es el modelo entero del curador:

| Campo | Qué es |
|---|---|
| `tareas` | celdas a corregir; cada una con `campos` → `casillas` (`filas`, `escrito`) |
| `sin_registro` | personas de la nómina sin ninguna fila: se da de **alta** o se **vincula**, no se corrige |
| `documentos` | para construir los enlaces al PDF |
| `correcciones`, `altas`, `vinculos` | cuántas van escritas |
| `sin_completar`, `sin_registro_abiertos` | lo que falta |
| `escrito_sin_volcar` | hay correcciones sin aplicar a la entrega |
| `altas_sin_reflejar` | hay altas o vínculos: aplicar **rehace la entrega entera** (minutos) |

Botón «aplicar»: habilitado si `correcciones` o si `altas_sin_reflejar`. En ese
caso el `title` debe avisar de que tarda, porque la entrega se rehace completa.

Cada persona de `sin_registro` trae además:

| Campo | Qué es |
|---|---|
| `campos` | el formulario del alta; vacío si ese documento no admite altas (`motivo` dice por qué) |
| `posible`, `que_hacer` | la fila que sobra en su página y se le parece, en texto |
| `vinculo` | `{archivo, fila}` de esa fila, o `null` si no sobra ninguna |
| `vinculada` | ya está vinculada a esta persona |

**Vincular** es para cuando la fila sí se extrajo pero con el nombre destrozado
(«Banco Sonscts Cativerinre Rashell» por «Blanco Sanabria Catherine Rashell»).
Se enseña un botón si `vinculo` no es `null`: «es su fila: vincularla», que
manda `PUT /cortes/{id}/vinculos` con `archivo` y `fila` de `vinculo` y el
`carne` de la persona. Con `vinculada`, el botón pasa a «deshacer el vínculo» y
manda `carne` vacío. Una persona vinculada cuenta como resuelta: no se le pide
el alta. Es lo único que resuelve a alguien en **resultados**, que no admite
altas.

Comprobar en el PDF antes de vincular: el porcentaje es una pista, no una
prueba. La API rechaza con 422 un carné fuera de la nómina, una fila que no
existe o una fila que en el papel trae el carné de **otra** persona.

### Comparación de nóminas

```
GET /cortes/{id}/comparacion?contra={otro}   bajas, altas y cambios por carné
PUT /cortes/{id}/comparacion/revision        marca o desmarca una diferencia
```

Sin `contra`, contra el corte anterior de la misma cohorte y carrera (409 si no
hay; 422 si `contra` es de otra carrera). Se calcula del disco, no hace falta
subir nada. Devuelve `antes` y `ahora` (`id`, `nomina`, `personas`),
`resumen` y tres listas; cada persona trae `carne`, `nombre`, `departamento`,
`municipio` y `marca` (`{nota, usuario, cuando}` o `null`):

| Lista | Además |
|---|---|
| `bajas` | `en_documentos_ahora` (si no está vacío, **no se retiró**: falta en la nómina) e `historial` (`asistencia`, `dictamen`, `notas` del corte anterior) |
| `altas` | `en_documentos_antes`: ya salía en los documentos del pago anterior |
| `cambios` | `campos`: `[{campo, etiqueta, antes, ahora}]` |

`marcas_disponible: false` (con `marcas_motivo`) si MySQL no responde o falta la
migración v4.6: se pinta la comparación y no se ofrece marcar.

El `PUT` lleva `carne`, `tipo` (`baja`/`alta`/`cambio`), `contra` —**el
`antes.id` que devolvió la comparación**, no lo elegido en pantalla, para que la
marca quede atada a ese corte— y `marcada` **`true` o `false` explícito**: un
campo vacío cuenta como ausente y la API marcaría. `nota` opcional; volver a
marcar con otra nota la reemplaza. Permiso `incidencias.resolver`.

### Re-extraer un corte con trabajo a mano

`POST .../extracciones`, `.../extracciones/parte` (en el primer trozo) y
`.../extracciones/ensamblar` devuelven **409** si el corte ya tiene correcciones,
altas o vínculos, con un mensaje que empieza explicándolo («este corte ya tiene
trabajo a mano…»). Las tres aceptan `forzar=true` para hacerlo igual. Ofrecerlo
**solo después de ese 409**, con una casilla que haya que marcar a propósito; y
mandar `forzar` explícito (`true`/`false`) en los trozos y en el ensamblado.

Tras re-extraer y rehacer la entrega, `/pendientes` trae `sin_ubicar`: las
correcciones que no se pudieron llevar con certeza a su persona y **no se
aplicaron**. Cada una con `ARCHIVO`, `FILA`, `CAMPO`, `VALOR`, `PAGINA` y
`MOTIVO`. Se descarta con el mismo `PUT /correcciones` y valor vacío en su
`FILA`.

### Ver la página del PDF

```
GET /cortes/{id}/pagina/{nombre_pdf}/{n}
GET /cortes/{id}/archivos/{capa}/{nombre}
```

---

## Comportamientos que hay que conservar

Cuatro. Ninguno es cosmético y ninguno se adivina.

### 1. La subida va troceada, y el motivo es el proxy

No el tamaño del archivo. **Cloudflare limita el cuerpo de cada petición**, no el
del archivo: el reporte de resultados (140 MB) moría con `413 Content Too Large`
antes de llegar a nginx, así que el `client_max_body_size 300m` del servidor no
pintaba nada porque el corte pasaba un salto más arriba. Se descartó arreglarlo
en la infraestructura porque depende de un panel al que no se tiene acceso.

Trocear no depende de nadie y sobrevive al proxy que metan mañana. **No lo
simplifiques a un solo POST.**

El algoritmo, en `index.html:520-565`:

1. Tamaño de trozo desde `GET /ajustes` → `trozo_bytes` (8 MB por defecto)
2. Id de subida: 16 bytes aleatorios en **hexadecimal**. La API solo acepta hex
   porque acaba siendo un nombre de carpeta
3. El id se guarda en `sessionStorage` con llave
   `subida:{corte}:{nombre}:{tamaño}:{lastModified}` — si la subida se corta, el
   mismo archivo se retoma donde iba
4. `GET .../parte/{id}` dice qué trozos hay. Se comparan **tamaños, no
   presencia**: un trozo a medio escribir no vale por bueno. Y solo se reutiliza
   si `d.total === n`
5. `File.slice()` por trozo → `POST .../parte` con `subida`, `indice`, `total`,
   `trozo`. Espera 202
6. Al acabar todos los archivos: `POST .../ensamblar` con `tipo`, y `subidas` +
   `nombres` **en el orden de las ranuras**
7. **La llave de sessionStorage se borra al ensamblar bien, nunca antes.** Si
   fallara justo tras el último trozo, borrarla obligaría a mandar 140 MB otra
   vez teniéndolos ya todos en el servidor

Las subidas que nadie retoma se barren solas a las 24 h.

### 2. El curador guarda cada celda en el acto

Al salir del campo (`change`), una petición por celda, contra
`<corte>/correcciones.csv`. **No hay botón «guardar»**: son decenas de celdas y
un botón por tarea se olvida. Cerrar la pestaña no puede perder nada.

Tras guardar, refleja el valor en el modelo local **sin recargar la lista**, o se
pierde el foco de escritura a media captura.

Las correcciones se direccionan por `archivo` + `filas` + `campo`. Las altas por
`archivo` + **`carne`** + `campo`: quien el OCR nunca extrajo no tiene fila a la
que apuntar, y el carné de la nómina no se mueve. Un alta equivocada se **anula**
(campo `ANULADA`), no se borra: quitar la línea correría las filas de detrás y
las correcciones caerían sobre la fila equivocada.

Los vínculos van por `archivo` + `fila`, y esa `fila` **no** es la de las
correcciones: es la posición en `datos/`, no en la entrega, que pierde filas por
el camino. Úsala tal como llega en `vinculo.fila`, sin calcularla. Un vínculo sí
se borra (carné vacío): no añade filas, así que quitarlo no mueve nada.

### 3. No enlazar al PDF entero con `#page=N`

Comprobado: Chrome aplica el fragmento antes de terminar de cargar y, cuando
acaba de bajar los 40 MB, vuelve a la página 1.

Usa `GET /cortes/{id}/pagina/{pdf}/{n}`, que extrae esa página y devuelve un PDF
de una sola hoja: el visor marca 1/1, no hay dónde desplazarse, y van 276 KB en
vez de 40 MB.

### 4. Sondeo cada 2 s

`setInterval(refresca, 2000)` mientras haya trabajos vivos. No hay websockets ni
SSE. Si migras a react-query o similar, `refetchInterval: 2000` y párala cuando
no haya nada corriendo — el servidor es un solo worker.

---

## Restricciones del proyecto

- **Tema claro fijo.** El modo oscuro se probó y se descartó por petición
  explícita del usuario. No volver a añadirlo, ni con `prefers-color-scheme`.
- **`<meta charset="utf-8">` como primera línea de todo HTML.** Sin ella las
  tildes se rompen. **No usar BOM** para esto.
- Los textos de la interfaz van **en español**, sin tecnicismos de programador:
  quien la usa cura datos, no despliega software.
- La API escucha solo en `127.0.0.1` y **no lleva autenticación**. En el servidor
  va detrás de nginx con `auth_basic`. Si el frontend nuevo vive en otro origen,
  las credenciales básicas viajan con `credentials: 'include'` — y por eso
  `allow_origins` tiene que ser la lista exacta.
- Errores: la API devuelve `{"detail": "..."}`. Enséñalo tal cual, ya viene en
  español y escrito para quien opera.
- Códigos: `202` en todo lo que encola (extraer, entregar, aplicar, cargar);
  `201` en lo que crea; `409` si la instalación no extrae o falta volcar antes de
  cargar; `422` si un alta trae un campo fuera de `ALTA_CAMPOS`.

---

## Orden sugerido de trabajo

1. Generar el cliente tipado desde `openapi.json`
2. Envoltorio `fetch` con base URL, manejo de `detail` y `credentials`
3. Pantalla de cortes: listar, crear, elegir (con `localStorage`), subir nómina
4. Subida troceada — **lo más delicado**; portar el algoritmo entero y probarlo
   con un archivo de más de 8 MB, cortando la red a mitad para ver que reanuda
5. Lista de trabajos con sondeo de 2 s y visor del registro
6. Entrega y carga (botones gobernados por `falta_para_entregar` y `entregado`)
7. Curador: tareas, altas, guardado por celda, enlace a la página del PDF
8. Auditoría

Los pasos 1-3 se pueden hacer contra `ejemplos_respuestas.json` sin levantar
nada. Del 4 en adelante hace falta el backend corriendo:

```bash
.venv/Scripts/python.exe -m uvicorn api.main:api --port 8000
```

**Después de tocar el backend hay que reiniciarlo**: no corre con `--reload`
porque el proceso tiene el código en memoria y una extracción en marcha se
perdería.
