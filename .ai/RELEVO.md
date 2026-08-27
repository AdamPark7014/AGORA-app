# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-27
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

Fase **A6-B calidad local**. HEAD de entrada `ca5bce3` (+ rescue `fc307ca` README A6-B).
**SIN REMOTO** — no push. Docker Desktop **apagado** → A6-B1 saltado.

| Ítem | Resultado |
|---|---|
| **A6-B1 e2e** | ⏭ `docker ps` falla (`dockerDesktopLinuxEngine` ausente). No se corrieron los 8 Playwright. |
| **A6-B2 parity** | Hub Más → `perfil-yo` (iOS+Android). iOS `SessionExpiredHost` + 401 en `ApiClient`. Android Términos/Privacidad clickables + rutas. Deep links `terminos`/`privacidad`/`moderacion`. Matriz: Android ~99 %, iOS ~96 %; Moderación Android ✅. |
| **A6-B3 tests** | Media: buffer corto, video >60 MB, MP4/PNG OK. Moderación API: key vacía, `MODERACION_OPCIONAL=false`. Política: self-harm + umbral 0.85. |
| **A6-B4 CI local** | `pnpm ci:verify:sin-turbo` **verde**. Fix compile: `retos-historial.tsx` `tamano="chico"`. Unit: API **73**/73; packages auth 32, correo 26, moderation 13, shared 14, contracts 10, rbac 9. |

Commits intermedios (salvar): `fc307ca`, `17dae87` (+ este cierre).

## A medias - CUIDADO

- **SIN REMOTO EN MAYÚSCULAS.** Custodia solo local. Adam autoriza repo privado + push.
- **A6-7 Deploy `udlagora.com`** — lo ejecuta Adam (`OPENAI_API_KEY` o `MODERACION_OPCIONAL=true` en `deploy/.env`).
- **A6-B1** — re-correr `pnpm test:e2e` cuando Docker Desktop esté encendido.
- **MARCANET / IMPI** — trámite legal de Adam.
- Push prod / AASA TEAMID / `google-services.json` real — solo Adam (no inventar FCM/APNs).

## Siguiente paso

1. Adam: encender Docker → A6-B1 e2e ×8, o autorizar remoto + Actions.
2. Adam: remoto privado GitHub + push `mejora/ci-y-blindaje`.
3. Adam: A6-7 deploy + credenciales Firebase/APNs.
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
- **Tests:** unit `node --test` + 8 e2e Playwright. `pnpm ci:verify` / `ci:verify:sin-turbo`.
- **BD:** Prisma, 19 migraciones.
- **Despliegue:** `deploy/` — Traefik + MinIO + Postgres 17 + Redis. Dominio **`udlagora.com`**.
- **CI:** `.github/workflows/ci.yml` listo; **no corre en Actions hasta que exista remoto**.
