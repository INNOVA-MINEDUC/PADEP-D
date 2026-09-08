# syntax=docker/dockerfile:1

# ---------- deps: solo dependencias de produccion ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- runtime ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini como PID 1: sin el, node no recibe SIGTERM y cada `docker compose down`
# tarda los 10 s del timeout en vez de parar limpio.
RUN apk add --no-cache tini

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# La imagen node:alpine ya trae el usuario 'node' (uid 1000). Nada de esto
# necesita root, y el proxy de extraccion recibe cuerpos de usuarios.
USER node

EXPOSE 4000

# Reusa el /health que app.js expone sin rate limit. fetch() es global desde
# Node 18, asi que no hace falta curl ni wget en la imagen.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
