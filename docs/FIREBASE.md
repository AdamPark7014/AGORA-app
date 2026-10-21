# Firebase / FCM (Ágora)

Guía de configuración para push en Android nativo y el servidor API.

## Android (`apps/mobile-native/android`)

El proyecto incluye `app/google-services.json` **placeholder** para que Gradle compile sin credenciales reales de Firebase.

### Decisión A6-6 (custodia)

- Desde el 21-10-2026 **se versiona el `google-services.json` real** del proyecto
  `agora-udlap` (no es un secreto: viaja dentro del APK; la clave de API que trae es de
  cliente). Así cualquier build, local o en CI, registra tokens FCM reales.
- **No** se versiona el service account (clave privada): vive solo en `deploy/.env` del
  servidor como `FIREBASE_SERVICE_ACCOUNT_JSON`.
- Antes de Play Store / push FCM real: reemplazar el archivo y **no** revertir
  al placeholder en la rama de release.

### Reemplazar `google-services.json` (producción)

1. Abre [Firebase Console](https://console.firebase.google.com/) y crea o selecciona el proyecto de producción.
2. **Add app** → Android, package name `mx.agora.mobile.nativeapp`.
3. (Opcional) Añade el SHA-1 del keystore de release para App Links / Dynamic Links.
   - SHA-256 para `assetlinks.json`: `.\scripts\get-release-sha256.ps1` (o `-KeystorePath` / env `AGORA_KEYSTORE_PASSWORD`).
4. Descarga `google-services.json` y **reemplaza** `apps/mobile-native/android/app/google-services.json`.
5. Sincroniza Gradle y verifica que FCM entrega tokens reales (`adb logcat -s PushRegistration AgoraFirebaseService`).

Sin un JSON real, la app compila y registra tokens en la API, pero **FCM no entregará notificaciones**.

### API del servidor (envío FCM)

Configura credenciales en el deploy del API (`apps/api`):

| Variable | Uso |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON completo del service account (recomendado en Railway/Fly/CI). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta a un archivo `.json` del service account en el host. |

Sin estas variables, `POST /push/suscribir-fcm` guarda el token pero el API omite el envío FCM (warn en log).

Obtén el JSON en Firebase Console → **Project settings** → **Service accounts** → **Generate new private key**.

### Registro en la app

- `POST /push/suscribir-fcm` con `{ "token": "<fcm-token>" }` — `PushRegistration` y `AgoraFirebaseService`.
- `PushRegistration.registerCurrentDeviceAsync()` — tras login y al abrir `MainActivity`.
- `AgoraFirebaseService` — renueva el token en la API cuando FCM lo rota.
- Icono de notificación: `res/drawable/ic_notification.xml` (monocromo) + tint naranja `#E35205`.

### Build types y API

| Build | `API_BASE_URL` |
|---|---|
| `debug` | `http://10.0.2.2:4200/api` (emulador → API local) |
| `release` | Propiedad Gradle `API_BASE_URL` (default `https://udlagora.com/api`) |

Definida en `android/gradle.properties` o `~/.gradle/gradle.properties`. En teléfono físico con build debug, usa la IP LAN de tu PC en `build.gradle.kts` si hace falta.

### Release signing (Play Store)

Copia `android/local.properties.example` → `android/local.properties` (no commitear) y rellena:

```properties
RELEASE_STORE_FILE=../keystore/agora-release.jks
RELEASE_STORE_PASSWORD=***
RELEASE_KEY_ALIAS=agora
RELEASE_KEY_PASSWORD=***
```

`assembleRelease` / `bundleRelease` usan signing solo si `RELEASE_STORE_FILE` existe.

### R8 / ProGuard

Release activa minify + shrink con reglas en `app/proguard-rules.pro` (Retrofit, Moshi, modelos API).

## Checklist Play Store (pendiente con credenciales reales)

- [ ] `google-services.json` de producción
- [ ] Keystore de release en `local.properties`
- [ ] `API_BASE_URL` apuntando al API de producción
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` en el API de producción
- [ ] Verificación de dominio App Links (`assetlinks.json` en `udlagora.com`)
- [ ] `bundleRelease` y subida a Play Console

## Documento Android detallado

Ver también [`apps/mobile-native/android/FIREBASE.md`](../apps/mobile-native/android/FIREBASE.md).
