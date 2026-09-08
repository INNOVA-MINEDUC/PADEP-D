# PADEP — Despliegue en produccion

Dos contenedores propios. La base de datos y el nginx que da la cara ya existen
en el servidor y son contenedores tambien, asi que todo se habla por redes de
Docker y nada de PADEP publica puertos en el host.

```
internet ──> contenedor nginx del servidor (TLS, sirve tambien otros sitios)
                │  red 'proxy'
                └─> padep-frontend   (nginx + build de Vue)
                        ├─ /            estatico del SPA
                        └─ /api/*  ───>  backend  (Express :4000)
                                             │  red del stack de la BD
                                             ├─> MySQL (contenedor)
                                             └─> API de extraccion (FastAPI, remota)
```

Tres redes en juego:

| Red | Quien la crea | Para que |
|---|---|---|
| `padep-app_default` | este compose | frontend ↔ backend |
| `proxy` (o como se llame) | el stack del nginx | nginx ↔ frontend |
| la red del MySQL | el stack de la BD | backend ↔ MySQL |

El backend no esta en la red del nginx: solo lo alcanza el frontend.

---

## 1. Requisitos en el servidor

```bash
docker --version
docker compose version    # v2
```

## 2. Averiguar los nombres reales

Todo lo demas depende de estos cuatro datos.

```bash
# Contenedor de MySQL y su red
docker ps --filter ancestor=mysql:8.0 --format '{{.Names}}'
docker inspect NOMBRE_MYSQL --format '{{json .NetworkSettings.Networks}}'

# Red del nginx que da la cara
docker ps --filter ancestor=nginx --format '{{.Names}}'
docker inspect NOMBRE_NGINX --format '{{json .NetworkSettings.Networks}}'

# Donde monta su configuracion (busca el bind hacia /etc/nginx/conf.d)
docker inspect NOMBRE_NGINX --format '{{json .Mounts}}'
```

Apunta: **nombre del contenedor MySQL**, **red del MySQL**, **red del nginx** y
**ruta del volumen de configuracion**.

## 3. Permisos en MySQL

El backend llega desde otro contenedor, no desde localhost, asi que el GRANT
tiene que contemplar la red de Docker:

```sql
CREATE USER IF NOT EXISTS 'padep'@'%' IDENTIFIED BY 'LA_CONTRASENA';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP
  ON padep.* TO 'padep'@'%';
FLUSH PRIVILEGES;
```

`CREATE`/`ALTER`/`INDEX` hacen falta para `npm run db:sync`. No se concede
`CREATE` global, y por eso el `.env.production` lleva `DB_ENSURE=false`: sin esa
variable el arranque intentaria `CREATE DATABASE` y moriria con *Access denied*
aunque la base estuviera perfectamente.

`'padep'@'%'` es aceptable mientras MySQL no publique el 3306 fuera de Docker.
Si lo publica, restringe al rango de la red (`'padep'@'172.21.%'`) y quita ese
`ports` del compose de la BD.

## 4. Codigo y entorno

```bash
git clone https://github.com/INNOVA-MINEDUC/PADEP-D.git padep && cd padep
git checkout development
```

**a) Conectar el backend a la red del MySQL:**

```bash
cp deploy/docker-compose.override.yml.example docker-compose.override.yml
nano docker-compose.override.yml     # pon ahi la red del MySQL
```

**b) Variables del compose**, en un `.env` en la raiz:

```ini
TAG=development
PROXY_NETWORK=NOMBRE_DE_LA_RED_DEL_NGINX
```

`TAG=development` porque `latest` solo se etiqueta desde `main`.

**c) Entorno del backend:**

```bash
cp backend/.env.production.example backend/.env.production
nano backend/.env.production
chmod 600 backend/.env.production
```

Ahi `DB_HOST` es el **nombre del contenedor de MySQL**, no
`host.docker.internal`. Y genera un `JWT_SECRET` nuevo, no reutilices el de
desarrollo:

```bash
openssl rand -base64 48
```

`backend/.env.production` y `docker-compose.override.yml` estan en
`.gitignore`. Que sigan asi.

## 5. Bajar las imagenes de GHCR

Si el repo es privado, hace falta un token con `read:packages`
([crear aqui](https://github.com/settings/tokens)):

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u TU_USUARIO --password-stdin
docker compose pull
```

> Alternativa sin registry, compilando en el propio servidor:
> `docker compose up -d --build`

## 6. Primer arranque: esquema y datos base

El esquema **no** se crea solo (`DB_SYNC=false` a proposito: un `sync` en cada
arranque puede alterar tablas con datos). Se hace una vez, a mano:

```bash
# Crea las 48 tablas del esquema v3
docker compose run --rm backend npm run db:sync

# Roles, permisos, catalogos y el usuario administrador.
# Idempotente: repetirlo no duplica nada.
docker compose run --rm backend npm run seed
```

El seed imprime las credenciales del admin. **Cambia esa contrasena en el primer
login.**

```bash
docker compose up -d
docker compose ps            # los dos en 'healthy'
```

Comprueba desde dentro, que es la unica via: PADEP no publica puertos.

```bash
docker compose exec frontend wget -qO- http://127.0.0.1/health
docker compose exec frontend wget -qO- http://127.0.0.1/api
```

## 7. Enchufarlo al nginx del servidor

```bash
cp deploy/nginx-padep.conf /RUTA/DEL/VOLUMEN/conf.d/padep.conf
nano /RUTA/DEL/VOLUMEN/conf.d/padep.conf     # server_name y rutas de los certs

docker exec NOMBRE_NGINX nginx -t
docker exec NOMBRE_NGINX nginx -s reload
```

Dos cosas de ese archivo que no son cosmeticas:

- El upstream se resuelve **por variable con `resolver 127.0.0.11`**. Ese nginx
  sirve otros sitios: con un `proxy_pass http://padep-frontend` literal, si el
  contenedor de PADEP esta parado durante un reload, nginx no levanta y se caen
  todos los demas. Con resolver, PADEP da 502 y el resto sigue sirviendo.
- `client_max_body_size 32m`. Los PDF suben en trozos de 8 MB y el limite por
  defecto (1 MB) los corta con un 413 que parece un fallo de la aplicacion.

Si los certificados de los demas sitios los emite certbot en otro contenedor,
emite el de PADEP por la misma via. Las rutas del `.conf` son las de **dentro**
del contenedor de nginx.

## 8. Verificar

```bash
curl -s https://padep.mineduc.edu.gt/health         # {"ok":true,...}
curl -s https://padep.mineduc.edu.gt/api | head -c 200
curl -sI https://padep.mineduc.edu.gt | head -1     # 200 y el SPA
```

## 9. Actualizar

```bash
git pull
docker compose pull
docker compose up -d
docker image prune -f
```

Si el `git pull` trajo modelos nuevos, ademas:

```bash
docker compose run --rm backend npm run db:sync
```

No hace falta tocar el nginx del servidor: el alias `padep-frontend` sigue
apuntando al contenedor nuevo.

## 10. Volver atras

Las imagenes se etiquetan tambien por commit corto:

```bash
TAG=sha-a1b2c3d docker compose up -d
```

## 11. Operacion diaria

```bash
docker compose logs -f backend        # o frontend
docker compose restart backend
docker compose down                   # para PADEP; no toca ni la BD ni el nginx
```

Los logs rotan solos (10 MB x 5 por servicio), configurado en el compose.

---

## Cosas que se rompen y por que

| Sintoma | Causa |
|---|---|
| `network proxy declared as external, but could not be found` | `PROXY_NETWORK` del `.env` no coincide con la red real del nginx. Paso 2. |
| `getaddrinfo ENOTFOUND` sobre el host de la BD | Falta el `docker-compose.override.yml`, o la red del MySQL esta mal puesta. Paso 4a. |
| `Access denied for user 'padep'@'172.x.x.x'` | El GRANT no cubre la red de Docker. Paso 3. |
| `Access denied ... CREATE DATABASE` al arrancar | Falta `DB_ENSURE=false` en `.env.production`. |
| 502 solo en PADEP, los demas sitios bien | El contenedor frontend esta caido. `docker compose ps`. Es el fallo *contenido*, funcionando como toca. |
| 502 y `padep-frontend could not be resolved` en el log del nginx | El frontend no esta en la red del nginx. Revisa `PROXY_NETWORK` y `docker network inspect`. |
| 413 al subir un PDF | Falta `client_max_body_size` en el nginx del servidor. Paso 7. |
| 504 en una extraccion larga | `proxy_read_timeout` corto en el nginx del servidor. |
| El navegador sirve JS viejo tras un deploy | Cache de `index.html`. El nginx de la imagen ya lo prohibe; revisa que no lo cachee algo por delante. |
| `denied` en `docker compose pull` | Falta `docker login ghcr.io` con un token `read:packages`. Paso 5. |
