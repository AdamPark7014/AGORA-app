# ÁGORA 2.0 — Plan técnico de Fase 0 y Fase 1

Fuente: auditoría del 07-10-2026 (backend, web, móvil) + mandato "ÁGORA 2.0".
Regla: incremental, sin reescrituras, cada cambio con pruebas y sin romper
web / Android / iOS. Fases 2+ **no** se implementan hasta cerrar estas dos.

Orden acordado con Adam: **P0 inmediato → después Home "Ahora en UDLAP" + push
+ analytics con prioridad máxima** (Fase 2 arranca en cuanto Fase 0 cierre; la
Fase 1 se intercala por piezas que el loop necesita: PostCard, navegación,
contenido primero).

---

## 1. Mapa de dependencias (lo que toca cada pieza)

```
@agora/contracts (Zod) ──► apps/api (NestJS, 1 AppModule)
        │                        │  Prisma ► Postgres 17 · Redis (throttle)
        │                        │  SSE en memoria (avisos, chat)
        ▼                        ▼
 apps/web (Next 15)       REST /api ◄── apps/mobile-native/android (Retrofit, Dtos.kt)
 apps/admin (Next)                  ◄── apps/mobile-native/ios (URLSession, AppModels.swift)
```

- Los **contratos Zod** solo los consumen API, web y admin. Android e iOS
  duplican los DTOs a mano (`Dtos.kt`, `AppModels.swift`): todo cambio de forma
  de respuesta debe ser **aditivo** (Moshi y Codable ignoran campos nuevos).
- `aVistaPost` (`apps/api/src/posts/vista-post.ts`) es el único mapeo de
  publicación: lo usan feed, detalle y guardados. Búsqueda, hashtags y perfil
  tienen mapeos propios (deuda: unificar en Fase 1).
- `SesionGuard` acepta cookie (web) y Bearer (nativas); `BAJA` y sesión
  borrada → 401 → los tres clientes ya manejan "sesión expirada".

## 2. Qué existe y qué hay que crear

| Pieza del mandato | Existe | Falta |
|---|---|---|
| Anonimato garantizado | Zona `/anonimo`, alias estable | ✅ hecho (ver §4) |
| Borrar cuenta | Estado `BAJA` en el enum, nada más | ✅ API, web, Android · iOS sin compilar |
| RBAC | `PermisoGuard`, 7 roles / 16 permisos | ✅ suspender exige admin |
| Seed seguro | — | ✅ |
| Cupos sin carrera | — | ✅ |
| Búsqueda sin retirados | ILIKE + trigram | ✅ eventos/anuncios; ⬜ bloqueados en posts |
| Media (thumbs, cuota, huérfanos, moderación) | Validación por magic bytes; `thumbUrl/ancho/alto` en esquema, vacíos | ⬜ todo |
| Push | Servidor completo (Web Push, FCM, APNs) | ⬜ credenciales reales, iOS no registra |
| Analytics | `AnalyticsEvent` + `/analytics/evento` | ⬜ taxonomía, D7 roto (Fase 2) |
| PostCard | 6 copias en web; `PostCard.kt` / `PostCardView.swift` | ⬜ Fase 1 |
| "Ahora en UDLAP" | `/eventos/en-vivo`, `/hashtags` trending, aventones, anuncios | ⬜ Fase 2 (agregador) |

### Endpoints reutilizables para Fase 1–2 (sin crear API nueva)

- `GET /eventos/en-vivo`, `GET /eventos` → bloque "empieza pronto".
- `GET /hashtags/trending` (o equivalente en `hashtags.controller.ts`) → tendencias.
- `GET /aventones?sentido=` → "N aventones hoy".
- `GET /anuncios` → marketplace reciente.
- `GET /directorio?carrera=` → gente de tu carrera.
- `GET /gamificacion/mio` → racha/insignias (hoy se pide 4× por carga: deduplicar).
- `GET /pregunta/hoy` → pregunta del día.

Fase 2 sí necesitará **un** endpoint agregador (`GET /ahora`) para no hacer 6
peticiones al abrir; se diseña ahí, no ahora.

## 3. Modelos y migraciones

Fase 0 **no requirió migraciones** (todo cabía en el esquema actual).

Previstas (no aplicadas todavía):

| Migración | Para | Fase |
|---|---|---|
| `TipoNotificacion += AVENTON_CANCELADO` | avisar a pasajeros | 0/2 |
| `Media.procesadoAt`, uso real de `thumbUrl/ancho/alto` | thumbnails | 0 |
| índices `reports(postId)`, `reports(commentId)` | `yaReporto`, cola | 0 |
| `UserStreak` congelación (`congeladaHasta`) | rachas justas | 2 |
| `AnalyticsEvent(nombre, createdAt)` ya existe; retención | analytics | 2 |

## 4. Fase 0 — Trust & Safety (estado)

| # | Ítem | Estado | Commit / notas |
|---|---|---|---|
| 0.1 | Desanonimización (`GET /posts/:id`, guardados, tarjeta pública, editar) | ✅ | `71658c6` — `aVistaPost` devuelve `autor:null` + `alias` en anónimas; editar anónima → 400; tarjeta pública sin texto anónimo. Unit + e2e |
| 0.2 | RBAC suspender | ✅ | `bac6502` — `resolver` exige `USUARIO_SUSPENDER`; `/auth/yo.puedeSuspender`; web/admin esconden el botón |
| 0.3 | Seed peligroso | ✅ | `bac6502` — demo no corre con `NODE_ENV=production` sin `SEED_DEMO=true`; sin super_admin por omisión |
| 0.4 | Búsqueda con retirados / comunidades ajenas | ✅ | `bac6502` |
| 0.5 | Cupos eventos / aventones | ✅ | `4fc2af8` — `SELECT … FOR UPDATE` en transacción |
| 0.6 | Borrar cuenta — API + web | ✅ | `ffee1d3` — `POST /cuenta/eliminar` |
| 0.7 | Borrar cuenta — Android + iOS | ✅ / ⚠️ | `7c0e6dc` — Android compilado (`assembleDebug`); iOS escrito, **sin compilar** (requiere Mac) |
| 0.8 | iOS: reportar publicación | ⬜ | requisito App Store (UGC) |
| 0.9 | iOS: `PushRegistration.registerIfNeeded()` nunca se llama | ⬜ | llamarlo tras login con permiso en contexto |
| 0.10 | Android: `usesCleartextTraffic` en release | ✅ | `7c0e6dc` — `manifestPlaceholders`: `true` solo en debug |
| 0.11 | Media: thumbnails + dimensiones (sharp), cuota por usuario, limpieza de huérfanos | ⬜ | `media.controller.ts`, `almacen.ts`, `MantenimientoService` |
| 0.12 | Media: moderación de imágenes | ⬜ | OpenAI `omni-moderation` acepta imagen; mismo `@agora/moderation` |
| 0.13 | Seguidores ignoran visibilidad `COMUNIDADES` | ⬜ | `perfil.service.ts` |
| 0.14 | Silenciar ≠ bloquear en el feed | ⬜ | `posts.service.ts` filtra `soloSilencio` en ambos sentidos |
| 0.15 | Credenciales push reales + `assetlinks.json` SHA + AASA TEAMID | ⛔ Adam | no se inventan; requiere consola Firebase / Apple |
| 0.16 | iOS: build real en Mac + TestFlight | ⛔ Mac | no se declara listo sin build |

### Decisiones de Fase 0 que conviene no re-litigar

- **Baja = anonimizar en sitio**, no borrar la fila: reportes, acciones de
  moderación y alias siguen referenciando el id (responsabilidad sin safe
  harbor en México). Se borra todo lo que identifica a la persona; queda un
  HMAC del correo en `audit_logs` para requerimientos legales.
- **Los mensajes del usuario dado de baja también se ocultan** (privacy by
  design). Si producto prefiere conservarlos para la otra parte, es una línea
  en `cuenta.service.ts`.
- Contador `numComments` no se recalcula al ocultar comentarios de una baja
  (deuda menor, se corrige con el recálculo de contadores de Fase 7).

## 5. Fase 1 — Foundation UX (plan exacto)

Orden por dependencia; cada paso es un commit verificable.

### Web (`apps/web`)

1. **Navegación nunca se pierde.** `lib/rutas.ts`: separar `esRutaPublica`
   (sin sesión) de `tienePreviewPublica` (post/perfil/evento/anuncio). `Marco`,
   `BarraInferior` y `Encabezado` montan la navegación si **hay sesión**,
   aunque la ruta tenga preview. Prueba: humo e2e con sesión en `/publicacion/:id`.
2. **Deep link sobrevive al login.** `app/page.tsx` lee `?siguiente=` (solo
   rutas internas que empiecen con `/`, sin `//`) y redirige ahí tras verificar.
3. **`PostCard` único** (`componentes/post-card.tsx`): cabecera (avatar,
   nombre/alias, comunidad, tiempo), texto con menciones, media (carrusel),
   encuesta, barra de acciones **reaccionar · comentar · compartir** + menú
   `•••` (guardar, reportar, editar/borrar propio, retirar staff). Reemplaza las
   6 copias (feed, detalle, guardados, hashtag, perfil, buscar). `REACCIONES`,
   `MOTIVOS_REPORTE` y subida de media a `lib/`.
4. **Contenido primero en el feed.** Sacar los 8 widgets de encima del
   compositor: en móvil, una sola tira compacta ("Tu racha · Reto · Pregunta")
   que abre un sheet; en escritorio, al carril derecho. Desmontar (no ocultar
   con CSS) los carriles en móvil para eliminar peticiones duplicadas.
5. **Primitivas UI**: `Sheet`/`Modal` con foco atrapado y Escape, `Toast`
   global (reemplaza `<p className="nota">` sueltos y `confirm()`).
6. **Iconografía**: solo Lucide en UI (emojis quedan para contenido y
   reacciones con etiqueta).
7. **Tokens**: subir `--texto-tenue` a ≥ 4.5:1; mover estilos inline del
   feed/perfil/detalle a clases (objetivo: −50 % de `style={{}}` en Fase 1).
8. **Skeletons y error states** donde faltan: aventones, marketplace,
   guardados (error), hashtag (error), historial admin.

### Android (`apps/mobile-native/android`)

1. `ApiClient`: un solo `OkHttpClient`/`Retrofit` (singleton) con caché HTTP.
2. Estado que sobrevive a volver atrás: `ViewModel` para `MainShell` (pestaña)
   y `FeedScreen` (lista + cursor). Solo donde aporta; sin Hilt.
3. Tema oscuro (`darkColorScheme` con los mismos tokens semánticos que web).
4. Avatar con foto (`AutorDto.fotoUrl` ya llega).
5. Permiso de notificaciones en contexto (no al arrancar).
6. Feed: banners → una tira compacta, igual que web.

### iOS (`apps/mobile-native/ios`)

1. Caché de imágenes (`URLCache` dimensionado + vista con caché propia).
2. Colores semánticos con variante oscura (`AgoraDesign.swift`).
3. Video: MIME real por tipo + `VideoPlayer`; carrusel de todos los adjuntos.
4. Renombrar `ScreenStubs.swift` → archivos por pantalla (sin cambiar lógica).

### Criterio de "hecho" de Fase 1

Cada pantalla tocada: loading, empty, error, foco/teclado, lector de pantalla,
responsive, analytics del evento principal, prueba (e2e web o unit nativo).

## 6. Riesgos de regresión

| Riesgo | Mitigación |
|---|---|
| Cambiar forma de `VistaPost` rompe nativas | Solo campos **aditivos**; `autor` ya era nullable en los 3 clientes |
| Transacciones con `FOR UPDATE` en tablas mal nombradas | Verificado contra DDL de migraciones (`aventones`, `eventos`, columna `id`) |
| `BOOTSTRAP_SUPERADMIN_EMAIL` sin default | CI lo declara; local ya tiene el rol en BD; `pnpm rol` como respaldo |
| Otro agente en el mismo checkout | Commits pequeños, `git pull --rebase --autostash`, archivos distintos |
| e2e no ejecutadas en este turno (Docker apagado) | Correr `npx playwright test anonimo cuenta` con Docker arriba antes de deploy |
