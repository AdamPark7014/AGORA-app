# Matriz de paridad nativa (web → mobile-native)

Objetivo: reemplazar `apps/mobile` (Expo, solo prototipo) por `apps/mobile-native` (Kotlin + SwiftUI) como app de producción.

## Leyenda

| Símbolo | Significado |
|---|---|
| ✅ | Implementado |
| 🟡 | Parcial / placeholder |
| ⬜ | Pendiente |

**Prototipo Expo** (`apps/mobile`): existe para copiar flujos durante desarrollo; no aparece en columnas — no es destino de producción.

## Core

| Feature | API | Web | Android | iOS | Tests |
|---|---|---|---|---|---|
| Login OTP `@udlap.mx` | ✅ `/auth/otp/*` | ✅ | ✅ `LoginScreen` | ✅ `LoginView` | ✅ `e2e/sesion-nativa`, `packages/auth` |
| Onboarding welcome (3 páginas) | — | — | ✅ `WelcomeScreen` | ✅ `WelcomeScreen` | ⬜ |
| Sesión Bearer (no cookies) | ✅ `modo: token` | — (cookie) | ✅ `SessionStore` + `SessionExpiredHost` (401 global) | ✅ `SessionStore` + `SessionExpiredHost` (401 global) | ✅ `e2e/sesion-nativa` |
| Registro perfil | ✅ `/perfil` | ✅ | ✅ `RegistroScreen` | ✅ `RegistroView` | ✅ `e2e/registro-y-feed` |
| Feed + paginación | ✅ `/posts/feed` | ✅ | ✅ `FeedScreen` | ✅ `FeedView` | ✅ `e2e/registro-y-feed`, `e2e/humo` |
| Detalle publicación | ✅ `/posts/:id` | ✅ | ✅ `PostDetailScreen` | ✅ `PostDetailView` | 🟡 e2e web only |
| Pregunta del día | ✅ `/pregunta/*` | ✅ | ✅ `PreguntaDelDiaBanner` | ✅ `PreguntaDelDiaBanner` | ⬜ Expo |
| Publicar (texto + media) | ✅ `/posts` + `/media` | ✅ | ✅ `PublicarScreen` (hasta 4 fotos/videos + encuesta) | ✅ `PublicarView` (hasta 4 fotos/videos + encuesta + cola offline) | 🟡 e2e web only |
| Encuestas en feed (votar) | ✅ `POST /posts/:id/votos` | ✅ | ✅ `EncuestaBloque` | ✅ `EncuestaBloque` | ✅ Expo feed |
| Trending + cumpleaños feed | ✅ `/hashtags/trending`, `/notificaciones/cumples` | ✅ carril derecho | ✅ `CampusPulseBanner` | ✅ `CampusPulseBanner` | ⬜ |
| Eventos | ✅ `/eventos/*` | ✅ | ✅ `EventosScreen` + `CreateEventoScreen` + `EventoDetalleScreen` | ✅ `EventosView` + `CreateEventoView` + `EventoDetalleView` | 🟡 e2e web only |
| Mensajes DM | ✅ `/mensajes/*` | ✅ | ✅ `MensajesListScreen`, `MensajeDetalleScreen` (SSE realtime) | ✅ `MensajesListView`, `MensajeDetalleView` (SSE realtime) | ⬜ |
| Notificaciones | ✅ `/notificaciones/*` + SSE | ✅ | ✅ `NotificacionesScreen` | ✅ `NotificacionesView` | 🟡 API unit (`notificaciones-stream`) |
| Perfil propio | ✅ `/perfil/mio` | ✅ | ✅ `ProfileScreen` | ✅ `ProfileView` | 🟡 e2e web only |
| Perfil ajeno / seguir / bloquear | ✅ `/perfil/:handle`, `/bloqueos` | ✅ | ✅ `PerfilAjenoScreen` | ✅ `PerfilAjenoView` | ⬜ |
| Ajustes (bio, foto, notif.) | ✅ `PATCH /perfil` | ✅ | ✅ `AjustesScreen` | ✅ `AjustesView` | ⬜ |
| Términos / Privacidad | — (estático) | ✅ | ✅ `LegalTextScreen` | ✅ `LegalTextView` | ⬜ |
| Marketplace | ✅ `/anuncios/*` | ✅ | ✅ `MarketplaceListScreen` + detalle + `CreateAnuncioScreen` | ✅ `MarketplaceListView` + detalle + `CreateAnuncioView` | ⬜ |
| Aventones | ✅ `/aventones/*` | ✅ | ✅ `AventonesScreen` | ✅ `AventonesView` | ⬜ |
| Directorio | ✅ `/directorio` | ✅ | ✅ `DirectorioScreen` | ✅ `DirectorioView` | ⬜ |
| Anónimo | ✅ `/anonimo/*` | ✅ | ✅ `AnonimoScreen` | ✅ `AnonimoView` | ✅ `e2e/anonimo` |
| Guardados | ✅ `/guardados/*` | ✅ | ✅ `GuardadosScreen` | ✅ `GuardadosView` | ⬜ |
| Hashtags | ✅ `/hashtags/:tag` | ✅ | ✅ `HashtagScreen` | ✅ `HashtagView` | ⬜ |
| Buscar global | ✅ `/buscar` | ✅ | ✅ `BuscarScreen` | ✅ `BuscarView` | ⬜ |
| Más (hub) | — | ✅ | ✅ `MasScreen` (perfil-yo + Términos/Privacidad) | ✅ `MasView` (perfil-yo + Términos/Privacidad) | ⬜ |
| Guardar post | ✅ `POST/DELETE posts/:id/guardar` | ✅ | ✅ `GuardarButton` en `PostCard` | ✅ `GuardarButton` en feed + detalle | ⬜ |
| Push (FCM/APNs) | ✅ `/push/suscribir-fcm` | Web Push | 🟡 Cliente listo (`PushRegistration`, `AgoraFirebaseService`, `ic_notification`); falta `google-services.json` real + `FIREBASE_SERVICE_ACCOUNT_JSON` en API | 🟡 Cliente listo (`PushRegistration`, `AppDelegate`); falta credenciales APNs `.p8` prod | 🟡 `DeepLinkParserTest` (unit Android + iOS) |
| Moderación staff | ✅ `/moderacion/*` | ✅ admin | ✅ `ModeracionScreen` | ✅ `ModeracionView` | ✅ `e2e/moderacion` |
| Design system | — | ✅ | ✅ `AgoraColors` + components | ✅ `AgoraDesign` | ⬜ |
| Nav / deep links | — | — | ✅ `AgoraNavHost` + `agora://` + App Links `udlagora.com` + `PendingDeepLink` | ✅ `DeepLinkParser` + `agora://` + `PendingDeepLink` + Associated Domains (AASA con TEAMID pendiente) | 🟡 unit tests |
| Tab bar | — | — | ✅ Material nav bar | ✅ `MainTabView` | ⬜ |

**Paridad Android:** ~**99 %** de filas core (27 ✅, 1 🟡: push prod credentials).

**Paridad iOS:** ~**96 %** de filas core (32 ✅, 2 🟡: push APNs prod, AASA TEAMID) — pendiente credenciales Apple/Firebase en prod.

## Gamificación / Delight (Wave 6)

| Feature | API | Web | Android | iOS | Tests |
|---|---|---|---|---|---|
| Rachas / badges | ✅ `/gamificacion/*` | ✅ `RachaBadges` + perfil | ✅ `RachaBadgeRow` + `GamificacionProfileSection` | ✅ `RachaBadgeRow` + `GamificacionProfileSection` | ⬜ |
| Confetti pregunta | — (cliente) | ✅ CSS `pregunta-confetti` | ✅ `ConfettiOverlay` + haptics | ✅ `ConfettiView` | ⬜ |
| Double-tap react (feed) | ✅ `POST /posts/:id/reacciones` | ✅ `galeria-doble-toque` → `ME_LATE` | ✅ `PostMediaGrid` double-tap | ✅ `PostCardView` + `FloatingHeartOverlay` | ⬜ |

Ping diario: `POST /gamificacion/ping` (idempotente) en los tres clientes al abrir sesión.

## Gamificación social (Wave 8)

| Feature | API | Web | Android | iOS | Tests |
|---|---|---|---|---|---|
| Insignias en perfil ajeno | ✅ `GET /gamificacion/:handle` | ✅ `perfil/[handle]` + `gamificacionPorHandle` | ✅ `GamificacionPublicSection` en `PerfilAjenoScreen` | ✅ `GamificacionPublicSection` en `PerfilAjenoView` | ⬜ |
| Compartir racha | — (cliente) | ✅ `racha-badges` / perfil propio (`navigator.share` + copiar) | ✅ share intent en `ProfileScreen` + `RachaBadgeRow` (≥ 2 días) | ✅ `ShareLink` en `ProfileView` + `RachaBadgeRow` | ⬜ |
| Progreso semanal pregunta | ✅ `semanaPregunta` en `/gamificacion/mio` | ✅ barra «Esta semana: X/7 días» en `pregunta-del-dia.tsx` | ✅ `PreguntaDelDiaBanner` | ✅ `PreguntaDelDiaBanner` | ✅ unit `semanaPregunta` (API) |
| Push / in-app insignia nueva | ✅ `TipoNotificacion.INSIGNIA` | ✅ lista avisos + toast local | ✅ FCM + `InsigniaCelebracionHost` | ✅ APNs + `InsigniaCelebracionOverlay` | ⬜ |

**Paridad Wave 8:** 4 filas ✅ en las cuatro plataformas (API + web + Android + iOS).

## Reto semanal + contexto campus (Wave 10)

| Feature | API | Web | Android | iOS | Tests |
|---|---|---|---|---|---|
| Reto semanal en feed | ✅ `retoSemanal` en `/gamificacion/mio` | ✅ `RetoSemanal` + confetti al 7/7 | ✅ `RetoSemanalBanner` | ✅ `RetoSemanalBanner` | ⬜ |
| Insignia semana perfecta | ✅ `SEMANA_PERFECTA` en `evaluarBadges` | ✅ toast + panel insignias | ✅ overlay + perfil | ✅ overlay + perfil | ✅ unit API |
| Racha vs promedio campus | ✅ `comparacionCampus` en `/gamificacion/mio` | ✅ chip en `racha-badges` | ✅ `ComparacionRachaChip` | ✅ chip en `RachaBadgeRow` | ⬜ |
| Mi puesto en leaderboard | ✅ `miPosicion` en `/gamificacion/leaderboard` | ✅ badge + animación al subir | ✅ `LeaderboardRachasRow` pulse | ✅ `LeaderboardRachasRow` pulse | ⬜ |

**Paridad Wave 10:** 4 filas ✅ en las cuatro plataformas (API + web + Android + iOS).

## Eventos en vivo + retos amigos (Wave 11)

| Feature | API | Web | Android | iOS | Tests |
|---|---|---|---|---|---|
| Eventos en vivo (feed) | ✅ `GET /eventos/en-vivo` | ✅ `EventosEnVivo` carril horizontal | ✅ `EventosEnVivoBanner` | ✅ `EventosEnVivoBanner` | ✅ unit `eventos-en-vivo` |
| Retos entre amigos | ✅ `POST /retos`, `GET /retos/activos`, `POST /retos/:id/responder` | ✅ `RetosAmigos` + `lib/retos.ts` | ✅ `RetosAmigosRow` | ✅ `RetosAmigosRow` | ⬜ |
| Animación tabs feed / nav | — (cliente) | ✅ `.feed-canales--animado` + `feedCanalActivar` | ✅ `AnimatedContent` tab bar | ✅ fade tab content | ⬜ |

**Paridad Wave 11:** 3 filas ✅ en las cuatro plataformas (API + web + Android + iOS).

## Retar desde perfil + ranking semanal (Wave 12)

| Feature | API | Web | Android | iOS | Tests |
|---|---|---|---|---|---|
| ¿Puedo retar? (`GET /retos/puede/:handle`) | ✅ | ✅ check en `perfil/[handle]` | ✅ `PerfilAjenoScreen` | ✅ `PerfilAjenoView` | ✅ unit `retos.service` |
| Retar desde perfil (modal tipo) | ✅ `POST /retos` | ✅ botón + modal `RACHA` / `SEMANA_PREGUNTA` | ✅ botón «Retar 🔥» + dialog | ✅ botón + sheet | ⬜ |
| Ranking semanal de duelos | ✅ `GET /retos/ranking-semanal` | ✅ `RetosRankingSemanal` en feed + `/retos` | ✅ `RetosRankingSemanalRow` | ✅ `RetosRankingSemanalRow` | ✅ unit `retos.service` |
| Notificación al retar / aceptar | ✅ `MENSAJE` → `/retos` | ✅ deep link `/retos` | ✅ push + in-app | ✅ push + in-app | ⬜ |

**Paridad Wave 12:** 4 filas ✅ en API + web + Android + iOS.

## Cobertura de pruebas (resumen)

| Capa | Estado | Detalle |
|---|---|---|
| API unitarias | ✅ | `apps/api/src/**/*.test.ts` (error filter, límite, retención, SSE) |
| Paquetes unitarios | ✅ | `packages/auth`, `contracts`, `correo`, `moderation`, `rbac`, `shared` |
| E2E web + API | ✅ | `e2e/humo`, `registro-y-feed`, `api-contrato`, `sesion-nativa`, `moderacion`, `anonimo` |
| Android instrumentado | ⬜ | Sin tests UI/instrumentation en `mobile-native/android` |
| Android unit (JVM) | 🟡 | `DeepLinkParserTest` (deep links `agora://` + `udlagora.com`) |
| iOS XCTest | 🟡 | `DeepLinkParserTests` (XcodeGen target `AgoraAppTests`; requiere Mac) |
| Build verify | ✅ | `pnpm mobile:android:verify` → `assembleDebug` |

## UX copy (Android Wave 3)

- **Centralizado** en `ui/copy/AgoraCopy.kt` — empty states, errores y CTAs en español cercano (tono compañero del campus UDLAP).
- **iOS equivalente:** `AgoraApp/UI/Design/AgoraDesign.swift` → enum `AgoraCopy` (misma voz en login, registro y empty states).
- **Componente** `AgoraEmptyState` / `AgoraErrorState` en `ui/components/` — usado en feed, eventos, mensajes, notificaciones, búsqueda, marketplace, aventones, directorio, hashtags, guardados, anonimo, moderación y detalles.
- **iOS:** `AgoraEmptyState`, `AgoraErrorState`, `AgoraFeedSkeleton` en `AgoraApp/UI/Components/`.
- **MasScreen** — secciones agrupadas (Descubre / Campus / Tu cuenta) y tarjeta de usuario con anillo naranja de marca.

## Reglas

- **Sin WebView** para pantallas de producto.
- **Misma API** (`apps/api`), mismos contratos Zod en `packages/contracts`.
- **Auth nativa**: siempre `modo: "token"` + header Bearer.

## Decisión A6-4 — `apps/mobile` (Expo)

**No se retira en este turno.** La paridad de pantallas core en
`mobile-native` es alta (~98 % Android / ~93 % iOS), pero siguen abiertos:

| Hueco | Por qué bloquea borrar Expo |
|---|---|
| Push prod Android | `google-services.json` es placeholder; falta `FIREBASE_SERVICE_ACCOUNT_JSON` |
| Push prod iOS | falta clave APNs `.p8` + TEAMID AASA |
| Tests instrumentados Android | ⬜ |
| Varias filas core con tests solo web/Expo | p.ej. pregunta del día, encuestas |

Hasta cerrar push prod (o aceptar explícitamente ship sin push), Expo queda
como prototipo de referencia (`pnpm --filter @agora/mobile dev`). Destino de
producción: solo `apps/mobile-native`.

## A6-B2 (2026-08-27) — hub / sesión / legales

Cerrado en código (sin FCM/APNs reales):

| Cambio | Detalle |
|---|---|
| iOS `SessionExpiredHost` | 401 global → diálogo + logout (paridad Android) |
| Hub «Más» | Tarjeta de perfil → `perfil-yo` (ProfileView / ProfileScreen) en iOS y Android |
| Android legales desde Más | Términos / Privacidad clickables + rutas `TERMINOS` / `PRIVACIDAD` |
| Deep links | `terminos`, `privacidad`, `moderacion` en parsers + tests unitarios |

Siguen 🟡 solo por credenciales: push FCM/APNs y AASA TEAMID.

## A6-C (2026-08-27) — tests + deep link Android

| Cambio | Detalle |
|---|---|
| Android `moderacion` deep link | Ruta top-level `MODERACION` + `ModeracionScreen` (antes solo anidada en perfil; el parser no la mapeaba) |
| Android `eventos/crear` | Ya no cae en `evento/crear`; mapea a `EVENTOS_CREAR` (paridad iOS) |
| Tests deep link | Android: moderación, feed, marketplace, eventos/crear. iOS: marketplace + eventos/crear |
| API unit | Stream SSE, MIME GIF/WEBP/WEBM/MOV, badges/retos, auth/aventones/marketplace/mensajes/moderación → **123**/123 |

Siguen 🟡 solo por credenciales: push FCM/APNs y AASA TEAMID. Tests instrumentados Android siguen ⬜ (Gradle unit OK).

## Documentos relacionados

- [`docs/architecture.md`](architecture.md) — mapa de plataforma
- [`docs/super-app-plan.md`](super-app-plan.md) — roadmap por fases, Wave 6, Wave 8, Wave 10, Wave 11 y Wave 12
