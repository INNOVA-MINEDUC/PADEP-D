# Reportes dinámicos — lo que hay que saber

Pantallas: **S13 Constructor de Reportes** y **S14 Reportes Guardados**.
Lógica en la API: `api/reportes.py`. Ya construido; esto es la referencia.

## La regla: se manda una especificación, nunca SQL

```json
{ "fuente": "notas", "modo": "resumen",
  "agrupar": ["sede_departamento", "asignatura"],
  "medidas": ["n_notas", "pct_aprobados"],
  "filtros": [{"campo": "trimestre", "op": "en", "valor": [1, 2]},
              {"campo": "pct_aprobados", "op": "menor", "valor": 60}],
  "orden": [{"campo": "pct_aprobados", "dir": "asc"}] }
```

- `modo: "listado"` lleva `columnas` (campos `dim` o `valor`); `modo: "resumen"`
  lleva `agrupar` (`dim`) y `medidas` (`medida`). En resumen, un filtro sobre
  una medida es un HAVING.
- La fuente `docentes` admite `trimestres: [2]`: limita a ese periodo las
  notas y la asistencia que resume por persona. Las demás lo rechazan (422).
- Qué campos, tipos y operadores hay lo dice `GET /reportes/catalogo`. La
  pantalla no tiene ninguno escrito.

## Fuentes (una por grano, para que nada cuente doble)

| Fuente | Una fila por | Periodo |
|---|---|---|
| `docentes` | inscripción (persona en carrera y cohorte) | `trimestres` opcional |
| `notas` | nota | campos trimestre, pago, año, bimestre |
| `asistencia` | persona × corte | ídem |
| `nomina` | persona × pago, tal cual vino esa nómina | ídem |

«Docentes distintos» cuenta a una persona una vez **por grupo**: agrupado por
trimestre, la suma pasa del total general. Es lo correcto, no un error.

## Seguridad

- Lo que no está en el catálogo es 422. Los valores van como parámetros.
- Campos `personal` (nombre, CUI, DPI, nacimiento, partida, carné): solo con
  `reportes.datos_personales`. Sin él ni salen en el catálogo, y pedirlos de
  cualquier forma es 403.
- Cada consulta: `START TRANSACTION READ ONLY` y 15 s de tope. Vista previa
  hasta 200 filas por página; exportación hasta 50 000.
- Exportar se anota en `ReporteBitacora` **antes** de entregar; si no se puede,
  503. Necesita la migración **v4.8**.

## Lo que hace la pantalla y no debe dejar de hacer

- Al cambiar de fuente conserva solo los campos que en la nueva tienen **el
  mismo papel** (`% de asistencia` es columna en docentes y medida en
  asistencia; conservarlo daba 422) y **avisa** de lo que quitó.
- No manda un filtro a medio escribir: lo enseña como pendiente.
- La vista previa se pide 400 ms después del último cambio y descarta las
  respuestas viejas.

## Probado

2 376 combinaciones contra la base de producción (solo lectura): cada columna,
cada dimensión con todas las medidas, todas las parejas de dimensiones, cada
campo con cada operador y el periodo. 0 fallos, ninguna pasó de 5 s, y los
recuentos agrupados cuadran con el total.
