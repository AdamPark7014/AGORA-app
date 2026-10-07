# RELEVO

- **Último turno:** claude-code
- **Fecha:** 2026-10-07
- **Rama:** main

## Hecho en este turno

**Correo del código que no llegaba + seguimiento de entrega + logo nuevo.**

### Diagnóstico (07-10)
- Adam no recibía el código: escribió `adam.delpozos@udlap.mx` (una «o»). Su cuenta real es
  `adam.delpozoos@udlap.mx` (ACTIVO, super_admin). Microsoft rechazó con
  `550 5.4.1 Recipient address rejected` y **Brevo bloqueó la dirección** (lista de bloqueo tras
  rebote duro). El 22-08 pasó igual con `adam.delpozooos@udlap.mx`.
- Con la dirección buena el correo sí se entregó, pero cayó fuera de la bandeja principal.
  La «apertura» 4 s después es el escáner de Microsoft (AS8075), no una persona.

### Seguimiento de entrega (nuevo)
- `packages/correo/src/entrega.ts`: eventos de Brevo → estado (`enviado/demorado/entregado/
  rebotado/bloqueado/error`), consulta de eventos y desbloqueo por API de Brevo. Con pruebas.
- `apps/api/src/correo/entrega.service.ts`: sigue cada código (en memoria, 1 réplica). Fuentes:
  webhook `POST /api/correo/brevo/:token` (token `CORREO_WEBHOOK_TOKEN`) y, si calla, la API de
  eventos de Brevo. Si Brevo tenía la dirección bloqueada, la desbloquea una vez.
  Log por envío: «Entregado a …», «Rebotó …» — esa es la bitácora para revisar que lleguen.
- `POST /api/auth/otp/solicitar` sigue en 204; el id va en la cabecera `X-Envio-Id`
  (no rompe apps nativas). `GET /api/auth/otp/entrega/:envioId` → `{ estado }`.
- Web: `componentes/estado-entrega.tsx` en «Revisa tu correo» (rebote → «esa dirección no existe»,
  bloqueado → reenviar) + botón «Reenviar código».

### Remitente
- Por pedido de Adam: `MAIL_FROM="Ágora · Zynora Tek <contacto@zynoratek.com>"` (en `deploy/.env`
  del servidor). Pie del correo y aviso legal: «Developed by Zynora Tek» → zynoratek.com.
- `zynoratek.com`: SPF agregado el 07-10 en Squarespace (`v=spf1 include:_spf.google.com include:spf.brevo.com ~all`);
  DKIM (Brevo) y DMARC p=none ya estaban. Riesgo que queda: el dominio viene de campañas en frío.
- **Respaldo listo:** `udlagora.com` autenticado en Brevo (07-10; DNS en Cloudflare: brevo-code,
  DKIM brevo1/brevo2, DMARC p=none, SPF `include:spf.brevo.com`). Remitente creado:
  `Ágora <acceso@udlagora.com>`. Si Zynora cae en no deseados, cambiar `MAIL_FROM` a ese.

### Despliegue (07-10, verificado)
- Desplegado `api` + `web`. Verificado en producción: `X-Envio-Id` en solicitar, estado
  «entregado» en 9 s para adam.delpozoos@udlap.mx, log «Entregado a …», webhook con token → 204,
  ícono/og/sw `agora-v4` servidos, «Developed by Zynora Tek» en el aviso legal.
- Webhook transaccional de Brevo id **2236928** → `https://udlagora.com/api/correo/brevo/<token>`.
- **Incidente:** el primer deploy subió con CRLF (`git archive` en Windows con autocrlf) y el API
  murió con `exec /entrypoint.sh: no such file or directory`; `web` depende de `api` healthy, así
  que el sitio estuvo caído ~10 min. Arreglado: `.gitattributes` con `*.sh`/`Dockerfile` en LF y
  subir con `git -c core.autocrlf=false archive HEAD`.
- Compose: usar `up -d --no-deps api web`. Sin `--no-deps` intenta recrear `minio-init` y la imagen
  `minio/mc` ya no existe en Docker Hub.
- Respaldo del env previo: `/root/udlagora-deploy-env.bak-20261007` en el servidor.

### Logo
- Isotipo nuevo: la Á como arco de portal (portales del zócalo de Cholula). Squircle con degradado.
  `public/icono.svg` (fuente), `icono-maskable.svg`, PNGs con `node scripts/export-brand-assets.mjs`.
  `componentes/isotipo.tsx` reemplaza los `<span class="marca-punto">Á</span>`.
- SW cache `agora-v3` → `agora-v4` (si no, el ícono viejo seguía en caché).
- og.png con fuentes de sistema (antes salía en monoespaciada).

## A medias - CUIDADO

- Admin (`apps/admin`) y apps móviles siguen con el ícono viejo (admin no está desplegado; las apps
  necesitan build de tienda).
- `udlagora.com` no tiene MX (Email Routing de Cloudflare sin configurar).
- `apps/web/tsconfig.tsbuildinfo` está versionado y cambia con cada typecheck: no commitearlo.

## Siguiente paso

1. Ver en los logs de `agora-api` que cada «Codigo enviado» tenga su «Entregado a …».
2. Si UDLAP manda a no deseados lo de Zynora: `MAIL_FROM` → `Ágora <acceso@udlagora.com>`.
3. Search Console + Rich Results Test (pendiente de antes).

## No tocar

- **`.env`** / **`deploy/.env`** salvo `MAIL_FROM` y `CORREO_WEBHOOK_TOKEN`.
- `git reset --hard` / `checkout --` / `clean` / `stash drop`.
- No regenerar secretos con `setup-server-env.sh`.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` (copia sin git; se sube con
`git -c core.autocrlf=false archive HEAD | ssh … tar -x`, luego `docker compose -f
deploy/docker-compose.yml build api web && … up -d --no-deps api web`) + Traefik. Dominio **udlagora.com**. Remotos: `origin` (GitHub)
y `hetzner` (`/srv/git/AGORA-app.git`).
