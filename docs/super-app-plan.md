# Plan maestro — Ágora Super App

**Objetivo:** paridad completa web → `apps/mobile-native` (Kotlin + SwiftUI), sin WebView/Expo en producción.

**Referencia de prototipo:** `apps/mobile` (Expo) — solo para copiar flujos, no para producción.

**API:** `apps/api` en `:4200`, auth `modo: "token"` + `Authorization: Bearer`.

---

## Fases

### Fase 0 — Fundación ✅ (hecho)

**Checklist Android**

- [x] Scaffold Android Gradle + Compose
- [x] Login OTP + SessionStore cifrado
- [x] Registro perfil
- [x] Feed básico + tabs
- [x] Publicar (texto + foto)
- [x] Eventos lista + asistencia
- [x] Notificaciones lista + badge
- [x] Perfil propio + logout
- [x] `pnpm mobile:android:preview`

**Checklist iOS**

- [x] Paridad Fase 0 pantallas core (login, registro, feed, publicar, eventos, avisos, perfil propio, mensajes)
- [x] Scaffold SwiftUI (`AgoraApp`, `LoginView`, `MainTabView`)
- [x] `ApiClient` URLSession + Bearer
- [x] `SessionStore` Keychain
- [x] `ios/README.md` + `MAC_BUILD_PLAYBOOK.md`
- [ ] Build Xcode en Mac verificado

### Fase 1 — Navegación y social core ✅ (Android hecho)

| ID | Entrega | Pantallas / APIs |
|---|---|---|
| **A1** | Navigation Compose + rutas | `NavHost`, deep links `agora://` |
| **A2** | Feed completo | paginación, filtros siguiendo/comunidad, encuestas, pregunta del día |
| **A3** | Detalle publicación | `GET/POST posts/:id`, reacciones, comentarios, votos, guardar, reportar, editar/borrar |
| **A4** | Mensajes DM | `mensajes/*`, hilos, enviar |
| **A5** | Perfil ajeno | `perfil/:handle`, seguir, publicaciones |

**Checklist**

- [x] A1 NavHost + deep links `agora://`
- [x] A2 Feed completo (Android) · 🟡 iOS (sin reacciones en card)
- [x] A3 Detalle publicación (Android + iOS)
- [x] A4 Mensajes DM (Android + iOS)
- [x] A5 Perfil ajeno (Android) · ⬜ iOS Wave 5 en curso
- [x] `docs/native-parity-matrix.md` actualizado

### Fase 2 — Descubrimiento y comunidad ✅ (Android hecho)

| ID | Entrega | APIs |
|---|---|---|
| **B1** | Buscar | `GET /buscar` |
| **B2** | Directorio | `GET /directorio` |
| **B3** | Hashtags | `GET /hashtags/:tag` |
| **B4** | Guardados | `POST/DELETE posts/:id/guardar`, lista guardados |
| **B5** | Pantalla Más | links a módulos secundarios |

**Checklist**

- [x] B1 Buscar (Android) · Wave 5 iOS
- [x] B2 Directorio (Android) · Wave 5 iOS
- [x] B3 Hashtags (Android)
- [x] B4 Guardados (Android) · Wave 5 iOS
- [x] B5 Pantalla Más (Android) · Wave 5 iOS

### Fase 3 — Marketplace y movilidad ✅ (Android hecho)

| ID | Entrega | APIs |
|---|---|---|
| **C1** | Marketplace lista + detalle | `anuncios/*` |
| **C2** | Crear anuncio + fotos | `POST /anuncios`, media |
| **C3** | Aventones | `aventones/*` |
| **C4** | Anónimo | `anonimo/*` |
| **C5** | Evento detalle | `GET /eventos/:id` |

**Checklist**

- [x] C1 Marketplace lista + detalle (Android)
- [x] C2 Crear anuncio + fotos (Android)
- [x] C3 Aventones (Android)
- [x] C4 Anónimo (Android)
- [x] C5 Evento detalle (Android) · 🟡 iOS lista only

### Fase 4 — Cuenta, push y staff ✅ (Android hecho; FCM prod pendiente)

| ID | Entrega | APIs |
|---|---|---|
| **D1** | Ajustes | `PATCH /perfil`, foto, preferencias notif |
| **D2** | FCM Android | `POST /push/suscribir` nativo (no Expo) |
| **D3** | Moderación staff | `moderacion/*`, `reportes/*` |
| **D4** | Legal | términos / privacidad (texto estático o web view solo legal — preferir Text nativo) |

**Checklist**

- [x] D1 Ajustes (Android) · Wave 5 iOS
- [x] D2 FCM Android nativo (cliente; 🟡 credenciales prod placeholder)
- [ ] D2b APNs iOS (Mac + Apple Developer)
- [x] D3 Moderación staff (Android 🟡) · ⬜ iOS
- [x] D4 Legal (Android) · Wave 5 iOS

### Fase 5 — iOS + hardening (agente 6)

| ID | Entrega |
|---|---|
| **E1** | SwiftUI scaffold `apps/mobile-native/ios/` |
| **E2** | Paridad matriz actualizada |
| **E3** | CI script `assembleDebug` / typecheck |
| **E4** | README mega-app checklist |

**Checklist**

- [x] E1 SwiftUI scaffold (`AgoraApp`, login, tabs, ApiClient, Keychain)
- [ ] E2 Paridad matriz iOS ↔ Android (stubs → pantallas reales)
- [x] E3 `scripts/verify-mobile-native.ps1` + `pnpm mobile:android:verify`
- [x] E4 README raíz + `ios/README.md` + este plan
- [ ] Build Xcode en Mac verificado
- [ ] Paridad iOS Fase 0–4 (post-scaffold)

### Fase 6 — Beta (operación, post-código)

**Checklist**

- [ ] Migraciones prod
- [ ] FCM keys + APNs `.p8`
- [ ] TestFlight / Play Internal
- [ ] Beta 50–150 alumnos UDLAP
- [ ] **Deploy prod explícitamente después de Fase 5**

---

## Arquitectura Android objetivo

```
ui/
  navigation/ AgoraNavHost.kt
  screens/     (una pantalla por feature)
  components/  PostCard, ReactionBar, etc.
data/
  api/         Retrofit interfaces + Dtos
  *Repository.kt
```

**Reglas:** Compose Material3, naranja `#E35205`, Retrofit+Moshi, Coil imágenes, `ApiClient.resolveUrl()` para media.

---

## Agentes ola 3 — Delight & hiper-profesional ✅ (completada)

Objetivo: app **intuitiva, divertida, cálida y premium** — tono UDLAP, micro-interacciones, estados vacíos con personalidad, diseño consistente.

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W3-1 | Design system Android | Tipografía, tokens, componentes base, skeletons, cards premium |
| 🤖 W3-2 | Onboarding + auth delight | Bienvenida, copy humano, animaciones login/registro |
| 🤖 W3-3 | Micro-interacciones | Haptics, reacciones animadas, feedback táctil, transiciones |
| 🤖 W3-4 | Empty states + copy | Textos amigables en todas las pantallas, ilustraciones/emoji |
| 🤖 W3-5 | Web polish | Misma voz de marca en `apps/web`, skeletons, empty states |
| 🤖 W3-6 | iOS delight | SwiftUI design system + animaciones + copy alineado |

## Agentes ola 4 — Paridad profunda ✅ (completada)

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W4-1 | Android media | Publicar hasta 4 fotos/videos, `PostMediaGrid` en feed |
| 🤖 W4-2 | Android video | `VideoPlaybackCoordinator`, autopause feed |
| 🤖 W4-3 | iOS deep parity | Welcome, mensajes, detalle post, publicar foto, pregunta del día |
| 🤖 W4-4 | Web/API realtime | SSE notificaciones, perfil paginado, admin cola polling |

Sin commit. Android: `gradlew :app:assembleDebug` ✅ · iOS: verificar en Mac con XcodeGen.

## Agentes ola 5b — completada ✅ (9 agentes, 23-ago)

| Agente | Frente | ID |
|---|---|---|
| 🤖 W5b-1 | iOS Marketplace + Aventones ✅ | [7150a305](7150a305-8ab5-4aa5-9919-75ce289d1816) |
| 🤖 W5b-2 | iOS Anónimo + Hashtags + feed nav ✅ | [841c0ea3](841c0ea3-30da-47e5-8541-36251d11c086) |
| 🤖 W5b-3 | iOS Eventos + deep links ✅ | [e08c892d](e08c892d-fd51-4da4-976e-d241c076c2ec) |
| 🤖 W5b-4 | Android FCM prod + release + tests ✅ | [3b2b6fd0](3b2b6fd0-2f2c-4f6b-b233-9330ab6da7a0) |
| 🤖 W5b-5 | Android realtime DMs ✅ | [8c73edff](8c73edff-0c0a-4bd6-b800-c3776534f748) |
| 🤖 W5b-6 | API contracts + indexes + PATCH | [3e22cc73](3e22cc73-a366-4b36-8063-42a7effb7cb1) |
| 🤖 W5b-7 | Offline cache Android + iOS ✅ | [eb1db0b2](eb1db0b2-b295-44b6-b149-b07515c1c449) |
| 🤖 W5b-8 | Analytics product events ✅ | [576ea702](576ea702-b604-4e18-bdd6-404d3efa9994) |
| 🤖 W5b-9 | Push FCM/APNs prod docs + iOS scaffold ✅ | [a8e0676e](a8e0676e-d20e-4399-b06f-5c8928dbf442) |

## Agentes ola 5 — iOS hub, seed, FCM prod, offline, analytics (planificada)

Objetivo: cerrar brechas de producción y llevar iOS a paridad funcional con Android.

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W5-1 | iOS hub + secundarios | `MasView`, directorio, buscar, guardados, hashtags, marketplace, aventones, anónimo, ajustes, legal |
| 🤖 W5-2 | iOS social completo | `PerfilAjenoView`, evento detalle, crear evento, deep links `agora://` |
| 🤖 W5-3 | Seed + demo | `pnpm db:seed` enriquecido para beta; script `pnpm db:demo` con datos realistas para screenshots y QA |
| 🤖 W5-4 | FCM/APNs producción | `google-services.json` real, Firebase Admin en API, APNs `.p8`, `POST /push/suscribir-fcm` y APNs verificados end-to-end |
| 🤖 W5-5 | Offline básico | Caché de feed/perfil en Room (Android) y cache local SwiftData/UserDefaults (iOS); cola de publicaciones sin red |
| 🤖 W5-6 | Analytics + observabilidad | Eventos de producto (login, publicar, DM, asistencia evento); crash reporting; métricas de retención para beta |
| 🤖 W5-7 | API hardening (audit) | Contratos de **respuesta** compartidos; SSE mensajes o WebSocket; índices búsqueda (GIN/trigram); `PATCH` eventos/anuncios; índice `Notificacion(userId, leidoAt)` |

**Checklist Wave 5**

- [x] W5-1 iOS hub + discovery 🟡 — `MasView`, directorio, buscar, guardados, ajustes, legal, reacciones en feed (~65 %; faltan marketplace/aventones/anónimo/hashtags)
- [x] W5-2 iOS campus + nav ✅ — eventos detalle/crear, deep links `agora://`, marketplace/aventones/hashtag/anonimo en deep link routing
- [ ] W5-3 Seed/demo listo para beta cerrada → ✅ `demo-seed.ts` + `pnpm db:demo` (20 users, posts, DMs, eventos)
- [ ] W5-4 Push prod Android + APNs iOS 🟡 — API: `POST /push/suscribir-fcm` + `POST /push/suscribir-apns`, envío FCM (Firebase Admin) y APNs (HTTP/2 + `.p8`); Android scaffold ✅; iOS scaffold ✅ (`PushRegistration`, `AppDelegate`); docs `PUSH_PRODUCTION.md` ✅; **pendiente credenciales** (`google-services.json`, `FIREBASE_SERVICE_ACCOUNT_JSON`, clave APNs `.p8`, env vars prod)
- [x] W5-5 Offline básico ✅ — Room/UserDefaults caché feed+perfil, banner offline, cola POST Android + iOS (`PendingPostQueue`)
- [x] W5-6 Analytics ✅ — `POST /analytics/evento` + `POST /analytics/crash` + `GET /analytics/retencion` (staff); instrumentación web/Android/iOS; retención D1/D7
- [x] W5-7 API ✅ — índices DB, PATCH eventos/anuncios, response contracts, SSE mensajes, índices trigram búsqueda, iOS SSE mensajes
- [ ] Build Xcode en Mac verificado
- [x] `docs/native-parity-matrix.md` y `docs/architecture.md` actualizados

**Dependencias:** Fase 5 (iOS scaffold) ✅ · Fases 0–4 Android ✅ · API push ✅ · Wave 6 + Wave 8 gamificación ✅.

---

## Agentes ola 2 (completada ✅)

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W2-1 | API push FCM | `POST /push/suscribir-fcm`, envío Firebase Admin, contratos |
| 🤖 W2-2 | Android deep links | `agora://`, taps push → pantalla, URLs en notificaciones |
| 🤖 W2-3 | Android UX polish | video posts, toasts, pull-refresh detalle, encuesta en publicar |
| 🤖 W2-4 | iOS pantallas reales | Feed, Publicar, Eventos, API parity SwiftUI |
| 🤖 W2-5 | Android eventos+registro | crear evento, editar perfil completo, bloqueos |

Cada agente: `gradlew :app:assembleDebug` (Android) o código Swift; actualizar matriz; **sin commit**.

## Agentes ola 6 — Gamificación + delight ✅ (completada)

Objetivo: retención ligera y micro-delight alineado con tono UDLAP — rachas diarias, insignias de campus, confetti en pregunta del día y reacción rápida en el feed.

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W6-1 | API gamificación | `GamificacionModule`: `UserStreak`, `UserBadge`, `GET /gamificacion/mio`, `POST /gamificacion/ping`; evaluación automática vía analytics/posts/pregunta/aventones |
| 🤖 W6-2 | Contratos + persistencia | `BADGE_CODIGOS`, `BADGES_CAMPUS`, `gamificacionResponseSchema` en `packages/contracts`; tablas `user_streaks` / `user_badges` |
| 🤖 W6-3 | Web delight | `RachaBadges`, confetti CSS en `PreguntaDelDia`, doble toque en galería del feed |
| 🤖 W6-4 | Android delight | `RachaBadgeRow`, `GamificacionProfileSection`, `ConfettiOverlay`, double-tap en `PostMediaGrid` |
| 🤖 W6-5 | iOS delight | `RachaBadgeRow`, `GamificacionProfileSection`, `ConfettiView`, double-tap + `FloatingHeartOverlay` en `PostCardView` |

**Checklist Wave 6**

- [x] W6-1 API gamificación — rachas con corte `America/Mexico_City`, ping idempotente por día, otorgamiento de badges
- [x] W6-2 Contratos Zod + migración Prisma (`UserStreak`, `UserBadge`)
- [x] W6-3 Web — panel racha/insignias en feed, confetti al responder pregunta, doble toque → `ME_LATE`
- [x] W6-4 Android — racha en feed + sección perfil, confetti nativo, haptics pregunta, double-tap react
- [x] W6-5 iOS — paridad racha/badges, confetti SwiftUI, double-tap react con corazón flotante
- [x] Badges campus — `PREGUNTA_7`, `AVENTONERO`, `EARLY_BIRD`, `SOCIAL` documentados en contratos
- [x] `docs/native-parity-matrix.md` y `docs/architecture.md` actualizados

## Agentes ola 8 — Gamificación social ✅ (completada)

Objetivo: hacer visible la gamificación en perfiles ajenos, celebrar rachas con share nativo, avisar al desbloquear insignias y mostrar progreso semanal de la pregunta del día.

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W8-1 | API gamificación social | `GET /gamificacion/:handle` (misma universidad, 404 si no existe); `semanaPregunta` en `gamificacionResponseSchema`; tipo `INSIGNIA` en Prisma + push/in-app al otorgar badge |
| 🤖 W8-2 | Web perfil + racha | Insignias y racha en `perfil/[handle]`; botón compartir racha (`navigator.share` + fallback copiar); barra «Esta semana: X/7 días» en `pregunta-del-dia.tsx` |
| 🤖 W8-3 | Android social | `GamificacionPublicSection` en `PerfilAjenoScreen`; share intent en `ProfileScreen`/`RachaBadgeRow` (≥ 2 días); progreso semanal en `PreguntaDelDiaBanner` |
| 🤖 W8-4 | iOS social | `GamificacionPublicSection` en `PerfilAjenoView`; `ShareLink` en `ProfileView`/`RachaBadgeRow`; progreso semanal en `PreguntaDelDiaBanner` |

**Checklist Wave 8**

- [x] W8-1 API — `GET /gamificacion/:handle` devuelve `rachaActual`, `rachaMaxima`, `badges` (solo campos públicos); `semanaPregunta: { respondidas, meta: 7 }` en `obtener()` y respuesta de `ping`; días distintos en semana ISO (`America/Mexico_City`)
- [x] W8-1 Notificaciones — `TipoNotificacion.INSIGNIA` en Prisma; `NotificacionesService.crear` tras `evaluarBadges` con texto de `mensajeNuevaInsignia` y URL `/perfil/mio`; push FCM/APNs según preferencias
- [x] W8-2 Web — `gamificacionPorHandle(handle)` en `lib/gamificacion.ts`; panel racha/insignias en perfil ajeno; compartir racha propia («Llevo 🔥 X días seguidos en Ágora — ¿te sumas? https://udlagora.com»)
- [x] W8-3 Android — `GamificacionApi.porHandle`; sección solo lectura en perfil ajeno; share intent si `rachaActual >= 2`; barra de progreso semanal pregunta
- [x] W8-4 iOS — `AgoraApi.gamificacionPorHandle`; paridad perfil ajeno + share + progreso semanal
- [x] `docs/native-parity-matrix.md` y `docs/architecture.md` actualizados

## Agentes ola 10 — Reto semanal + contexto campus ✅ (completada)

Objetivo: hacer visible el reto semanal de preguntas, comparar la racha personal con el promedio del campus y celebrar mejoras de posición en el leaderboard.

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W10-1 | API + contratos | Badge `SEMANA_PERFECTA`; `comparacionCampus`, `retoSemanal` en `gamificacionResponseSchema`; `miPosicion` en `leaderboardResponseSchema` |
| 🤖 W10-2 | Web delight | `RetoSemanal`, chip comparación en `RachaBadges`, highlight `miPosicion` + animación al subir puesto |
| 🤖 W10-3 | Android delight | `RetoSemanalBanner`, `ComparacionRachaChip`, `LeaderboardRachasRow` con pulse al mejorar |
| 🤖 W10-4 | iOS delight | `RetoSemanalBanner`, comparación en `RachaBadgeRow`, `LeaderboardRachasRow` con animación |

**Checklist Wave 10**

- [x] W10-1 API — insignia `SEMANA_PERFECTA` al llegar a 7/7 preguntas en la semana ISO; promedio de racha del campus en `comparacionCampus`; `miPosicion` en leaderboard (null si racha &lt; 2)
- [x] W10-1 Contratos — `retoSemanal`, `comparacionCampus`, `miPosicion`; badge ⭐ Semana perfecta
- [x] W10-2 Web — banner reto semanal en feed; chip «Tu racha vs campus»; confetti al completar 7/7; animación CSS al subir en ranking
- [x] W10-3 Android — paridad feed: `RetoSemanalBanner` → leaderboard → tips
- [x] W10-4 iOS — paridad feed: `RetoSemanalBanner` → leaderboard → tips
- [x] `docs/native-parity-matrix.md` y `docs/architecture.md` actualizados

## Agentes ola 11 — Eventos en vivo + retos amigos ✅ (completada)

Objetivo: mostrar en el feed lo que pasa **ahora** en campus (eventos en curso o que empiezan pronto) y duelos ligeros entre amigos por racha o semana de preguntas, con transiciones suaves en los tabs del feed.

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W11-1 | API + contratos | `GET /eventos/en-vivo`, módulo `retos` (`POST /retos`, `GET /retos/activos`, `POST /retos/:id/responder`); Prisma `RetoAmigo`; puntajes vía `GamificacionService.puntajeReto` |
| 🤖 W11-2 | Web delight | `EventosEnVivo`, `RetosAmigos`, `lib/retos.ts`, integración feed, animación tabs `.feed-canales--animado` |
| 🤖 W11-3 | Android delight | `EventosEnVivoBanner`, `RetosAmigosRow`, `AnimatedContent` en tab bar (`MainShell`) |
| 🤖 W11-4 | iOS delight | `EventosEnVivoBanner`, `RetosAmigosRow`, transición fade entre tabs |

**Checklist Wave 11**

- [x] W11-1 API — ventana configurable (`horas`, default 4) para eventos en curso o próximos; retos solo entre misma universidad, sin bloqueos, requiere seguir o comunidad compartida; estados `PENDIENTE` / `ACTIVO` / `RECHAZADO`
- [x] W11-1 Contratos — `enVivoResponseSchema`, `retoAmigoSchema`, `retosActivosResponseSchema`, `crearRetoSchema`, `responderRetoSchema`
- [x] W11-2 Web — carril horizontal eventos en vivo; panel retos pendientes/activos con «¡Va!» / «Nel»; CSS `eventos-en-vivo-*`, `retos-amigos-*`, `@keyframes feedCanalActivar`
- [x] W11-3 Android — paridad feed: eventos en vivo → racha → reto semanal → retos amigos → leaderboard
- [x] W11-4 iOS — paridad feed + animación tabs
- [x] `docs/native-parity-matrix.md` y `docs/architecture.md` actualizados

## Agentes ola 12 — Retar desde perfil + ranking semanal ✅

Objetivo: retar a alguien desde su perfil (con validación previa), notificar al retado, y mostrar quién va ganando sus duelos esta semana.

| Agente | Frente | Entrega |
|---|---|---|
| 🤖 W12-1 | API + contratos | `GET /retos/puede/:handle`, `GET /retos/ranking-semanal`; notificación in-app/push al crear y al aceptar reto |
| 🤖 W12-2 | Web delight | Botón «Retar» + modal en `perfil/[handle]`; `RetosRankingSemanal` en feed; página `/retos` para deep links |
| 🤖 W12-3 | Android delight | `PerfilAjenoScreen` botón «Retar 🔥»; `RetosRankingSemanalRow` en feed |
| 🤖 W12-4 | iOS delight | `PerfilAjenoView` botón + sheet; `RetosRankingSemanalRow` en feed |

**Checklist Wave 12**

- [x] W12-1 API — `puedePorHandle` (misma uni, seguir o comunidad compartida); `rankingSemanal` suma victorias en duelos `ACTIVO` de la semana ISO; empates no cuentan
- [x] W12-1 Contratos — `puedeRetarResponseSchema`, `retosRankingSemanalEntradaSchema`, `retosRankingSemanalResponseSchema`
- [x] W12-1 Notificaciones — al crear reto y al aceptar (`MENSAJE`, url `/retos`)
- [x] W12-2 Web — botón «⚔️ Retar» solo si `puedeRetar`; modal con `RACHA` / `SEMANA_PREGUNTA`; carril `RetosRankingSemanal`; página `/retos`
- [x] W12-3 Android — paridad perfil + feed
- [x] W12-4 iOS — paridad perfil + feed
- [x] `docs/native-parity-matrix.md` y `docs/architecture.md` actualizados
