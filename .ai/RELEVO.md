# RELEVO

- **Último turno:** cursor
- **Fecha:** 2026-08-30
- **Rama:** mejora/ci-y-blindaje

## Hecho en este turno

**Web profesional polish** (plan `web_profesional_polish`) — olas W1–W3 + verify. Sin sync VPS.

### W1 — Primera impresión
- Landing branded en `/`: marca Ágora dominante, headline, CTA `@udlap.mx`, sin cards en hero; esqueleto branded anti-FOUC al reconocer sesión.
- Disclaimer legal solo en rutas públicas (`AvisoLegal`); fuera del layout autenticado.
- SEO: `metadataBase`, Open Graph, Twitter card, `public/og.svg`; sitemap con registro/términos/privacidad.
- Script inline anti-FOUC de tema en `layout.tsx`; skip link + `#contenido`.
- Toggle tema en encabezado también en rutas públicas.

### W2 — Confianza
- DM hilo: `cargando` + skeleton; no “chat vacío” hasta terminar fetch; header con nombre al llegar; `EstadoError` en fallo de carga.
- Nuevo `EstadoError` cableado en feed, mensajes, notificaciones, eventos, directorio.
- Galería: aspect-ratio en contenedor (CLS); `next/image` + alts en `Avatar`; `images.remotePatterns` en `next.config.ts`.

### W3 — Pulido
- Tokens dark completos (`--sombra-tarjeta*`, `--borde-sutil`, `--gradiente-fondo`, glow).
- `aria-live="polite"` en errores de formularios OTP/registro/feed compositor.
- Welcome web `/bienvenida` (localStorage `agora-welcome-visto`), post-login/registro.
- FAB: hash/scroll fiable + `agora:publicar`; FAB sin `aria-current`.
- Eventos/directorio: `EsqueletoLista`; `perfil/mio` sin flash null; 404 con CTA `vacio-cta`.
- Offline SW branded (`offline.html`, cache `agora-v3`).

### Verificado
- `pnpm --filter @agora/web check-types` → **verde**.

## A medias - CUIDADO

- **SIN REMOTO EN MAYÚSCULAS.** Custodia solo local.
- Código local **adelantado** al deploy en `/var/www/udlagora-app`. **No sync sin OK de Adam.**
- R4 Wave13 / deep link `/retos` → feed nativo: cierre fino opcional.
- VPS `minio-init` puede seguir en `:latest` hasta sync.
- Firebase / APNs / AASA TEAMID / MARCANET — Adam.
- Smoke visual manual de polish (landing/DM/dark/welcome) pendiente en navegador si Adam quiere.

## Siguiente paso

1. Sync VPS (rsync + compose + `install-traefik-route.sh` + smoke) **solo con OK explícito**.
2. Remoto GitHub cuando Adam autorice.
3. Opcional: smoke visual del polish web en local/prod tras sync.

## No tocar

- **`.env`** (secretos). No leerlo ni commitearlo.
- Remoto / secretos FCM sin pedido explícito.
- `git reset --hard`, `git checkout --`, `git clean`, `git stash drop`.
- No regenerar secretos prod con `setup-server-env.sh`.
- No sync VPS sin OK explícito de Adam.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` + Traefik en `/opt/traefik/config` (= nexara traefik dir). Dominio **udlagora.com**.
