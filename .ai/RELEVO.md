# RELEVO

- **Último turno:** claude-code
- **Fecha:** 2026-08-27
- **Rama:** master

## Hecho en este turno

Carril A6-1: **dar custodia local a AGORA-app**. El proyecto llevaba
hasta hoy sin ningún control de versiones — 26 módulos, 19 migraciones
Prisma y 23 tests colgando de un único disco.

- `git init` sobre `C:\dev\apps\AGORA-app` (rama `master`). No existía
  `.git` previo: el repo nace aquí.
- Se **amplió** el `.gitignore` que ya había (edición por anexado, no se
  reescribió nada de lo anterior). Añadido: `*.tar`, `*.tar.gz`, `*.tgz`,
  `*.apk`, `*.aab`, `*.keystore`, `*.jks`, `.gradle/`, `.DS_Store`.
  Las reglas de Gradle/Android **ya estaban** (`build/`, `.gradle/`,
  `.gradle-isolated/`, `local.properties`).
- `agora-deploy.tar` (6 366 720 B), que hacía de control de versiones
  artesanal, **se movió** a `C:\dev\_scratch\agora-deploy.tar`. No se
  borró: está ahí si alguien lo necesita.
- Primer commit `afea257` — **537 archivos, 1.06 MiB**. Árbol limpio.
- Alta del protocolo de relevo (`.ai/`, `AGENTS.md`, `.cursor/rules/`).

Verificado antes de commitear: `.env`, `node_modules/`, `capturas/`,
`test-results/`, `.turbo/`, `.next/`, `dist/` y los ~18 800 artefactos
Gradle quedan fuera. Sólo entran `.env.example` y
`local.properties.example`, que son plantillas.

## A medias - CUIDADO

- **FALTA CREAR EL REMOTO.** Esto es lo importante: la custodia hoy es
  **sólo local**. Un fallo de disco todavía se lleva el proyecto entero.
  El turno tenía alcance explícito de sólo-local.
- **Adam tiene que autorizar** la creación del remoto en GitHub y el
  primer push. **No lo hagas por tu cuenta.** Cuando lo autorice: repo
  **privado** (es una red social cerrada de la comunidad UDLAP, con
  datos y configuración de despliegue).

## Siguiente paso

1. Pedir a Adam autorización para el remoto privado + push inicial.
2. Decidir qué hacer con `packages/core/` y `packages/ui/`: están
   **vacíos** (0 archivos) y por eso no existen en el commit. O se
   rellenan o se borran del `pnpm-workspace.yaml`.
3. Valorar si `apps/mobile-native/android/app/google-services.json`
   (682 B, config Firebase de cliente) debe seguir versionado. Hoy **sí
   está en el commit**. No se tocó por decisión propia.
4. No hay CI. Si algún día hay remoto, `pnpm ci:verify` es el candidato
   natural para un workflow.

## No tocar

- **`.env`** (945 B, secretos reales). Está ignorado. No lo commitees, no
  lo leas, no lo muevas. `.env.example` es el que viaja.
- **`C:\dev\_scratch\agora-deploy.tar`** — copia de seguridad del tar de
  despliegue. Bórralo sólo si Adam lo dice.
- **`capturas/`** y **`test-results/`** — se regeneran con Playwright.
  Ignorados a propósito.
- Los cuatro comandos prohibidos por protocolo: `git reset --hard`,
  `git checkout --`, `git clean`, `git stash drop`.

## Mapa rápido del proyecto

Monorepo pnpm 10.30.3 + turbo, Node >= 22. `agora-platform`.

- **apps/**: `web` (Next), `admin` (Next), `api` (Nest, puerto 4200),
  `mobile` (Expo), `mobile-native` (Android nativo, Kotlin/Compose).
- **packages/**: `auth`, `config`, `contracts`, `correo`, `db`,
  `moderation`, `rbac`, `shared` — más `core` y `ui`, **vacíos**.
- **Tests (23):** 15 unitarios `.test.ts` (`node --test` sobre `dist/`,
  no vitest) + 8 e2e Playwright `.spec.ts` en `e2e/`.
  Comandos: `pnpm test` (turbo), `pnpm test:e2e`, `pnpm ci:verify`.
- **BD:** Prisma, 19 migraciones en `packages/db/prisma/migrations/`.
- **Despliegue:** `deploy/` — docker-compose + Traefik. Dominio
  **`udlagora.com`** (web y API tras el mismo host; `/api` y `/media`
  con PathPrefix, MinIO para media, Let's Encrypt).
- **CI:** no hay `.github/workflows/`. Verificación local `pnpm ci:verify`.
