# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-27
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

Retoma desde WIP rescatado (`68263dd`: `ci.yml`, `bucket-policy.json`, e2e helpers).
**SIN REMOTO** — no se creó ni se empujó nada a GitHub.

| Ítem | Resultado |
|---|---|
| **A6-2 CI** | Workflow verificado (Postgres 17 + Redis, migrate, lint, types, build, unit, 8 e2e). Sin `\|\| true` en pasos de fallo. `capturas.spec.ts` usa `e2e/helpers/db.ts`. |
| **A6-3 core/ui** | Carpetas vacías **retiradas**. README + `docs/architecture.md` actualizados. |
| **A6-5 MinIO/mod** | `minio-init` aplica `deploy/minio/bucket-policy.json` (solo GetObject). Deploy sin bypass IA por defecto. Tests rechazo: `almacen.test.ts` (SVG/exe/tope/path), `entorno.test.ts`, `moderacion.test.ts`. |
| **A6-4 Expo** | Matriz actualizada con decisión: **NO se borra** `apps/mobile` (push prod / AASA / instrumented 🟡). |
| **A6-6 docs** | `docs/comunidad.md`, `docs/moderacion.md`, `docs/runbook.md`. Remitente `contacto@udlagora.com` (antes nexara). `google-services.json` = placeholder versionado (decisión documentada en FIREBASE.md). |
| **Tests** | API unit: **67/67** pass (antes fallaban 2 mocks `retoAmigo`). Lint local OK. |

Commits de este turno: `31932d1`, `d09fa15`, `5a381cb` (+ este cierre).

## A medias - CUIDADO

- **SIN REMOTO EN MAYÚSCULAS.** Custodia solo local. Adam autoriza repo privado + push.
- **A6-7 Deploy `udlagora.com`** — `deploy/` listo; lo ejecuta Adam (rellenar `OPENAI_API_KEY` o `MODERACION_OPCIONAL=true` en `deploy/.env`).
- **MARCANET / IMPI** — trámite legal de Adam.
- E2E Playwright **no corridos en este turno**: Docker Desktop apagado (`dockerDesktopLinuxEngine` no disponible). El workflow CI los tiene; falta validar cuando haya daemon o remoto+Actions.

## Siguiente paso

1. Adam: autorizar remoto privado GitHub + primer push de `mejora/ci-y-blindaje` (o merge a `master` primero).
2. Adam: A6-7 — `bash deploy/setup-server-env.sh` + OpenAI o bypass explícito + `docker compose up`.
3. Cuando haya push/Firebase reales: reemplazar `google-services.json` placeholder; APNs `.p8`.
4. Tras push prod nativo: re-evaluar borrar `apps/mobile` (Expo).

## No tocar

- **`.env`** (secretos reales). Ignorado. No leerlo, no commitearlo.
- **`C:\dev\_scratch\agora-deploy.tar`** — backup del tar de despliegue.
- **`capturas/`** y **`test-results/`** — regenerables; ignorados.
- Comandos prohibidos: `git reset --hard`, `git checkout --`, `git clean`, `git stash drop`.
- Carpetas ajenas: `NO TOCAR LIBREMENTE`, `SOFTWARE PERSONAL`.

## Mapa rápido del proyecto

Monorepo pnpm 10.30.3 + turbo, Node >= 22. `agora-platform`.

- **apps/**: `web`, `admin`, `api` (:4200), `mobile` (Expo prototipo), `mobile-native` (prod).
- **packages/**: `auth`, `config`, `contracts`, `correo`, `db`, `moderation`, `rbac`, `shared`.
- **Tests:** unit `node --test` sobre `dist/` + 8 e2e Playwright. `pnpm ci:verify` / `.github/workflows/ci.yml`.
- **BD:** Prisma, 19 migraciones.
- **Despliegue:** `deploy/` — Traefik + MinIO + Postgres 17 + Redis. Dominio **`udlagora.com`**.
- **CI:** `.github/workflows/ci.yml` listo; **no corre en Actions hasta que exista remoto**.
