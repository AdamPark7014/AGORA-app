# Push en producción — FCM (Android) + APNs (iOS)

Checklist para activar notificaciones push nativas en Ágora. El código ya registra tokens y envía payloads con deep link (`url`); faltan credenciales de consola.

## Payload (todos los canales)

El API envía el mismo shape desde `PushService.enviar`:

```json
{
  "titulo": "Ágora",
  "cuerpo": "María comentó tu publicación",
  "url": "agora://post/abc123"
}
```

| Canal | Cómo llega `url` |
|---|---|
| **Web Push (VAPID)** | JSON stringificado en el body |
| **FCM (Android)** | `data.url` + `notification.title/body` |
| **APNs (iOS)** | Campo raíz `url` junto a `aps.alert` |
| **Expo** | `data.url` |

Las apps nativas deben abrir `url` al tocar la notificación (`agora://…` o rutas web).

## Endpoints de registro

| Plataforma | Endpoint | Body |
|---|---|---|
| Android | `POST /push/suscribir-fcm` | `{ "token": "<fcm-token>" }` |
| iOS | `POST /push/suscribir-apns` | `{ "token": "<hex-device-token>" }` |
| Web | `POST /push/suscribir` | Suscripción Web Push (VAPID) |
| Expo (legacy) | `POST /push/suscribir-expo` | `{ "token": "<expo-token>" }` |

Requieren sesión (`Authorization: Bearer`).

---

## Android — Firebase / FCM

### Checklist consola Firebase

- [ ] Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
- [ ] Añadir app Android con package `mx.agora.mobile.nativeapp`
- [ ] Descargar `google-services.json` real
- [ ] Reemplazar placeholder en `apps/mobile-native/android/app/google-services.json`
- [ ] En Firebase → Project settings → Service accounts → **Generate new private key**
- [ ] Configurar el JSON en el servidor API (ver abajo)

### App Android (ya implementado)

- `PushRegistration.registerCurrentDeviceAsync()` — tras login y al abrir `MainActivity`
- `AgoraFirebaseService` — renueva token cuando FCM lo rota
- Ver `apps/mobile-native/android/FIREBASE.md`

### Variables de entorno API (FCM)

```env
# Opción A (recomendada en deploy): JSON completo en una variable
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Opción B: ruta a archivo JSON del service account
GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-sa.json
```

Sin estas variables, los tokens FCM se guardan pero el envío se omite (warn en log).

---

## iOS — Apple Push Notification service (APNs)

### Checklist Apple Developer

- [ ] Cuenta [Apple Developer](https://developer.apple.com/) activa
- [ ] App ID `mx.agora.mobile.AgoraApp` con capability **Push Notifications**
- [ ] Crear clave APNs (`.p8`): Certificates, Identifiers & Profiles → Keys → **Apple Push Notifications service (APNs)**
- [ ] Anotar **Key ID** y **Team ID**
- [ ] En Xcode (Mac): target AgoraApp → Signing & Capabilities → **+ Push Notifications**
- [ ] Para TestFlight/App Store: cambiar `aps-environment` a `production` en `Resources/AgoraApp.entitlements`

### App iOS (scaffold implementado)

- `PushRegistration.swift` — pide permiso tras login y registra token
- `AppDelegate.swift` — callbacks APNs y tap → `Notification.Name.agoraPushDeepLink`
- `POST /push/suscribir-apns` desde `AgoraApi.suscribirApns`
- Pasos en Mac: `apps/mobile-native/ios/MAC_BUILD_PLAYBOOK.md` (sección Push)

### Variables de entorno API (APNs)

```env
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX
# Contenido PEM del AuthKey_XXXX.p8 (puede ir en una línea con \n)
APNS_SIGNING_KEY=-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----
APNS_BUNDLE_ID=mx.agora.mobile.AgoraApp
# true en producción / TestFlight; false o ausente = sandbox (desarrollo)
APNS_PRODUCTION=false
```

Sin estas variables, los tokens APNs se guardan pero el envío se omite (warn en log).

---

## Web Push (opcional)

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contacto@udlagora.com
```

Generar claves: `npx web-push generate-vapid-keys`

---

## Verificación end-to-end

1. API con credenciales FCM y/o APNs configuradas
2. Usuario logueado en app nativa
3. Confirmar token en DB: tabla `PushSubscription`, endpoint `fcm:…` o `apns:…`
4. Disparar notificación (comentario, reacción, etc.)
5. Verificar recepción y que tap abre `url` correcta

### Gaps que requieren consola (no código)

| Gap | Quién lo resuelve |
|---|---|
| `google-services.json` real | Firebase Console |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Console → Service account |
| Clave APNs `.p8` | Apple Developer → Keys |
| `APNS_KEY_ID` / `APNS_TEAM_ID` | Apple Developer (junto con la clave) |
| Push capability en Xcode | Mac + Apple Developer account |
| `aps-environment: production` | Antes de TestFlight/App Store |

---

## Referencias en el repo

- API: `apps/api/src/push/` (`push.service.ts`, `apns.client.ts`)
- Android: `apps/mobile-native/android/FIREBASE.md`
- iOS: `apps/mobile-native/ios/MAC_BUILD_PLAYBOOK.md`
- Contratos: `packages/contracts` (`fcmPushTokenSchema`, `apnsPushTokenSchema`)
