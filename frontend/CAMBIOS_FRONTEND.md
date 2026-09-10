# Encargo para el frontend — el corte cambió de eje

Lee esto entero antes de tocar código. Es un cambio pequeño en líneas y grande
en consecuencias: **si no se hace completo, la pantalla no da un error claro
sino un 422 en todas partes sin pista de por qué.**

Contexto largo en `TRASPASO_FRONTEND.md` (actualizado). Esto es solo el delta.

---

## Lo que cambió, en una frase

Un corte se identificaba con **tres** datos (cohorte, semestre, corte) y ahora
se identifica con **cuatro**: cohorte, **carrera**, **trimestre**, corte.

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

## Los siete cambios

### 1. Regenerar los tipos

`api/openapi.json` y `api/ejemplos_respuestas.json` están regenerados del código
(25 rutas). Cópialos otra vez y rehaz el cliente tipado:

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
