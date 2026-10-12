# RELEVO

- **Último turno:** claude-code (sesión en la nube, hilo de proyecto)
- **Fecha:** 2026-10-12
- **Rama:** main

## Hecho en este turno (12-10)

Auditoría completa (seguridad, rendimiento, UX, producción): 40 hallazgos priorizados, fuera del repo
(archivo del proyecto `auditoria/auditoria-agora-2026-10-12.md`). Etapa 1 del plan, todo en `main`,
**sin desplegar**:
- `795e001` Rutas `auth/otp/*` cuentan siempre por IP (`@LimitePorIp`): un Bearer inventado ya no
  abre un contador nuevo por petición.
- `e10cc4a` Intentos del OTP reservados y canje con `updateMany` condicionado (carrera en paralelo).
- `730ad3b` Contador de publicaciones del perfil e insignia SOCIAL sin anónimas (delataban autor).
- `321b680`/`09f0a9f` `enSegundoPlano` + `unhandledRejection` en `main.ts` (un aviso fallido tumbaba
  la API); el bloqueo corta `enviar`, `alternarSeguir` y avisos (`bloqueos/bloqueos.ts`), y bloquear
  borra seguimientos en los dos sentidos.
- `844a786` Bandeja de mensajes sin mensajes retirados.
- `0d6da8b` Media con `thumbUrl/ancho/alto` (`aMediaVista`); la web usa `srcSet` (`lib/imagen.ts`).
- `29660cf` CI: build con `NODE_ENV=production` (reproducido el fallo del admin en local).
- API 205/205, lint y check-types en verde.

## Hecho en este turno (08-10)

Retomado desde el turno de Cursor del 07-10 (Fase 0 de ÁGORA 2.0, plan en
`docs/agora-2.0/PLAN-FASE-0-1.md`), que se cortó sin cerrar: su WIP de Android quedó en `d1261c9`.

### Revisión de Fase 0 y correcciones (`23de7f0`, `f904789`, `f688305`)
- Redirect abierto en `?siguiente=` (`/\t/evil.com`, `/..//evil.com`): `lib/welcome.ts` resuelve con `URL`.
- **Una suspensión se levantaba sola al volver a pedir el código** (`abrirSesion` ponía ACTIVO). Arreglado
  con prueba. Un suspendido sí puede darse de baja (`SesionGuardBaja`).
- Media: HEIC/AVIF ya no se clasifican como MP4 (se guardaban con GPS sin pasar por sharp); HEIC se
  rechaza, AVIF se re-codifica. `media/metadatos-video.ts` vacía `udta`/`meta` de MP4/MOV (GPS de
  Android e iPhone) sin cambiar tamaño. GIF/WEBP animados re-codificados. Foto de perfil = imagen.
- Baja de cuenta borra sus archivos del almacén público (salvo bajo reporte abierto).
- Moderación: levantar suspensión exige admin, no revive BAJA; restaurar no publica lo borrado por el autor.
- Marketplace: solo imágenes propias (`ownerId`) y pasan por moderación de imagen.
- Limpieza de huérfanos: exclusión de fotos de perfil dentro del SQL (antes se atascaba con 500 avatares).
- Seed sin `.env` (`--env-file-if-exists`); pruebas del limitador ya no se cuelgan con Redis presente.
- API: 194/194 pruebas, lint y typecheck en verde.

### Paridad móvil
- **Android** (`b6d6027`): seguimiento de entrega del OTP + Reenviar, isotipo, «Developed by Zynora
  Tek», logout real (push + `/auth/salir`), compartir, seguidores/siguiendo, tema, Retirar/Suspender,
  Silenciar, badge de mensajes, reportar anónimas, contactar conductor, notificaciones paginadas,
  filtros de directorio, portada/cumpleaños, cupo/tipo de eventos, visor con zoom, @menciones.
  `assembleDebug` + 22 pruebas unitarias en verde. **Probado en emulador contra producción**: login con
  isotipo y crédito; código pedido → «Entregado en tu buzón UDLAP» a los ~45 s.
- **iOS** (`8dc8101`): lo mismo + fotos a JPEG sin EXIF antes de subir + editar/borrar propio +
  carrusel/video. Además arregló ~12 errores **previos** que impedían compilar (SWIFT_VERSION 5.9→5.0,
  redeclaraciones, tipos privados, bloques >10 hijos…) y bugs: 9 banners que nunca cargaban, PATCH
  /perfil que siempre mostraba error, leaderboard 404. **SIN COMPILAR** (sin Mac).
- Íconos (`032d9ec`): adaptativo Android + monocromo + notificación; AppIcon 1024 de iOS (estaba vacío).

### Despliegue (08-10, verificado)
- Desplegado `api` + `web` con todo lo anterior y lo de Cursor. Migraciones `media_owner` y
  `aviso_aventon_cancelado` aplicadas. Respaldo previo: `/root/db-backups/agora/agora-predeploy-20261008.sql.gz`.
  Rollback: imágenes `agora-api:prev-20261008` y `agora-web:prev-20261008`.
- Humo: salud ok, páginas 200, `/api/auth/otp/entrega` 404 para id desconocido, cuenta/media 401 sin sesión.
- Webhook de Brevo llega (Traefik: POST `/api/correo/brevo/*` → 204), pero Brevo lo manda con 30–40 s
  de retraso. El estado llega a la pantalla en ~45 s.

### Incidente del servidor (08-10, ~15:30 UTC)
- Replicar el CI en el Hetzner (Playwright + Postgres de prueba) **llenó el disco al 100 %**:
  `nexara-db`/`family-db` con «No space left on device» y NEXARA en 503 (su health exige < 90 %).
  Recuperado borrando lo propio (imagen Playwright, carpeta, 6 volúmenes anónimos de hoy) y
  `docker builder prune`. Disco ahora ~84 %. **No correr e2e en el servidor. Nunca `docker volume prune`**
  (hay volúmenes con nombre «sin usar» con datos viejos: `nexara-db-data`, `zynoratek-app_pgdata`…).

## A medias - CUIDADO

- **E2E sin correr**: Docker Desktop local no arranca (socket `sailor-ingest`, necesita reiniciar
  Windows; nunca «Reset to factory defaults») y **GitHub Actions no corre ningún job desde el 27-09
  por un problema de cobro** de la cuenta. Con cualquiera de los dos: `pnpm test:e2e` (anonimo, cuenta…).
- El CI fija `NODE_ENV=development` para todo el job y `next build` del admin falla así; el build debe
  correr con `NODE_ENV=production` (arreglado el 12-10 en `ci.yml`).
- iOS sin compilar: el workflow `.github/workflows/ios.yml` (macos-15, XcodeGen, simulador + capturas)
  es la primera compilación real en cuanto Actions vuelva. Pendiente en iOS: visor con zoom desde el feed.
- Admin (`apps/admin`) sigue con el ícono viejo (no está desplegado).
- `udlagora.com` sin MX (Email Routing de Cloudflare sin configurar).
- `apps/web/tsconfig.tsbuildinfo` y `apps/admin/tsconfig.tsbuildinfo` están versionados y cambian con
  cada typecheck: no commitearlos.

## Siguiente paso

1. Adam: arreglar el cobro de GitHub (Settings → Billing) → corre CI (e2e) + `ios.yml`.
2. Con iOS compilando: TestFlight; Android: build de release a Play.
3. Fase 1 de ÁGORA 2.0 (plan, §5).

## No tocar

- **`.env`** / **`deploy/.env`** salvo `MAIL_FROM` y `CORREO_WEBHOOK_TOKEN`.
- `git reset --hard` / `checkout --` / `clean` / `stash drop`.
- No regenerar secretos con `setup-server-env.sh`. No `docker volume prune` en el Hetzner.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` (copia sin git; se sube con
`git -c core.autocrlf=false archive HEAD | ssh … tar -x`, luego `docker compose -f
deploy/docker-compose.yml build api web && … up -d --no-deps api web`; antes etiquetar
`agora-api:latest`/`agora-web:latest` como `prev-AAAAMMDD` para poder volver). Dominio **udlagora.com**.
Remitente de códigos: `Ágora · Zynora Tek <contacto@zynoratek.com>` (respaldo `acceso@udlagora.com`).
Remotos: `origin` (GitHub, privado) y `hetzner` (`/srv/git/AGORA-app.git`).
Android: `.\gradlew.bat :app:assembleDebug -PDEBUG_API_BASE_URL=https://udlagora.com/api`, AVD `nexara_phone`.
