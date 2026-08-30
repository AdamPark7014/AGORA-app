# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-30
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

**Ola R2 — seguridad / blindaje API** (plan `sistema_super_robusto`).

### Redis throttle
- Paquete: `@nest-lab/throttler-storage-redis` + `ioredis`.
- `apps/api/src/comun/almacen-limite.ts`: ping Redis al arrancar; si falla o no hay `REDIS_URL` → storage in-memory + log (API no se tumba).
- `ThrottlerModule.forRootAsync` en `app.module.ts`.

### OTP `@Throttle` alineado a caps de negocio (`@agora/auth` 1/min, 10/día por buzón)
- `solicitar`: **20/min**, **200/h** (antes 60 / 1200).
- `verificar`: **30/min**, **300/h** (antes 60 / 1200).
- Holgura NAT campus documentada en comentarios.

### `revisarEntorno` estricto en prod
- Exige: `COOKIE_DOMAIN`, `REDIS_URL`, `S3_*` (endpoint/bucket/keys/public URL), `MAIL_FROM`, API key según `MAIL_PROVIDER` (brevo/resend).
- Tests ampliados en `entorno.test.ts` + `almacen-limite.test.ts`.
- `pnpm --filter @agora/api test` → **140 pass / 0 fail**.

### MinIO pin
- `minio/minio:RELEASE.2025-09-07T16-13-09Z`
- `minio/mc:RELEASE.2025-08-13T08-35-41Z`

## A medias - CUIDADO

- **SIN REMOTO EN MAYÚSCULAS.** Custodia solo local.
- Código local puede ir más adelante que el deploy en `/var/www/udlagora-app`.
- **A6-B1 e2e** — Docker Desktop local apagado (Ola R3).
- Ola R1 (Traefik durable / backup / smoke) y R4 Wave13 nativo — pendientes del plan.
- MARCANET / Firebase/APNs reales — Adam.

## Siguiente paso

1. Ola R1 restante o R3 e2e cuando Docker esté arriba.
2. Sync VPS solo con OK explícito de Adam.
3. Remoto GitHub cuando Adam autorice.

## No tocar

- **`.env`** (secretos). No leerlo ni commitearlo.
- Remoto / secretos FCM sin pedido explícito.
- `git reset --hard`, `git checkout --`, `git clean`, `git stash drop`.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` + Traefik en `/opt/traefik/config` (= nexara traefik dir). Dominio **udlagora.com**.
