# PADEP — Backend (Express + Sequelize + JWT)

API REST sobre MySQL que implementa el **esquema v3** de PADEP, con
autenticación por **JWT** y control de acceso por rol.

## Stack

- Node.js + Express
- Sequelize (ORM) + mysql2
- JWT (`jsonwebtoken`) + bcryptjs
- Variables de entorno con `dotenv`
- `express-rate-limit`, `cors`, `morgan`

## Requisitos

- Node.js 18+ (probado en Node 22)
- MySQL 8.0+ corriendo en `127.0.0.1:3306`

## Instalación

```bash
cd backend
npm install
cp .env.example .env   # ya viene un .env listo con tus datos
```

La conexión ya está configurada en `.env`:

| Variable  | Valor    |
|-----------|----------|
| DB_HOST   | 127.0.0.1|
| DB_PORT   | 3306     |
| DB_NAME   | padep    |
| DB_USER   | root     |
| DB_PASS   | root     |

> ⚠️ **Cambia `JWT_SECRET`** por un secreto largo y aleatorio antes de producción.

## Puesta en marcha

```bash
# 1) Crea la BD (si no existe) y todas las tablas
npm run db:sync

# 2) Carga roles, permisos, catálogos base y el usuario admin
npm run seed

# 3) Arranca la API
npm run dev      # con recarga (node --watch)
# o
npm start
```

Al arrancar, `server.js` también crea la BD y ejecuta `sync()` según
`DB_SYNC` / `DB_SYNC_MODE` en `.env`, así que en desarrollo basta con
`npm run seed` una vez y luego `npm run dev`.

- API: `http://localhost:4000/api`
- Health: `http://localhost:4000/health`

## Roles

El esquema define 5 roles de dominio. Para el control de acceso:

- **Administrador** → `DIGECADE`
- **Usuario común** → el resto (por defecto `Enlace DIDEDUC`)

El usuario que crea el seed es admin (`DIGECADE`):

```
email:    admin@mineduc.edu.gt
password: Admin123*
```

(configurable en `.env` → `SEED_ADMIN_*`)

## Endpoints

| Método | Ruta                         | Acceso            |
|--------|------------------------------|-------------------|
| POST   | `/api/auth/register`         | Público (crea usuario común) |
| POST   | `/api/auth/login`            | Público           |
| GET    | `/api/auth/me`               | Autenticado       |
| GET    | `/api/usuarios`              | Solo admin        |
| POST   | `/api/usuarios`              | Solo admin        |
| PATCH  | `/api/usuarios/:id/estatus`  | Solo admin        |
| ALL    | `/api/extraccion/*`          | Autenticado (proxy) |

### Ejemplos

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mineduc.edu.gt","password":"Admin123*"}'

# Usar el token
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# Crear un usuario con rol (solo admin)
curl -X POST http://localhost:4000/api/usuarios \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","email":"ana@mineduc.edu.gt","password":"secreto123","rol":"Enlace DIDEDUC"}'
```

## Puerta unica hacia la API de extraccion

La extraccion por OCR vive en otro servicio (FastAPI, `PycharmProjects/PADEP`).
El frontend **no habla con el directamente**: todo pasa por este backend.

```
Vue :5173  ->  Express :4000/api/extraccion/*  ->  FastAPI :8000/*
```

Se gana lo siguiente:

- **Una sola URL y un solo login** para el frontend. La API de extraccion no
  tiene autenticacion propia, y aqui queda detras del JWT.
- **Sin CORS en el FastAPI.** Ya no lo llama el navegador, lo llama Express
  desde el servidor. Puede seguir escuchando solo en `127.0.0.1`.
- **Sin `credentials: 'include'`.** Si arriba hay un nginx con `auth_basic`, la
  credencial la pone Express desde `EXTRACCION_BASIC_USER/PASS`; nunca sale al
  navegador.

Las rutas se mapean quitando el prefijo, asi que el contrato de
`api/openapi.json` vale tal cual:

| Frontend | FastAPI |
|---|---|
| `GET /api/extraccion/ajustes` | `GET /ajustes` |
| `GET /api/extraccion/cortes` | `GET /cortes` |
| `POST /api/extraccion/cortes/{id}/extracciones/parte` | `POST /cortes/{id}/extracciones/parte` |

Detalles que **no** hay que deshacer (estan comentados en
`src/routes/extraccion.routes.js` y `src/app.js`):

- El proxy va montado **antes** de `express.json()`. Los PDF suben en trozos de
  8 MB y se encanan sin leerlos; si un body parser consume el cuerpo, se acabo
  el stream.
- **Sin keep-alive.** El FastAPI hay que reiniciarlo a mano cada vez que se
  toca, y los sockets del pool quedarian muertos.
- La cabecera `Authorization` se **sustituye**, no se reenvia: el Bearer es de
  este backend.
- Los codigos de estado pasan tal cual (`202` = encolado, `409` = la
  instalacion no extrae) y los errores conservan la forma `{"detail": "..."}`
  de FastAPI, ya escrita en espanol para quien opera.
- `/api/extraccion` tiene su propio limitador (600/min). Con el general
  (300 / 15 min) una sola subida troceada mas el sondeo de 2 s lo agotan.

Levantar el FastAPI (desde `PycharmProjects/PADEP`):

```bash
.venv/Scripts/python.exe -m uvicorn api.main:api --port 8000
```

Si no esta arriba, el proxy responde `502` con la instruccion para levantarlo,
en vez de un error opaco.

## Estructura

```
backend/
├── .env / .env.example
├── package.json
├── db/
│   └── padep_schema_v3.sql      # esquema canónico (referencia; incluye vistas y triggers)
└── src/
    ├── server.js                # arranque: crea BD, sync, listen
    ├── app.js                   # Express, middleware, rutas
    ├── config/
    │   ├── env.js               # carga y valida .env
    │   ├── database.js          # instancia Sequelize
    │   └── roles.js             # mapa de roles (admin = DIGECADE)
    ├── models/                  # 1 archivo por módulo del esquema + associations
    ├── controllers/             # auth, usuarios
    ├── routes/                  # auth, usuarios, index
    ├── middleware/              # auth (JWT), roles, rateLimit, errorHandler
    ├── utils/                   # jwt, ApiError
    ├── scripts/                 # ensureDatabase, sync
    └── seeders/                 # seed.js
```

## Notas sobre `sync()` vs esquema v3

Se eligió `sequelize.sync()` para crear las tablas desde los modelos JS.
Lo que `sync()` **no** reproduce del esquema v3 se cubre así:

- **Triggers** (`motivo` obligatorio al retirar, sync de estatus, máx. 4
  semestres) → implementados como **hooks** de Sequelize.
- **Columna generada `Nota.cuadra`** → calculada por hook antes de guardar.
- **Vistas** (`vw_docente`, `vw_reporte_notas`, …) → **no** se crean con
  `sync()`. Si las necesitas, corre el SQL de referencia:
  `db/padep_schema_v3.sql` (sección VISTAS) contra la base.
```
