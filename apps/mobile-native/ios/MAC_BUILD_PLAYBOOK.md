# 🍎 Ágora iOS — Mac Build Playbook (lee-esto-primero)

Runbook para cuando tengas acceso a una Mac. Todo lo que puede hacerse desde Windows ya está en `AgoraApp/`.

---

## ✅ Estado actual (preparado desde Windows)

| Componente | Estado |
|---|---|
| `AgoraApp.swift` (@main, RootView login → registro → tabs) | Listo |
| `LoginView.swift` (OTP correo + código, paridad Android) | Listo |
| `MainTabView.swift` (5 tabs + NavigationStack, badge avisos) | Listo |
| `SessionStore.swift` (Keychain) | Listo |
| `ApiClient.swift` + `AgoraApi.swift` + `AppModels.swift` | Listo |
| `AuthRepository.swift` + `AuthModels.swift` | Listo |
| `RegistroView.swift` (catálogo + POST /perfil) | Listo |
| `FeedView`, `PublicarView`, `EventosView`, `NotificacionesView`, `ProfileView` | Listo (parcial vs Android) |
| `PostDetailView.swift` | Stub básico (Fase 1 A2) |
| Push APNs | Scaffold listo (`PushRegistration`, `AppDelegate`, `POST /push/suscribir-apns`) — falta `.p8` y capability en Xcode |

---

## 🚀 Pasos en la Mac (~20–30 min primer arranque)

### 1) Instalar herramientas

```bash
xcode-select --install
sudo xcodebuild -license accept
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install xcodegen git
```

### 2) Clonar / pull

```bash
cd ~/Desktop
git clone <repo-agora>
cd AGORA-app
git pull --rebase
```

### 3) Generar proyecto Xcode

```bash
cd apps/mobile-native/ios
xcodegen generate
open AgoraApp.xcodeproj
```

### 4) Configurar Signing

1. Target `AgoraApp` → **Signing & Capabilities**.
2. ✅ **Automatically manage signing**.
3. **Team**: Apple ID personal o de empresa.
4. Si hay conflicto de bundle ID: `mx.agora.mobile.AgoraApp.dev`.

### 5) Apuntar al backend

Editar `AgoraApp/Data/ApiClient.swift`:

- Simulador: `http://localhost:4200/api` (ya en `#if DEBUG`).
- iPhone físico: IP LAN de tu PC, p. ej. `http://192.168.1.10:4200/api`.

Levantar API: `pnpm dev:api` desde la raíz del monorepo.

### 6) Compilar y correr

- Simulador: iPhone 15 Pro → ▶️.
- Dispositivo: cable USB, confiar en el desarrollador en Ajustes → General.

### 7) Verificación funcional (checklist manual)

- [ ] Login OTP con correo `@udlap.mx` (código en log de API).
- [ ] Tabs visibles tras login (stubs muestran placeholder).
- [ ] Cerrar sesión desde pestaña Yo.
- [ ] Keychain persiste sesión al reabrir app.

### 8) TestFlight (post-Fase 5)

- Xcode → Product → Archive → Distribute → App Store Connect.
- Invitar testers beta UDLAP (50–150 alumnos).

---

## 🧩 Archivos a crear/verificar en Mac

| Archivo | Cómo | Checklist |
|---|---|---|
| `AgoraApp.xcodeproj/` | `xcodegen generate` | ☐ |
| AppIcon 1024×1024 | Arrastrar PNG en Assets | ☐ |
| Code Signing | Xcode → Signing | ☐ |
| APNs key `.p8` | developer.apple.com → Keys → APNs | ☐ |
| Push Notifications capability | Xcode → Signing & Capabilities → + Push Notifications | ☐ |
| `AgoraApp.entitlements` | `aps-environment`: `development` (dev) / `production` (TestFlight) | ☐ |
| Verificar registro push | Login → consola Xcode: `[Push] token APNs registrado` | ☐ |

---

## 🧯 Troubleshooting

- **Build falla por firma** → Borrar DerivedData `~/Library/Developer/Xcode/DerivedData/AgoraApp-*`.
- **"Untrusted Developer"** → Ajustes → General → VPN y gestión de dispositivos → Confiar.
- **Login falla en simulador** → Verificar que `pnpm dev:api` corre y `ApiClient.baseURL` apunta a `:4200/api`.
- **Login falla en iPhone físico** → Usar IP LAN, no `localhost`.
