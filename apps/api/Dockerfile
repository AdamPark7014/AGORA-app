# --- Dependencias -----------------------------------------------------------
# pnpm + turbo en una imagen delgada. Se instala con el lockfile congelado para
# que el build sea reproducible: un despliegue no puede resolver versiones
# distintas a las que se probaron.
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile

# --- Compilacion ------------------------------------------------------------
FROM deps AS build
WORKDIR /repo
# El cliente de Prisma se genera aqui, no en runtime: en produccion el
# contenedor debe arrancar sin escribir en node_modules.
RUN pnpm --filter @agora/db exec prisma generate
RUN pnpm --filter @agora/api... build

# --- Ejecucion --------------------------------------------------------------
FROM node:22-alpine AS runtime
RUN corepack enable && addgroup -S agora && adduser -S agora -G agora
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api ./apps/api
COPY --from=build /repo/package.json ./package.json
COPY docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER agora
EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4200/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
