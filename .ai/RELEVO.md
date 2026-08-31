# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-30
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

**Ultra profundo — SEO, gaps por capa y deploy** (plan autorizado).

### Capa web — SEO y presencia
- `apps/web/lib/seo.ts`: fuente única (`SITE_URL`, `buildMetadata`, `ROOT_METADATA`, `SITEMAP_ROUTES`, `jsonLdScripts`).
- `componentes/json-ld.tsx` + inyección en `layout.tsx` (Organization + WebSite/SearchAction).
- Layouts metadata: `/registro`, `/bienvenida`, `/terminos`, `/privacidad` (migrados a `buildMetadata`).
- `sitemap.ts` (5 URLs) y `robots.ts` desde config central; allow registro/bienvenida.
- Assets: `og.png`, `icono-192.png`, `icono-512.png`, `humans.txt`; manifest con purpose any/maskable.
- Script `scripts/export-brand-assets.mjs` + `sharp` devDep root.

### Capa API / compose
- `deploy/docker-compose.yml`: passthrough `OPENAI_API_KEY`, `FIREBASE_*`, `APNS_*` al contenedor api.
- `salud.controller.ts`: `@SkipThrottle()` + ping Redis → `estado: degradado` si Redis cae (base ok → HTTP 200).

### Deploy VPS (2026-08-31)
- Tar sync → `/var/www/udlagora-app` + `docker compose up -d --build`.
- Traefik: `install-traefik-route.sh` (503 transitorio post-up; smoke OK tras ~15s).
- Smoke verde: `/` 200, `/api/salud` estado=ok.

### URLs entregables (prod)
- https://udlagora.com
- https://udlagora.com/sitemap.xml
- https://udlagora.com/robots.txt
- https://udlagora.com/og.png
- https://udlagora.com/api/salud → `estado: ok`

### Verificado local
- `pnpm --filter @agora/web check-types` → verde
- `pnpm ci:verify:sin-turbo` → verde

## A medias - CUIDADO

- **SIN REMOTO GitHub.** Custodia solo local.
- Firebase / APNs / AASA TEAMID / MARCANET — Adam.
- `OPENAI_API_KEY` en `deploy/.env` del VPS: revisar si moderación IA debe activarse (hoy puede seguir `MODERACION_OPCIONAL=true`).
- R4 Wave13 / deep link `/retos` → feed nativo: cierre fino opcional.

## Siguiente paso

1. Search Console: enviar sitemap; Rich Results Test en home.
2. Remoto GitHub cuando Adam autorice.
3. Adam: credenciales Firebase/APNs reales si quiere push nativo en prod.

## No tocar

- **`.env`** / **`deploy/.env`** (secretos). No leerlos ni commitearlos.
- Remoto / secretos FCM sin pedido explícito.
- `git reset --hard`, `git checkout --`, `git clean`, `git stash drop`.
- No regenerar secretos prod con `setup-server-env.sh`.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` + Traefik en `/opt/traefik/config` (= nexara traefik dir). Dominio **udlagora.com**.
