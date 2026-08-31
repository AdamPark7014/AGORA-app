# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-31
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

**Ultra profundo gaps + mega presencia v2** (plan autorizado). Deploy VPS OK.

### Ola A — P0
- PWA: `registrar-sw` conserva `agora-v3`; SW precachea iconos 192/512.
- `/bienvenida` pública (middleware + `RUTAS_PUBLICAS`); robots disallow ampliado.
- Quitado SearchAction (deprecado Google); landing con H1 en HTML inicial (no esqueleto vacío).
- Security headers en `next.config.ts` (HSTS, CSP, nosniff, frame deny, AASA Content-Type).
- `favicon.ico` vía `export-brand-assets.mjs`.

### Ola B — Mega presencia
- JSON-LD `@graph`: Organization + WebSite + WebApplication + FAQPage (FAQ visible en landing, misma copy).
- `llms.txt`, `.well-known/security.txt`, manifest `id`/`scope`/`lang` + icon any+maskable.
- AASA paths `/retos`, `/retos/*`.

### Ola B — Unfurl OG
- API pública: `GET /api/public/tarjeta/{publicacion|perfil|evento|anuncio}/:id`.
- Middleware permite previews UGC; pages server + `generateMetadata` noindex; anónimo ve `PreviewPublica` + CTA.

### Ola C — Blindaje
- `SesionGuard` rechaza `SUSPENDIDO`; suspender → `session.deleteMany`.
- Compose: `APNS_SIGNING_KEY` (alineado con código).
- Runbook SEO v2 / MinIO / salud Redis / APNs / suspensión.

### URLs prod
- https://udlagora.com — H1 + FAQ + JSON-LD graph
- https://udlagora.com/llms.txt
- https://udlagora.com/.well-known/security.txt
- https://udlagora.com/sitemap.xml · robots.txt · og.png
- https://udlagora.com/api/salud → ok

### Verificado
- `pnpm ci:verify:sin-turbo` verde
- Smoke VPS verde

## A medias - CUIDADO

- **SIN REMOTO GitHub.**
- Firebase / APNs reales / AASA TEAMID / assetlinks SHA / MARCANET — Adam.
- Admin subdomain no en compose (DNS pendiente).
- OPENAI en VPS: puede seguir `MODERACION_OPCIONAL=true`.

## Siguiente paso

1. Search Console + Rich Results Test.
2. Remoto GitHub cuando Adam autorice.
3. Credenciales push nativo cuando haya Firebase/APNs.

## No tocar

- **`.env`** / **`deploy/.env`**.
- `git reset --hard` / `checkout --` / `clean` / `stash drop`.
- No regenerar secretos con `setup-server-env.sh`.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` + Traefik. Dominio **udlagora.com**.
