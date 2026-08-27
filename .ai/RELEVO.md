# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-27
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

Fase **A6-C tests y calidad**. HEAD de entrada `f3fa17a`.
**SIN REMOTO** — no push. Docker Desktop **apagado** → e2e saltado.

| Ítem | Resultado |
|---|---|
| **A6-C1 unitarios** | API **73→123**. Stream notificaciones (reconnect/destroy/orden) + mensajes-stream. Media GIF/WEBP/WEBM/MOV. Gamificación/retos edge. Nuevos: auth, aventones, marketplace, mensajes, moderación (servicio). |
| **A6-C2 parity** | Android: deep link `moderacion` + NavHost; `eventos/crear` → `EVENTOS_CREAR`. Tests parser (moderación/feed/marketplace/hub). Gradle DeepLinkParser unit **OK**. |
| **A6-C3 CI local** | `pnpm ci:verify:sin-turbo` **verde** (pre-cierre; unit 123/123). |
| **A6-C4 e2e** | ⏭ Docker Desktop apagado. |

Commits: `b151033` / `011862b` (salvar) + este cierre.

## A medias - CUIDADO

- **SIN REMOTO EN MAYÚSCULAS.** Custodia solo local. Adam autoriza repo privado + push.
- **A6-7 Deploy `udlagora.com`** — lo ejecuta Adam (`OPENAI_API_KEY` o `MODERACION_OPCIONAL=true` en `deploy/.env`).
- **e2e ×8** — re-correr `pnpm test:e2e` cuando Docker Desktop esté encendido.
- **MARCANET / IMPI** — trámite legal de Adam.
- Push prod / AASA TEAMID / `google-services.json` real — solo Adam (no inventar FCM/APNs).
- Tests instrumentados Android — siguen ⬜ (unit Robolectric OK).

## Siguiente paso

1. Adam: encender Docker → `pnpm test:e2e` ×8, o autorizar remoto + Actions.
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
