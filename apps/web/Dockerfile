FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /repo
# Empaqueta el servidor con solo sus dependencias reales. Ver next.config.ts.
ENV BUILD_STANDALONE=true NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @agora/web... build

FROM node:22-alpine AS runtime
RUN addgroup -S agora && adduser -S agora -G agora
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

# La salida standalone trae solo lo que el servidor necesita: la imagen pasa
# de cientos de MB a decenas.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER agora
EXPOSE 3200
ENV PORT=3200 HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
