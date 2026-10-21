# Publicar Ágora (App Store y Google Play)

App nativa `mx.agora.mobile.AgoraApp` (iOS, SwiftUI) y `mx.agora.mobile.nativeapp` (Android,
Kotlin/Compose) en `apps/mobile-native/`. Se publica con las cuentas de desarrollador de **NEXARA**
(equipo de Apple `AHNW9K8745`, cuenta de Play de NEXARA), igual que ARTA. Sin Mac: iOS se compila,
firma y sube desde GitHub Actions. El repositorio es **público** desde el 21-10-2026 (Actions no cuesta
en repos públicos): **nunca** commitear llaves, contraseñas ni datos personales.

## Qué está hecho (21-10-2026)

- `ios.yml` («iOS simulador») compila Swift en `macos-15` y sube capturas: **en verde** con el login por
  contraseña.
- `ios-testflight.yml` («iOS · TestFlight»): archiva, firma con el certificado del equipo, crea el App
  ID y el perfil con `scripts/asc_signing.py` (Push + Associated Domains) y sube a App Store Connect.
  Comprueba SDK de iOS 26, icono 1024 sin alfa, `PrivacyInfo.xcprivacy`, solo iPhone.
- `android-play.yml` («Android · Play»): `bundleRelease` firmado con la llave de subida, R8 con las
  reglas de Tink (si no, `EncryptedSharedPreferences` truena al arrancar), verifica la huella y deja el
  `.aab` como artefacto `agora-aab`.
- Scripts para Adam (custodia de llaves; ninguno imprime valores): `scripts/subir-secretos-ios.ps1` y
  `scripts/subir-secretos-android.ps1` (`crear-llave-android.ps1` solo si algún día no hubiera llave).
- `google-services.json` real (Firebase `agora-udlap`) versionado desde `5a4c21a`; FCM y Web Push ya
  configurados en el servidor.

## Lo que hace Adam, una sola vez

| # | Paso | Dónde |
| --- | --- | --- |
| 1 | **Secretos de iOS**: `pwsh -File scripts\subir-secretos-ios.ps1` (toma la llave de App Store Connect y el certificado de distribución de `C:\dev\secrets\arta-ios`; pide el Issuer ID: App Store Connect → Usuarios y acceso → Integraciones → API, el UUID encima de la tabla). | PC de Adam |
| 2 | **App en App Store Connect**: Apps → «+» → Nueva app → iOS · Nombre **Ágora UDLAP** (si está tomado: «Ágora · Red del campus») · Idioma Español (México) · Bundle ID `mx.agora.mobile.AgoraApp` (si no aparece, corre una vez «iOS · TestFlight» con *upload* desmarcado: el flujo registra el App ID) · SKU `AGORA-IOS` · Acceso completo. | appstoreconnect.apple.com |
| 3 | **Secretos de Android**: `pwsh -File scripts\subir-secretos-android.ps1`. Toma la llave de subida que ya existe (`apps/mobile-native/keystore/agora-release.jks`, contraseñas en `local.properties`, hecha el 21-10; **respáldala fuera de esta PC**). No crear otra: Play registra la del primer `.aab`. | PC de Adam |
| 4 | **App en Play Console** y primera subida del `.aab` a prueba interna: pasos, declaraciones y textos de la ficha en [`../PLAY_STORE.md`](../PLAY_STORE.md). El `.aab` sale del flujo «Android · Play» (artefacto `agora-aab`) o del `bundleRelease` local. | play.google.com/console |

Después de 1 y 2, Claude lanza **iOS · TestFlight** (versión `1.0.0`); la build aparece en TestFlight en
~15 min. Después de 3, Claude lanza **Android · Play**; la primera subida del `.aab` a **Prueba interna**
es a mano en Play Console (la API no admite la primera subida de una app nueva).

## Ficha (borrador, común a las dos tiendas)

| Campo | Valor |
| --- | --- |
| Nombre | Ágora UDLAP |
| Subtítulo / descripción breve (≤80) | `La red social verificada de la UDLAP: feed, eventos, aventones y mercado.` |
| Categoría | Redes sociales |
| Clasificación | 17+ (contenido generado por usuarios, chat, anónimo con moderación) |
| Correo de contacto | gerencia@nexara.com.mx |
| Sitio web | https://udlagora.com |
| Política de privacidad | https://udlagora.com/privacidad |
| Términos | https://udlagora.com/terminos |
| Eliminar cuenta | Ajustes → Eliminar mi cuenta (dentro de la app) y https://udlagora.com/ajustes |
| Cuenta de revisión | Apple y Google entran con correo + contraseña (sin código): crear una cuenta `@udlap.mx` de prueba con contraseña y ponerla en «Información de la revisión». Pendiente de Adam. |

**Descripción completa (borrador):** Ágora es la red social verificada de la comunidad UDLAP. Entras con
tu correo @udlap.mx y caes en las comunidades de tu carrera y tu generación. Feed con fotos y encuestas,
pregunta del día, eventos del campus, aventones, marketplace, directorio, mensajes, insignias y rachas, y
un foro anónimo con reglas claras y moderación. Nadie de fuera lee lo que pasa aquí. Ágora no está
afiliada a la Universidad de las Américas Puebla.

## Lecciones de NEXARA y ARTA que ya están aplicadas aquí

- Solo iPhone (`TARGETED_DEVICE_FAMILY "1"`): Apple revisó en iPad y rechazó dos veces por capturas.
- Icono 1024 **sin canal alfa** (ITMS-90717): `scripts/generar-icono.mjs` lo escribe en RGB.
- `aps-environment = production` en Release (`AgoraApp.Release.entitlements`); development solo en Debug.
- `PrivacyInfo.xcprivacy` en la raíz del `.app`, sin rastreo, con los datos que recoge la app.
- Antes de cada envío, revisar las cuatro pestañas del Gestor de recursos multimedia de ASC (iPhone,
  iPad, Watch, iMessage): un juego de capturas escondido en iPad tumbó tres reenvíos de NEXARA.
- Play: cada subida necesita un `versionCode` mayor (`-f build=N` en el flujo); Play App Signing guarda la
  llave final, la de subida solo firma lo que se sube.
