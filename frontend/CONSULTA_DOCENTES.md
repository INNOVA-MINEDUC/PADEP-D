# Encargo para el frontend: consultar docentes y notas

Dos rutas nuevas, **solo lectura**, que leen de MySQL lo que ya se cargó. No
cambia nada de lo existente: las demás rutas siguen iguales.

Antes, copia otra vez `api/openapi.json` y `api/ejemplos_respuestas.json` (43
rutas) y rehaz los tipos:

```bash
npx openapi-typescript api/openapi.json -o src/api/tipos.ts
```

Los ejemplos de `/docentes` van **anonimizados** (`00000000000`, `Apellido
Apellido Nombre Nombre`): son gente real de la base y ese archivo vive en tu
repo. La forma es la real.

---

## `GET /docentes` — la lista

Una fila por **inscripción** (docente en una carrera de una cohorte), no por
persona: quien esté en dos carreras sale dos veces, con dos resultados.

| Parámetro | Qué hace |
|---|---|
| `cohorte` | código de cohorte: `11` |
| `carrera` | código de carrera: `35`, `36` |
| `id_departamento`, `id_municipio` | los ids de `GET /departamentos` y `.../municipios` |
| `q` | nombre (sin distinguir tildes ni mayúsculas), principio del código PADEP o CUI exacto |
| `estado` | `APROBADO`, `CDR`, `REPROBADO`, `PENDIENTE`: quien tiene al menos una nota así |
| `pagina`, `por_pagina` | desde 1; `por_pagina` de 1 a 200, 50 por defecto |

```json
{ "total": 1077, "pagina": 1, "por_pagina": 50, "paginas": 22,
  "docentes": [ { "codigo_padep": "…", "cui": "…", "nombre": "…", "sexo": "F",
                  "cohorte": "11", "carrera": "35", "carrera_nombre": "…",
                  "departamento": "…", "municipio": "…",
                  "estatus_academico": "activo", "escalafon": "A",
                  "notas": 2, "aprobadas": 1, "cdr": 1, "reprobadas": 0,
                  "promedio": 64, "presentes": 7, "sesiones": 7,
                  "asistencia_porcentaje": 100 } ] }
```

`total` y `paginas` son del filtro entero. `promedio` y
`asistencia_porcentaje` pueden ser `null` si la persona no tiene notas o
asistencia cargadas.

## `GET /docentes/{codigo}` — la ficha

`codigo` es el código PADEP (11 dígitos) **o** el CUI (13). 404 si no existe.

```
docente          datos de la persona
inscripciones[]  una por carrera/cohorte, y dentro de cada una:
  laboral          escalafón, jornada, partida (la situación más reciente)
  notas[]          por asignatura: sección, catedrático, sede, zona, examen,
                   nota, estado, cuadra, pagina_origen
  asistencia[]     por corte: sesiones[{numero, presente}], presentes,
                   total_declarado, cuadra, porcentaje, pagina_origen
nomina[]         lo que dice la nómina de cada pago, TAL CUAL llegó
incidencias[]    lo que quedó sin resolver al cargar (FALTA, REVISAR, ...)
```

Tres cosas para pintarlo bien:

- **`estado` manda sobre `observaciones`.** `estado` sale del control
  académico y distingue `CDR` (derecho a recuperación) de `REPROBADO`; la
  observación del reporte de resultados solo dice «NO APROBADO». Pinta
  `estado`.
- **`cuadra`** (notas y asistencia): `true`/`1` = cuadra, `false`/`0` = no
  cuadra, `null` = falta alguno de los datos. Un «no cuadra» merece un aviso,
  no un error: el dato es el del papel.
- **`pagina_origen`** es la página del PDF de donde salió. Con
  `GET /cortes/{id}/pagina/{pdf}/{n}` se puede enlazar a esa hoja sola.

## Lo que NO hay

Ni PUT ni DELETE, a propósito. La base se reconstruye desde la entrega en cada
carga: una edición hecha aquí se perdería en la siguiente sin avisar. Un dato
mal leído se corrige en el curador (`correcciones.csv`) y se vuelve a cargar.

Errores: `422` si un parámetro no vale (el `detail` dice cuál), `503` si MySQL
no responde —**no es una lista vacía**—.
