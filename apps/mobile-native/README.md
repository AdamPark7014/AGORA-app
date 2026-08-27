## Mobile Native (100% nativo)

App móvil de **Ágora** sin WebView, sin Capacitor y sin Expo/React Native.

Mismo criterio que `nexara-app/apps/mobile-native`: UI nativa, sesión en llavero del sistema, API con `Authorization: Bearer`.

| Plataforma | Tecnología |
|---|---|
| **Android** | Kotlin + Jetpack Compose + Navigation + Retrofit |
| **iOS** | Swift + SwiftUI (carpeta `ios/`, ver `ios/README.md`) |

### ¿Y `apps/mobile` (Expo)?

`apps/mobile` es un **prototipo rápido** para probar flujos contra la API durante desarrollo. **No es la app de producción.** La fuente de verdad móvil es esta carpeta.

### Preview Android (Windows)

```bash
pnpm dev:api                    # API en :4200
pnpm mobile:android:preview     # emulador + installDebug + launch
```

O manualmente: Android Studio → **Open** → `apps/mobile-native/android` → Run `app`.

API de desarrollo (emulador → tu PC):

```
http://10.0.2.2:4200/api
```

En teléfono físico usa la IP LAN de tu máquina, p. ej. `http://192.168.1.10:4200/api` en `app/build.gradle.kts` → `API_BASE_URL`.

### Auth

Igual que la web, pero con `modo: "token"` en `POST /auth/otp/verificar`. El JWT vive en `EncryptedSharedPreferences`, no en cookies.

### Paridad con web

Ver [`docs/native-parity-matrix.md`](../../docs/native-parity-matrix.md).

### Verificar build Android (sin emulador)

```bash
pnpm mobile:android:verify
```

### iOS (Mac)

Scaffold SwiftUI listo en `ios/`. Ver `ios/README.md` y `ios/MAC_BUILD_PLAYBOOK.md`.

```bash
cd ios && xcodegen generate && open AgoraApp.xcodeproj
```

### Próximos pasos

1. Fase 1–4 Android: mensajes, marketplace, perfil ajeno, aventones…
2. FCM push nativo (Android) + APNs (iOS en Mac)
3. Paridad iOS pantalla por pantalla
4. Retirar `apps/mobile` cuando la paridad nativa cubra el checklist
