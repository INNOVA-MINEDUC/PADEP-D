# PADEP — Despliegue en produccion

Dos contenedores, la BD fuera de Docker.

```
internet ──> nginx del host (TLS)
                └─> 127.0.0.1:8080  contenedor frontend (nginx + build de Vue)
                        ├─ /            estatico del SPA
                        └─ /api/*  ───>  contenedor backend  (Express :4000)
                                              ├─> MySQL del host (host.docker.internal:3306)
                                              └─> API de extraccion (FastAPI, remota)
```

El backend **no** se publica al host: solo lo alcanza el frontend por la red
interna de Docker. El unico puerto abierto es el 8080 en loopback.

---

## 1. Requisitos en el servidor

```bash
docker --version          # 20.10+ (host-gateway necesita esa version)
docker compose version    # v2
nginx -v
```

## 2. MySQL del host: dejar entrar a Docker

Es el paso que mas falla. El contenedor no es `localhost` para MySQL: llega
desde la red bridge (`172.17.0.0/16`), asi que hacen falta dos cosas.

**a) Que MySQL escuche en la interfaz del bridge.** En
`/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
# La IP del bridge, NO 0.0.0.0: asi Docker entra pero MySQL sigue sin asomarse
# a internet. Confirma la IP con: ip -4 addr show docker0
bind-address = 172.17.0.1
```

Si el servidor necesita que MySQL siga atendiendo tambien a sus propios
procesos locales, pon las dos: `bind-address = 127.0.0.1,172.17.0.1`.

```bash
sudo systemctl restart mysql
```

**b) Un usuario con permisos solo sobre `padep` y solo desde esa red:**

```sql
CREATE USER IF NOT EXISTS 'padep'@'172.%' IDENTIFIED BY 'LA_CONTRASENA';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP
  ON padep.* TO 'padep'@'172.%';
FLUSH PRIVILEGES;
```

`CREATE`/`ALTER`/`INDEX` hacen falta para `npm run db:sync`. No se da `CREATE`
global, por eso el `.env.production` lleva `DB_ENSURE=false`: sin esa variable
el arranque intentaria `CREATE DATABASE` y moriria con *Access denied*.

Comprueba que el firewall no expone el 3306 hacia fuera:

```bash
sudo ss -lntp | grep 3306      # debe salir 172.17.0.1:3306, nunca 0.0.0.0:3306
```

### Si en el servidor MySQL tambien es un contenedor

Entonces `host.docker.internal` sobra y ademas es peor: la conexion saldria al
host para volver a entrar. Se conectan por la red de Docker, que de paso evita
publicar el 3306 en el host.

1. Averigua el nombre del contenedor de MySQL y su red:

```bash
docker ps --filter ancestor=mysql:8.0 --format '{{.Names}}'
docker inspect NOMBRE_MYSQL --format '{{json .NetworkSettings.Networks}}'
```

2. Cuelga el backend de esa red con un `docker-compose.override.yml`:

```yaml
services:
  backend:
    networks: [default, bd]

networks:
  bd:
    external: true
    name: NOMBRE_DE_LA_RED_DE_MYSQL
```

3. En `.env.production`, `DB_HOST` pasa a ser el nombre del contenedor:

```ini
DB_HOST=padep_mysql
```

Asi el paso 2a (bind-address) no aplica: MySQL ya escucha dentro de la red de
Docker. El GRANT del paso 2b si hace falta, pero con el rango que use esa red.

> `docker-compose.override.yml` esta en `.gitignore`, asi que ese ajuste se
> queda en el servidor y no viaja al repo.

## 3. Codigo y entorno

```bash
git clone https://github.com/INNOVA-MINEDUC/PADEP-D.git padep && cd padep
cp backend/.env.production.example backend/.env.production
nano backend/.env.production        # rellena todo lo marcado con <<< >>>
chmod 600 backend/.env.production
```

Genera un `JWT_SECRET` nuevo — **no** reutilices el de desarrollo:

```bash
openssl rand -base64 48
```

`backend/.env.production` esta en `.gitignore`. Que siga asi.

## 4. Bajar las imagenes de GHCR

Si el repo es privado, el servidor necesita un token con `read:packages`
([crear aqui](https://github.com/settings/tokens)):

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u TU_USUARIO --password-stdin
```

Las imagenes se etiquetan con el nombre de la rama. `latest` solo existe para
`main`; desde `development` hay que decirlo:

```bash
echo "TAG=development" >> .env      # el compose lee ${TAG:-latest}
docker compose pull
```

> Alternativa sin registry, compilando en el propio servidor:
> `docker compose up -d --build`

## 5. Primer arranque: esquema y datos base

El esquema **no** se crea solo (`DB_SYNC=false` a proposito: un `sync` en cada
arranque puede alterar tablas con datos). Se hace una vez, a mano:

```bash
# Crea las 48 tablas del esquema v3
docker compose run --rm backend npm run db:sync

# Roles, permisos, catalogos (departamentos, jornadas, tipos de documento)
# y el usuario administrador. Es idempotente: repetirlo no duplica nada.
docker compose run --rm backend npm run seed
```

El seed imprime las credenciales del admin (`SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`). **Cambia esa contrasena en el primer login.**

Ya se puede levantar todo:

```bash
docker compose up -d
docker compose ps          # los dos en 'healthy'
curl -s localhost:8080/health
```

## 6. Nginx del host

```bash
sudo cp deploy/nginx-padep.conf /etc/nginx/sites-available/padep
sudo nano /etc/nginx/sites-available/padep     # ajusta server_name
sudo ln -s /etc/nginx/sites-available/padep /etc/nginx/sites-enabled/padep
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d padep.mineduc.edu.gt
```

El `client_max_body_size 32m` de ese bloque no es opcional: los PDF se suben en
trozos de 8 MB y el limite por defecto de nginx (1 MB) los corta con un 413 que
parece un fallo de la aplicacion.

## 7. Verificar

```bash
curl -s https://padep.mineduc.edu.gt/health        # {"ok":true,...}
curl -s https://padep.mineduc.edu.gt/api | head -c 200
curl -sI https://padep.mineduc.edu.gt | head -1    # 200 y el SPA
```

## 8. Actualizar

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

## 9. Volver atras

Las imagenes quedan etiquetadas tambien por commit corto:

```bash
TAG=sha-a1b2c3d docker compose up -d
```

## 10. Operacion diaria

```bash
docker compose logs -f backend        # o frontend
docker compose restart backend
docker compose down                   # para todo (no toca la BD)
```

Los logs rotan solos (10 MB x 5 por servicio), configurado en el compose.

---

## Cosas que se rompen y por que

| Sintoma | Causa |
|---|---|
| `ECONNREFUSED 172.17.0.1:3306` | MySQL sigue con `bind-address = 127.0.0.1`. Paso 2a. |
| `Access denied for user 'padep'@'172.18.0.3'` | Falta el `GRANT ... @'172.%'`. Paso 2b. |
| `Access denied ... CREATE DATABASE` al arrancar | Falta `DB_ENSURE=false` en `.env.production`. |
| 413 al subir un PDF | Falta `client_max_body_size` en el nginx del host. Paso 6. |
| 504 en una extraccion larga | `proxy_read_timeout` corto en el nginx del host. |
| El navegador sirve JS viejo tras un deploy | Cache de `index.html`. El nginx del contenedor ya lo prohibe; revisa que no lo cachee algo por delante. |
| `denied` en `docker compose pull` | Falta `docker login ghcr.io` con un token `read:packages`. Paso 4. |
