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
# Generar deploy/.env la primera vez (pide BREVO_API_KEY del .env raíz):
bash deploy/setup-server-env.sh
# Rellenar OPENAI_API_KEY=…  O  MODERACION_OPCIONAL=true
docker compose -f deploy/docker-compose.yml up -d --build
```

Health: Traefik enruta `udlagora.com` → web; `/api` → API; `/media` → MinIO.

**Importante — ruta Traefik compartida:** en el VPS, `/opt/traefik/config` apunta a
`/var/www/nexara-app/deploy/traefik/`. Si `udlagora.yml` solo está en
`/var/www/udlagora-app/deploy/traefik/`, Traefik no lo carga y el dominio
devuelve `404 page not found` (texto plano). Tras un deploy o reboot:

```bash
cp /var/www/udlagora-app/deploy/traefik/udlagora.yml \
   /var/www/nexara-app/deploy/traefik/udlagora.yml
# Traefik recarga el file provider solo; si no: docker restart traefik-main
curl -skI --resolve udlagora.com:443:127.0.0.1 https://udlagora.com/
```

## MinIO

- Bucket: `S3_BUCKET` (default `agora-media`).
- Política: solo `s3:GetObject` público sobre `arn:aws:s3:::BUCKET/*`
  (`deploy/minio/bucket-policy.json`). El init aplica
  `mc anonymous set-json` (no ListBucket ni Put anónimo).
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

- Preferir `OPENAI_API_KEY` real.
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
| OTP no llega | Brevo/Resend, DKIM, spam Outlook; logs API con `MAIL_PROVIDER=console` solo en dev |
| 404 en fotos | MinIO sano + `S3_PUBLIC_URL`; Traefik PathPrefix `/media` |
| `404 page not found` texto plano en `udlagora.com` | Falta `udlagora.yml` en `/opt/traefik/config/` (ver arriba); contenedores `agora-*` en red `proxy` |
| API no arranca en prod | `revisarEntorno`: SESSION_SECRET ≥ 32, MAIL no console, OPENAI o bypass, sin DEV_OTP |
| Panel admin sin sesión | `COOKIE_DOMAIN` con punto; HTTPS |
| E2E local sin Docker postgres | Contenedor `agora-postgres` (infra/) o `AGORA_PSQL_DIRECT=1` |

## Pendiente Adam (fuera de este runbook)

1. **SIN REMOTO** — crear repo privado GitHub + primer push.
2. **A6-7** — stack ya corría; ruta Traefik restaurada 2026-08-29. Redeploy de código cuando haga falta.
3. **MARCANET / IMPI** — trámite de marca.
4. Credenciales Firebase/APNs de producción.
