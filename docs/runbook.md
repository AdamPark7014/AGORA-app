# Runbook de operación — Ágora (`udlagora.com`)

Operación del monorepo en el VPS. **SIN REMOTO GitHub** hasta que Adam lo
autorice: hoy la custodia es solo disco + git local.

## Stack en el servidor

| Pieza | Contenedor / ruta |
|---|---|
| Compose | `deploy/docker-compose.yml` |
| Traefik | `deploy/traefik/udlagora.yml` **debe vivir también** en `/opt/traefik/config/` (symlink → `/var/www/nexara-app/deploy/traefik/`) |
| Postgres 17 | `agora-db` |
| Redis 7 | `agora-redis` |
| MinIO | `agora-minio` + init `agora-minio-init` |
| API / web | `agora-api`, `agora-web` |

## Arranque / redeploy

```bash
cd /var/www/udlagora-app
# Generar deploy/.env la primera vez (pide BREVO_API_KEY del .env raíz).
# Si deploy/.env ya existe: NO regenera SESSION_SECRET / DB / MinIO; solo completa claves faltantes.
bash deploy/setup-server-env.sh
# Rellenar ANTHROPIC_API_KEY=<token pia_agora_ de la puerta>  O  MODERACION_OPCIONAL=true
docker compose -f deploy/docker-compose.yml up -d --build
# Obligatorio tras compose up: instalar + verificar ruta Traefik (copia atómica + curl --resolve)
bash deploy/install-traefik-route.sh
bash scripts/smoke-udlagora.sh
# Desde el VPS (loopback):
# RESOLVE=udlagora.com:443:127.0.0.1 bash scripts/smoke-udlagora.sh
```

Health: Traefik enruta `udlagora.com` → web; `/api` → API; `/media` → MinIO.
Compose healthchecks: `api` (`/api/salud`), `web` (`/`). Traefik `healthCheck` en
`agora-web` (`/`) y `agora-api` (`/api/salud`).

**Importante — ruta Traefik compartida:** en el VPS, `/opt/traefik/config` apunta a
`/var/www/nexara-app/deploy/traefik/`. Si `udlagora.yml` solo está en
`/var/www/udlagora-app/deploy/traefik/`, Traefik no lo carga y el dominio
devuelve `404 page not found` (texto plano). No uses `cp` a mano salvo emergencia:
usa el script (copia atómica + verificación):

```bash
bash deploy/install-traefik-route.sh
# Equivalente manual de emergencia:
# cp /var/www/udlagora-app/deploy/traefik/udlagora.yml \
#    /var/www/nexara-app/deploy/traefik/udlagora.yml
# Traefik recarga el file provider solo; si no: docker restart traefik-main
curl -skI --resolve udlagora.com:443:127.0.0.1 https://udlagora.com/
```

## Respaldo fuera del servidor (Postgres + media)

**Lo de abajo solo deja dumps en el mismo disco del servidor.** El respaldo de verdad es
`scripts/respaldo-externo.sh`: dump de Postgres + espejo de MinIO a un destino externo con rclone
(cifrado con un remoto `crypt`), con retención de 30 días y aviso a healthchecks.io si un día no corre.
Instrucciones de preparación y cron en la cabecera del script. Probar un restore una vez al mes.

## Alertas

- **Disco:** `scripts/vigilar-disco.sh` (cron cada 15 min) manda push por ntfy.sh al pasar el 80 %.
- **Errores de la API:** `SENTRY_DSN` en `deploy/.env` (sentry.io, plan gratis).
- **Caída:** monitor externo (UptimeRobot o healthchecks.io) sobre `https://udlagora.com/api/salud`.
- **Respaldo que no corrió:** `RESPALDO_PING_URL` (healthchecks.io).

## Backup / restore Postgres

Dumps gzip diarios en `/var/backups/udlagora/` (retención 7 días por defecto).

```bash
# Manual
bash scripts/backup-pg.sh
# Cron ejemplo (diario 03:15, retención 7 días):
# 15 3 * * * root cd /var/www/udlagora-app && bash scripts/backup-pg.sh >> /var/log/udlagora-backup.log 2>&1

# Restore (destructivo: el dump lleva --clean). Requiere confirmación:
RESTORE_CONFIRM=1 bash scripts/restore-pg.sh /var/backups/udlagora/agora-YYYYMMDD-HHMMSS.sql.gz
```

No commitear dumps ni tocar `deploy/.env` en el repo.

## Smoke post-deploy

```bash
bash scripts/smoke-udlagora.sh
# o desde el VPS:
RESOLVE=udlagora.com:443:127.0.0.1 bash scripts/smoke-udlagora.sh
```

Espera: `200` en `/`; JSON `estado` `ok` o `degradado` en `/api/salud`; aviso no bloqueante en media.

## SEO post-deploy (v2 — 2026-08-31)

Tras sync mega presencia v2, verificar:

| URL | Esperado |
|---|---|
| https://udlagora.com | 200, H1 en HTML, FAQ visible, JSON-LD `@graph` (Organization, WebSite, WebApplication, FAQPage) |
| https://udlagora.com/sitemap.xml | 5 URLs (/, registro, bienvenida, terminos, privacidad) |
| https://udlagora.com/robots.txt | allow onboarding; disallow gated + UGC |
| https://udlagora.com/llms.txt | 200 texto |
| https://udlagora.com/.well-known/security.txt | 200 |
| https://udlagora.com/og.png | 200 PNG 1200×630 |
| Headers en `/` | HSTS, X-Content-Type-Options, CSP |
| Share UGC | `curl` a `/publicacion/{id}` sin cookie → preview + OG noindex |

Regenerar PNGs/favicon: `node scripts/export-brand-assets.mjs`.

**Unfurl:** `GET /api/public/tarjeta/{publicacion\|perfil\|evento\|anuncio}/:id` sin sesión (campos mínimos).

**Salud:** Redis caído → JSON `estado: degradado` + `redis: error` con **HTTP 200** (no tumba Traefik/healthcheck). Solo Postgres caído → 503.

**Suspensión:** `SUSPENDIDO` rechazado en `SesionGuard`; al suspender se borran sesiones (`session.deleteMany`).

**APNs en compose:** variable `APNS_SIGNING_KEY` (no `APNS_KEY`).

Google Search Console: enviar sitemap; [Rich Results Test](https://search.google.com/test/rich-results) en home.


## Checklist post-reboot VPS

1. `docker ps` — `agora-web`, `agora-api`, `agora-db`, `agora-redis`, `agora-minio` UP.
2. `ls -l /opt/traefik/config/udlagora.yml` — existe (si no: `bash deploy/install-traefik-route.sh`).
3. `bash scripts/smoke-udlagora.sh` (o con `RESOLVE=…` en el VPS).
4. Si smoke falla en `/` con `404 page not found` plano → falta ruta Traefik (paso 2).
5. Si `/api/salud` → `degradado` → mirar `docker logs agora-db` / `agora-api`.

## MinIO

- Bucket: `S3_BUCKET` (default `agora-media`).
- Política: solo `s3:GetObject` público sobre `arn:aws:s3:::BUCKET/*`
  (`deploy/minio/bucket-policy.json` es referencia). El init aplica
  `mc anonymous set download` (la imagen `mc` no trae `sed`; no usar
  `set-json` + plantilla).
- Escritura: solo la API con `MINIO_ROOT_*` → `S3_ACCESS_KEY_ID` /
  `S3_SECRET_ACCESS_KEY`.
- URL pública: `https://udlagora.com/media/agora-media/...`

Si el init falla: `docker logs agora-minio-init`. Re-crear bucket:

```bash
docker compose -f deploy/docker-compose.yml run --rm minio-init
```

## Correo (OTP)

- Proveedor: `MAIL_PROVIDER=brevo` (o `resend`).
- Remitente: `MAIL_FROM=Ágora <contacto@udlagora.com>` — dominio **udlagora.com**
  verificado (DKIM/SPF). No usar `@nexara.com.mx` ni `@udlap.mx`.
- Probar: `pnpm correo:probar` desde un entorno con `.env` (no commits).

## Moderación en prod

- Preferir el token de la puerta en `ANTHROPIC_API_KEY` (`C:\dev\secrets\puerta-ia\agora.token`); `ANTHROPIC_BASE_URL` por omisión es `http://puerta-ia:8080` (red `proxy`).
- `MODERACION_OPCIONAL=true` solo si se acepta cola humana sin IA (explícito).
- Sin ninguno de los dos, la API **no arranca** (`revisarEntorno`).

## CI local (sin remoto)

```bash
pnpm ci:verify          # lint + types + unit + build
# e2e: infra arriba + apps en 3200/3300/4200
pnpm test:e2e
```

El workflow `.github/workflows/ci.yml` queda listo para cuando exista el
remoto privado. **No hacer push** sin autorización de Adam.

## Credenciales Firebase (Android)

`apps/mobile-native/android/app/google-services.json` es un **placeholder**
(682 B, `agora-placeholder`). Se versiona a propósito para que Gradle compile.
Reemplazar por el JSON real de Firebase **antes** de release / Play Store.
Ver `docs/FIREBASE.md`. No commitear service accounts.

## Incidentes frecuentes

| Síntoma | Qué mirar |
|---|---|
| OTP no llega | Solo afecta a cuentas nuevas y a "olvidé mi contraseña" (desde 21-10 se entra con contraseña). Brevo/Resend, DKIM, spam Outlook; logs `agora-api` («Codigo enviado» → «Entregado a…»); `MAIL_PROVIDER=console` solo en dev |
| «Correo o contraseña incorrectos» con la buena | 5 fallos seguidos bloquean 15 min (`users.loginBloqueadoHasta`); entrar con código lo limpia. Ver `docs/autenticacion.md` |
| 404 en fotos | MinIO sano + `S3_PUBLIC_URL`; Traefik PathPrefix `/media` |
| `404 page not found` texto plano en `udlagora.com` | Falta `udlagora.yml` en `/opt/traefik/config/` → `bash deploy/install-traefik-route.sh`; contenedores `agora-*` en red `proxy` |
| API no arranca en prod | `revisarEntorno`: SESSION_SECRET ≥ 32, MAIL no console, ANTHROPIC (con BASE_URL) o bypass, sin DEV_OTP |
| Panel admin sin sesión | `COOKIE_DOMAIN` con punto; HTTPS |
| E2E local sin Docker postgres | Contenedor `agora-postgres` (infra/) o `AGORA_PSQL_DIRECT=1` |
| Tras reboot todo UP pero dominio 404 | Misma causa Traefik compartida; checklist post-reboot arriba |

## Pendiente Adam (fuera de este runbook)

1. **SIN REMOTO** — crear repo privado GitHub + primer push.
2. **A6-7** — stack ya corría; ruta Traefik restaurada 2026-08-29. Redeploy de código cuando haga falta.
3. **MARCANET / IMPI** — trámite de marca.
4. Credenciales Firebase/APNs de producción.
