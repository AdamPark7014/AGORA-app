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
- **Ícono nuevo aplicado: «Mono»** (pirámide de Cholula de cinco gradas, blanco→crema sobre
  naranja; Adam dejó la elección a Claude el 21-10). Fuente única `scripts/generar-icono.mjs`
  (`CONCEPTO_ACTUAL = 'mono'`; los otros tres conceptos siguen ahí): regenera web/PWA
  (`icono*.svg/png`, `apple-touch-icon`, `favicon.ico`, `og.svg/png`), Android (`ic_launcher_*`,
  `agora_isotipo`, `ic_notification`) e iOS (`AppIcon-1024.png`, `Isotipo.svg` sin clipPath ni
  filtros). `sw.js` subió a `agora-v5` para que los navegadores suelten el ícono viejo.
  **Desplegado `650bcaa` el 21-10 13:40 MX** (smoke OK, `/icono.svg` ya es la pirámide,
  rollback `prev-20261021-1337`). Disco tras podar toda la caché de build: 86 %, 11 GB libres.
- **Notificaciones configuradas (21-10, por orden de Adam):** Web Push con claves VAPID nuevas y
  FCM con el service account de Firebase, ambos en `deploy/.env` del Hetzner (respaldo
  `deploy/.env.bak-20261021`; `chmod 600`), API recreada y verificada (`/push/vapid-public-key`
  → `activo: true`; el JSON de FCM parsea dentro del contenedor). Firebase: proyecto
  `agora-udlap` (sin Analytics), app Android `mx.agora.mobile.nativeapp`, `google-services.json`
  real versionado. **APNs (iOS) sin configurar**: el clasificador de permisos bloquea el portal
  de Apple y la app tampoco compila sin Mac.
- **Tiendas:** llave de subida `apps/mobile-native/keystore/agora-release.jks` (fuera de git,
  contraseña en `local.properties`; **respaldar**), AAB firmado 1.0.0 (1) en
  `app/build/outputs/bundle/release/`. Play Console: el clasificador de permisos de Claude
  bloquea los pasos de publicación y el AAB pasa el tope de 10 MB de la herramienta de subida:
  **lo sube Adam** siguiendo `docs/PLAY_STORE.md` (textos de ficha incluidos).
  **AAB recompilado a las 17:56 MX con el `google-services.json` real** (verificado: `resources.pb`
  trae `agora-udlap`, firmado con `AGORA.RSA`); el `classes.dex` bloqueado era el demonio de Gradle de
  la sesión de móvil (`gradlew --stop`). En Chrome quedó Play Console en «Crear aplicación» con nombre
  «Ágora UDLAP», paquete e idioma es-419 ya puestos (faltan Aplicación/Gratis, las dos declaraciones y
  Crear → Pruebas internas → Crear versión → arrastrar el AAB) y Apple en su inicio de sesión; la
  extensión se desconectó antes de terminar.
- **22-10, con Chrome de vuelta:** app «Ágora UDLAP» **creada** en Play Console (id
  `4973131523055175748`, es-419, gratis) y versión 1 (1.0.0) de Prueba interna con el bundle subido y
  notas, detenida en «Revisar y confirmar» → **falta el clic de Adam en «Guardar y publicar»** (el
  clasificador de permisos de Claude lo bloquea como transacción real). Se subió
  `bundle/release/agora-1.0.0-play.aab` (4.8 MB): copia sin el mapa de R8 vuelta a firmar con la
  llave de subida, porque el original (11 MB) pasaba el tope de 10 MB de la subida por navegador;
  el `mapping.txt` se puede subir aparte (`docs/PLAY_STORE.md`). Apple: «Register a New Key» con
  nombre «Agora UDLAP APNs» y APNs marcado, en «Configure Key»; Adam elige *Sandbox & Production*,
  Save, Continue, Register y descarga el `.p8` (también bloqueado para Claude). Los
  vectores de Android/iOS están validados como XML pero **sin compilar** aquí (la sesión de
  móvil corre gradle en el mismo checkout; su `assembleDebug` los compila).

- **Apps nativas: entrar con contraseña** (sesión lateral de móvil, 21-10, commit en `main`).
  Android y iOS arrancan en correo + contraseña + «Recordarme» → `POST /auth/entrar` (modo
  `token`; sin recordarme la API da 12 h no renovables). «¿Olvidaste tu contraseña?» y
  «¿Primera vez aquí? Crea tu cuenta» llevan al flujo de código de siempre (pedir →
  seguimiento de entrega → verificar). Tras verificar, si `tieneContrasena == false` o se vino
  por «olvidé», pantalla «Crea tu contraseña» (nueva + repetir, mín. 8, ver/ocultar) antes del
  perfil o el feed; con `tieneContrasena` null (API vieja) pasa directo como antes. Ajustes →
  tarjeta «Contraseña»: crear si no tiene, cambiar con la actual si tiene; oculta si `auth/yo`
  no trae el campo. Errores: el `mensaje` de la API tal cual (401 uniforme, 429 por intentos).
  Textos = `copy.login` de la web; «Vence en 15 minutos».
  - Android: `EntrarRequest/Response`, `CrearContrasenaRequest`, `CambiarContrasenaRequest` y
    `tieneContrasena` en `VerificarOtpResponse`/`YoResponse` (`Dtos.kt`, `Apis.kt`);
    `AuthRepository.entrar/crearContrasena/cambiarContrasena/yo`, `verificarOtp` devuelve
    `EntradaPorCodigo(user, tieneContrasena)`; constructor interno inyectable (`AlmacenSesion`,
    que `SessionStore` implementa, + `AuthApi`) para probarlo sin red ni Android.
    `ui/components/FormularioContrasena.kt` (`CampoContrasena`, `FormularioContrasena`) lo
    comparten `LoginScreen` y `AjustesScreen`. **`assembleDebug` contra udlagora.com en verde el
    21-10 13:40**, unitarias **32/32** (nuevas `AuthRepositoryTest` 5 y `DtosContrasenaTest` 5);
    los vectores del ícono Mono compilaron con él.
  - iOS (**SIN COMPILAR**, no hay Mac): `AuthModels.swift`, `AuthRepository.swift` (`entrar`,
    `crearContrasena`, `cambiarContrasena`, `yo`, `EntradaPorCodigo`),
    `UI/Components/CampoContrasena.swift` nuevo, `LoginView.swift` reescrita (pasos
    entrar/pedir/codigo/contrasena), `AjustesView.seccionContrasena`, copy en `AgoraDesign.swift`,
    prueba `AgoraAppTests/AuthModelsTests.swift`.
  - Sin probar con cuenta real contra producción (el deploy `40e5bfc` ya responde en
    `/auth/entrar`); nada subido a tiendas.
- **Tiendas (21-10, sesión lateral, pedido de Adam «compila en GitHub, repo público, sube a Apple y
  Android»).** `AdamPark7014/AGORA-app` es **PÚBLICO** desde el 21-10 13:49 MX (gitleaks: 104 commits,
  0 fugas; lo único «sensible» versionado es `google-services.json`, público por diseño, y la IP del
  Hetzner en `scripts/desplegar.ps1`, que ya es pública por DNS). Con eso Actions volvió a correr:
  `ios.yml` **en verde** (corrida 39665033178: el Swift del login compiló a la primera; captura del
  simulador con la pantalla nueva). Hallazgo: XcodeGen regeneraba `Info.plist` en el Mac (bloque
  `info:` de `project.yml`) y la app salía sin `UILaunchScreen` (franjas negras) ni los permisos de
  fotos/cámara; ahora `INFOPLIST_FILE` + `GENERATE_INFOPLIST_FILE=false`. Preparado para publicar,
  copiando ARTA/FINANVOZ: `ios-testflight.yml` (archiva, firma con el certificado del equipo
  AHNW9K8745, `scripts/asc_signing.py` crea App ID + perfil con Push y Associated Domains, sube a
  ASC), `android-play.yml` (`bundleRelease` firmado con llave de subida por secretos, huella
  verificada, artefacto `agora-aab`), `PrivacyInfo.xcprivacy`, `AgoraApp.Release.entitlements`
  (aps production), `Config/AgoraApp.xcconfig`, solo iPhone, esquema compartido, icono 1024 en RGB
  (el generador ya escribe `removeAlpha`), reglas R8 de Tink, versión por `-PVERSION_CODE/NAME`.
  `ci.yml`: el sembrador importaba `@agora/shared/dist` antes del build → se siembra después del
  build. **Claude no tocó ninguna llave** (veto de credenciales): los secretos los carga Adam con
  `scripts/subir-secretos-ios.ps1` (reusa `C:\dev\secrets\arta-ios`, pide el Issuer ID),
  `scripts/subir-secretos-android.ps1` (toma la llave `apps/mobile-native/keystore/agora-release.jks`
  + `local.properties` que dejó la otra sesión en `5a4c21a`; **no crear otra**: Play registra la del
  primer `.aab`), y crea las apps en App Store Connect y Play Console a mano (la API no puede).
  Pasos exactos en `docs/store/README.md`; Play Console y textos de ficha en `docs/PLAY_STORE.md`.
  Después: lanzar «iOS · TestFlight» y «Android · Play» y subir el `.aab` a prueba interna.
  CI tras el arreglo del sembrador (corrida 39667520389): lint, types, build y unit en verde; **e2e con
  3 fallos ajenos a móvil** (`anonimo.spec` «la respuesta anonima nunca incluye al autor»,
  `capturas-admin.spec`, `moderacion.spec` «resolver exige motivo escrito»): nadie los había corrido
  desde el 27-09 (Actions sin cobro).
- **Móvil:** Android compila en local (último `assembleDebug` 21-10, ya con contraseña), sin release a Play.
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
  `otp/verificar` y `/auth/yo` traen `tieneContrasena`. Las apps nativas ya entran con
  contraseña (ver «Apps nativas» arriba; iOS sin compilar). OTP: vigencia 10 → 15 min,
  reenviar con cuenta regresiva.
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
  Lo del 21-10 (`LoginView`, `CampoContrasena`, `AuthRepository`, `AjustesView.seccionContrasena`,
  `AuthModelsTests`) también va **SIN COMPILAR**: revisar errores de Swift al primer build.
- Android con contraseña compilado y con unitarias, pero sin probar en el AVD contra producción.
- Admin (`apps/admin`) sigue con el ícono viejo (no está desplegado).
- `udlagora.com` sin MX (Email Routing de Cloudflare sin configurar).
- `apps/web/tsconfig.tsbuildinfo` y `apps/admin/tsconfig.tsbuildinfo` están versionados y cambian con
  cada typecheck: no commitearlos.

## Siguiente paso

1. Probar en producción con una cuenta real: crear cuenta, entrar con contraseña, olvidé,
   cambiar en Ajustes (la sesión lateral de móvil está en marcha: no hacer `cerrar` con
   `add -A` mientras trabaje; commits con rutas explícitas).
3. Tiendas: Adam corre los 4 pasos de `docs/store/README.md` (secretos iOS, app en ASC, llave Android,
   app en Play) → Claude lanza «iOS · TestFlight» y «Android · Play» → prueba interna / TestFlight →
   ficha, capturas y cuenta de revisión → enviar a revisión.
   **22-10 (sesión lateral de tiendas):** los 9 secretos ya están en el repo (Adam inició sesión de `gh`
   en el panel; Claude sacó el Issuer ID de ASC y corrió `subir-secretos-ios.ps1 -IssuerId …`). La app
   de App Store Connect **no existía** (el primer TestFlight murió en «Error Downloading App
   Information»): Claude la creó: **«Ágora UDLAP», id `6825863471`**, es-MX, SKU `AGORA-IOS`, bundle
   `mx.agora.mobile.AgoraApp`, acceso ilimitado. **TestFlight 1.0.0 (2) subido** (corrida 39816719592,
   solo iPhone, aps production, enlaces universales); falta que Apple lo procese y agregar testers
   internos. «Android · Play» en verde: AAB 1.0.0 (código 2) firmado con la llave de subida, copia en
   `Documents\AGORA-builds\agora-1.0.0-2.aab` (para la siguiente versión; la 1 ya está en Play).
   **22-10 13:13, por orden de Adam («dale guardar y publicar a todo, acepta todo»):** prueba interna de
   Play **publicada** (versión 1 (1.0.0), «Disponible para testers internos»; nombre temporal
   «mx.agora.mobile.nativeapp (unreviewed)» hasta completar la ficha), listas de testers «Equipo
   Finanvoz» y «Plantilla nexara» (1 correo cada una), enlace para unirse
   https://play.google.com/apps/internaltest/4701647825350555249. **Acuerdo nuevo del Apple Developer
   Program aceptado.** TestFlight: build 2 procesada (VALID, «Lista para enviar»), grupo interno
   «Equipo Ágora» con distribución automática y Adam (ad.pozo.ont@icloud.com) invitado.
   Falta para tienda pública: ficha, capturas, cuenta de revisión, cuestionarios de Play y enviar a revisión.
4. Android/iOS: probar el login con contraseña en el AVD (`nexara_phone`) contra producción: entrar,
   olvidé → crear, Ajustes → cambiar.
5. Adam: cobro de GitHub ya no bloquea (repo público); queda arreglar el banco para los repos privados.

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
