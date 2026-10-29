# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# URL de la API (ej: https://api-padepd.mineduc.edu.gt). Vite la INCRUSTA en el
# bundle durante el build: cambiarla exige reconstruir la imagen. La pasa el
# pipeline por ambiente. Vacia, las llamadas salen relativas (/api/...), que
# solo sirve en desarrollo con el proxy de Vite.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- runtime ----------
# nginx sin root (uid 101): no puede abrir puertos por debajo del 1024, por eso
# escucha en el 8080. Es el puerto DENTRO del contenedor: el del host lo elige
# el compose (PADEP_FRONT_PUERTO), asi que no choca con otros 8080 del servidor.
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

# Parches de seguridad de Alpine encima de la imagen base. Trivy bloquea el
# pipeline con CVEs CRITICAL/HIGH, y la imagen base suele ir unos dias detras.
USER root
RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1
