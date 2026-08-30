# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-30
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

**Ola R3 + fix crítico minio-init** (plan `sistema_super_robusto`).

### minio-init (paridad VPS)
- Local `deploy/docker-compose.yml` ya no usa `sed` + `mc anonymous set-json` (imagen `minio/mc` **no trae sed**).
- Ahora: `mc anonymous set download local/$$S3_BUCKET` con escape Compose `$$VAR`.
- Se quitó el volume mount de `bucket-policy.json` (queda como referencia en disco).
- Tag pin se mantiene: `minio/mc:RELEASE.2025-08-13T08-35-41Z` (VPS aún puede tener `:latest` hasta próximo sync).

### R3 calidad
- `pnpm ci:verify:sin-turbo` → **verde** (API unit **140**/0 fail).
- `pnpm test:e2e` → **25 pass / 1 skip** (Docker Desktop Linux engine presente).
- Fix `package.json` `test:e2e`: config real es `playwright.config.ts` (raíz), no `e2e/playwright.config.ts`.
- DB local: `pnpm db:migrate:deploy` aplicó 7 migraciones pendientes (rachas/badges/reto) — causaban 500 en `/api/gamificacion/*` y rompían humo.
- e2e: expectativa membresías automáticas **6** (escuela+depto+carrera+gen+colegio+campus).
- Admin `Guardia`: acepta rol `super_admin` (antes solo moderador/admin → panel atascado en “Comprobando permisos…”).
- `capturas-admin`: timeout 90s.

### Docs
- `README.md` A6-7 / R1–R3: Traefik durable, smoke, backup cron, Redis throttle, RETO en prod, e2e verde.

### Verificado en VPS (solo lectura)
- `/opt/traefik/config/udlagora.yml` presente; `https://udlagora.com/` 200; `/api/salud` ok.
- Cron backup: `/etc/cron.d/udlagora-backup` (15 3 * * *); dumps en `/var/backups/udlagora/`.
- Enum `RETO` presente en BD prod.

## A medias - CUIDADO

- **SIN REMOTO EN MAYÚSCULAS.** Custodia solo local.
- Código local **adelantado** al deploy en `/var/www/udlagora-app` (Redis throttle, minio pin/init, Guardia, etc.). **No sync sin OK de Adam.**
- R4 Wave13: prefs RETO/INSIGNIA y push respetan `url`; deep link `/retos` → feed nativo (sin pantalla dedicada). Cierre fino opcional.
- VPS `minio-init` ya usa `anonymous set download` pero imagen puede seguir en `:latest` hasta sync.
- Firebase / APNs / AASA TEAMID / MARCANET — Adam.

## Siguiente paso

1. Sync VPS (rsync + compose + `install-traefik-route.sh` + smoke) **solo con OK explícito**.
2. Remoto GitHub cuando Adam autorice.
3. Opcional: pantalla nativa `/retos` o dejar deep link→feed documentado.

## No tocar

- **`.env`** (secretos). No leerlo ni commitearlo.
- Remoto / secretos FCM sin pedido explícito.
- `git reset --hard`, `git checkout --`, `git clean`, `git stash drop`.
- No regenerar secretos prod con `setup-server-env.sh`.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` + Traefik en `/opt/traefik/config` (= nexara traefik dir). Dominio **udlagora.com**.
