# RELEVO

- **Último turno:** claude-code (sesión lateral de Ágora, en la compu de Adam)
- **Fecha:** 2026-10-21
- **Rama:** main

## Hecho en este turno (21-10)

Adam pidió tres cosas: estado de builds móviles, ícono nuevo y login sin fricción.
**Desplegado `40e5bfc` el 21-10 13:22 MX** con `scripts\desplegar.ps1` tras el OK de Adam:
migración `20261021120000_contrasena` aplicada sola al arrancar, rutas `/auth/entrar`,
`/auth/contrasena`, `/auth/contrasena/cambiar` mapeadas, api y web healthy, smoke OK.
Rollback: imágenes `prev-20261021-1320` (= las del 19-10). Antes del deploy el disco estaba al
**95 %**: se liberó caché de build, imágenes de rollback anteriores al 19-10 y journal
(→ 88 %); tras el build volvió a 93 % y se podó toda la caché de build. El disco sigue
crónico: el aviso de ntfy (>80 %) va a seguir sonando hasta que se libere algo de otros
proyectos (nunca `volume prune`).
- **`scripts/generar-icono.mjs`**: fuente única del set de íconos (web/PWA, og, Android
  adaptativo + monocromo + notificación + isotipo, iOS AppIcon + Isotipo.svg), parametrizado
  por concepto (`mono|cristal|noche|amanecer`). `CONCEPTO_ACTUAL` queda en `mono` como marcador;
  **no se ha corrido sobre el repo** hasta que Adam elija letra (`--salida` previsualiza fuera).

- **Móvil:** Android compila en local (último `assembleDebug` 19-10), sin release a Play.
  iOS nunca se ha compilado: `ios.yml` y `ci.yml` mueren en 5 s por el cobro de GitHub
  Actions («recent account payments have failed»). `apps/mobile` (Expo) es un resto sin EAS.
- **Ícono:** tres rondas de propuestas (letra Á/portal/voz → pirámide → pirámide limpia
  estilo Apple). Adam eligió la dirección «pirámide de Cholula, limpio como Apple»; la hoja
  de la ronda 3 (A Mono, B Cristal, C Noche, D Amanecer) está en el scratchpad de la
  sesión; **nada sustituido** hasta que elija letra. Generador pendiente de escribir en
  `scripts/generar-icono.mjs` (set: favicon, PWA 192/512 + maskable, Apple touch, Android
  adaptable, iOS 1024).
- **Login con contraseña** (`docs/autenticacion.md`): el código al correo solo al crear
  la cuenta, la primera vez de una cuenta de antes, u «olvidé mi contraseña»; después
  correo + contraseña con «Recordarme». argon2id (`@node-rs/argon2`, precompilado, también
  musl para Docker), 5 fallos = 15 min de bloqueo, 401 uniforme (sin enumeración, hash
  señuelo), cambiar/reemplazar revoca las otras sesiones, nada de contraseñas en logs.
  Migración **aditiva** `20261021120000_contrasena` (users.passwordHash/passwordSetAt/
  loginFallidos/loginBloqueadoHasta, sessions.viaCodigo/persistente). Rutas nuevas:
  `POST /auth/entrar`, `POST /auth/contrasena`, `POST /auth/contrasena/cambiar`;
  `otp/verificar` y `/auth/yo` traen `tieneContrasena`. **Las apps nativas siguen
  entrando con código sin cambios** (ignoran los campos nuevos); pantalla de contraseña
  en Android/iOS pendiente. OTP: vigencia 10 → 15 min, reenviar con cuenta regresiva.
  Web: `/` con pasos entrar → pedir código → código → crear contraseña; Ajustes →
  Contraseña; aviso arriba del feed para cuentas sin contraseña. e2e actualizadas
  (registro-y-feed, humo, capturas, capturas-admin) + `contrasena.spec.ts` (API real).
  auth 45/45, contracts 13/13, API 240/240, tsc y eslint en verde, build web en verde.
  Las e2e no corrieron (Docker local caído, Actions sin cobro).
- **Por qué tarda el código:** la API entrega a Brevo en < 1 s; lo lento es Microsoft 365
  (`deferred`). El único envío desde el deploy del 19-10 llegó en 7 s. Remitente
  `acceso@udlagora.com` (ya autenticado en Brevo) sigue pendiente de Adam.

## Hecho en este turno (19-10)

Adam pidió terminar la app con Claude, sin Cursor. **Desplegado `ec634e0` el 19-10 18:13 MX** (CSP sin
unsafe-eval, smoke OK, rollback `prev-20261019-1813`). Los tres intentos previos murieron por cortes de
SSH a media construcción; ahora el build corre con nohup en el servidor y el script solo sondea. Ojo: en el servidor hay respaldo de las 13:31 MX y
etiquetas `prev-20261019-1331`, pero las imágenes `latest` son de hace 11 días y la CSP en vivo aún trae
`'unsafe-eval'`: alguien corrió el script hoy y se cortó después del paso 3. Revisar el log al desplegar.
- **Pregunta relámpago nativa** (punto 4 de `PARA-CURSOR.md`): Android (`7cab9cf`, assembleDebug y
  unitarias en verde) e iOS (`c7e8169`, **SIN COMPILAR**): espera a la hora sorpresa y recarga al caer,
  cuenta regresiva, sello a tiempo/tarde, "tu carrera X%", interruptor `avisoPregunta` en Ajustes.
  El push `/feed` ya abría el feed en las dos.
- **API** (`b854cd0`): reacciones a prueba de doble toque (deleteMany condicionado, P2002 = ya puesta,
  sin aviso doble); el detalle trae los 50 comentarios **más recientes** + `comentariosAnteriores`, y
  `GET /posts/:id/comentarios?antesDe=` da la página previa. Web: botón "Ver comentarios anteriores".
  API 226/226, tsc y eslint en verde. Índice del feed: no se agregó; el filtro `estado IN (PUBLICADO,
  EN_REVISION)` casi no descarta filas y ya existe `(communityId, createdAt desc)`.
- **Avisos instalados en el VPS** (`/etc/cron.d/udlagora-vigilancia`, `scripts/instalar-vigilancia.sh`):
  disco >80 % cada 15 min y caída de `/api/salud` cada 5 min (avisa una vez y al volver), tema ntfy
  `udlagora-53c9f1958d79`. **El disco está en 88 %**: avisará cada 15 min hasta liberar espacio
  (`docker builder prune --filter until=168h` libera ~6.5 GB de caché; nunca `volume prune`).
- **Pendiente de Adam:** desplegar; suscribirse al tema en la app ntfy; DSN de Sentry; monitor externo
  (UptimeRobot) para cuando cae el servidor entero; remitente `acceso@udlagora.com`; 3 datos del aviso
  de privacidad. Sin respaldo externo (decisión de Adam).

## Hecho en este turno (12-10, etapas 2 a 4)

Todo en `main`, **sin desplegar**. Plan de 4 etapas que pidió Adam ("haz todas una por una").
- **Etapa 1 y 2** (blindar, red de seguridad): privacidad del perfil COMUNIDADES (la comunidad campus
  la anulaba), directorio y tarjetas públicas sin datos de perfiles restringidos, bloqueos en feed,
  detalle, comentar, hashtags; Sentry opcional (`SENTRY_DSN`); push solo a hosts conocidos y máx. 10
  suscripciones; `/reglas`; CSP sin unsafe-eval en prod; logs con tope en compose; Traefik `/media`
  solo GET/HEAD + CSP sandbox; `scripts/respaldo-externo.sh` y `scripts/vigilar-disco.sh` (runbook).
- **Etapa 3:** `TarjetaPost` única (6 copias fuera; feed 1098→583 líneas), carril derecho en
  escritorio y tira "Tu día" en móvil; bienvenida guiada (foto → seguir, `GET /perfil/sugerencias` →
  pregunta → presentarte); esqueletos y Reintentar en aventones/marketplace/anónimo/ajustes; chat web
  por SSE (`/mensajes/:id/stream` ya existía) con sondeo de respaldo; `leidoAt` solo si hay algo nuevo.
- **Etapa 4:** pregunta del día relámpago (`pregunta/relampago.ts`): hora sorpresa 10–20 h (HMAC del
  día con SESSION_SECRET), cron por minuto manda un push una sola vez, "a tiempo" = 2 min, tu carrera
  vs campus. Interruptor `avisoPregunta` en Ajustes. **Migración nueva `20261012120000_pregunta_relampago`**
  (solo columnas). Arreglado: la pregunta cambiaba a las 18:00 MX (contenedor en UTC).
- **Pendiente de Adam:** billing de GitHub Actions; destino rclone + cron de respaldo y disco en el VPS;
  DSN de Sentry; topic de ntfy; `install-traefik-route.sh`; datos del aviso de privacidad (borrador en
  el archivo del proyecto `auditoria/aviso-privacidad-borrador.md`); correo desde udlagora.com (DNS).
  Las apps nativas no muestran aún la hora sorpresa (ignoran los campos nuevos).
- Ojo: `prisma migrate diff --shadow-database-url` con la base de desarrollo la **borra**.
- API 224/224, e2e 24 ok (las de admin requieren :3300), tsc/eslint/build web en verde.

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

1. Adam elige el ícono (ronda 3) → poner `CONCEPTO_ACTUAL`, `node scripts/generar-icono.mjs`,
   subir `CACHE` en `apps/web/public/sw.js` (agora-v4 → v5), commit y deploy.
2. Probar en producción con una cuenta real: crear cuenta, entrar con contraseña, olvidé,
   cambiar en Ajustes (la sesión lateral de móvil está en marcha: no hacer `cerrar` con
   `add -A` mientras trabaje; commits con rutas explícitas).
3. Android/iOS: pantalla de contraseña (`/auth/entrar` modo token) y crear contraseña tras el código.
4. Adam: cobro de GitHub (Settings → Billing) → corre CI (e2e) + `ios.yml`; luego TestFlight / Play.

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
