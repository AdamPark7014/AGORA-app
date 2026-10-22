# Funciones para universitarios de 18 a 22 (22-10-2026)

Adam pidió una pasada de «UI/UX que perpetúe el uso amigable de un chavo de 18 años». Esto es lo que la app ya
tiene, lo que falta y en qué orden. Regla de Adam para lo visual: **mockup aprobado antes de construir**
(rechazó dos veces pantallas hechas a ciegas). Lo que no cambia la interfaz se construye directo.

## Lo que ya tiene (para no proponerlo otra vez)

Feed del campus y de comunidades automáticas (escuela, carrera, generación, colegio) · publicaciones con fotos,
video y encuestas · comentarios, cuatro reacciones, guardados, compartir, hashtags y menciones · seguir y
directorio por carrera o generación · mensajes directos en tiempo real · eventos con «Voy» / «Me interesa» ·
aventones con lugares · mercado con apartar y vendido · pregunta relámpago a hora sorpresa · rachas, insignias y
retos entre amigos · zona sin nombre con seudónimo · perfil con intereses, lo que buscas, Instagram, ciudad y
cumpleaños sin año · modo oscuro · avisos push con preferencias por tipo · búsqueda · sugerencias de gente ·
reportar, bloquear y silenciar.

## Construido en esta pasada (sin cambio visual grande)

| Función | Qué hace | Dónde |
|---|---|---|
| Recordatorio de eventos | Aviso ~1 h antes a quien dijo «Voy» o «Me interesa» | `apps/api/src/eventos/recordatorios.service.ts` (`97b7fe5`) |
| Recordatorio de aventones | Aviso ~30 min antes al conductor (si alguien va) y a cada pasajero | `apps/api/src/aventones/recordatorios.service.ts` |
| Agregar evento a mi calendario | Web: `.ics` con alarma 1 h antes (`GET /eventos/:id/calendario.ics`). Android: abre el calendario del teléfono ya lleno, sin permisos | `calendario.ts`, `ui/util/Calendario.kt` |
| Tu voto se queda marcado | La encuesta recuerda qué votaste al recargar | `vista-post.ts` → `encuesta.miVoto` |
| Comentarios anteriores | «Ver comentarios anteriores» en publicaciones largas (Android) | `PostDetailScreen.kt` |
| Avisos de moderación al publicar | Si la publicación queda en revisión o se retira, la app lo dice y no se pierde el texto | `PublicarScreen.kt` |
| Cola sin conexión honesta | Lo que el servidor rechaza sale de la cola y te avisa en vez de reintentar para siempre | `OfflineCache.kt` |

## Lo que falta, en orden

Esfuerzo: S = un día o menos, M = dos a cuatro días, L = una semana o más.

### Sin cambio visual grande: se construyen directo

| # | Función | Por qué importa a esa edad | Esfuerzo |
|---|---|---|---|
| 1 | **Agregar evento a mi calendario en iPhone** (web y Android ya lo tienen): `EKEventEditViewController` o abrir el `.ics` | Viven en el Calendario del iPhone; si no está ahí, no existe | S |
| 2 | **Felicitar cumpleaños** («Hoy cumple Sofía, de tu generación») a quien la sigue, respetando su visibilidad | El dato ya existe; es el empujón social más barato | S |
| 3 | **Silenciar palabras** (spoilers, temas que no quieres ver) | Control sin tener que bloquear a nadie | S |
| 4 | **Resumen del domingo**: un aviso con lo más comentado de tu carrera en la semana | Trae de vuelta a quien entró una vez y no regresó | M |
| 5 | **Aviso cuando alguien de tu carrera publica un evento** (opt-in, agrupado) | Hoy `EVENTO_NUEVO` sale apagado por defecto porque es ruidoso; agrupado deja de serlo | S |

### Visuales: mockup primero, luego construir

| # | Función | Por qué | Esfuerzo |
|---|---|---|---|
| A | **Permiso de notificaciones en contexto**: Android ya tiene bienvenida de 3 pantallas, pero el permiso del sistema salta antes, al entrar, sin explicar para qué. Pedirlo en la última pantalla de la bienvenida («Te avisamos cuando te escriban o empiece un evento al que vas») y llevar la misma bienvenida a iOS y web | Un «No permitir» al primer segundo es para siempre | S |
| B | **«Quién de tus amigos va»**: avatares de gente que sigues en eventos y aventones | La prueba social es lo que hace ir a un evento | S |
| C | **Compartir a historias de Instagram**: tarjeta con la marca de Ágora para un evento, una encuesta o la pregunta relámpago | Instagram es donde ya están; cada historia es publicidad gratis dentro del campus | M |
| D | **Notas de voz, fotos y reacciones en mensajes**, y «visto» opcional | Es como escriben en WhatsApp; sin eso el chat se siente viejo | M |
| E | **Grupos de estudio / busco equipo** por materia, con el campo «lo que buscas» del perfil | Necesidad real detectada en la investigación y hoy sin cubrir | L |
| F | **Historias del campus de 24 h** («lo que pasa ahora» en la Biblioteca, el Comedor, la Recta) | Contenido efímero = menos miedo a publicar | L |
| G | **Widget** de la pregunta relámpago y los eventos de hoy (iPhone y Android) | Presencia sin abrir la app | M |
| H | **GIFs y stickers** en comentarios | Lenguaje natural de esa edad; requiere llave de Tenor o GIPHY | S + llave |
| I | **Prompts de perfil** («mi lugar del campus», «la materia que me salvó») | Rompehielos para el directorio | S |

### Decisiones que son de Adam

- **Moderación automática:** el código ya tiene el filtro previo (`moderarTexto` / `moderarImagen`), pero
  producción no tiene `OPENAI_API_KEY`, así que hoy todo se publica y se modera solo por reportes. La moderación
  de OpenAI no cobra; falta crear la llave y ponerla en `deploy/.env`.
- **Contenido inicial:** producción tiene 0 publicaciones. Sin eventos y publicaciones reales del equipo, el
  primer estudiante (y el revisor de Apple) ve una red vacía.
