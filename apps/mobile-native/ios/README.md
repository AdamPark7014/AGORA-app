# Ágora iOS (nativa)

App **100% nativa** en SwiftUI, espejo de `apps/mobile-native/android`.

## Estructura

```
ios/
├── project.yml              # Definición XcodeGen
├── AgoraApp/                # Código Swift
│   ├── AgoraApp.swift       # @main, RootView (login → welcome → registro → tabs)
│   ├── Navigation/          # DeepLinkParser, DeepLinkBus, PendingDeepLink
│   ├── Session/             # SessionStore (Keychain + seen_welcome)
│   ├── Data/                # ApiClient, AgoraApi, AppModels, MediaRepository
│   └── UI/                  # LoginView, MainTabView, pantallas reales, componentes
│       ├── Design/          # AgoraDesign.swift (colores, spacing, copy)
│       ├── WelcomeScreen.swift
│       ├── MensajesListView.swift / MensajeDetalleView.swift
│       ├── PostDetailView.swift
│       ├── EventoDetalleView.swift / CreateEventoView.swift
│       ├── MasView.swift / DirectorioView.swift / BuscarView.swift
│       ├── MarketplaceListView.swift / MarketplaceDetailView.swift / CreateAnuncioView.swift
│       ├── AventonesView.swift
│       ├── GuardadosView.swift / PerfilAjenoView.swift / AjustesView.swift
│       ├── LegalTextView.swift
│       └── Components/      # ReaccionesRow, PostCardView, PreguntaDelDiaBanner, AgoraSkeleton, …
├── Resources/
│   ├── Info.plist
│   └── Assets.xcassets/
└── MAC_BUILD_PLAYBOOK.md    # Runbook detallado para la Mac
```

## Generar el proyecto Xcode

Requiere [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```bash
brew install xcodegen
cd apps/mobile-native/ios
xcodegen generate
open AgoraApp.xcodeproj
```

## Build (Mac)

1. Abrir `AgoraApp.xcodeproj` en Xcode 15+.
2. Target **AgoraApp** → **Signing & Capabilities** → marcar *Automatically manage signing*.
3. Seleccionar simulador (p. ej. iPhone 15 Pro) → ▶️ Run.

### API de desarrollo

Editar `AgoraApp/Data/ApiClient.swift`:

| Entorno | URL base |
|---|---|
| Simulador (DEBUG) | `http://localhost:4200/api` |
| Dispositivo físico | `http://<IP-LAN-de-tu-PC>:4200/api` |
| Producción | `https://api.agora.mx/api` |

Levantar la API antes de probar login:

```bash
pnpm dev:api    # :4200
```

El OTP en desarrollo sale en el log de la API (`MAIL_PROVIDER=console`).

### Auth

Igual que Android: `POST /auth/otp/verificar` con `modo: "token"`. El JWT vive en Keychain vía `SessionStore`. El flag `seen_welcome` también vive en Keychain (cuenta separada).

## Paridad con Android

Toda vista, endpoint y flujo debe existir también en `android/`. Ver [`docs/native-parity-matrix.md`](../../../docs/native-parity-matrix.md).

## Estado del scaffold (Wave 5b — eventos + deep links)

| Componente | Estado |
|---|---|
| `@main` + `RootView` (login → welcome → registro → tabs) | ✅ Wave 4 |
| `WelcomeScreen` (3 páginas swipe + `seen_welcome` Keychain) | ✅ Wave 4 |
| `AgoraDesign` (colores, spacing, radii, `AgoraCopy`) | ✅ Wave 3 |
| `AgoraPrimaryButton` / `AgoraEmptyState` / `AgoraSkeleton` | ✅ Wave 3 |
| `LoginView` OTP (copy cálida + logo + animaciones) | ✅ Wave 3 |
| `MainTabView` (5 tabs, badge avisos, tab «Más») | ✅ Wave 5 |
| `ApiClient` URLSession + Bearer + multipart + PATCH | ✅ Wave 5 |
| `AgoraApi` + `AppModels` (feed, posts, perfil, eventos detalle/crear, búsqueda, …) | ✅ Wave 5b |
| `SessionStore` Keychain + `seen_welcome` | ✅ Wave 4 |
| `DeepLinkParser` + `PendingDeepLink` + `DeepLinkBus` | ✅ Wave 5b |
| `RegistroView` (catálogo UDLAP + `POST /perfil`) | ✅ Wave 3 |
| `FeedView` + `PreguntaDelDiaBanner` + `PostCardView` reacciones/guardar | ✅ Wave 5 |
| `PublicarView` (texto + `PhotosPicker` + `POST /media`) | ✅ Wave 4 |
| `PostDetailView` (reacciones, comentarios, guardar) | ✅ Wave 4 |
| `MensajesListView` + `MensajeDetalleView` | ✅ Wave 4 |
| `MasView` (hub Descubre/Campus/Tu cuenta + anillo naranja) | ✅ Wave 5 |
| `DirectorioView` / `BuscarView` / `GuardadosView` | ✅ Wave 5 |
| `MarketplaceListView` / `MarketplaceDetailView` / `CreateAnuncioView` | ✅ Wave 5b |
| `AventonesView` (lista, crear, apartar, cancelar) | ✅ Wave 5b |
| `PerfilAjenoView` + `AjustesView` + `LegalTextView` | ✅ Wave 5 |
| `ProfileView` (mío + ajustes/legal/mensajes) | ✅ Wave 5 |
| `EventosView` + `EventoDetalleView` + `CreateEventoView` | ✅ Wave 5b |
| `NotificacionesView` (lista + empty 🔔 + marcar leídas) | ✅ Wave 3 |
| Push APNs | ⬜ Fase 4 |
| Deep links `agora://` + `https://udlagora.com` (custom scheme) | 🟡 Wave 5b (sin Associated Domains) |
| Universal Links (App Store entitlements) | ⬜ |

### Design system (`AgoraDesign.swift`)

- **Colores:** naranja UDLAP `#E35205`, fondo cálido `#F7F5F2`, superficies y semánticos — espejo de `AgoraColors.kt`.
- **Spacing:** grid de 4 pt (`xxs`–`xxl`).
- **Radii:** card 16, button 12, chip capsule.
- **Copy:** `AgoraCopy` centraliza textos de login, registro, empty states y mensajes.

Ver **`MAC_BUILD_PLAYBOOK.md`** para el checklist completo en Mac (signing, TestFlight, APNs).
