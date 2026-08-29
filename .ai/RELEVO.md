# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-29
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

**Incidente prod `udlagora.com` → 404.** SSH al VPS Hetzner (`root@5.78.215.109:2222`).

### Causa

- Contenedores `agora-web` / `agora-api` / `agora-minio` **estaban UP** (tras reboot del VPS, uptime ~0 min).
- Traefik **no tenía router** para `udlagora.com`: `/opt/traefik/config` → symlink a `/var/www/nexara-app/deploy/traefik/` y ahí **faltaba** `udlagora.yml` (solo existía en `/var/www/udlagora-app/deploy/traefik/`).

### Arreglo

```bash
cp /var/www/udlagora-app/deploy/traefik/udlagora.yml \
   /var/www/nexara-app/deploy/traefik/udlagora.yml
```

Verificado: `https://udlagora.com` → **200** HTML Ágora; `/api/` llega a Nest (404 JSON de ruta vacía = routing OK).

Docs: `docs/runbook.md` actualizado con el gotcha de Traefik compartido.

## A medias - CUIDADO

- **SIN REMOTO EN MAYÚSCULAS.** Custodia solo local.
- Código local puede ir más adelante que el deploy en `/var/www/udlagora-app` (deploy de ago-22).
- **A6-B1 e2e** — Docker Desktop local apagado.
- MARCANET / Firebase/APNs reales — Adam.

## Siguiente paso

1. Recargar `udlagora.com` en el navegador (Ctrl+F5).
2. Si hace falta código nuevo en prod: sync + `docker compose -f deploy/docker-compose.yml up -d --build` en el VPS.
3. Remoto GitHub cuando Adam autorice.
4. Wave 13 (tipo RETO / historial / duelos ganados) quedó a medias en disco local de sesiones previas — verificar antes de seguir.

## No tocar

- **`.env`** (secretos). No leerlo ni commitearlo.
- Remoto / secretos FCM sin pedido explícito.
- `git reset --hard`, `git checkout --`, `git clean`, `git stash drop`.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` + Traefik en `/opt/traefik/config` (= nexara traefik dir). Dominio **udlagora.com**.
