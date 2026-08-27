# Firebase / FCM (Android nativo)

Documentación canónica del monorepo: [`docs/FIREBASE.md`](../../../docs/FIREBASE.md).

El proyecto incluye `app/google-services.json` **placeholder** para que Gradle compile sin credenciales reales.

## Producción — `google-services.json`

1. Crea o abre el proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Añade la app Android con package `mx.agora.mobile.nativeapp`.
3. Registra el SHA-1 del keystore de release (Play App Signing o upload key).
4. Descarga `google-services.json` y reemplaza `app/google-services.json`.
5. Rebuild: `./gradlew :app:assembleRelease` (o `assembleDebug` para pruebas).

## API — variables de entorno

El servidor (`apps/api`) necesita credenciales para enviar push:

```bash
# Opción A (deploy): JSON inline
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Opción B (local): ruta al archivo
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
```

Sin ellas, los tokens FCM se registran en BD pero no se envían notificaciones.

## Registro en la app

- `POST /push/suscribir-fcm` — `PushRegistration`, `AgoraFirebaseService`.
- Notificaciones: `AgoraNotifications` + `ic_notification` (tint naranja `#E35205`).

## Build types

| Tipo | API |
|---|---|
| `debug` | `http://10.0.2.2:4200/api` |
| `release` | `API_BASE_URL` en `gradle.properties` (default `https://udlagora.com/api`) |

## Signing release

Ver `local.properties.example` → copiar a `local.properties` con rutas y contraseñas del keystore.

## Tests

```bash
./gradlew :app:testDebugUnitTest --tests "*.DeepLinkParserTest"
```
