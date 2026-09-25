# Encargo para el frontend — el corte cambió de eje

Lee esto entero antes de tocar código. Es un cambio pequeño en líneas y grande
en consecuencias: **si no se hace completo, la pantalla no da un error claro
sino un 422 en todas partes sin pista de por qué.**

Contexto largo en `TRASPASO_FRONTEND.md` (actualizado). Esto es solo el delta.

---

## Lo que cambió, en una frase

Un corte se identificaba con **tres** datos (cohorte, semestre, corte) y ahora
se identifica con **cuatro**: cohorte, **carrera**, **trimestre**, corte.

Y hay **una pantalla nueva** que no existía: la configuración de cohorte —sedes
y enlaces de DIDEDUC— (punto 8).
No tiene nada que ver con el cambio de eje; se puede dejar para después.

```
antes:   35-s3-c1        cohorte=35  semestre=3  corte=1
ahora:   11-car35-t6-c1  cohorte=11  carrera=35  trimestre=6  corte=1
```

## Por qué, para que no se deshaga por accidente

**El 35 y el 36 nunca fueron cohortes: son códigos de CARRERA.** Las dos nóminas
dicen `COHORTE = Onceava` —la cohorte es la `11`— y se distinguen por su columna
`codigo`:

| código | carrera | personas |
|---|---|---|
| **35** | Profesorado de educación **pre**primaria intercultural | 1077 |
| **36** | Profesorado de educación **primaria** intercultural | 2557 |

Y la unidad temporal es el **trimestre**, no el semestre. El papel cuenta
bimestres («NOVENO BIMESTRE»); 9 bimestres son 18 meses = 6 trimestres, así que
el corte que se llamaba `s3-c1` es el `t6-c1`. **El número no se traduce con una
fórmula** —`trimestre = semestre * 2` acierta en este corte por casualidad—: lo
manda el backend, el frontend nunca lo calcula.

---

## Los nueve cambios

### 1. Regenerar los tipos

`api/openapi.json` y `api/ejemplos_respuestas.json` están regenerados del código
(34 rutas). Cópialos otra vez y rehaz el cliente tipado:

```bash
npx openapi-typescript api/openapi.json -o src/api/tipos.ts
```

No edites esos JSON a mano. En el backend los rehace
`api/generar_contrato.py`.

### 2. `POST /cortes` — cuatro campos

```
cohorte     requerido    "11"
carrera     requerido    "35" | "36"
trimestre   requerido    1..12   (entero)
corte       requerido    >= 1    (entero)
```

`multipart/form-data` o `x-www-form-urlencoded`, como antes.

Mandar `semestre` da **422**. Validaciones del servidor, para reflejarlas en el
formulario antes de enviar:

- `carrera` vacía → 422 «falta el código de carrera (35, 36, ...)»
- `trimestre` fuera de 1..12 → 422 «el trimestre va de 1 a 12»
- `corte` < 1 → 422 «el corte empieza en 1»

El tope de 12 **no dice cuántos trimestres dura una cohorte** —eso no se sabe—:
solo ataja el número absurdo. No lo conviertas en un desplegable de 1 a 6.

### 3. El objeto corte trae `carrera` y `trimestre`

`GET /cortes` y `GET /cortes/{id}` devuelven:

```json
{
  "id": "11-car35-t6-c1",
  "cohorte": "11",
  "carrera": "35",
  "trimestre": 6,
  "corte": 1,
  "carpeta": "cortes/11/car35/t6-c1",
  "nomina": "Nomina 35 6to pago 2026.xlsx",
  "documentos": { "asistencia": {"pdfs": [...], "extraido": true, "filas": 1077}, "…": {} },
  "entregado": true,
  "curado": true,
  "falta_para_entregar": []
}
```

`cohorte` y `carrera` son **texto**; `trimestre` y `corte`, **enteros**. En la
lista, la carrera tiene que verse: dos cortes del mismo trimestre solo se
distinguen por ella.

Etiquetas sugeridas, para que nadie repita el error de origen:

```
Carrera 35 — preprimaria intercultural
Carrera 36 — primaria intercultural
```

Y donde ponga «Semestre», que ponga **«Trimestre»**.

### 4. Limpiar `localStorage` — esto es lo que más molesta si se olvida

La clave `padep.corte` guarda el id del corte elegido. En cualquier navegador
que ya usó la app hay guardado un id viejo (`35-s3-c1`), y ese id **no casa con
el patrón nuevo**: todas las rutas con `{id_corte}` devuelven 422 y la pantalla
se ve rota sin decir por qué.

Al arrancar, valida el id guardado contra la lista y descártalo si no está:

```js
const cortes = await api.cortes();
const guardado = localStorage.getItem('padep.corte');
if (guardado && !cortes.some(c => c.id === guardado)) {
  localStorage.removeItem('padep.corte');       // id de antes del cambio de eje
}
```

Vale igual para cualquier otra cosa cacheada que lleve el id dentro.

### 5. La API ya no sirve pantallas

`GET /` y `GET /curador` **dan 404** en el servidor: la imagen de Docker es la
API sola. El frontend es la única interfaz — también para la curación manual,
que antes vivía en `/curador`.

Como el front va en otro origen, cada `fetch` necesita base configurable:

```js
const API = import.meta.env.VITE_API_URL ?? '';   // '' = mismo origen
```

El CORS ya está resuelto en el backend (`PADEP_ORIGENES`); si tu origen no está
en esa lista el preflight vuelve **400 «Disallowed CORS origin»** y hay que
añadirlo allí, no en el cliente.

### 6. `GET /cortes/{id}/carga` puede decir que no está disponible

Tiene tres formas y la pantalla tiene que aguantar las tres sin romperse:

```json
{"disponible": false, "motivo": "…", "pista": "…"}          // base caída o esquema viejo
{"disponible": true, "cargado": false, "motivo": "…"}       // aún no se ha cargado
{"disponible": true, "cargado": true,  "cuentas": {...}}    // cargado
```

`disponible: false` **no es un error**: se pinta el `motivo` y, si viene, la
`pista`. Lo normal es que la base no esté levantada, y el resto de la pantalla
tiene que seguir funcionando.

### 7. El formulario del corte: esconder `corte`, preguntar lo que el usuario sí sabe

Quien usa la pantalla no sabe qué es un «corte», y hoy se le pide teclearlo.
Hay que darle la vuelta: **quitar de la vista el número que no entiende y pedir
los datos que tiene escritos en los papeles que está subiendo.**

#### 7a. `corte` fijo en 1 y oculto

Hoy siempre vale 1. Un campo con un solo valor posible es ruido y una ocasión
más de teclear mal.

```js
await api.creaCorte({ cohorte, carrera, trimestre, corte: 1 });
```

Queda así, con tres campos en vez de cuatro:

```
COHORTE      CARRERA                                TRIMESTRE
[ 11 ]       [ 35 — preprimaria intercultural  ▾ ]  [ 6 ]      [ Crear ]
```

Y en el rótulo del selector, `COHORTE · CARRERA · TRIMESTRE` (sin `· CORTE`).

**No hay caso de borde que manejar**: `POST /cortes` con un corte que ya existe
devuelve su estado, no un error, así que pulsar «Crear» sobre uno existente
simplemente lo selecciona.

**No calcules el número automáticamente** (`hermanos.length + 1`): si alguien
reenvía el formulario del mismo corte, en vez de reseleccionarlo crearía un
corte 2 vacío por accidente. Con el 1 fijo eso no puede pasar, precisamente
porque la creación es idempotente.

Salida de emergencia, por si algún día llegan dos entregas en el mismo
trimestre: un enlace pequeño junto al selector que revele el campo.

```
Otra entrega en este trimestre →   [ Corte: 2 ]
```

Probablemente no se use nunca, pero evita tener que tocar el backend ese día.

#### 7b. Desplegable para la carrera, valores por defecto de verdad

`carrera` no debe ser texto libre: es el campo donde el error de confundirla con
la cohorte se vuelve a colar. Dos opciones, con su nombre:

```
35 — preprimaria intercultural
36 — primaria intercultural
```

Y `cohorte` (`11`) y `trimestre` con **valor** por defecto, no *placeholder*: en
la pantalla de hoy salen en gris, así que quien pulsa «Crear» sin escribirlos
manda la carrera vacía y recibe un 422.

#### 7c. Las cuatro etiquetas, en el paso de carga

Esto es lo que de verdad mejora la pantalla: cambias un número que nadie
entiende por cuatro datos que **están escritos en los papeles que el usuario
tiene delante**. Son campos opcionales de `POST /cortes/{id}/carga`:

| Campo | Dónde lo lee | Ejemplo |
|---|---|---|
| `bimestre` | portada del PDF | `NOVENO BIMESTRE` |
| `pago` | nombre de la nómina | `6` |
| `anio_pago` | nombre de la nómina | `2026` |
| `cohorte_nombre` | columna `COHORTE` de la nómina | `Onceava` |

`pago` y `anio_pago` tienen que ser dígitos o el servidor responde 422.

**No los rellenes con valores por defecto.** No tienen ninguno a propósito:
antes valían los de la 35 y cualquier otro corte se guardaba como noveno
bimestre, 6º pago de 2026 sin avisar. Son columnas que admiten NULL — no saberlo
es un estado legítimo, inventarlo no —, y una carga posterior que sí los traiga
los rellena.

Van en el paso de carga a la base, no en el de crear el corte.

### 8. Pantalla nueva: configuración de cohorte (sedes y enlaces DIDEDUC)

Un asistente de tres pasos —**Cohorte → Sedes → Enlaces**— y es **la primera
parte de la API que escribe en MySQL**. No se parece al resto: aquí no hay PDF,
ni extracción, ni entrega. Se da de alta la cohorte, se le ponen sedes y a cada
sede se le asigna la persona de DIDEDUC que la lleva. **Todo esto pasa meses
antes de que exista ningún PDF**; por eso las sedes se escriben a mano y no se
esperan de la extracción.

> Cambió el 2026-09-16: hasta entonces el enlace se asignaba **por
> departamento**. Ahora es **por sede**. Si ya había código contra
> `/cohortes/{c}/enlaces/{id_departamento}`, hay que reescribirlo: la ruta es
> la misma pero el último tramo es `id_cohorte_sede` y la lista devuelve sedes,
> no departamentos.

#### Las tres cosas, que son distintas

```
la COHORTE      codigo ('11'), nombre ('Onceava')        /cohortes
la SEDE         una escuela, en un municipio, de esta    /cohortes/{c}/sedes
                cohorte
la PERSONA      nombre, cargo, telefono, email           /enlaces
la ASIGNACION   esta sede de esta cohorte la lleva       /cohortes/{c}/enlaces/{sede}
                esta persona
```

**La sede no es un campo de la persona.** Se crea el enlace sin sede —eso es un
estado normal, no un formulario a medias— y se asigna después, sede por sede,
dentro de una cohorte. Una persona puede llevar **varias** sedes (lo normal es
que cubra las de su departamento); una sede lleva **una** persona.

#### Las rutas

```
GET    /cohortes                                  las de la base, con sedes y enlaces contados
POST   /cohortes                                  codigo, nombre  → 201 · 409 si existe

GET    /departamentos                             los 22, primer desplegable
GET    /departamentos/{id}/municipios             segundo desplegable
GET    /municipios/{id}/escuelas                  tercer desplegable

GET    /cohortes/{cohorte}/sedes                  las sedes, cada una con su enlace o null
POST   /cohortes/{cohorte}/sedes                  id_municipio, escuela, [direccion] → 201
DELETE /cohortes/{cohorte}/sedes/{id_cohorte_sede}   «Quitar» · 409 si tiene datos cargados

GET    /enlaces                                   las personas, con sus asignaciones
POST   /enlaces                                   crear      → 201
GET    /enlaces/{id}
PUT    /enlaces/{id}                              editar
DELETE /enlaces/{id}                              → 409 si está asignado

GET    /cohortes/{cohorte}/enlaces                = GET .../sedes (misma lista)
PUT    /cohortes/{cohorte}/enlaces/{id_cohorte_sede}   asignar o reasignar
DELETE /cohortes/{cohorte}/enlaces/{id_cohorte_sede}   dejar la sede sin enlace
```

`{cohorte}` es el **código**: `11`. No el id de la base, y no el id del corte.

`POST` y `PUT` van por formulario (`Form`), igual que el resto de la API.

#### Paso 1: la cohorte

`POST /cohortes` con `codigo=11&nombre=Onceava`. Si ya existe, 409 — y para la
Onceava ya existe en la base local, porque nació con la primera carga. La
pantalla puede pedir `GET /cohortes` y ofrecer elegir o crear.

Carrera y trimestre **no van aquí**: son del corte, en disco (`POST /cortes`,
punto 2 de este documento). La cohorte en MySQL solo lleva código y nombre.

#### Paso 2: las sedes — los tres desplegables y un campo libre

```
GET /departamentos                → elige uno
GET /departamentos/4/municipios   → elige uno
GET /municipios/8/escuelas        → elige una... o escribe una nueva
POST /cohortes/11/sedes   id_municipio=8  escuela=EORM Chimaltenango No.1
```

Dos cosas que hay que saber para pintarlo bien:

- **Los catálogos de municipios y escuelas son lo que la base ha visto**, no el
  listado oficial. Se llenan con las nóminas y los PDF cargados. Un municipio o
  una escuela que falten **se escriben a mano**: el tercer desplegable tiene
  que aceptar texto libre (un `<datalist>`, o un select con opción «otra…»).
  Un municipio que falte hoy no se puede crear desde aquí; se avisa y se pide.
- **La escuela va por nombre, no por id.** Si ya existe en ese municipio se
  reutiliza; si no, se crea. Es la misma clave con la que el cargador la busca
  cuando llegue el PDF de sedes, así que no se duplica. El formulario es el
  mismo tanto si se eligió del desplegable como si se escribió.

```json
POST /cohortes/11/sedes   → 201
{ "id_cohorte_sede": 126, "id_sede": 127, "correlativo": null,
  "id_departamento": 4, "departamento": "Chimaltenango",
  "id_municipio": 8, "municipio": "Chimaltenango",
  "id_escuela": 127, "escuela": "EORM Chimaltenango No.1", "direccion": null,
  "coordinador": null, "enlace": null }
```

`GET /cohortes/11/sedes` devuelve esa misma forma, una por sede, ordenadas por
departamento, municipio, escuela. Con eso se pinta la tabla del paso 2 (las
tres columnas) y el «Sedes: N» del resumen.

**«Quitar» puede dar 409**, y hay que enseñarlo: una sede que ya tiene
secciones con docentes cargados de un corte es del papel, y no se borra desde
aquí. El `detail` lo dice. Quitar una sede sin datos se lleva también su
enlace, y la respuesta trae `enlace_liberado` con el nombre.

#### Paso 3: los enlaces, sede por sede

```json
GET /cohortes/11/enlaces      (idéntico a GET /cohortes/11/sedes)
[{ "id_cohorte_sede": 126, "escuela": "EORM Chimaltenango No.1",
   "municipio": "Chimaltenango", "departamento": "Chimaltenango", …,
   "enlace": { "id_enlace": 15, "nombre": "Lucía Morán",
               "cargo": "Supervisora educativa", "telefono": null,
               "email": "lmoran@mineduc.gt" } },
 { "id_cohorte_sede": 127, "escuela": "EORM Sololá Casco Urbano", …,
   "enlace": null }]
```

**Devuelve todas las sedes, también las sin enlace.** La pantalla es «quién
lleva cada sede» y la que está sin asignar es justo la fila que hay que
rellenar — no la filtres, píntala como «Sin asignar» con un botón. «Enlaces
asignados: N» del resumen es contar las que traen `enlace`.

El botón «Registrar enlace nuevo» es `POST /enlaces`; el desplegable de
personas para «Asignar» sale de `GET /enlaces`.

```json
GET /enlaces
[{ "id_enlace": 15, "nombre": "Lucía Morán", "cargo": "Supervisora educativa",
   "telefono": null, "email": "lmoran@mineduc.gt",
   "asignaciones": [
     { "id_cohorte": 1, "cohorte": "11", "id_cohorte_sede": 126,
       "escuela": "EORM Chimaltenango No.1",
       "municipio": "Chimaltenango", "departamento": "Chimaltenango" }] }]
```

#### `PUT` reasigna, y dice a quién desplazó

Es `PUT` sobre la sede y no `POST` a una lista porque **la asignación es la
sede**: asignar y reasignar son la misma operación, y repetir el mismo `PUT` no
crea una segunda fila.

```json
PUT /cohortes/11/enlaces/126   id_enlace=16
{ "cohorte": "11", "id_cohorte_sede": 126, "sede": "EORM Chimaltenango No.1",
  "municipio": "Chimaltenango", "departamento": "Chimaltenango",
  "enlace": "Luis Mo", "id_enlace": 16,
  "sustituyo": { "id_enlace": 15, "nombre": "Lucía Morán" } }
```

`sustituyo` es **`null`** si la sede estaba libre, y también al repetir el
mismo `PUT`. Cuando trae a alguien, esa persona **ya no lleva esa sede** y hay
que decirlo: un aviso después, o una confirmación antes —«EORM Chimaltenango
No.1 la lleva Lucía Morán. ¿Reemplazar?»—. Lo que no vale es tragárselo.

#### Los errores previstos

Ninguno es un fallo: todos traen un `detail` que se puede enseñar tal cual.

| | |
|---|---|
| `409` al crear la cohorte | «la cohorte 11 ya existe» |
| `409` al agregar sede | «EORM Chimaltenango No.1 ya es sede de la cohorte 11» |
| `409` al quitar sede | «no se puede quitar …: tiene 2 sección(es) con datos cargados de un corte. Es una sede del papel.» |
| `409` al borrar enlace | «no se puede borrar a Lucía Morán: está asignado en EORM Chimaltenango No.1 (cohorte 11). Quita esas asignaciones primero.» |
| `404` en cohorte | «no existe la cohorte 99 en la base. Se crea con POST /cohortes, o al cargar un corte suyo.» |
| `404` en sede | «esa sede no es de esta cohorte» |

Ya no hay 409 al asignar: una persona puede llevar varias sedes.

#### Y una diferencia de criterio con el resto de la API

Si MySQL no responde, estas rutas devuelven **503**, no una lista vacía.

Es a propósito y no contradice a `GET /cortes/{id}/carga`, que devuelve
`disponible: false`: allí la base es un extra y la pantalla tiene que pintarse
igual sin ella. Aquí la base es lo único que hay, y contestar «no hay sedes»
cuando lo que pasa es que MySQL está caído sería mentir.

### 9. El histórico de trabajos se puede filtrar por corte

`GET /extracciones` sigue devolviendo **todos** los trabajos, como hasta ahora.
Lo nuevo es un parámetro opcional:

```
GET /extracciones                        el histórico entero
GET /extracciones?corte=11-car35-t6-c1   solo los de ese corte
```

Cada trabajo ya traía `cohorte`, `carrera`, `trimestre` y `corte`; ahora además
se puede pedir filtrado y no traerse lo que no se va a pintar.

**Es opcional a propósito, y las dos vistas hacen falta.** La pantalla de un
corte quiere los suyos; pero «qué está corriendo ahora mismo» los quiere todos,
porque **la cola es una sola y global** —un trabajo a la vez, que una extracción
ocupa todos los núcleos—. Si la pantalla filtra siempre por el corte elegido y
hay una extracción de otro corte en marcha, el usuario ve su trabajo «en cola»
sin nada que explique por qué no arranca.

Lo razonable: filtrar por defecto, con un «ver todos» a mano. O una línea fija
arriba con lo que se está extrayendo ahora, sea del corte que sea.

Dos detalles del comportamiento:

- Un corte mal escrito da **422**, con el mismo mensaje que el resto de rutas
- Un corte **sin histórico** da `200` y lista vacía, no 404. Tampoco se
  comprueba que el corte exista en disco: un corte borrado puede tener
  histórico, y un 404 escondería justo lo que se está buscando

Y un aviso que no es del filtro pero se ve al mirar el histórico: los trabajos
que estaban «en cola» o «extrayendo» cuando se paró el servidor aparecen como
**fallidos**, con «el servidor se detuvo durante la extracción». Es correcto: un
proceso no sobrevive a un reinicio, y dejarlo como «extrayendo» sería mentir.

---

## Lo que NO cambia

Todo el resto del contrato: subida troceada, cola de trabajos, pendientes,
correcciones, altas, auditoría. Mismos campos, mismos códigos, mismo
comportamiento. `falta_para_entregar` sigue siendo la lista que manda —vacía =
se puede entregar— y **no se recalcula en el cliente**.

## Cómo comprobar que quedó bien

1. Crear un corte con carrera 36 y trimestre 6 → **201**, id `11-car36-t6-c1`
2. Mandar `semestre=3` en vez de `trimestre` → **422** (no debe pasar)
3. Poner a mano `padep.corte = "35-s3-c1"` en localStorage y recargar → la
   pantalla arranca limpia, sin 422 en cadena
4. Con la base apagada, abrir un corte → se ve el `motivo`, no una pantalla rota
5. La lista distingue la 35 de la 36 del mismo trimestre
6. El formulario de crear enseña **tres** campos, no cuatro
7. Pulsar «Crear» sobre un corte que ya existe lo **selecciona**, no da error
8. Cargar a la base manda `bimestre`, `pago`, `anio_pago` y `cohorte_nombre`,
   y los deja vacíos si el usuario no los sabe (nunca inventados)
9. `GET /extracciones?corte=…` devuelve solo los de ese corte, y sigue habiendo
   forma de ver todos
9. `GET /cohortes/11/enlaces` pinta **22** filas, con botón de asignar en las
   que traen `enlace: null`
10. Reasignar un departamento ocupado avisa de a quién desplazó (`sustituyo`),
    antes o después, pero avisa
11. Con MySQL apagado, las rutas de enlaces dan **503** y la pantalla lo dice;
    no enseña una lista vacía
