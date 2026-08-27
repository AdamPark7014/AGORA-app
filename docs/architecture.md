# Arquitectura — Ágora

Mapa de la plataforma: qué vive dónde, cómo se conectan los clientes y qué es producción vs prototipo.

---

## Vista general

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  apps/web   │  │ apps/admin  │  │ apps/mobile │
│  Next.js 15 │  │  Next.js    │  │ Expo (proto)│
│  cookie     │  │  cookie     │  │ Bearer token│
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────────────────┐
│             │  │             │  │  apps/mobile-native      │
│             │  │             │  │  Kotlin + Compose (Android)│
│             │  │             │  │  SwiftUI (iOS) — producción │
└──────┬──────┘  └──────┬──────┘  └──────┬──────────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        │  HTTPS / JSON
                        ▼
              ┌──────────────────┐
              │    apps/api      │
              │    NestJS :4200  │
              │  /api/*          │
              └────────┬─────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
  ┌────────────┐ ┌──────────┐ ┌──────────┐
  │ @agora/db  │ │  Redis   │ │ S3 / R2  │
  │  Prisma    │ │  :6382   │ │ (media   │
  │  Postgres  │ │  caché   │ │  prod)   │
  │  :5442     │ │          │ │          │
  └────────────┘ └──────────┘ └──────────┘
```

**Flujo de datos:** Web/Admin/Mobile → API REST → Prisma → PostgreSQL. Media en disco local (dev) o S3/R2 (prod). Redis disponible para caché futuro; hoy el feed es fan-out on read directo a Postgres.

---

## Apps y su rol

| App | Stack | Puerto (dev) | Auth | Estado |
|---|---|---|---|---|
| `apps/web` | Next.js 15, PWA | `:3200` | Cookie httpOnly (`modo: 'cookie'`) | **Producción** |
| `apps/admin` | Next.js 15 | `:3300` | Cookie compartida con web (`COOKIE_DOMAIN`) | **Producción** |
| `apps/api` | NestJS 11 | `:4200` | Sesión vía cookie o Bearer | **Producción** |
| `apps/mobile-native` | Kotlin + Jetpack Compose / SwiftUI | — | Bearer token en Keychain/Keystore | **Producción** (Android ~98 %; iOS ~93 %; Wave 6 + Wave 8 gamificación ✅) |
| `apps/mobile` | Expo SDK 57 | bundler Expo | Bearer + SecureStore | **Solo prototipo** — no es la app de tienda |

---

## Paquetes compartidos (`packages/`)

| Paquete | Responsabilidad |
|---|---|
| `config` | tsconfig compartidos |
| `shared` | Catálogo UDLAP (escuelas, carreras, comunidades derivadas) |
| `contracts` | Esquemas Zod compartidos (API + clientes) |
| `auth` | OTP, sesiones, límites de envío por buzón |
| `rbac` | Roles y permisos (`moderador`, `PermisoGuard`) |
| `db` | Prisma: esquema, migraciones, seed idempotente |
| `correo` | Proveedores Brevo / Resend / console |
| `moderation` | Política de línea roja + clasificador OpenAI |
| `core` | Reglas de dominio (pendiente) |
| `ui` | Design system compartido (pendiente) |

---

## Módulos de la API (`apps/api/src/`)

Cada módulo expone controladores REST bajo `/api/`:

| Módulo | Prefijo / rutas | Función |
|---|---|---|
| `auth` | `/auth/*` | OTP solicitar/verificar, sesión, logout |
| `catalogo` | `/catalogo/*` | Escuelas, carreras, colegios para registro |
| `perfil` | `/perfil/*` | Perfil propio/ajeno, seguir, foto, preferencias |
| `directorio` | `/directorio` | Búsqueda de personas por escuela/generación |
| `posts` | `/posts/*` | Feed, publicar, reacciones, comentarios, encuestas |
| `eventos` | `/eventos/*` | CRUD eventos, asistencia voy/me interesa, **`GET /eventos/en-vivo`** (Wave 11) |
| `mensajes` | `/mensajes/*` | DM idempotente, hilos, no leídos |
| `aventones` | `/aventones/*` | Puebla–Cholula, apartar lugar |
| `marketplace` | `/anuncios/*` | Anuncios, categorías, fotos, apartado |
| `media` | `/media/*` | Subida con validación magic-bytes |
| `moderacion` | `/moderacion/*`, `/reportes/*` | Cola staff, resolver, motivo obligatorio |
| `pregunta` | `/pregunta/*` | Pregunta del día, votos ocultos hasta responder |
| `notificaciones` | `/notificaciones/*` | Lista, marcar leídas, SSE stream; tipos incluyen `INSIGNIA` (Wave 8) |
| `anonimo` | `/anonimo/*` | Zona pseudónima con alias estable |
| `bloqueos` | `/bloqueos/*` | Bloquear/desbloquear usuarios |
| `busqueda` | `/buscar` | Búsqueda global |
| `guardados` | `/guardados/*`, `/posts/:id/guardar` | Posts guardados |
| `hashtags` | `/hashtags/:tag` | Feed por hashtag |
| `push` | `/push/*` | Suscripción FCM/APNs/Expo |
| `salud` | `/salud` | Health check con ping a DB |
| `analytics` | `/analytics/evento` | Eventos de producto (auth requerida); dispara ping de racha + evaluación de badges |
| `gamificacion` | `/gamificacion/*` | Rachas diarias, badges de campus, ping de actividad, perfil público por handle, progreso semanal pregunta |
| `retos` | `/retos/*` | Retos entre amigos por racha o semana de preguntas (Wave 11–12) |
| `mantenimiento` | (cron interno) | Limpieza OTP, sesiones, avisos leídos |

**Infra transversal:** `SesionGuard`, `LimiteGuard` (por usuario, no IP), `ZodPipe`, `error.filter.ts`, helmet, throttler.

---

## Flujo de autenticación

```
Usuario ingresa @udlap.mx
        │
        ▼
POST /api/auth/otp/solicitar  →  204 (siempre, sin revelar si existe cuenta)
        │                          Código OTP por correo (o log en dev)
        ▼
POST /api/auth/otp/verificar  { email, codigo, modo }
        │
        ├─ modo: "cookie"  →  Set-Cookie httpOnly (web, admin)
        │                    Respuesta: { tienePerfil }
        │
        └─ modo: "token"   →  Sin cookie
                              Respuesta: { tienePerfil, token, expiraEn }
                              Cliente guarda token:
                                · Web/Admin: no aplica
                                · mobile-native: Keystore (Android) / Keychain (iOS)
                                · mobile (Expo): expo-secure-store
        │
        ▼
Peticiones autenticadas:
  · Web/Admin: cookie automática (credentials: include)
  · Nativo: header Authorization: Bearer <token>
        │
        ▼
¿tienePerfil === false?  →  pantalla de registro (catálogo + comunidades automáticas)
        │
        ▼
App principal (feed, etc.)
```

**Contrato fijado en pruebas:** `e2e/sesion-nativa.spec.ts` — `modo: 'token'` devuelve token en cuerpo y **no** pone cookie; `modo: 'cookie'` pone cookie y **no** devuelve token.

**Límites OTP:** por IP en solicitar/verificar (60/min) + por buzón en `@agora/auth` (1/min, 10/día). El límite general de la API es por usuario autenticado (240/min), no por IP — crítico en campus con NAT compartido.

---

## Base de datos (Prisma → PostgreSQL)

- **Multi-tenant:** `University` como raíz (hoy solo UDLAP, `emailDomain: udlap.mx`).
- **Catálogo académico:** `Escuela` → `Departamento` → `Carrera` → `Colegio`.
- **Comunidades derivadas:** al completar perfil el usuario entra en ~6 comunidades automáticas (escuela, departamento, carrera, generación, colegio, organizaciones).
- **Feed:** fan-out on read — `Post` indexado por `(communityId, createdAt)`.
- **Seed:** `pnpm db:seed` — catálogo UDLAP idempotente + datos demo (`demo-seed.ts`: ~20 usuarios, posts, DMs, eventos). Solo demo: `pnpm db:demo`.

Esquema completo: `packages/db/prisma/schema.prisma`.

---

## Clientes móviles: producción vs prototipo

### `apps/mobile-native` — producción

| Plataforma | Stack | Estado |
|---|---|---|
| **Android** | Kotlin, Jetpack Compose, Retrofit, Coil, FCM | Fases 0–4 completas (ver `docs/super-app-plan.md`) |
| **iOS** | SwiftUI, URLSession, XcodeGen | Wave 5b (~80 % matriz); verificar build en Mac |

Arquitectura Android:

```
ui/
  navigation/   AgoraNavHost.kt, deep links agora://
  screens/      una pantalla por feature
  components/   PostCard, AgoraEmptyState, etc.
data/
  api/          Retrofit + Dtos
  *Repository.kt
```

Comandos: `pnpm mobile:android:preview`, `pnpm mobile:android:verify`.

### `apps/mobile` — prototipo (Expo)

Expo SDK 57 para **probar flujos rápido** contra la API durante desarrollo. No va a tiendas. Sirve de referencia de UX para portar a `mobile-native`.

```bash
pnpm --filter @agora/mobile dev   # prototipo Expo — no producción
```

---

## Web y admin

- **Web** (`apps/web`): PWA con layout de 3 columnas. Rutas: feed, eventos, aventones, marketplace, mensajes, directorio, perfil, anonimo, ajustes, etc.
- **Admin** (`apps/admin`): subdominio propio (`admin.tudominio.mx`). Cola de moderación, historial, marcado por IA. Sesión compartida vía `COOKIE_DOMAIN`.

---

## Pruebas

| Capa | Herramienta | Ubicación |
|---|---|---|
| Unitarias | Vitest | `packages/*/*.test.ts`, `apps/api/src/**/*.test.ts` |
| E2E web/API | Playwright | `e2e/*.spec.ts` — humo, registro, moderación, contrato API, sesión nativa |
| Android build | Gradle | `scripts/verify-mobile-native.ps1` → `assembleDebug` |
| iOS build | Xcode | Manual en Mac (ver `apps/mobile-native/ios/MAC_BUILD_PLAYBOOK.md`) |
| Nativo UI | — | Sin tests instrumentados aún (⬜) |

`pnpm ci:verify` → lint + typecheck + test + build en todos los workspaces.

---

## Despliegue (producción)

- API y web: Dockerfiles multi-etapa, usuario sin privilegios, `prisma generate` en build.
- Validación de entorno al arrancar (`apps/api/src/comun/entorno.ts`).
- Media: S3/R2 obligatorio en prod (disco local solo dev).
- Correo: Brevo o Resend con dominio verificado; `MAIL_PROVIDER=console` bloqueado en prod.
- `TRUST_PROXY=true` detrás de reverse proxy.

---

## Observabilidad y analytics

### Telemetría operativa (API)

- **Logs estructurados:** `RegistroInterceptor` anota peticiones lentas y errores en cada request.
- **Health:** `GET /api/salud` con ping a PostgreSQL.
- **Errores:** `ErrorFilter` unifica respuestas JSON; los 500 no exponen detalles internos.

### Analytics de producto (sin SDK externo)

Telemetría mínima de uso, almacenada en Postgres. No hay claves de Amplitude/PostHog: los clientes envían eventos fire-and-forget a la API.

```
Web / Android / iOS
        │  POST /api/analytics/evento  (SesionGuard)
        ▼
  AnalyticsService → PrismaAnalyticsSink → analytics_events
```

| Componente | Ubicación | Rol |
|---|---|---|
| Contrato Zod | `packages/contracts` → `analyticsEventoSchema` | `nombre`, `propiedades`, `timestamp` |
| API | `apps/api/src/analytics/` | Persistencia vía `AnalyticsSink` (enchufable) |
| Modelo | `AnalyticsEvent` en Prisma | Tabla `analytics_events` |
| Web | `apps/web/lib/analytics.ts` | `track()` + helpers |
| Android | `ui/analytics/AgoraAnalytics.kt` | Singleton Retrofit |
| iOS | `UI/Analytics/AgoraAnalytics.swift` | Singleton URLSession |

**Eventos instrumentados (W5-6):** `login`, `publicar`, `dm_enviado`, `evento_asistencia`. Cada payload incluye `plataforma` (`web`, `android`, `ios`).

**Futuro:** implementar otro `AnalyticsSink` (export batch, webhook) sin cambiar clientes.

---

## Gamificación (Wave 6 + Wave 8)

Retención ligera sin gamificación pesada: racha de días consecutivos con actividad en campus, insignias desbloqueables por hitos reales, visibilidad social en perfiles ajenos y progreso semanal de la pregunta del día.

### Módulo API (`apps/api/src/gamificacion/`)

| Ruta | Función |
|---|---|
| `GET /gamificacion/mio` | Devuelve `rachaActual`, `rachaMaxima`, `badges` y `semanaPregunta` del usuario autenticado |
| `GET /gamificacion/:handle` | Gamificación pública de otro perfil (misma universidad): `rachaActual`, `rachaMaxima`, `badges`; 404 si no existe o universidad distinta |
| `GET /gamificacion/leaderboard` | Top rachas del campus (mínimo 2 días consecutivos); incluye `miPosicion` del solicitante (1-based, `null` si racha &lt; 2) |
| `POST /gamificacion/ping` | Registra actividad del día; responde `{ nuevasInsignias, gamificacion }` (idempotente si ya hubo ping hoy) |

**Disparadores de actividad:** además del ping explícito al abrir la app (web/Android/iOS), `AnalyticsService` llama a `registrarActividad` + `evaluarBadges` tras eventos de producto. También se evalúan badges al publicar (`posts`), responder pregunta del día (`pregunta`) y crear aventones.

**Corte de día:** medianoche en `America/Mexico_City` (misma lógica que pregunta del día), persistido como `@db.Date` en UTC.

### Progreso semanal pregunta (`semanaPregunta`)

Campo opcional en `gamificacionResponseSchema` (Wave 8):

```typescript
semanaPregunta?: { respondidas: number; meta: 7 }
```

Cuenta días **distintos** con `RespuestaPregunta` en la semana ISO actual (`America/Mexico_City`). Incluido en `obtener()` y en la respuesta de `ping`. Los clientes muestran barra «Esta semana: X/7 días» en el banner de pregunta del día.

### Reto semanal (`retoSemanal`, Wave 10)

Campo opcional en `gamificacionResponseSchema` — misma fuente que `semanaPregunta`, con copy de producto para el feed:

```typescript
retoSemanal?: {
  titulo: string;      // «Reto semanal: 7 preguntas»
  progreso: number;    // días respondidos esta semana
  meta: 7;
  completado: boolean; // progreso >= meta
}
```

Los clientes muestran banner en el feed con barra de progreso y confetti al completar 7/7 por primera vez en la sesión.

### Comparación con el campus (`comparacionCampus`, Wave 10)

Campo opcional en `gamificacionResponseSchema` (solo en `obtener()` / `ping`, no en perfil ajeno):

```typescript
comparacionCampus?: {
  promedioRacha: number;       // AVG(rachaActual) usuarios activos misma universidad, racha > 0
  tuRacha: number;
  porEncimaDelPromedio: boolean;
}
```

UI: chip «Tu racha vs campus: 🔥 X vs promedio Y» en panel de racha propia.

### Posición en leaderboard (`miPosicion`, Wave 10)

Campo opcional en `leaderboardResponseSchema`:

```typescript
miPosicion?: number | null;  // rank 1-based por rachaActual en campus; null si rachaActual < 2
```

Los clientes guardan la última posición en almacenamiento local y animan (pulse / scale) cuando el nuevo rank es **menor** (mejor puesto).

### Insignia `SEMANA_PERFECTA` (Wave 10)

| Código | Condición | Etiqueta | Emoji |
|---|---|---|---|
| `SEMANA_PERFECTA` | 7 días distintos respondiendo pregunta en la semana ISO actual | Semana perfecta | ⭐ |

Se evalúa en `evaluarBadges` tras responder pregunta del día (cuando `semanaPregunta.respondidas >= 7`).

### Notificación `INSIGNIA` (Wave 8)

Al otorgar una insignia nueva en `evaluarBadges`, la API crea notificación in-app (y push si el usuario lo permite):

| Campo | Valor |
|---|---|
| `tipo` | `INSIGNIA` (`TipoNotificacion` en Prisma) |
| `texto` | `mensajeNuevaInsignia(codigo)` — p. ej. «¡Nueva insignia! 🌅 Madrugador — 7 días seguidos en el campus» |
| `url` | `/perfil/mio` |

Preferencias de aviso: in-app ✅ por defecto; push según ajustes del usuario (mismo patrón que `SEGUIDOR`, `MENCION`, etc.). Clientes nativos muestran overlay de celebración (`InsigniaCelebracionHost` / `InsigniaCelebracionOverlay`) además del aviso en bandeja.

### Almacenamiento de rachas (Prisma)

| Modelo | Tabla | Campos clave |
|---|---|---|
| `UserStreak` | `user_streaks` | `rachaActual`, `rachaMaxima`, `ultimoDiaActivo` (1 fila por usuario) |
| `UserBadge` | `user_badges` | `codigo`, `otorgadoAt`; unique `(userId, codigo)` |

Lógica de racha: si `ultimoDiaActivo` fue ayer → incrementa; si no → reinicia a 1; si ya es hoy → no-op.

### Códigos de badge (`packages/contracts`)

Definidos en `BADGE_CODIGOS` / `BADGES_CAMPUS` — catálogo compartido API + clientes:

| Código | Condición | Etiqueta | Emoji |
|---|---|---|---|
| `PREGUNTA_7` | 7 días distintos respondiendo pregunta del día | 7 días de pregunta | 💬 |
| `AVENTONERO` | ≥ 3 aventones publicados como conductor | Conductor de confianza | 🚗 |
| `EARLY_BIRD` | racha actual ≥ 7 días | Madrugador | 🌅 |
| `SOCIAL` | ≥ 10 publicaciones | Voz del campus | 📣 |
| `SEMANA_PERFECTA` | 7/7 preguntas respondidas en la semana ISO actual | Semana perfecta | ⭐ |

### Clientes

| Plataforma | UI propia | Perfil ajeno (Wave 8) | Delight asociado |
|---|---|---|---|
| Web | `RachaBadges`, `RetoSemanal`, `LeaderboardRachas`, `EventosEnVivo`, `RetosAmigos`, `RetosRankingSemanal`, `pingGamificacionSiNecesario`, `gamificacionPorHandle` | Insignias + racha en `perfil/[handle]`; compartir racha (`navigator.share`); botón «Retar» con modal tipo | Confetti CSS en pregunta y reto semanal; chip racha vs campus; animación al subir en leaderboard; progreso semanal; doble toque en galería → `ME_LATE`; carril eventos en vivo; duelos amigos; ranking semanal retos; animación tabs feed |
| Android | `RachaBadgeRow`, `GamificacionProfileSection`, share intent (≥ 2 días) | `GamificacionPublicSection` en `PerfilAjenoScreen` | `ConfettiOverlay`, `InsigniaCelebracionHost`, progreso en `PreguntaDelDiaBanner`, double-tap en `PostMediaGrid` |
| iOS | `RachaBadgeRow`, `GamificacionProfileSection`, `ShareLink` (≥ 2 días) | `GamificacionPublicSection` en `PerfilAjenoView` | `ConfettiView`, `InsigniaCelebracionOverlay`, progreso en `PreguntaDelDiaBanner`, double-tap + `FloatingHeartOverlay` en `PostCardView`, `EventosEnVivoBanner`, `RetosAmigosRow`, fade tabs |

---

## Eventos en vivo + retos amigos (Wave 11)

Contexto campus en tiempo real y gamificación social 1:1 entre personas que se conocen en Ágora.

### Eventos en vivo (`GET /eventos/en-vivo`)

| Query | Default | Descripción |
|---|---|---|
| `horas` | `4` | Ventana hacia adelante (1–48 h) |

Respuesta (`enVivoResponseSchema`):

```typescript
eventos: Array<{
  id: string;
  titulo: string;
  inicioAt: Date;
  lugar: string;
  vanAIr: number;
  empiezaEnMinutos: number;  // 0 si ya en curso
  enCurso: boolean;
}>
```

Incluye eventos **en curso** (`inicioAt <= ahora` y `finAt >= ahora` o sin `finAt`) y los que **empiezan dentro de la ventana**. Filtrados por universidad y comunidades del usuario (misma lógica de visibilidad que el listado general). Helpers en `apps/api/src/eventos/eventos-en-vivo.ts`.

UI web: carril horizontal `EventosEnVivo` en el feed con badges «🔴 En vivo», «⏱ En X min», etc.

### Retos entre amigos (`/retos/*`)

| Ruta | Función |
|---|---|
| `POST /retos` | Crear reto `{ retadoHandle, tipo: 'RACHA' \| 'SEMANA_PREGUNTA' }` |
| `GET /retos/activos` | `{ pendientes, activos }` — pendientes solo para quien fue retado |
| `POST /retos/:id/responder` | `{ aceptar: boolean }` — activa o rechaza |

**Reglas:** misma universidad; no bloqueos; solo si sigues al retado o comparten comunidad; un reto `PENDIENTE`/`ACTIVO` por par retador→retado; puntajes en tiempo real vía `GamificacionService.puntajeReto(tipo)`.

Modelo Prisma `RetoAmigo` (`retos_amigos`): `retadorId`, `retadoId`, `tipo`, `estado`, `activadoAt`.

UI web: `RetosAmigos` con tarjetas «Te retaron» (botones «¡Va!» / «Nel») y duelos activos «Tú X vs @rival Y». Helpers en `apps/web/lib/retos.ts`.

### Animación tabs del feed (web)

Clase `.feed-canales--animado` en los filtros del feed (campus / siguiendo / comunidades). Al cambiar tab activo, `@keyframes feedCanalActivar` hace un micro-scale en la pastilla seleccionada; respeta `prefers-reduced-motion`.

Nativo: Android `AnimatedContent` en `MainShell` (fade 150 ms entre tabs); iOS equivalente en tab content.

---

## Retar desde perfil + ranking semanal (Wave 12)

Extiende Wave 11 con descubrimiento social (retar desde perfil ajeno) y leaderboard de duelos ganados en la semana ISO.

### Endpoints adicionales (`/retos/*`)

| Ruta | Función |
|---|---|
| `GET /retos/puede/:handle` | `{ puedeRetar, motivo? }` — misma universidad; debe seguir o compartir comunidad |
| `GET /retos/ranking-semanal` | `{ entradas: [{ handle, nombre, fotoUrl, victorias }] }` — top victorias en duelos `ACTIVO` activados esta semana ISO |

Query `limite` en ranking (default 5, max 50). Empates en duelo no suman victoria. Filtrado por universidad del viewer.

### Notificaciones de retos (Wave 12)

Al crear o aceptar un reto, la API crea notificación in-app (y push si el usuario lo permite):

| Evento | `tipo` | `url` | Texto (ejemplo) |
|---|---|---|---|
| Te retaron | `MENSAJE` | `/retos` | «María López te retó a duelo de racha. ¿Le entras? 🔥» |
| Aceptaron tu reto | `MENSAJE` | `/retos` | «Juan Pérez aceptó tu reto de semana de preguntas. ¡Que gane el mejor! 🔥» |

Nativo: deep link `/retos` abre el feed con la sección de duelos (Android/iOS mapean a tab feed).

### UI web

| Componente | Ubicación | Comportamiento |
|---|---|---|
| Botón «⚔️ Retar» | `perfil/[handle]` | Visible solo si `puedeRetar`; modal con selección `RACHA` / `SEMANA_PREGUNTA`; llama `POST /retos` y dispara `EVENTO_REFRESH_RETOS` |
| `RetosAmigos` + `RetosRankingSemanal` | `/retos` | Destino de notificaciones push/in-app; mismos paneles que en feed |
| `RetosRankingSemanal` | Feed (tras `RetosAmigos`) | Carril horizontal con medallas y victorias de la semana |
| `lib/retos.ts` | Cliente | `puedeRetar`, `rankingSemanal`, `crearReto` (ya existía) |

### UI nativa

| Plataforma | Perfil ajeno | Feed |
|---|---|---|
| Android | `PerfilAjenoScreen` — `GET /retos/puede/:handle`, botón «Retar 🔥», dialog tipo | `RetosRankingSemanalRow` tras `RetosAmigosRow` |
| iOS | `PerfilAjenoView` — sheet tipo reto | `RetosRankingSemanalRow` tras `RetosAmigosRow` |

CSS: `retos-ranking-semanal-*`, `modal-reto-opcion` en `globals.css`.

---

## Documentos relacionados

- [`docs/super-app-plan.md`](super-app-plan.md) — roadmap mobile-native por fases
- [`docs/native-parity-matrix.md`](native-parity-matrix.md) — paridad pantalla por pantalla
- [`docs/estandares-interfaz.md`](estandares-interfaz.md) — guía visual
- [`README.md`](../README.md) — arranque, correo, moderación, decisiones de producto
