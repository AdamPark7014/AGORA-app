# Diseño D de Ágora (aprobado por Adam el 23-10-2026)

Mockups: https://claude.ai/artifact/FWFgnBnjxfAT9HTojpUDuU (artboards `FeedD`, `Reels`, `Evento`, `Perfil`,
`Mercado`, `Registro`, `Bienvenida`). Adam eligió la D: el feed B «fotos primero» que le gustó, más los clips,
pero con identidad propia de Ágora para que «no parezca copia de Instagram». Esta guía es la fuente para web,
Android e iOS: si una plataforma se aparta, se corrige la plataforma, no la guía.

## 0. Cambio del 26-10-2026: el inicio sigue Feed B

Adam, revisando el canvas: «elegí el feed B principalmente». Desde la build 7 de iOS, **el inicio y la barra de
navegación siguen el artboard `FeedB`**; lo que FeedB no define sale de `Main`. El resto de las pantallas
(Evento, Perfil, Mercado, Registro, Bienvenida, Clips) siguen sus artboards de abajo.

- **Encabezado:** «Ágora» en Bricolage 700 naranja; a la derecha Avisos (punto si hay nuevos) y Mensajes (número,
  de Main). Sin fecha, sin avatar (va en la barra).
- **Historias:** fila de círculos de 60 con anillo naranja. Ágora no tiene historias que caduquen: cada círculo es
  un clip reciente (anillo gris si ya lo viste) y «Tu historia» lleva a publicar. Sin «Clips del campus» aparte.
- **Filtros (de Main):** píldoras Para ti / Siguiendo / tu carrera / tu generación.
- **Pregunta del día (de Main):** tarjeta naranja muy suave, opciones 2×2, barras al contestar.
- **Publicación:** a todo lo ancho, sin tarjeta ni banda de comunidad. Avatar redondo 36, @ y comunidad, foto de
  borde a borde (330/390 del ancho) con «1/3», corazón con el total de reacciones (las otras tres con pulsación
  larga), comentar con número, compartir, guardar a la derecha, pie «@ texto» y «Ver los N comentarios · hace…».
  Sin foto, el texto va arriba en grande (Main).
- **Fuera del inicio:** «Ahora en el campus», el mini evento y la fila de clips (ni FeedB ni Main los tienen).
- **Barra:** blanca con borde arriba (no flotante): Inicio, Eventos, Publicar (rectángulo con borde), Mercado y
  Tu perfil (tu foto). Campus (aventones, directorio, sin nombre, buscar, guardados, tu día, ajustes) se abre
  desde el menú de tu perfil.
- **Colores del inicio:** fondo `#FFFFFF`, tinta `#0F1419`, secundario `#536471`, bordes `#EEF0F2`; en oscuro, los
  tonos de la D (`#0F0D0B`, `#F4F2EF`, `#B3AAA1`, `#2E2925`).
- **Android (27-10, versión 7 de Play):** mismo inicio y misma barra que iOS (`FeedB.kt`, `MainShell.kt`). Clips ya
  no es pestaña: se abre a pantalla completa desde una historia. Campus (con «Tu día») se abre desde el ☰ de Tu
  perfil. Un video del inicio solo enseña sus controles al tocarlo.

## 1. Qué la hace propia (no quitar)

1. **Lo del campus arriba:** fecha y semana del semestre, «Ahora en el campus» en vivo, la pregunta relámpago
   con resultados de *tu carrera contra el campus*.
2. **La comunidad manda:** cada publicación lleva su banda de comunidad (carrera, generación, colegio) arriba.
3. **Reacciones propias con conteo:** Me late, Me rió, Apoyo, No mames, como chips con número.
4. **Tarjetas, no sangrado:** las fotos y videos van dentro de la tarjeta con esquinas redondeadas.
5. **Clips del campus:** videos verticales con la comunidad de origen y, si hay, el evento ligado.
6. **Barra de navegación oscura flotante**, con Publicar en naranja.

## 2. Tokens

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `fondo` | `#F4F2EF` | `#0F0D0B` | fondo de pantalla (cálido, no gris frío) |
| `superficie` | `#FFFFFF` | `#1B1815` | tarjetas |
| `superficie-2` | `#E9E5DF` | `#24201C` | segmentos, chips inactivos |
| `tinta` | `#14110F` | `#F4F2EF` | texto principal, botones oscuros, barra de navegación (claro) |
| `tinta-media` | `#6B625B` | `#B3AAA1` | secundario (contraste ≥ 4.5:1 sobre `fondo` y `superficie`) |
| `borde` | `#E6E1DB` | `#2E2925` | bordes de 1 px |
| `naranja` | `#E35205` | `#FF6B26` | acento: Publicar, Voy, chip activo, enlaces |
| `naranja-suave` | `#FDE8DC` | `#2A1509` | banda de comunidad, chip de reacción activo |
| `naranja-tinta` | `#9A3503` | `#FFB385` | texto sobre `naranja-suave` |
| `vivo` | `#16A34A` | `#22C55E` | punto de «Ahora en el campus» |
| `oscuro` | `#14110F` | `#24201C` | tarjeta de la pregunta, barra de navegación flotante, barra de acciones del evento |

Radios: tarjeta 22, foto dentro de tarjeta 16, botón 14, chip 12, avatar 14 (cuadrado redondeado; 28 en el
perfil). Espaciado: márgenes de pantalla 18 (tarjetas a 14), separación entre tarjetas 12. Áreas táctiles ≥ 44.

Tipografía: **Bricolage Grotesque** 700–800 para títulos (marca, nombres de sección, títulos de evento y de
perfil, cifras), **Outfit** 400–700 para todo lo demás. Web ya las carga; Android e iOS las empaquetan
(Google Fonts, OFL) o usan la del sistema solo como respaldo.

## 3. Componentes

- **Encabezado de inicio:** «Ágora» (Bricolage 800, 30) + «Jueves 23 de octubre · semana 10» en `tinta-media`;
  a la derecha Mensajes (con contador) y tu avatar con la insignia de racha (llama + número).
- **Segmento** Campus / Mi carrera / Siguiendo: fondo `superficie-2`, el activo en `superficie` con sombra leve.
- **Ahora en el campus:** punto `vivo` + etiqueta en versalitas; tarjetas pequeñas desplazables: eventos en
  curso o en las próximas 3 h (`GET /eventos/en-vivo`), aventones que salen pronto y cuántos van.
- **Pregunta relámpago:** tarjeta `oscuro`, rayo naranja, «cierra en m:ss», opciones como barras de porcentaje
  (la mía en naranja), y abajo «<Tu carrera> votó X % <opción> · el campus Y %» + número de respuestas.
- **Tarjeta de publicación:** banda de comunidad (ícono por tipo + NOMBRE en versalitas, `naranja-suave`) →
  autor (avatar 40, nombre, «Gen 2023 · hace 1 h», menú «…») → texto con #hashtags en `naranja-tinta` →
  media en cuadrícula (1: completa; 2: mitades; 3+: grande + dos chicas, «+N»; video con ▶ y duración) →
  chips de reacción con conteo (el mío con borde naranja) → «6 comentarios» + Comentar / Compartir / Guardar.
- **Clips del campus:** fila desplazable de tarjetas 132×200 (radio 18): chip de comunidad arriba, título y
  vistas abajo; «Ver todos» abre la pantalla de clips.
- **Mini evento «Tu generación va»:** bloque de fecha naranja (día + número), título, hora y lugar, botón «Voy»
  `tinta`. «Tu generación va» solo si el evento es de una comunidad de generación a la que perteneces; si no,
  «Van N» o «Van <amigo> y N más».
- **Barra de navegación flotante:** píldora `oscuro` con márgenes de 14, cinco destinos: Inicio, Clips,
  Publicar (botón naranja), Eventos, Campus (cuadrícula: Mercado, Aventones, Directorio, Sin nombre, Más).

## 4. Pantallas

| Pantalla | Qué cambia |
|---|---|
| Inicio (feed) | Todo lo del §3 en este orden: encabezado, segmento, Ahora en el campus, pregunta relámpago, publicaciones; cada ~5 publicaciones se intercala la fila de clips o un mini evento |
| Clips | Pantalla completa oscura: video vertical, pestañas Mi carrera / Campus, acciones a la derecha (Me late, Comentarios, Enviar, Guardar), chip de comunidad, autor con «Seguir», texto, evento ligado si lo hay, barra de progreso |
| Evento | Portada con esquinas (radio 24) y bloque de fecha encima; etiqueta de tipo y comunidad; título Bricolage 27; «quién va» con avatares; tarjetas Cómo llegar / aventones; descripción; organizador con «Mensaje»; barra fija `oscuro` con Calendario, Me interesa, Voy |
| Perfil | Portada, avatar cuadrado 88 que se monta sobre ella, solo **Seguir** y **Mensaje** a la vista; Retar, Silenciar, Bloquear y Reportar en el menú «…»; nombre Bricolage, «@handle · carrera · Gen · ciudad», bio, intereses y «Busca…» como chips; cifras (publicaciones, seguidores, siguiendo, racha); «Lo siguen X e Y · comparten <comunidad>»; pestañas Publicaciones / Fotos / Eventos / Aventones |
| Mercado | Título grande + «Vender»; buscador; chips de categoría; **cuadrícula de 2 columnas con foto**, precio sobre la foto, «Apartado» como etiqueta; sin foto: ícono de la categoría, no un gris vacío |
| Registro | Paso a paso con barra de progreso (n de 4); carrera con **buscador** y resultados resaltados en vez de la lista larga; generación con botones; «N de tu generación en <carrera> ya están aquí» si la API lo da |
| Bienvenida | Último paso: «Que no se te pase nada del campus», ejemplo de 3 avisos reales, «Activar avisos» (aquí se pide el permiso del sistema, nunca antes) y «Ahora no» |

Las demás pantallas (avisos, mensajes, buscar, directorio, guardados, ajustes, aventones, sin nombre, retos)
toman los tokens y componentes nuevos sin cambiar su estructura.

## 5. Contrato de la API para la D

Todo es aditivo: los clientes viejos ignoran los campos nuevos.

| Dato | Dónde | Forma |
|---|---|---|
| Reacciones por tipo | cada publicación del feed, del detalle y de guardados (las del perfil siguen con el total) | `reacciones: { ME_LATE: n, ME_RIO: n, APOYO: n, NO_MAMES: n }` (además de `numReactions`) |
| Solo clips | `GET /feed?tipo=clips` | mismas reglas de visibilidad que el feed; solo publicaciones con al menos un video (`media.mime` `video/*`) |
| Quién va | `GET /eventos/:id` y cada evento de `GET /eventos` | `asistentes: [{ handle, nombre, fotoUrl }]` (hasta 5; primero gente que sigues) |
| Seguidores en común | `GET /perfil/:handle` | `seguidoresEnComun: [{ handle, nombre, fotoUrl }]` (hasta 3) y `numSeguidoresEnComun` |
| Pregunta por carrera | `GET /pregunta/hoy` | ya existe (`miCarrera`) |
| En vivo | `GET /eventos/en-vivo` | ya existe |

## 6. Qué no hacer

- Sin emojis como íconos (íconos de línea), sin degradados de relleno, sin tarjetas con borde izquierdo de color.
- No copiar patrones exactos de Instagram o Facebook (historias en círculo, corazón doble toque como única acción).
- No inventar datos: si la API no da un número, la UI no lo muestra.
- No pedir el permiso de notificaciones fuera de la bienvenida o de Ajustes.
- Mantener los identificadores de accesibilidad que usan las pruebas (iOS: `tab.*`, `mas.*`, `login.*`,
  `registro.*`, `personal.*`, `teclado.listo`, `legal.cerrar`; ver `AgoraAppUITests`).
