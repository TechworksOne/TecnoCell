# ============================================================
# STAGE: development — nodemon + devDependencies para HMR
# ============================================================
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Crear carpeta uploads por si no existe en el código fuente
RUN mkdir -p uploads

EXPOSE 3000
CMD ["npm", "run", "dev"]

# ============================================================
# STAGE: production — solo dependencias de producción
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
# Instalar SOLO dependencias de producción (sin nodemon, etc.)
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads

# Usar usuario no-root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
