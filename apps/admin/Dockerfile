FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /repo
# Empaqueta el servidor con solo sus dependencias reales. Ver next.config.ts.
ENV BUILD_STANDALONE=true NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @agora/admin... build

FROM node:22-alpine AS runtime
RUN addgroup -S agora && adduser -S agora -G agora
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

# La salida standalone trae solo lo que el servidor necesita: la imagen pasa
# de cientos de MB a decenas.
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /repo/apps/admin/public ./apps/admin/public

USER agora
EXPOSE 3300
ENV PORT=3300 HOSTNAME=0.0.0.0

CMD ["node", "apps/admin/server.js"]
