# RELEVO

- **Último turno:** claude-code (sesión de móvil, en la compu de Adam)
- **Fecha:** 2026-10-26
- **Rama:** main

## Android, diseño D (sesión de móvil, 26-10)

Hecho según `docs/diseno-d.md`. Compila, `testDebugUnitTest` 44/44 y recorrido completo en el emulador
contra la API local (claro y oscuro, alta de cuenta nueva incluida).
- **Play, prueba interna (26-10 11:33 MX):** versión **4 (1.0.0)** publicada y «Disponible para testers
  internos» (corrida «Android · Play» 40364738369 con `-f build=4`; en Play solo existía la 1, las 2 y 3
  nunca se subieron). El AAB de 12.4 MB pasaba el tope de 10 MB de la subida por navegador: se subió una
  copia sin el mapa de R8, vuelta a firmar con la llave de subida (5.7 MB). Por eso Play avisa «sin archivo
  de desofuscación» y «sin símbolos nativos» (no bloquean). El siguiente versionCode libre es **5**.
- **Base:** tokens D en `ui/theme` (colores claro/oscuro, radios, márgenes 18/14/12), Bricolage Grotesque
  700–800 y Outfit 400–700 empaquetadas en `res/font` (estáticas de Google Fonts, licencias OFL en
  `apps/mobile-native/android/licencias-fuentes/`), avatar cuadrado redondeado con tono por persona, piezas
  compartidas en `ui/components/DisenoD.kt`. Desugaring activado (`java.time` con minSdk 24 tronaba en Android 7).
- **Navegación:** barra oscura flotante (Inicio, Clips, Publicar naranja, Eventos, Campus); `PestanaBus` ahora
  0..4. Avisos y mensajes pasaron al encabezado de Inicio; la pestaña Campus abre Mercado, Aventones,
  Directorio, Sin nombre y Más. En Clips la barra se aclara y la hora va en claro sobre el negro.
- **Pantallas:** Inicio (encabezado con racha, segmento Campus/Mi carrera/Siguiendo, «Ahora en el campus» con
  eventos y aventones, pregunta relámpago oscura, «Tu día» sin la pregunta ni lo en vivo, clips tras la 3.ª
  publicación y mini evento tras la 7.ª), tarjeta de publicación con banda de comunidad y reacciones por tipo
  (también en el detalle), Clips a pantalla completa (media3), evento con portada, «quién va», Cómo
  llegar/Aventones y barra fija, lista de eventos, perfil ajeno y propio (racha solo en las cifras), mercado en
  cuadrícula, Más con íconos de línea, estados vacíos y «Sin nombre» sin emojis, registro en 4 pasos con
  buscador de carrera.
- **Permiso de avisos:** ya no se pide al arrancar; solo en el último paso de la bienvenida y en Ajustes
  («Avisos en este teléfono»). El orden de alta ahora es registro → bienvenida. Verificado en el emulador.
- **Sin datos en la API (no se inventan):** semana del semestre, generación del autor en la tarjeta, duración
  y vistas de clips, evento ligado a un clip, «Seguir» en clips (falta `yoLeSigo` en el autor del feed),
  comunidades en común, pestañas Eventos/Aventones del perfil, conteo «N de tu generación» del registro.
- **Pendiente:** el seed de demo sigue sin videos (la fila de clips y Clips salen vacíos en local); iOS dice
  «Bienvenido de vuelta» en `AgoraDesign.swift` (género fijo; es de la sesión de iOS).

## iOS 1.0.0 (5) salió rota: barra de pestañas sobre toda la pantalla (26-10)

Adam la vio en su iPhone: la píldora oscura de la D ocupaba toda la pantalla y abajo se asomaba la barra
nativa. Dos causas: (1) la barra va en `safeAreaInset` y sus figuras no tenían alto fijo
(`minHeight: 48`), así que crecían hasta llenar el espacio; (2) con el SDK de iOS 26 (TestFlight) la barra
nativa de `TabView` ya no se oculta con `.toolbar(.hidden, for: .tabBar)`. `ios-capturas.yml` ya estaba en
rojo con capturas que mostraban el fallo y no se revisó: ese fue el error de proceso.
- **Arreglo:** `MainTabView` deja `TabView` por un contenedor propio (`pestana(n)`: monta cada pestaña al
  visitarla y la deja viva, oculta y fuera de VoiceOver si no es la activa); botones de la barra con
  `frame(height: 48)` y `fixedSize` vertical.
- **Para no repetirlo:** `ios-testflight.yml` se niega a subir si la última corrida de `ios-capturas.yml` en
  main no está en verde o si el código de iOS cambió desde ella (`sin_capturas` solo con orden de Adam);
  `ios-capturas.yml` usa el Xcode más reciente (el SDK de TestFlight). Regla en `AGENTS.md`: mirar las
  capturas con sesión del mismo commit antes de subir a tiendas.
- **Tema claro por omisión** (Adam): iOS `AgoraTema.porOmision = .claro` (quien eligió algo en Ajustes lo
  conserva); web: el script del `<head>` solo pone oscuro si `agora:tema` es `dark`, o `system` con el
  sistema en oscuro. Android: se le pidió a la sesión de móvil.

## Rediseño D (aprobado por Adam el 23-10, «si confirmado», relayado por la sesión principal)

Guía única para las tres plataformas: `docs/diseno-d.md` (tokens claro/oscuro, componentes, pantallas,
contrato). Reparto: API, web e iOS en esta sesión; Android en la sesión de móvil.
- **API (aditiva):** `reacciones` por tipo en feed, detalle y guardados (una `groupBy` por página);
  `GET /feed?tipo=clips` (solo publicaciones con video); `asistentes` (hasta 5, primero a quien sigues, sin
  bloqueados) en `GET /eventos` y `/eventos/:id`; `seguidoresEnComun` + `numSeguidoresEnComun` en
  `GET /perfil/:handle`. Pruebas en `comun/personas.test.ts` y `posts/vista-post.test.ts` (API 274+).
- **Pendiente:** el seed de demo no tiene fotos ni videos, así que los clips salen vacíos en local y en
  las capturas.
- **Web D construida (26-10, este commit; sin desplegar todavía).** Estilos de la D en
  `apps/web/app/diseno-d.css` (cargado después de `globals.css`, que ya tiene los tokens). Hecho:
  - Tarjeta de publicación: banda de comunidad (enlace al filtro), chips de reacción con número, pie con
    comentarios + Comentar/Compartir/Guardar, fotos con esquinas dentro de la tarjeta, sin emojis
    (Guardar y el corazón del doble toque son íconos). Avatares cuadrados redondeados en toda la web.
  - Inicio (`feed/page.tsx` + `componentes/inicio-d.tsx`): encabezado con fecha, segmento
    Campus / Mi carrera / Siguiendo (las demás comunidades quedan como chips), «Ahora en el campus»
    (`/eventos/en-vivo?horas=3`), pregunta relámpago oscura (tu carrera contra el campus), compositor
    plegado en el teléfono, fila de clips tras la 3.ª publicación y mini evento con «Voy» tras la 7.ª.
    `INICIO_SEMESTRE` está en null a propósito: no hay fecha oficial del semestre; con ella sale «semana N».
  - Navegación: píldora oscura flotante en el teléfono (Inicio, Clips, Publicar, Eventos, Campus→/mas);
    Mensajes con contador pasó al encabezado. Menú izquierdo: Inicio, Clips, Mercado.
  - `/clips` nuevo: visor vertical a pantalla completa (en el teléfono va en un portal a `<body>`: la
    transición de página con transform dejaba el `position: fixed` en cero), pestañas Mi carrera/Campus,
    Me late, comentarios, Enviar, Guardar, sonido. Probado con un clip sintético solo en la base local.
  - Evento: portada por tipo (la API no guarda imagen), bloque de fecha, quién va con avatares, Cómo llegar
    (Maps) y Aventones, organizador con Mensaje y barra oscura fija (Calendario .ics, Me interesa, Voy).
  - Perfil: solo Seguir y Mensaje a la vista; Retar/Silenciar/Bloquear en «…» (reportar perfil no existe
    en la API); «Lo siguen X e Y»; pestañas Publicaciones/Fotos/Información.
  - Mercado: buscador, chips de categoría, cuadrícula de 2 columnas con precio sobre la foto e ícono de
    categoría si no hay foto. Registro: buscador de carrera sobre las 52 (elige también la escuela) y
    generación con botones; las e2e (`registro-y-feed`, `capturas`, `humo`) ya usan el buscador y los radios.
  - Quitado: `componentes/eventos-en-vivo.tsx` (lo reemplaza «Ahora en el campus»).
  - Verificado: tsc, eslint del repo, `pnpm test` 16/16 tareas, capturas teléfono claro/oscuro y escritorio
    de inicio, clips, evento, perfil, mercado y registro. `format:check` falla igual sin estos cambios
    (no hay configuración de Prettier; truena en `packages/config`).
  - Falta de la D en web: registro paso a paso con barra de progreso, bienvenida con «Activar avisos»,
    «N de tu generación ya están aquí» y vistas en clips (no hay datos en la API).
  - **Desplegado** `d49531e` en udlagora.com el 26-10 (API con reacciones/clips/asistentes y web D;
    smoke OK; rollback `prev-20261026-1037`).
- **iOS D, paso 1 (26-10, sin compilar en local: lo compila `ios.yml`).** `AgoraDesign` con los tokens de
  la D (fondo cálido, `naranjaTinta`, `superficie2`, `oscuro`, `vivo`; radios tarjeta 22, foto 16, botón 14,
  chip 12, avatar 14). `PostDto`/`PostDetalleDto.reacciones`; `ReaccionesRow` son chips con nombre y número
  (sin emojis; sin conteos por tipo dice el total); `PostCardView` con banda de comunidad, avatar cuadrado,
  fotos con esquinas y pie Comentar/Compartir/Guardar; corazón del doble toque como ícono.
- **iOS D, paso 2 (26-10).** Barra de pestañas como píldora oscura flotante con Publicar en naranja
  (mismos 5 destinos e identificadores `tab.0…4`: las pruebas de UI los usan; «Feed» se llama «Inicio»).
  Inicio: fecha, segmento Campus / Mi carrera / Siguiendo con las demás comunidades como chips, «Ahora en
  el campus» (`EventosEnVivoBanner`), pregunta relámpago oscura con barras y tu carrera contra el campus,
  y la gamificación (racha, retos, ranking, tips, pulso) plegada en «Tu día» (`@AppStorage`).
- **iOS D, paso 3 (26-10).** `AvatarD` (cuadrado redondeado, iniciales o foto). Evento: portada por tipo
  con bloque de fecha, etiqueta tipo · comunidad, quién va con avatares (`EventoDetalleDto.asistentes`),
  Cómo llegar (Mapas), organizador y barra oscura fija con Me interesa / Voy. Mercado: buscador, «Vender»,
  chips de las 7 categorías y cuadrícula de 2 columnas con precio sobre la foto e ícono si no hay foto.
  Perfil: portada con avatar 88 montado, Seguir y Mensaje a la vista, «…» con Retar/Silenciar/Bloquear,
  línea @handle · carrera · Gen · ciudad, chips con «Busca:», cifras con racha y «Lo siguen X e Y»
  (`PerfilAjenoDto.seguidoresEnComun`).
- **iOS D, paso 4 (26-10).** Registro: buscador de carrera (`registro.buscarCarrera`, sin acentos, con la
  coincidencia resaltada) en vez de la lista de las 52, y generación con botones. `CapturasTiendaUITests`
  escribe «Ingenier» en el buscador antes de tocar la carrera.
- **iOS D, paso 5 (26-10).** `ClipsView` (`AppRoute.clips`): videos a pantalla completa sin controles y
  en bucle (`AVQueuePlayer` + `AVPlayerLooper`), solo corre el visible, sonido apagado por omisión,
  pestañas Mi carrera / Campus, Me late con número, comentarios y Enviar. En iOS 16 no hay paginado
  vertical nativo: se pasa de clip de lado (`TabView` .page). `FilaClips` en el inicio (se esconde sin
  videos) y `AgoraApi.feed(tipo:)`.
- **iOS D verificado:** `ios.yml` en verde con los cinco pasos (run 40364073126 sobre `5b9f77f`:
  simulador y pruebas-ui).
- **TestFlight 1.0.0 (5) con la D (26-10, por orden de Adam):** `ios-testflight.yml` run 40368106784 sobre
  `d987ae7`; Apple lo procesó (VALID, cifrado exento ya declarado) y lo ve el grupo interno «Equipo
  Ágora» (acceso a todos los builds, 1 probador). Sin probar a mano todavía. Consulta de builds por API:
  llave ASC de `secrets/arta-ios` (la de ARTA/NEXARA sirve para Ágora). Pendiente de iOS: tipografía
  Bricolage/Outfit empaquetada (hoy usa la del sistema, que la guía permite como respaldo).

## Pasada de profesionalismo del 23-10 (en curso)

Adam: «mejora y profesionaliza aún más… noto muchas cosas de UI/UX y funciones nada profesionales».
Reparto: esta sesión lleva **web e iOS**; la sesión de móvil lleva **Android** desde `55fe226`.
- **Capturas reales** de las 21 pantallas web (teléfono claro/oscuro y escritorio) y de iOS (artefacto de
  `ios-capturas.yml`). Hallazgos de la web en manos de un agente: chat con el campo aplastado, «Choose File»
  en Ajustes, avatar recortado, adorno roto en Aventones, hidratación en modo oscuro (4 rutas), vacíos que
  salen mientras carga, hashtags partidos, «Sin nombre» explicando configuración interna, retos sin estado
  vacío y el registro con correo personal sin mostrar el UDLAP.
- **Mockups para que Adam elija** (https://claude.ai/artifact/FWFgnBnjxfAT9HTojpUDuU): feed A/B/C/D, clips a
  pantalla completa, evento, perfil, mercado, registro y bienvenida. A Adam le gustaron el feed B y los clips
  y pidió «más profesional, que no parezca copia de Instagram»; la D es la propuesta con identidad propia.
  Adam confirmó la D el 23-10 (ver la sección de arriba).
- **iOS (este commit, sin compilar en local: lo compila `ios.yml`)**: «✓ Vas en este» / «✓ Vas a ir» con
  pista de VoiceOver, plurales en el perfil (`cuenta()`), y en el registro con correo personal la tarjeta
  «Vamos a confirmar <correo UDLAP>» con «Cambiar» (id `personal.cambiarUdlap`), con el error de buzón
  inexistente ahí y no debajo del Gmail. Android ya lo tiene (`55fe226`).
- **Web, 11 arreglos (agente, verificados con capturas antes/después):** chat con campo completo que crece;
  «Cambiar portada»/«Cambiar foto»/«Agregar fotos» en vez de «Choose File»; avatar con anillo y
  iniciales centradas; ruta Puebla–Cholula y asientos con ícono en Aventones; sin errores de hidratación
  en oscuro (el botón de tema leía `document` al pintar); esqueleto / vacío / error con «Reintentar» en
  todas las listas (ya no sale «Sin publicaciones» ni «Nada agendado» mientras carga); hashtags en línea;
  «Sin nombre abre pronto»; retos con estado vacío; Más con íconos de línea y fila «Apariencia»; registro
  con correo personal mostrando el UDLAP con «Cambiar». Seed: «Ximena creó un evento».

## Android, pasada de profesionalismo (sesión de móvil, 23→26-10)

Android es de la sesión de móvil desde `55fe226`. Auditoría de toda `ui/**` (3 agentes, ~200 hallazgos) y
arreglos en 68 archivos sin cambiar el diseño aprobado. Compila y `testDebugUnitTest` 44/44.
- **ANR al arrancar** (la otra sesión lo vio con `pm clear`): `MainActivity` abría las prefs cifradas
  (llave en el Keystore + keyset de Tink) en el hilo principal, cada `AuthRepository` las volvía a abrir y
  `PendingDeepLink` abría otras dos veces por llamada. Ahora `SessionStore.prefsCifradas` es una sola por
  proceso, `MainActivity` la abre en segundo plano antes de `setContent` (los deep links que llegan antes se
  guardan) y `PendingDeepLink` usa esas mismas prefs (`pending_route`). Probado: 3 arranques en limpio en el
  emulador, 1.1–1.7 s, sin ANR.
- **Tema:** `secondaryContainer` y `surfaceContainer*` mapeados a la paleta: los FilterChip seleccionados,
  diálogos, menús y selectores de fecha salían en el lila por omisión de Material 3. Verificado en emulador.
- **Accesibilidad:** interruptores y casillas con nombre (`toggleable`), áreas de 48 dp, insignias «N sin
  leer», fotos y videos descritos, burbujas del chat leídas como «Tú: …», errores con `liveRegion`, títulos
  como encabezado, emojis y glifos («›», «▾», «＋») fuera de TalkBack.
- **Textos:** plurales con `cuenta(n, singular, plural)` (plural obligatorio), «posts» → «publicaciones»,
  «Me río», «✓ Vas a ir» / «✓ Vas en este», «Sin aventones disponibles», cuota «Gratis», «queda 1»,
  sin voseo, mensajes del servidor sin los genéricos de Nest en inglés (`mensajeLegibleDelServidor`).
- **Fallos:** «Cargar más» del mercado duplicaba anuncios (la lista podía tronar); Directorio se tragaba el
  error; registro bajo la barra de estado y el teclado; «atrás» cerraba la app en los pasos de la puerta y del
  registro; snackbars que dejaban spinners y diálogos atorados en Publicación; cambiar de filtro dejaba la
  lista vieja sin indicador; el mercado no filtraba Muebles/Cuarto/Servicios; el contador de seguidores no se
  movía; «Deshacer» al bloquear; video y foto con error y «Reintentar».
- **Decisiones de Adam que quedan fuera:** el naranja como texto da 3.5–3.8:1 (AA pide 4.5:1; `NaranjaOscuro`
  daría ~5.5:1), texto blanco sobre el botón naranja, bordes de campos casi invisibles (1.16:1), etiquetas de
  reacción a 9 sp, «Developed by», «Tip:»/«Trending»/«Feed».
- **Siguiente (Android):** hecho el 26-10 (sección de arriba). Para probar en local sin Docker: Postgres 17
  nativo con `initdb` en el scratchpad y la API en el 4210 (`-PDEBUG_API_BASE_URL=http://10.0.2.2:4210/api`);
  el 4200 suele estar ocupado. Con el emulador abierto, compilar con
  `-Pkotlin.compiler.execution.strategy=in-process` y `-Xmx3g`: con la configuración por omisión (dos JVM de
  4 GB) más el emulador, el equipo se quedó sin memoria y se reinició.

## Pasada grande del 22-10: fallos, funciones y fichas de tienda (cerrada por Claude; pendientes de Adam abajo)

Adam pidió auditar fallos y arreglarlos, listar funciones que faltan para chavos de 18-22 y dejar
completas las fichas de App Store y Play. Hecho hasta ahora:
- **Android, 33 arreglos de la auditoría** (3 agentes en archivos separados; compila junto y
  `testDebugUnitTest` en verde; **sin probar aún en emulador**): adjuntos por uri y varios a la vez,
  comentarios en barra fija con teclado, doble envío bloqueado, votos y reacciones con error visible y
  48dp, cola sin conexión que saca los 4xx y avisa en Publicar, selector de fecha/hora en eventos y
  aventones (hora de México), validación de cupo/cuota/precio sin `toInt()` que truene, «No voy»
  quitado (tocar otra vez quita la respuesta), confirmación antes de borrar o cancelar, generación en el
  registro, chat que abre abajo y burbuja optimista, errores del servidor en español
  (`Format.mensajeDe`), estados de carga/vacío/error distintos con «Reintentar», carrusel del feed sin
  parpadeo, apartar/liberar/vendido en marketplace, ícono y canal de notificación en el manifest.
  Componentes nuevos: `SelectorFechaHora`, `DialogoConfirmacion`, `EstadoDesplazable`,
  `MiniaturaAdjunto`, `CarruselFeed`.
- **Cuenta de revisión para las tiendas creada en producción** (`@revision_tiendas`, solo miembro de
  la plaza del campus, visibilidad COMUNIDADES): correo y contraseña **solo** en
  `C:\dev\secrets\agora-store\cuenta-revision.txt`; entrada probada contra udlagora.com. Contacto de App
  Review copiado del de NEXARA a `contacto-revision.txt` (misma carpeta).
- **Producción está vacía: 4 usuarios, 2 perfiles, 0 publicaciones, 0 eventos.** El revisor de Apple
  vería un feed vacío (riesgo de rechazo 2.1/4.2). Antes de mandar a revisión hace falta contenido real
  publicado por el equipo (bienvenida, eventos reales del campus); no se inventó nada.
- **Fichas de tienda en `docs/tienda/`** (README con campos y límites, `IOS-APP-STORE.md` con la etiqueta de
  privacidad de Apple respuesta por respuesta, `PLAY-STORE.md` con ficha, Seguridad de los datos, IARC,
  público 18+ y acceso), gráficos en `docs/tienda/graficos/` y scripts en `scripts/tienda/` (portados de
  FinanVoz: `marca.py`, `iconos-tienda.py`, `grafico-funciones.py`, `enmarcar.py` + `capturas-plan.json`,
  `asc-ficha.py`). **App Store Connect ya cargado por API** (22-10): versión 1.0.0, textos, categorías Redes
  sociales/Estilo de vida, URLs, edad 17+ (18+ en el sistema nuevo) y revisión con la cuenta demo. Faltan
  capturas, etiqueta de privacidad (solo consola) y la ficha de Play (navegador).
- **Web:** aviso de privacidad reescrito con lo que de verdad se recoge (correo personal, token de push,
  proveedores Hetzner/Cloudflare/Brevo/FCM/APNs, ARCO); términos con «Cero tolerancia» y reportes revisados
  en < 24 h; `/reglas` ya no promete un filtro automático (**producción no tiene `OPENAI_API_KEY`**: el
  filtro previo del código está apagado); casilla obligatoria de Términos y Reglas al crear el perfil (Apple
  1.2). Correo público `contacto@zynoratek.com` (contacto@udlagora.com rebotaba: el dominio no tiene MX).
  Android (agente) e iOS (sesión de móvil, `7dc30e2`) ya tienen la misma casilla y una pantalla de Reglas.
- **Desplegado `e195135` el 22-10 16:17 MX** (rollback `prev-20261022-1617`, smoke OK, migración del
  recordatorio de eventos aplicada; /soporte, /eliminar-cuenta, /privacidad, /terminos y /reglas en 200).
- **Android, segunda tanda** (agente, compila y 44 pruebas en verde): `ReaccionarRequest.tipo` no nulo,
  fotos en las publicaciones del perfil, aviso de moderación al publicar, voto que se queda marcado
  (`encuesta.miVoto` en la API y el contrato), id real del mensaje enviado, «Ver comentarios anteriores»,
  navegación de Yo/Perfil y deep link a la pestaña Eventos, MainShell con pestaña guardada, Atrás y sin doble
  espacio sobre el teclado, Ajustes manda `""` para borrar y no deja editar si el perfil no cargó,
  `PendingPostSync` registrado una vez, casilla de términos, pantalla de Reglas, términos y privacidad al día.
  Dos fallos extra: guardar en Ajustes siempre tronaba al leer `{ ok: true }`, y el texto legal quedaba
  debajo de la barra.
- **Funciones nuevas sin cambio visual grande:** recordatorio de aventón (~30 min antes, conductor con
  pasajeros y cada pasajero; tipo `AVENTON_RECORDATORIO`, migración aditiva `20261022200000`) y «Agregar a
  mi calendario» (`GET /eventos/:id/calendario.ics`, botón en la web). Lista completa y priorizada de lo que
  falta para 18-22, con lo visual marcado para mockup: `docs/funciones-universitarios.md`.
- **Privacidad corregida otra vez:** las apps mandan fallos y eventos de uso a `/analytics/*` ligados a la
  cuenta; ya lo dicen el aviso, la etiqueta de Apple y la Seguridad de los datos de Play.
- **Desplegado `837cb15` el 22-10 16:27 MX** (rollback `prev-20261022-1627`; migración del recordatorio de
  aventones aplicada; `.ics` responde 401 sin sesión).
- **Recorrido en el emulador** (`agora-capturas`, API local + seed de demo, nunca producción) y arreglos que
  salieron: el catálogo entero no tenía acentos («Ingenieria», «Psicologia Clinica», «Universidad de las
  Americas») → `udlap.ts` + migración de datos `20261022210000_catalogo_acentos` (solo `UPDATE … nombre` por
  slug en escuelas, departamentos, carreras, colegios y sus comunidades derivadas; no borra nada); el seed de
  demo tampoco (123 textos); Aventones aplastaba «+ Ofrecer» en una barra vertical; «Retar 🔥» se partía en dos
  líneas; «1 seguidores»; «✓ Voy (tocar para quitar)» en la lista → «✓ Vas a ir»; y «Agregar a mi calendario»
  en Android (intent del calendario, sin permisos; probado: abre Google Calendar). El permiso de notificaciones
  salta al entrar, antes de la bienvenida: queda en `docs/funciones-universitarios.md` (A).
- **Capturas de Android listas** en `docs/tienda/capturas/android-telefono/` (7, 1080×1920, enmarcadas, barra de
  estado en modo demo). `.gitignore` ignoraba toda carpeta `capturas/`; ahora `docs/tienda/capturas/` sí se
  versiona. iOS: el flujo `ios-capturas.yml` de la sesión de móvil deja el artefacto; falta enmarcarlo.
- **CI:** la casilla de términos rompió 3 e2e que crean perfil (capturas, humo, registro-y-feed); ya la
  marcan. Las otras 4 (anonimo, capturas-admin, moderacion, navegacion) no venían del correo personal sino de
  un moderador que no existía en la base nueva del CI; la sesión de móvil lo arregló en `2a188fc` y `ci` pasó
  por primera vez (32/32 e2e, run 39969506967). **Desplegado `efe8943` 17:06 MX** (rollback
  `prev-20261022-1706`): catálogo con acentos ya en producción.
- **Play Console por Chrome (17:20 MX):** la «Ficha de Play Store predeterminada» quedó llena en el Chrome de
  Adam (textos, ícono, gráfico, 7 capturas) **sin guardar**; luego Chrome le quitó a la extensión el acceso a
  play.google.com y no se pudo seguir. La consola confirma «Cuenta de organización»: no hay prueba cerrada de
  14 días.

- **Disco del Hetzner (22-10 noche):** llegó al 100 %; la sesión principal borró los `agora-api:prev-*` viejos y
  el log de Traefik. `scripts/desplegar.ps1` ahora deja solo los 2 `prev-*` más recientes de api y web en cada
  despliegue; se aplicó también a los 7 `agora-web:prev-*` que quedaban (87 %). Rollback vigente:
  `prev-20261022-1706`. Build «Android · Play» 1.0.0 (3) lanzado (run 39902540978) para la prueba interna.

### Lo que queda para Adam (una línea cada uno)
1. Play: pulsar «Guardar como borrador» en la ficha abierta (o volver a llenarla con `docs/tienda/PLAY-STORE.md`
   §1) y capturar §2 a §6 (configuración de la tienda, política, anuncios, acceso con la cuenta demo, IARC,
   público 18+, Seguridad de los datos). Las credenciales demo las pega él.
2. App Store Connect: etiqueta de privacidad (`docs/tienda/IOS-APP-STORE.md` §5), capturas de iPhone (cuando el
   artefacto de `ios-capturas.yml` salga en verde: enmarcar con `enmarcar.py --plataforma ios-6.9` y correr
   `asc-ficha.py`), enlazar la build y enviar.
3. Contenido real en producción antes de enviar a revisión (hoy 0 publicaciones y 0 eventos).
4. Decidir la moderación automática: crear `OPENAI_API_KEY` (la moderación de OpenAI no cobra) para encender el
   filtro previo que ya existe; mientras, el compromiso con Apple es revisar reportes en menos de 24 h.
5. Riesgo de marca: «Ágora UDLAP» usa el nombre de la universidad; plan B «Ágora · Red del campus».
6. **Sin super_admin (23-10):** por pedido de Adam, la sesión principal borró sus 3 cuentas en producción; solo
   queda la cuenta demo de revisión. Cuando Adam se vuelva a registrar hay que darle el rol `super_admin`.

## Hecho en este turno (22-10, sesión lateral de móvil: iOS para Apple 1.2 y capturas de tienda)

Pedido de la sesión principal (Apple 1.2: contenido de usuarios exige aceptar términos con cero
tolerancia). Solo `apps/mobile-native/ios/**` y `.github/`:
- **Registro:** casilla obligatoria «Acepto los Términos y las Reglas de la comunidad. Cero tolerancia…»
  antes de «Entrar a Ágora» (`registro.terminos`, botón `registro.crear` desactivado sin ella). «Términos» y
  «Reglas de la comunidad» son enlaces de la frase que abren hojas sin salir del registro. No va nada a la API.
- **Reglas** (`ReglasView`, texto de `apps/web/app/reglas/page.tsx`, sin prometer filtro automático: cola que
  el equipo revisa en <24 h, faltas graves o repetidas cuestan la cuenta). Enlace en Más (pie: Términos ·
  Reglas · Privacidad) y en Yo; `/reglas`, `agora://reglas` y `udlagora.com/reglas` abren la pantalla.
- **Términos** con «Cero tolerancia», disponibilidad y contacto; **Privacidad** resume el aviso nuevo de la web
  y cierra con «Versión completa en udlagora.com/privacidad». Correo público `contacto@zynoratek.com`
  (`AgoraContacto`). Los textos legales aceptan Markdown en línea (negritas, mailto).
- **Capturas de tienda** (`.github/workflows/ios-capturas.yml`): Postgres + API en modo desarrollo en el Mac del
  CI, `pnpm db:seed` (catálogo + demo), `capturas-preparar.py` pone una contraseña de un solo uso a
  `prueba.uno@udlap.mx` (renata.mv); `CapturasTiendaUITests` entra y recorre tocando (pestañas `tab.N`,
  filas de Más `mas.<ruta>`) feed, evento, aventones, mercado, mensajes y perfil (@diego.tr por el
  Directorio) en claro y oscuro y guarda
  `capturas-ios/{claro,oscuro}/<nombre>.png` a 1320×2868 (artefacto `ios-capturas-tienda`). La misma prueba
  registra una cuenta nueva y comprueba la casilla. En `pruebas-ui` se salta (sin `AGORA_CAPTURAS`).
- **Arreglo de la puerta de iOS (venía del 21-10):** al canjear el código, `AuthRepository` ponía la sesión
  de inmediato y `RootView` dejaba la puerta, así que el paso «crea tu contraseña» no se veía nunca (cuentas
  nuevas sin contraseña y «¿Olvidaste tu contraseña?» que no la cambiaba). Ahora `verificarOtp(guardar:
  false)` y la sesión se guarda al terminar ese paso (`crearContrasena(_:token:)`). Confirmar la UDLAP sigue
  guardando de inmediato. Revisar si Android tiene lo mismo.
- `ios-capturas.yml` firma con «-» (sin firma el simulador no escribe en el Keychain y la sesión no se
  guarda) y la prueba salta la bienvenida de tres pantallas. `XCUIApplication.open(agora://…)` relanzaba la
  app y no navegaba: los enlaces profundos de iOS siguen sin probarse en el simulador.
- **Verificado (23-10):** `ios-capturas` run 39905898520 en verde: 12 capturas de 1320×2868 con datos del
  seed (claro y oscuro de verdad, relanzando con `-agora.apariencia oscuro`) y el registro de una cuenta
  nueva: pidió crear la contraseña, abrió Términos y Reglas desde la frase y solo habilitó el botón con la
  casilla. El seed del flujo corre con `TZ=America/Mexico_City` (si no, la fiesta salía a las 16:00).
- `PrivacyInfo.xcprivacy` igual a `docs/tienda/IOS-APP-STORE.md` §5: fallos ligados (Funcionalidad +
  Analíticas), interacción con Funcionalidad + Analíticas y «Otros tipos de datos» (cumpleaños, carrera,
  intereses…), que faltaba. Ajustes: etiqueta de `AVENTON_RECORDATORIO` («Tu aventón está por salir»); el
  push abre Aventones por su `url`.
- **E2E (`ci`) — las 4 rojas no venían del correo personal:** fallaban igual desde el 21-10 (5a4c21a) y
  `ci` nunca ha pasado en GitHub (76 fallidas, 10 canceladas). Causa: en la base nueva del CI la cuenta de
  `BOOTSTRAP_SUPERADMIN_EMAIL` no existe al sembrar, así que nunca recibía rol ni perfil (navegación caía en
  /registro, moderación daba 403, el panel no mostraba «Resumen»). El seed de demo ahora la crea fuera de
  producción con un perfil mínimo («Equipo Ágora») y rol super_admin; una cuenta existente solo recibe el
  rol, como antes. `anonimo.spec.ts` crea su propia anónima (dependía de una que quedaba de corridas viejas).
- **23-10 «no me llegó ni al UDLAP ni al personal» (Adam, registro nuevo en la app):** el UDLAP sí salió y
  Brevo lo entregó en 5 s (luego lo abrieron los escáneres de Microsoft): está en no deseado/Otros/cuarentena.
  El personal nunca salió: `otp/personal/solicitar` dio **429** porque el minuto de espera era por cuenta y
  lo pidió 24 s después del UDLAP. Ahora el minuto es por buzón (`revisarCupo(…, destino)`); el tope de 10
  al día sigue siendo de la cuenta. Además el disco del Hetzner estaba al 99 % (Redis sin poder guardar,
  NEXARA en 503): se liberaron ~10 GB (caché de build de Docker, `.gradle-isolated` viejo dentro de
  `/var/www/udlagora-app` y los respaldos `prev-20261022-*` de Ágora). Tras desplegar 73c3a0c (rollback
  `prev-20261023-1157`) volvió a 90 %: un benchmark de Whisper de otra sesión corre en `/root/bench-whisper`
  (2.2 GB, modelos de hoy) y el `/api/health` de NEXARA da 503 por su umbral de 90 % (la web sí responde).
  Al terminar ese benchmark se pueden borrar sus modelos. La API de Brevo rechaza la IPv6 del servidor:
  consultar eventos con `curl -4`.
- Segundo intento de Adam (12:07): escribió el UDLAP sin punto (`adamdelpozoos@`); Microsoft dice que no
  existe (verificado: el suyo con punto da IfExistsResult 0) y el aviso «Ese correo no existe en la UDLAP»
  salía bajo el campo del correo personal, así que parecía que rechazaba su Gmail. Ahora el 400 nombra el
  correo UDLAP, dice que el personal está bien y recuerda `nombre.apellido@udlap.mx`. Falta en las apps:
  mostrar en la pantalla del correo personal qué correo UDLAP se va a revisar (pedido a la sesión de UI).

## Hecho en este turno (22-10, sesión lateral de móvil: correo personal y fallos de iOS)

Adam: «si el código institucional tarda, que puedan registrarse con su correo normal y lo confirmen
después» + «mejora todas esas posibles problemáticas» + TestFlight nuevo verificado.
- **Registro con correo personal** (contrato en `docs/autenticacion.md` pendiente de ampliar; el detalle
  está en los commits). Si el código UDLAP no llega, «¿No te llegó? Regístrate con tu correo personal»:
  la API pregunta a **Microsoft (GetCredentialType)** si el buzón @udlap.mx existe (0 existe, 1 no; sin
  respuesta → 503, no se adivina; `VERIFICAR_BUZON_UDLAP=off` lo apaga en dev/CI), manda el código al
  personal (atado a ese correo, `otp_codes.destino='personal'`, comparte cupo 1/min y 10/día) y la cuenta
  queda **pendiente de UDLAP 30 días** (`users.udlapPendienteDesde`, `users.correoPersonal` único).
  Vencido el plazo, `SesionGuard` da **403** en todo salvo `/auth/*` y `/cuenta/*` (no 401: la sesión
  sigue). **El buzón UDLAP manda:** confirmar con el código UDLAP borra el correo personal y la
  contraseña y cierra todas las sesiones (si alguien se registró con el correo de otro, el dueño la
  recupera y elige contraseña). Solo para cuentas que nunca confirmaron UDLAP. Migración aditiva
  `20261022140000_correo_personal`. API `0c45850` (CI 250/250; en esta PC las pruebas de la API no
  corren: Control de aplicaciones bloquea el binario de argon2), web `298e3dd`, Android `b45746d`
  (42/42), iOS `c7b9024`. **Desplegado** API (`0c45850`) y web (`298e3dd`) el 22-10 ~14:45 MX, rollback
  `prev-20261022-1444`; probado en producción: buzón inexistente → «Ese correo no existe en la UDLAP».
- **iOS, toques:** «Enviarme el código» no respondía fuera de las letras (TestFlight 2): ButtonStyle
  propio sin `contentShape`. Arreglado en `AgoraScaleButtonStyle` y los 47 `.plain` → `.agoraPlain`;
  enlaces del login de 44 pt, «Listo» encima del teclado (tapaba «Entrar»), código exige 6 dígitos.
- **iOS, fallos de contrato** (auditoría Android de la otra sesión, `7f45a63`): reacciones del anónimo
  con tipo siempre, selector de generación, aventones con sentido y fecha, evento con DatePicker y fin,
  estado/aviso al publicar, «Ver comentarios anteriores», media en perfil ajeno, mensaje enviado al
  momento; etiqueta `EVENTO_RECORDATORIO`.
- **Pruebas de interfaz iOS** (`ios.yml` → job `pruebas-ui`): XCUITest contra `.github/scripts/api-falsa.py`
  en el Mac del CI, tocando cada botón en su borde (crear cuenta, correo personal, código malo,
  contraseña mala) + 18 unitarias. `ApiClient` acepta `AGORA_API_URL` del entorno (solo pruebas/Xcode).
- **TestFlight 1.0.0 (4)** subido con todo lo anterior; grupo interno «Equipo Ágora» (Adam).
- **Pendiente:** Play necesita un AAB nuevo (versionCode ≥ 3) con el correo personal; la otra sesión
  tiene arreglos de Android sin commitear y la subida de la ficha por API: acordado que lo lance quien
  cierre Android. `docs/autenticacion.md` aún no describe el correo personal.

## Hecho en este turno (21-10)

Adam pidió tres cosas: estado de builds móviles, ícono nuevo y login sin fricción.
**Desplegado `40e5bfc` el 21-10 13:22 MX** con `scripts\desplegar.ps1` tras el OK de Adam:
migración `20261021120000_contrasena` aplicada sola al arrancar, rutas `/auth/entrar`,
`/auth/contrasena`, `/auth/contrasena/cambiar` mapeadas, api y web healthy, smoke OK.
Rollback: imágenes `prev-20261021-1320` (= las del 19-10). Antes del deploy el disco estaba al
**95 %**: se liberó caché de build, imágenes de rollback anteriores al 19-10 y journal
(→ 88 %); tras el build volvió a 93 % y se podó toda la caché de build. El disco sigue
crónico: el aviso de ntfy (>80 %) va a seguir sonando hasta que se libere algo de otros
proyectos (nunca `volume prune`).
- **Ícono nuevo aplicado: «Mono»** (pirámide de Cholula de cinco gradas, blanco→crema sobre
  naranja; Adam dejó la elección a Claude el 21-10). Fuente única `scripts/generar-icono.mjs`
  (`CONCEPTO_ACTUAL = 'mono'`; los otros tres conceptos siguen ahí): regenera web/PWA
  (`icono*.svg/png`, `apple-touch-icon`, `favicon.ico`, `og.svg/png`), Android (`ic_launcher_*`,
  `agora_isotipo`, `ic_notification`) e iOS (`AppIcon-1024.png`, `Isotipo.svg` sin clipPath ni
  filtros). `sw.js` subió a `agora-v5` para que los navegadores suelten el ícono viejo.
  **Desplegado `650bcaa` el 21-10 13:40 MX** (smoke OK, `/icono.svg` ya es la pirámide,
  rollback `prev-20261021-1337`). Disco tras podar toda la caché de build: 86 %, 11 GB libres.
- **Notificaciones configuradas (21-10, por orden de Adam):** Web Push con claves VAPID nuevas y
  FCM con el service account de Firebase, ambos en `deploy/.env` del Hetzner (respaldo
  `deploy/.env.bak-20261021`; `chmod 600`), API recreada y verificada (`/push/vapid-public-key`
  → `activo: true`; el JSON de FCM parsea dentro del contenedor). Firebase: proyecto
  `agora-udlap` (sin Analytics), app Android `mx.agora.mobile.nativeapp`, `google-services.json`
  real versionado. **APNs (iOS) configurado el 22-10** (ver abajo).
- **Tiendas:** llave de subida `apps/mobile-native/keystore/agora-release.jks` (fuera de git,
  contraseña en `local.properties`; **respaldar**), AAB firmado 1.0.0 (1) en
  `app/build/outputs/bundle/release/`. Play Console: el clasificador de permisos de Claude
  bloquea los pasos de publicación y el AAB pasa el tope de 10 MB de la herramienta de subida:
  **lo sube Adam** siguiendo `docs/PLAY_STORE.md` (textos de ficha incluidos).
  **AAB recompilado a las 17:56 MX con el `google-services.json` real** (verificado: `resources.pb`
  trae `agora-udlap`, firmado con `AGORA.RSA`); el `classes.dex` bloqueado era el demonio de Gradle de
  la sesión de móvil (`gradlew --stop`). En Chrome quedó Play Console en «Crear aplicación» con nombre
  «Ágora UDLAP», paquete e idioma es-419 ya puestos (faltan Aplicación/Gratis, las dos declaraciones y
  Crear → Pruebas internas → Crear versión → arrastrar el AAB) y Apple en su inicio de sesión; la
  extensión se desconectó antes de terminar.
- **22-10, con Chrome de vuelta:** app «Ágora UDLAP» **creada** en Play Console (id
  `4973131523055175748`, es-419, gratis) y versión 1 (1.0.0) de Prueba interna con el bundle subido y
  notas, detenida en «Revisar y confirmar» → **falta el clic de Adam en «Guardar y publicar»** (el
  clasificador de permisos de Claude lo bloquea como transacción real). Se subió
  `bundle/release/agora-1.0.0-play.aab` (4.8 MB): copia sin el mapa de R8 vuelta a firmar con la
  llave de subida, porque el original (11 MB) pasaba el tope de 10 MB de la subida por navegador;
  el `mapping.txt` se puede subir aparte (`docs/PLAY_STORE.md`). Apple: «Register a New Key» con
  nombre «Agora UDLAP APNs» y APNs marcado, en «Configure Key»; Adam elige *Sandbox & Production*,
  Save, Continue, Register y descarga el `.p8` (también bloqueado para Claude).
- **APNs listo (22-10 13:20 MX):** llave **`8JBG8G5JT3`** (equipo `AHNW9K8745`, *Sandbox & Production*,
  Team Scoped), guardada en `C:\dev\secrets\agora-ios\AuthKey_8JBG8G5JT3.p8` (+ `LEEME.txt`) y borrada
  de Descargas. En el Hetzner: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_SIGNING_KEY` (una línea con `\n`),
  `APNS_BUNDLE_ID=mx.agora.mobile.AgoraApp`, `APNS_PRODUCTION=true` en `deploy/.env` (respaldo
  `.env.bak-apns-20261022`, `chmod 600`); `deploy/docker-compose.yml` ahora pasa `APNS_PRODUCTION`
  (`998a086`, copiado al servidor) y la API se recreó. **Verificado contra Apple**: un envío con token
  falso responde `400 BadDeviceToken` (la llave y el JWT son válidos). El App ID
  `mx.agora.mobile.AgoraApp` tiene **Push Notifications** y **Associated Domains** activados. Falta
  probar con un iPhone real desde TestFlight (el token llega por `POST /push/suscribir-apns`). Los
  vectores de Android/iOS están validados como XML pero **sin compilar** aquí (la sesión de
  móvil corre gradle en el mismo checkout; su `assembleDebug` los compila).

- **Apps nativas: entrar con contraseña** (sesión lateral de móvil, 21-10, commit en `main`).
  Android y iOS arrancan en correo + contraseña + «Recordarme» → `POST /auth/entrar` (modo
  `token`; sin recordarme la API da 12 h no renovables). «¿Olvidaste tu contraseña?» y
  «¿Primera vez aquí? Crea tu cuenta» llevan al flujo de código de siempre (pedir →
  seguimiento de entrega → verificar). Tras verificar, si `tieneContrasena == false` o se vino
  por «olvidé», pantalla «Crea tu contraseña» (nueva + repetir, mín. 8, ver/ocultar) antes del
  perfil o el feed; con `tieneContrasena` null (API vieja) pasa directo como antes. Ajustes →
  tarjeta «Contraseña»: crear si no tiene, cambiar con la actual si tiene; oculta si `auth/yo`
  no trae el campo. Errores: el `mensaje` de la API tal cual (401 uniforme, 429 por intentos).
  Textos = `copy.login` de la web; «Vence en 15 minutos».
  - Android: `EntrarRequest/Response`, `CrearContrasenaRequest`, `CambiarContrasenaRequest` y
    `tieneContrasena` en `VerificarOtpResponse`/`YoResponse` (`Dtos.kt`, `Apis.kt`);
    `AuthRepository.entrar/crearContrasena/cambiarContrasena/yo`, `verificarOtp` devuelve
    `EntradaPorCodigo(user, tieneContrasena)`; constructor interno inyectable (`AlmacenSesion`,
    que `SessionStore` implementa, + `AuthApi`) para probarlo sin red ni Android.
    `ui/components/FormularioContrasena.kt` (`CampoContrasena`, `FormularioContrasena`) lo
    comparten `LoginScreen` y `AjustesScreen`. **`assembleDebug` contra udlagora.com en verde el
    21-10 13:40**, unitarias **32/32** (nuevas `AuthRepositoryTest` 5 y `DtosContrasenaTest` 5);
    los vectores del ícono Mono compilaron con él.
  - iOS (**SIN COMPILAR**, no hay Mac): `AuthModels.swift`, `AuthRepository.swift` (`entrar`,
    `crearContrasena`, `cambiarContrasena`, `yo`, `EntradaPorCodigo`),
    `UI/Components/CampoContrasena.swift` nuevo, `LoginView.swift` reescrita (pasos
    entrar/pedir/codigo/contrasena), `AjustesView.seccionContrasena`, copy en `AgoraDesign.swift`,
    prueba `AgoraAppTests/AuthModelsTests.swift`.
  - Sin probar con cuenta real contra producción (el deploy `40e5bfc` ya responde en
    `/auth/entrar`); nada subido a tiendas.
- **Tiendas (21-10, sesión lateral, pedido de Adam «compila en GitHub, repo público, sube a Apple y
  Android»).** `AdamPark7014/AGORA-app` es **PÚBLICO** desde el 21-10 13:49 MX (gitleaks: 104 commits,
  0 fugas; lo único «sensible» versionado es `google-services.json`, público por diseño, y la IP del
  Hetzner en `scripts/desplegar.ps1`, que ya es pública por DNS). Con eso Actions volvió a correr:
  `ios.yml` **en verde** (corrida 39665033178: el Swift del login compiló a la primera; captura del
  simulador con la pantalla nueva). Hallazgo: XcodeGen regeneraba `Info.plist` en el Mac (bloque
  `info:` de `project.yml`) y la app salía sin `UILaunchScreen` (franjas negras) ni los permisos de
  fotos/cámara; ahora `INFOPLIST_FILE` + `GENERATE_INFOPLIST_FILE=false`. Preparado para publicar,
  copiando ARTA/FINANVOZ: `ios-testflight.yml` (archiva, firma con el certificado del equipo
  AHNW9K8745, `scripts/asc_signing.py` crea App ID + perfil con Push y Associated Domains, sube a
  ASC), `android-play.yml` (`bundleRelease` firmado con llave de subida por secretos, huella
  verificada, artefacto `agora-aab`), `PrivacyInfo.xcprivacy`, `AgoraApp.Release.entitlements`
  (aps production), `Config/AgoraApp.xcconfig`, solo iPhone, esquema compartido, icono 1024 en RGB
  (el generador ya escribe `removeAlpha`), reglas R8 de Tink, versión por `-PVERSION_CODE/NAME`.
  `ci.yml`: el sembrador importaba `@agora/shared/dist` antes del build → se siembra después del
  build. **Claude no tocó ninguna llave** (veto de credenciales): los secretos los carga Adam con
  `scripts/subir-secretos-ios.ps1` (reusa `C:\dev\secrets\arta-ios`, pide el Issuer ID),
  `scripts/subir-secretos-android.ps1` (toma la llave `apps/mobile-native/keystore/agora-release.jks`
  + `local.properties` que dejó la otra sesión en `5a4c21a`; **no crear otra**: Play registra la del
  primer `.aab`), y crea las apps en App Store Connect y Play Console a mano (la API no puede).
  Pasos exactos en `docs/store/README.md`; Play Console y textos de ficha en `docs/PLAY_STORE.md`.
  Después: lanzar «iOS · TestFlight» y «Android · Play» y subir el `.aab` a prueba interna.
  CI tras el arreglo del sembrador (corrida 39667520389): lint, types, build y unit en verde; **e2e con
  3 fallos ajenos a móvil** (`anonimo.spec` «la respuesta anonima nunca incluye al autor»,
  `capturas-admin.spec`, `moderacion.spec` «resolver exige motivo escrito»): nadie los había corrido
  desde el 27-09 (Actions sin cobro).
- **Móvil:** Android compila en local (último `assembleDebug` 21-10, ya con contraseña), sin release a Play.
  iOS nunca se ha compilado: `ios.yml` y `ci.yml` mueren en 5 s por el cobro de GitHub
  Actions («recent account payments have failed»). `apps/mobile` (Expo) es un resto sin EAS.
- **Ícono:** tres rondas de propuestas (letra Á/portal/voz → pirámide → pirámide limpia
  estilo Apple). Adam eligió la dirección «pirámide de Cholula, limpio como Apple»; la hoja
  de la ronda 3 (A Mono, B Cristal, C Noche, D Amanecer) está en el scratchpad de la
  sesión; **nada sustituido** hasta que elija letra. Generador pendiente de escribir en
  `scripts/generar-icono.mjs` (set: favicon, PWA 192/512 + maskable, Apple touch, Android
  adaptable, iOS 1024).
- **Login con contraseña** (`docs/autenticacion.md`): el código al correo solo al crear
  la cuenta, la primera vez de una cuenta de antes, u «olvidé mi contraseña»; después
  correo + contraseña con «Recordarme». argon2id (`@node-rs/argon2`, precompilado, también
  musl para Docker), 5 fallos = 15 min de bloqueo, 401 uniforme (sin enumeración, hash
  señuelo), cambiar/reemplazar revoca las otras sesiones, nada de contraseñas en logs.
  Migración **aditiva** `20261021120000_contrasena` (users.passwordHash/passwordSetAt/
  loginFallidos/loginBloqueadoHasta, sessions.viaCodigo/persistente). Rutas nuevas:
  `POST /auth/entrar`, `POST /auth/contrasena`, `POST /auth/contrasena/cambiar`;
  `otp/verificar` y `/auth/yo` traen `tieneContrasena`. Las apps nativas ya entran con
  contraseña (ver «Apps nativas» arriba; iOS sin compilar). OTP: vigencia 10 → 15 min,
  reenviar con cuenta regresiva.
  Web: `/` con pasos entrar → pedir código → código → crear contraseña; Ajustes →
  Contraseña; aviso arriba del feed para cuentas sin contraseña. e2e actualizadas
  (registro-y-feed, humo, capturas, capturas-admin) + `contrasena.spec.ts` (API real).
  auth 45/45, contracts 13/13, API 240/240, tsc y eslint en verde, build web en verde.
  Las e2e no corrieron (Docker local caído, Actions sin cobro).
- **Por qué tarda el código:** la API entrega a Brevo en < 1 s; lo lento es Microsoft 365
  (`deferred`). El único envío desde el deploy del 19-10 llegó en 7 s. Remitente
  `acceso@udlagora.com` (ya autenticado en Brevo) sigue pendiente de Adam.

## Hecho en este turno (19-10)

Adam pidió terminar la app con Claude, sin Cursor. **Desplegado `ec634e0` el 19-10 18:13 MX** (CSP sin
unsafe-eval, smoke OK, rollback `prev-20261019-1813`). Los tres intentos previos murieron por cortes de
SSH a media construcción; ahora el build corre con nohup en el servidor y el script solo sondea. Ojo: en el servidor hay respaldo de las 13:31 MX y
etiquetas `prev-20261019-1331`, pero las imágenes `latest` son de hace 11 días y la CSP en vivo aún trae
`'unsafe-eval'`: alguien corrió el script hoy y se cortó después del paso 3. Revisar el log al desplegar.
- **Pregunta relámpago nativa** (punto 4 de `PARA-CURSOR.md`): Android (`7cab9cf`, assembleDebug y
  unitarias en verde) e iOS (`c7e8169`, **SIN COMPILAR**): espera a la hora sorpresa y recarga al caer,
  cuenta regresiva, sello a tiempo/tarde, "tu carrera X%", interruptor `avisoPregunta` en Ajustes.
  El push `/feed` ya abría el feed en las dos.
- **API** (`b854cd0`): reacciones a prueba de doble toque (deleteMany condicionado, P2002 = ya puesta,
  sin aviso doble); el detalle trae los 50 comentarios **más recientes** + `comentariosAnteriores`, y
  `GET /posts/:id/comentarios?antesDe=` da la página previa. Web: botón "Ver comentarios anteriores".
  API 226/226, tsc y eslint en verde. Índice del feed: no se agregó; el filtro `estado IN (PUBLICADO,
  EN_REVISION)` casi no descarta filas y ya existe `(communityId, createdAt desc)`.
- **Avisos instalados en el VPS** (`/etc/cron.d/udlagora-vigilancia`, `scripts/instalar-vigilancia.sh`):
  disco >80 % cada 15 min y caída de `/api/salud` cada 5 min (avisa una vez y al volver), tema ntfy
  `udlagora-53c9f1958d79`. **El disco está en 88 %**: avisará cada 15 min hasta liberar espacio
  (`docker builder prune --filter until=168h` libera ~6.5 GB de caché; nunca `volume prune`).
- **Pendiente de Adam:** desplegar; suscribirse al tema en la app ntfy; DSN de Sentry; monitor externo
  (UptimeRobot) para cuando cae el servidor entero; remitente `acceso@udlagora.com`; 3 datos del aviso
  de privacidad. Sin respaldo externo (decisión de Adam).

## Hecho en este turno (12-10, etapas 2 a 4)

Todo en `main`, **sin desplegar**. Plan de 4 etapas que pidió Adam ("haz todas una por una").
- **Etapa 1 y 2** (blindar, red de seguridad): privacidad del perfil COMUNIDADES (la comunidad campus
  la anulaba), directorio y tarjetas públicas sin datos de perfiles restringidos, bloqueos en feed,
  detalle, comentar, hashtags; Sentry opcional (`SENTRY_DSN`); push solo a hosts conocidos y máx. 10
  suscripciones; `/reglas`; CSP sin unsafe-eval en prod; logs con tope en compose; Traefik `/media`
  solo GET/HEAD + CSP sandbox; `scripts/respaldo-externo.sh` y `scripts/vigilar-disco.sh` (runbook).
- **Etapa 3:** `TarjetaPost` única (6 copias fuera; feed 1098→583 líneas), carril derecho en
  escritorio y tira "Tu día" en móvil; bienvenida guiada (foto → seguir, `GET /perfil/sugerencias` →
  pregunta → presentarte); esqueletos y Reintentar en aventones/marketplace/anónimo/ajustes; chat web
  por SSE (`/mensajes/:id/stream` ya existía) con sondeo de respaldo; `leidoAt` solo si hay algo nuevo.
- **Etapa 4:** pregunta del día relámpago (`pregunta/relampago.ts`): hora sorpresa 10–20 h (HMAC del
  día con SESSION_SECRET), cron por minuto manda un push una sola vez, "a tiempo" = 2 min, tu carrera
  vs campus. Interruptor `avisoPregunta` en Ajustes. **Migración nueva `20261012120000_pregunta_relampago`**
  (solo columnas). Arreglado: la pregunta cambiaba a las 18:00 MX (contenedor en UTC).
- **Pendiente de Adam:** billing de GitHub Actions; destino rclone + cron de respaldo y disco en el VPS;
  DSN de Sentry; topic de ntfy; `install-traefik-route.sh`; datos del aviso de privacidad (borrador en
  el archivo del proyecto `auditoria/aviso-privacidad-borrador.md`); correo desde udlagora.com (DNS).
  Las apps nativas no muestran aún la hora sorpresa (ignoran los campos nuevos).
- Ojo: `prisma migrate diff --shadow-database-url` con la base de desarrollo la **borra**.
- API 224/224, e2e 24 ok (las de admin requieren :3300), tsc/eslint/build web en verde.

## Hecho en este turno (12-10)

Auditoría completa (seguridad, rendimiento, UX, producción): 40 hallazgos priorizados, fuera del repo
(archivo del proyecto `auditoria/auditoria-agora-2026-10-12.md`). Etapa 1 del plan, todo en `main`,
**sin desplegar**:
- `795e001` Rutas `auth/otp/*` cuentan siempre por IP (`@LimitePorIp`): un Bearer inventado ya no
  abre un contador nuevo por petición.
- `e10cc4a` Intentos del OTP reservados y canje con `updateMany` condicionado (carrera en paralelo).
- `730ad3b` Contador de publicaciones del perfil e insignia SOCIAL sin anónimas (delataban autor).
- `321b680`/`09f0a9f` `enSegundoPlano` + `unhandledRejection` en `main.ts` (un aviso fallido tumbaba
  la API); el bloqueo corta `enviar`, `alternarSeguir` y avisos (`bloqueos/bloqueos.ts`), y bloquear
  borra seguimientos en los dos sentidos.
- `844a786` Bandeja de mensajes sin mensajes retirados.
- `0d6da8b` Media con `thumbUrl/ancho/alto` (`aMediaVista`); la web usa `srcSet` (`lib/imagen.ts`).
- `29660cf` CI: build con `NODE_ENV=production` (reproducido el fallo del admin en local).
- API 205/205, lint y check-types en verde.

## Hecho en este turno (08-10)

Retomado desde el turno de Cursor del 07-10 (Fase 0 de ÁGORA 2.0, plan en
`docs/agora-2.0/PLAN-FASE-0-1.md`), que se cortó sin cerrar: su WIP de Android quedó en `d1261c9`.

### Revisión de Fase 0 y correcciones (`23de7f0`, `f904789`, `f688305`)
- Redirect abierto en `?siguiente=` (`/\t/evil.com`, `/..//evil.com`): `lib/welcome.ts` resuelve con `URL`.
- **Una suspensión se levantaba sola al volver a pedir el código** (`abrirSesion` ponía ACTIVO). Arreglado
  con prueba. Un suspendido sí puede darse de baja (`SesionGuardBaja`).
- Media: HEIC/AVIF ya no se clasifican como MP4 (se guardaban con GPS sin pasar por sharp); HEIC se
  rechaza, AVIF se re-codifica. `media/metadatos-video.ts` vacía `udta`/`meta` de MP4/MOV (GPS de
  Android e iPhone) sin cambiar tamaño. GIF/WEBP animados re-codificados. Foto de perfil = imagen.
- Baja de cuenta borra sus archivos del almacén público (salvo bajo reporte abierto).
- Moderación: levantar suspensión exige admin, no revive BAJA; restaurar no publica lo borrado por el autor.
- Marketplace: solo imágenes propias (`ownerId`) y pasan por moderación de imagen.
- Limpieza de huérfanos: exclusión de fotos de perfil dentro del SQL (antes se atascaba con 500 avatares).
- Seed sin `.env` (`--env-file-if-exists`); pruebas del limitador ya no se cuelgan con Redis presente.
- API: 194/194 pruebas, lint y typecheck en verde.

### Paridad móvil
- **Android** (`b6d6027`): seguimiento de entrega del OTP + Reenviar, isotipo, «Developed by Zynora
  Tek», logout real (push + `/auth/salir`), compartir, seguidores/siguiendo, tema, Retirar/Suspender,
  Silenciar, badge de mensajes, reportar anónimas, contactar conductor, notificaciones paginadas,
  filtros de directorio, portada/cumpleaños, cupo/tipo de eventos, visor con zoom, @menciones.
  `assembleDebug` + 22 pruebas unitarias en verde. **Probado en emulador contra producción**: login con
  isotipo y crédito; código pedido → «Entregado en tu buzón UDLAP» a los ~45 s.
- **iOS** (`8dc8101`): lo mismo + fotos a JPEG sin EXIF antes de subir + editar/borrar propio +
  carrusel/video. Además arregló ~12 errores **previos** que impedían compilar (SWIFT_VERSION 5.9→5.0,
  redeclaraciones, tipos privados, bloques >10 hijos…) y bugs: 9 banners que nunca cargaban, PATCH
  /perfil que siempre mostraba error, leaderboard 404. **SIN COMPILAR** (sin Mac).
- Íconos (`032d9ec`): adaptativo Android + monocromo + notificación; AppIcon 1024 de iOS (estaba vacío).

### Despliegue (08-10, verificado)
- Desplegado `api` + `web` con todo lo anterior y lo de Cursor. Migraciones `media_owner` y
  `aviso_aventon_cancelado` aplicadas. Respaldo previo: `/root/db-backups/agora/agora-predeploy-20261008.sql.gz`.
  Rollback: imágenes `agora-api:prev-20261008` y `agora-web:prev-20261008`.
- Humo: salud ok, páginas 200, `/api/auth/otp/entrega` 404 para id desconocido, cuenta/media 401 sin sesión.
- Webhook de Brevo llega (Traefik: POST `/api/correo/brevo/*` → 204), pero Brevo lo manda con 30–40 s
  de retraso. El estado llega a la pantalla en ~45 s.

### Incidente del servidor (08-10, ~15:30 UTC)
- Replicar el CI en el Hetzner (Playwright + Postgres de prueba) **llenó el disco al 100 %**:
  `nexara-db`/`family-db` con «No space left on device» y NEXARA en 503 (su health exige < 90 %).
  Recuperado borrando lo propio (imagen Playwright, carpeta, 6 volúmenes anónimos de hoy) y
  `docker builder prune`. Disco ahora ~84 %. **No correr e2e en el servidor. Nunca `docker volume prune`**
  (hay volúmenes con nombre «sin usar» con datos viejos: `nexara-db-data`, `zynoratek-app_pgdata`…).

## A medias - CUIDADO

- **E2E sin correr**: Docker Desktop local no arranca (socket `sailor-ingest`, necesita reiniciar
  Windows; nunca «Reset to factory defaults») y **GitHub Actions no corre ningún job desde el 27-09
  por un problema de cobro** de la cuenta. Con cualquiera de los dos: `pnpm test:e2e` (anonimo, cuenta…).
- El CI fija `NODE_ENV=development` para todo el job y `next build` del admin falla así; el build debe
  correr con `NODE_ENV=production` (arreglado el 12-10 en `ci.yml`).
- iOS sin compilar: el workflow `.github/workflows/ios.yml` (macos-15, XcodeGen, simulador + capturas)
  es la primera compilación real en cuanto Actions vuelva. Pendiente en iOS: visor con zoom desde el feed.
  Lo del 21-10 (`LoginView`, `CampoContrasena`, `AuthRepository`, `AjustesView.seccionContrasena`,
  `AuthModelsTests`) también va **SIN COMPILAR**: revisar errores de Swift al primer build.
- Android con contraseña compilado y con unitarias, pero sin probar en el AVD contra producción.
- Admin (`apps/admin`) sigue con el ícono viejo (no está desplegado).
- `udlagora.com` sin MX (Email Routing de Cloudflare sin configurar).
- `apps/web/tsconfig.tsbuildinfo` y `apps/admin/tsconfig.tsbuildinfo` están versionados y cambian con
  cada typecheck: no commitearlos.

## Siguiente paso

1. Probar en producción con una cuenta real: crear cuenta, entrar con contraseña, olvidé,
   cambiar en Ajustes (la sesión lateral de móvil está en marcha: no hacer `cerrar` con
   `add -A` mientras trabaje; commits con rutas explícitas).
3. Tiendas: Adam corre los 4 pasos de `docs/store/README.md` (secretos iOS, app en ASC, llave Android,
   app en Play) → Claude lanza «iOS · TestFlight» y «Android · Play» → prueba interna / TestFlight →
   ficha, capturas y cuenta de revisión → enviar a revisión.
   **22-10 (sesión lateral de tiendas):** los 9 secretos ya están en el repo (Adam inició sesión de `gh`
   en el panel; Claude sacó el Issuer ID de ASC y corrió `subir-secretos-ios.ps1 -IssuerId …`). La app
   de App Store Connect **no existía** (el primer TestFlight murió en «Error Downloading App
   Information»): Claude la creó: **«Ágora UDLAP», id `6825863471`**, es-MX, SKU `AGORA-IOS`, bundle
   `mx.agora.mobile.AgoraApp`, acceso ilimitado. **TestFlight 1.0.0 (2) subido** (corrida 39816719592,
   solo iPhone, aps production, enlaces universales); falta que Apple lo procese y agregar testers
   internos. «Android · Play» en verde: AAB 1.0.0 (código 2) firmado con la llave de subida, copia en
   `Documents\AGORA-builds\agora-1.0.0-2.aab` (para la siguiente versión; la 1 ya está en Play).
   **22-10 13:13, por orden de Adam («dale guardar y publicar a todo, acepta todo»):** prueba interna de
   Play **publicada** (versión 1 (1.0.0), «Disponible para testers internos»; nombre temporal
   «mx.agora.mobile.nativeapp (unreviewed)» hasta completar la ficha), listas de testers «Equipo
   Finanvoz» y «Plantilla nexara» (1 correo cada una), enlace para unirse
   https://play.google.com/apps/internaltest/4701647825350555249. **Acuerdo nuevo del Apple Developer
   Program aceptado.** TestFlight: build 2 procesada (VALID, «Lista para enviar»), grupo interno
   «Equipo Ágora» con distribución automática y Adam (ad.pozo.ont@icloud.com) invitado.
   Falta para tienda pública: ficha, capturas, cuenta de revisión, cuestionarios de Play y enviar a revisión.
   **Bug visto en TestFlight 1.0.0 (2):** en iOS «Enviarme el código» no respondía: con un ButtonStyle
   propio SwiftUI solo recibe toques donde hay algo dibujado y los Spacer alrededor del texto son
   transparentes (el servidor no recibió ninguna petición `otp/solicitar`; solo el 401 de `entrar`).
   Arreglado con `.contentShape` en `AgoraScaleButtonStyle` (todos los botones naranja y de contorno);
   va en la build 3 de TestFlight.
4. Android/iOS: probar el login con contraseña en el AVD (`nexara_phone`) contra producción: entrar,
   olvidé → crear, Ajustes → cambiar.
5. Adam: cobro de GitHub ya no bloquea (repo público); queda arreglar el banco para los repos privados.

## No tocar

- **`.env`** / **`deploy/.env`** salvo `MAIL_FROM` y `CORREO_WEBHOOK_TOKEN`.
- `git reset --hard` / `checkout --` / `clean` / `stash drop`.
- No regenerar secretos con `setup-server-env.sh`. No `docker volume prune` en el Hetzner.

## Mapa rápido del proyecto

Monorepo pnpm + turbo. Deploy VPS: `/var/www/udlagora-app` (copia sin git; se sube con
`git -c core.autocrlf=false archive HEAD | ssh … tar -x`, luego `docker compose -f
deploy/docker-compose.yml build api web && … up -d --no-deps api web`; antes etiquetar
`agora-api:latest`/`agora-web:latest` como `prev-AAAAMMDD` para poder volver). Dominio **udlagora.com**.
Remitente de códigos: `Ágora · Zynora Tek <contacto@zynoratek.com>` (respaldo `acceso@udlagora.com`).
Remotos: `origin` (GitHub, privado) y `hetzner` (`/srv/git/AGORA-app.git`).
Android: `.\gradlew.bat :app:assembleDebug -PDEBUG_API_BASE_URL=https://udlagora.com/api`, AVD `nexara_phone`.
