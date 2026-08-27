# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-27
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

Cierre formal **A6-C** + avance **A6-D** (más unitarios, sin Docker).
HEAD de entrada: WIP `b151033` + `011862b` (tests A6-C + matriz). **SIN REMOTO** — no push.
Docker Desktop **apagado** → e2e ×8 saltados otra vez.

### A6-C (cerrado)

| Ítem | Resultado |
|---|---|
| **A6-C1 unitarios** | Stream SSE, MIME GIF/WEBP/WEBM/MOV, gamificación/retos edge → API **89**/89 al verificar cierre |
| **A6-C2 paridad** | Android `moderacion` + `eventos/crear`; tests DeepLink Android/iOS |
| **A6-C3 CI local** | `pnpm ci:verify:sin-turbo` **verde** al cierre A6-C |
| **A6-C4 e2e ×8** | ⏭ Docker `dockerDesktopLinuxEngine` ausente |

### A6-D (este turno)

| Ítem | Resultado |
|---|---|
| **Mensajería** | `mensajes-stream` (+5) + `mensajes.service` edges abrirCon/bloqueo/noLeidos (+6) |
| **Marketplace** | crear/actualizar/borrar/detalle ownership y media (+5) |
| **Aventones** | salida pasada, conductor, cupo, toggle asiento, cancelar (+6) |
| **Moderación edge** | auto-reporte, duplicado, cerrado, retirar/decidirMarcado (+7) |
| **Auth OTP edge** | dominio, 429 minuto/día, mensaje uniforme, intentos (+5) |
| **Native deep link** | hub secundarios: aventones/anonimo/guardados/directorio/buscar/notificaciones (Android+iOS) |
| **API unit** | **89 → 123** (pass 123 / fail 0) |
| **e2e** | ⏭ Docker sigue apagado |

## A medias - CUIDADO

- **SIN REMOTO EN MAYÚSCULAS.** Custodia solo local. Adam autoriza repo privado + push.
- **A6-7 Deploy `udlagora.com`** — lo ejecuta Adam (`OPENAI_API_KEY` o `MODERACION_OPCIONAL=true` en `deploy/.env`).
- **A6-B1 / A6-C4 / A6-D e2e** — re-correr `pnpm test:e2e` (×8) cuando Docker Desktop esté encendido.
- **MARCANET / IMPI** — trámite legal de Adam.
- Push prod / AASA TEAMID / `google-services.json` real — solo Adam (no inventar FCM/APNs).

## Siguiente paso

1. Adam: encender Docker → e2e ×8, o autorizar remoto + Actions.
2. Adam: remoto privado GitHub + push `mejora/ci-y-blindaje`.
3. Adam: A6-7 deploy + credenciales Firebase/APNs.
4. Seguir A6-D si hace falta: más cobertura posts/feed/bloqueos, o instrumentación Android.
5. Tras push prod nativo: re-evaluar borrar `apps/mobile` (Expo).

## No tocar

- **`.env`** (secretos reales). Ignorado. No leerlo, no commitearlo.
- **`C:\dev\_scratch\agora-deploy.tar`** — backup del tar de despliegue.
- **`capturas/`** y **`test-results/`** — regenerables; ignorados.
- Comandos prohibidos: `git reset --hard`, `git checkout --`, `git clean`, `git stash drop`.
- Carpetas ajenas: `NO TOCAR LIBREMENTE`, `SOFTWARE PERSONAL`.
- Remoto / deploy / secretos FCM — **prohibido** en este turno.

## Mapa rápido del proyecto

Monorepo pnpm 10.30.3 + turbo, Node >= 22. `agora-platform`.

- **apps/**: `web`, `admin`, `api` (:4200), `mobile` (Expo prototipo), `mobile-native` (prod).
- **packages/**: `auth`, `config`, `contracts`, `correo`, `db`, `moderation`, `rbac`, `shared`.
- **Tests:** unit `node --test` + 8 e2e Playwright. `pnpm ci:verify` / `ci:verify:sin-turbo`.
- **BD:** Prisma, 19 migraciones.
- **Despliegue:** `deploy/` — Traefik + MinIO + Postgres 17 + Redis. Dominio **`udlagora.com`**.
- **CI:** `.github/workflows/ci.yml` listo; **no corre en Actions hasta que exista remoto**.
