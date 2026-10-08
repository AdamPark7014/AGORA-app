package mx.agora.mobile.nativeapp.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class SolicitarOtpRequest(val email: String)

@JsonClass(generateAdapter = true)
data class VerificarOtpRequest(
    val email: String,
    val codigo: String,
    val modo: String = "token",
)

@JsonClass(generateAdapter = true)
data class VerificarOtpResponse(
    val tienePerfil: Boolean,
    val token: String? = null,
)

@JsonClass(generateAdapter = true)
data class YoResponse(
    val handle: String? = null,
    val nombre: String? = null,
    val email: String? = null,
    val tienePerfil: Boolean? = null,
    val esStaff: Boolean = false,
    val puedeModerar: Boolean = false,
    val puedeSuspender: Boolean = false,
    val fotoUrl: String? = null,
)

/** Estado de la entrega del código OTP (`GET auth/otp/entrega/{envioId}`). */
@JsonClass(generateAdapter = true)
data class EntregaOtpResponse(val estado: String)

@JsonClass(generateAdapter = true)
data class AutorDto(
    val handle: String? = null,
    val nombre: String? = null,
    val fotoUrl: String? = null,
    val verificado: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class MediaDto(
    val url: String,
    val mime: String? = null,
    val esVideo: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class OpcionEncuestaDto(
    val id: String,
    val texto: String,
    val votos: Int = 0,
)

@JsonClass(generateAdapter = true)
data class EncuestaDto(
    val pregunta: String,
    val opciones: List<OpcionEncuestaDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class ComunidadDto(
    val slug: String,
    val nombre: String,
    val silenciada: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class PostDto(
    val id: String,
    val texto: String,
    val createdAt: String,
    val estado: String? = null,
    val autor: AutorDto? = null,
    val comunidad: ComunidadDto,
    val media: List<MediaDto> = emptyList(),
    val encuesta: EncuestaDto? = null,
    val numComments: Int = 0,
    val numReactions: Int = 0,
    val miReaccion: String? = null,
    val miGuardado: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class ComentarioDto(
    val id: String,
    val texto: String,
    val createdAt: String,
    val autor: AutorDto? = null,
)

@JsonClass(generateAdapter = true)
data class PostDetalleDto(
    val id: String,
    val texto: String,
    val createdAt: String,
    val estado: String? = null,
    val autor: AutorDto? = null,
    val comunidad: ComunidadDto,
    val media: List<MediaDto> = emptyList(),
    val encuesta: EncuestaDto? = null,
    val numComments: Int = 0,
    val numReactions: Int = 0,
    val miReaccion: String? = null,
    val miGuardado: Boolean = false,
    val comentarios: List<ComentarioDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class CrearComentarioRequest(val texto: String)

@JsonClass(generateAdapter = true)
data class CrearComentarioResponse(val id: String, val aviso: String? = null)

@JsonClass(generateAdapter = true)
data class ReaccionarRequest(val tipo: String? = null)

@JsonClass(generateAdapter = true)
data class ReaccionarResponse(val miReaccion: String? = null)

@JsonClass(generateAdapter = true)
data class VotarEncuestaRequest(val opcionId: String)

@JsonClass(generateAdapter = true)
data class VotarEncuestaResponse(
    val opciones: List<OpcionEncuestaDto> = emptyList(),
    val miVoto: String? = null,
)

@JsonClass(generateAdapter = true)
data class EditarPostRequest(val texto: String)

@JsonClass(generateAdapter = true)
data class EditarPostResponse(val aviso: String? = null)

@JsonClass(generateAdapter = true)
data class CrearReporteRequest(
    val postId: String? = null,
    val commentId: String? = null,
    val motivo: String,
    val detalle: String? = null,
)

@JsonClass(generateAdapter = true)
data class PreguntaOpcionDto(
    val indice: Int,
    val texto: String,
    val votos: Int? = null,
)

@JsonClass(generateAdapter = true)
data class SemanaPreguntaDto(
    val respondidas: Int,
    val meta: Int,
)

@JsonClass(generateAdapter = true)
data class PreguntaHoyDto(
    val id: String,
    val texto: String,
    val yaRespondi: Boolean,
    val miOpcion: Int? = null,
    val total: Int = 0,
    val opciones: List<PreguntaOpcionDto> = emptyList(),
    val nuevasInsignias: List<String>? = null,
    val semanaPregunta: SemanaPreguntaDto? = null,
)

@JsonClass(generateAdapter = true)
data class ResponderPreguntaRequest(val opcion: Int)

@JsonClass(generateAdapter = true)
data class FeedResponse(
    val publicaciones: List<PostDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class CrearEncuestaRequest(
    val pregunta: String,
    val opciones: List<String>,
)

@JsonClass(generateAdapter = true)
data class CrearPostRequest(
    val comunidadSlug: String,
    val texto: String,
    val mediaIds: List<String> = emptyList(),
    val encuesta: CrearEncuestaRequest? = null,
)

@JsonClass(generateAdapter = true)
data class CrearPostResponse(
    val id: String,
    val nuevasInsignias: List<String>? = null,
)

@JsonClass(generateAdapter = true)
data class MediaUploadResponse(
    val id: String,
    val url: String,
    val mime: String? = null,
)

@JsonClass(generateAdapter = true)
data class PerfilMioDto(
    val handle: String,
    val nombre: String,
    val apellidos: String,
    val bio: String? = null,
    val fotoUrl: String? = null,
    val ciudadOrigen: String? = null,
    val instagram: String? = null,
    val intereses: List<String> = emptyList(),
    val busco: String? = null,
    val visibilidad: String? = null,
    val portadaUrl: String? = null,
    val cumpleMes: Int? = null,
    val cumpleDia: Int? = null,
)

@JsonClass(generateAdapter = true)
data class CrearPerfilRequest(
    val handle: String,
    val nombre: String,
    val apellidos: String,
    val generacion: Int,
    val carreraSlug: String,
    val colegioSlug: String? = null,
)

@JsonClass(generateAdapter = true)
data class CrearPerfilResponse(
    val handle: String,
    val comunidades: Int,
)

@JsonClass(generateAdapter = true)
data class CarreraDto(val slug: String, val nombre: String)

@JsonClass(generateAdapter = true)
data class EscuelaDto(
    val slug: String,
    val nombre: String,
    val carreras: List<CarreraDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class ColegioDto(val slug: String, val nombre: String)

@JsonClass(generateAdapter = true)
data class CatalogoDto(
    val escuelas: List<EscuelaDto> = emptyList(),
    val colegios: List<ColegioDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class EventoDto(
    val id: String,
    val titulo: String,
    val descripcion: String? = null,
    val tipo: String,
    val lugar: String? = null,
    val inicioAt: String,
    val costoMxn: Int? = null,
    val vanAIr: Int = 0,
    val miRespuesta: String? = null,
    val comunidad: ComunidadDto? = null,
    val cupo: Int? = null,
    val finAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class EventosResponse(val eventos: List<EventoDto> = emptyList())

@JsonClass(generateAdapter = true)
data class EventoEnVivoDto(
    val id: String,
    val titulo: String,
    val inicioAt: String,
    val lugar: String? = null,
    val vanAIr: Int = 0,
    val empiezaEnMinutos: Int? = null,
    val enCurso: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class EventosEnVivoResponse(val eventos: List<EventoEnVivoDto> = emptyList())

@JsonClass(generateAdapter = true)
data class ResponderEventoRequest(val respuesta: String)

@JsonClass(generateAdapter = true)
data class NotificacionDto(
    val id: String,
    val tipo: String,
    val texto: String,
    val url: String? = null,
    val leida: Boolean,
    val createdAt: String,
    val actor: AutorDto? = null,
)

@JsonClass(generateAdapter = true)
data class NotificacionesResponse(
    val notificaciones: List<NotificacionDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class SinLeerResponse(val total: Int)

@JsonClass(generateAdapter = true)
data class ApiErrorBody(
    val message: String? = null,
    val mensaje: String? = null,
    @Json(name = "errores") val errores: List<ApiFieldError>? = null,
)

@JsonClass(generateAdapter = true)
data class ApiFieldError(val mensaje: String? = null)

@JsonClass(generateAdapter = true)
data class ParticipanteConversacionDto(
    val handle: String,
    val nombre: String,
    val fotoUrl: String? = null,
)

@JsonClass(generateAdapter = true)
data class ConversacionDto(
    val id: String,
    val con: ParticipanteConversacionDto? = null,
    val ultimoTexto: String? = null,
    val ultimoAt: String,
    val mioElUltimo: Boolean = false,
    val noLeidos: Int = 0,
)

@JsonClass(generateAdapter = true)
data class BandejaResponse(val conversaciones: List<ConversacionDto> = emptyList())

@JsonClass(generateAdapter = true)
data class MensajeDto(
    val id: String,
    val texto: String,
    val createdAt: String,
    val mio: Boolean,
    val autor: AutorDto? = null,
)

@JsonClass(generateAdapter = true)
data class ConversacionDetalleResponse(
    val con: ParticipanteConversacionDto? = null,
    val mensajes: List<MensajeDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class EnviarMensajeRequest(val texto: String)

@JsonClass(generateAdapter = true)
data class AbrirConversacionRequest(val handle: String)

@JsonClass(generateAdapter = true)
data class AbrirConversacionResponse(val id: String)

@JsonClass(generateAdapter = true)
data class PerfilAjenoDto(
    val handle: String,
    val nombre: String,
    val apellidos: String,
    val bio: String? = null,
    val fotoUrl: String? = null,
    val ciudadOrigen: String? = null,
    val instagram: String? = null,
    val intereses: List<String> = emptyList(),
    val seguidores: Int? = null,
    val siguiendo: Int? = null,
    val publicaciones: Int? = null,
    val generacion: Int? = null,
    val carrera: String? = null,
    val escuela: String? = null,
    val restringido: Boolean = false,
    val yoLeSigo: Boolean = false,
    val verificado: Boolean = false,
    val portadaUrl: String? = null,
    val colegio: String? = null,
    val suspendido: Boolean = false,
)

/** Fila de `GET perfil/{handle}/seguidores` y `/siguiendo`. */
@JsonClass(generateAdapter = true)
data class PersonaListaDto(
    val handle: String,
    val nombre: String,
    val fotoUrl: String? = null,
    val verificado: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class ListaPersonasResponse(
    val personas: List<PersonaListaDto> = emptyList(),
    val restringido: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class PerfilPublicacionDto(
    val id: String,
    val texto: String,
    val createdAt: String,
    val comunidad: String,
    val numComments: Int = 0,
    val numReactions: Int = 0,
)

@JsonClass(generateAdapter = true)
data class PerfilPublicacionesResponse(
    val publicaciones: List<PerfilPublicacionDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class SeguirResponse(val siguiendo: Boolean)

@JsonClass(generateAdapter = true)
data class BuscarPersonaDto(
    val handle: String,
    val nombre: String,
    val fotoUrl: String? = null,
    val carrera: String? = null,
)

@JsonClass(generateAdapter = true)
data class BuscarPublicacionDto(
    val id: String,
    val texto: String,
    val createdAt: String,
    val autor: AutorDto? = null,
    val comunidad: String,
)

@JsonClass(generateAdapter = true)
data class BuscarEventoDto(
    val id: String,
    val titulo: String,
    val lugar: String? = null,
    val inicioAt: String,
)

@JsonClass(generateAdapter = true)
data class BuscarAnuncioDto(
    val id: String,
    val titulo: String,
    val precioMxn: Int,
)

@JsonClass(generateAdapter = true)
data class BuscarResponse(
    val personas: List<BuscarPersonaDto> = emptyList(),
    val publicaciones: List<BuscarPublicacionDto> = emptyList(),
    val eventos: List<BuscarEventoDto> = emptyList(),
    val anuncios: List<BuscarAnuncioDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class DirectorioPersonaDto(
    val handle: String,
    val nombre: String,
    val apellidos: String,
    val generacion: Int? = null,
    val carrera: String? = null,
    val escuela: String? = null,
)

@JsonClass(generateAdapter = true)
data class DirectorioResponse(
    val resultados: List<DirectorioPersonaDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class HashtagPublicacionesResponse(
    val publicaciones: List<PostDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class GuardadosResponse(
    val publicaciones: List<PostDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class GuardarResponse(val guardado: Boolean)

// --- Marketplace ---

@JsonClass(generateAdapter = true)
data class AnuncioDto(
    val id: String,
    val titulo: String,
    val descripcion: String,
    val categoria: String,
    val precioMxn: Int,
    val estadoVenta: String,
    val createdAt: String,
    val imagenes: List<String> = emptyList(),
    val vendedor: AutorDto? = null,
    val esMio: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class AnunciosResponse(
    val anuncios: List<AnuncioDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class AnuncioDetalleDto(
    val id: String,
    val titulo: String,
    val descripcion: String,
    val categoria: String,
    val precioMxn: Int,
    val estadoVenta: String,
    val createdAt: String,
    val imagenes: List<MediaDto> = emptyList(),
    val vendedor: AutorDto? = null,
    val esMio: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class CrearAnuncioRequest(
    val titulo: String,
    val descripcion: String,
    val categoria: String,
    val precioMxn: Int,
    val imagenIds: List<String> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class CrearAnuncioResponse(val id: String)

@JsonClass(generateAdapter = true)
data class ActualizarAnuncioRequest(val estadoVenta: String)

@JsonClass(generateAdapter = true)
data class ActualizarAnuncioResponse(val estadoVenta: String)

// --- Aventones ---

@JsonClass(generateAdapter = true)
data class AventonDto(
    val id: String,
    val sentido: String,
    val origen: String,
    val destino: String,
    val salidaAt: String,
    val lugares: Int,
    val ocupados: Int,
    val cuotaMxn: Int,
    val nota: String? = null,
    val conductor: AutorDto? = null,
    val voyYo: Boolean = false,
    val esMio: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class AventonesResponse(val aventones: List<AventonDto> = emptyList())

@JsonClass(generateAdapter = true)
data class CrearAventonRequest(
    val sentido: String,
    val origen: String,
    val destino: String,
    val salidaAt: String,
    val lugares: Int,
    val cuotaMxn: Int,
    val nota: String? = null,
)

@JsonClass(generateAdapter = true)
data class CrearAventonResponse(
    val id: String,
    val nuevasInsignias: List<String>? = null,
)

@JsonClass(generateAdapter = true)
data class ApartarAsientoResponse(val voyYo: Boolean, val ocupados: Int)

// --- Anónimo ---

@JsonClass(generateAdapter = true)
data class AnonimoEstadoResponse(val habilitada: Boolean)

@JsonClass(generateAdapter = true)
data class AnonimoAliasResponse(val alias: String)

@JsonClass(generateAdapter = true)
data class AnonimoPostDto(
    val id: String,
    val texto: String,
    val createdAt: String,
    val alias: String,
    val esMio: Boolean = false,
    val numComments: Int = 0,
    val numReactions: Int = 0,
    val miReaccion: String? = null,
)

@JsonClass(generateAdapter = true)
data class AnonimoFeedResponse(
    val publicaciones: List<AnonimoPostDto> = emptyList(),
    val siguienteCursor: String? = null,
)

@JsonClass(generateAdapter = true)
data class PublicarAnonimoRequest(val texto: String)

@JsonClass(generateAdapter = true)
data class PublicarAnonimoResponse(val id: String, val alias: String, val aviso: String? = null)

// --- Eventos detalle ---

@JsonClass(generateAdapter = true)
data class EventoDetalleDto(
    val id: String,
    val titulo: String,
    val descripcion: String? = null,
    val tipo: String,
    val lugar: String? = null,
    val inicioAt: String,
    val finAt: String? = null,
    val costoMxn: Int? = null,
    val cupo: Int? = null,
    val esMio: Boolean = false,
    val autor: AutorDto? = null,
    val comunidad: ComunidadDto? = null,
    val vanAIr: Int = 0,
    val miRespuesta: String? = null,
)

@JsonClass(generateAdapter = true)
data class ResponderEventoResponse(val miRespuesta: String? = null)

@JsonClass(generateAdapter = true)
data class CrearEventoRequest(
    val titulo: String,
    val descripcion: String,
    val tipo: String,
    val lugar: String,
    val inicioAt: String,
    val finAt: String? = null,
    val costoMxn: Int? = null,
    val cupo: Int? = null,
    val comunidadSlug: String? = null,
)

@JsonClass(generateAdapter = true)
data class CrearEventoResponse(
    val id: String,
    val estado: String? = null,
    val aviso: String? = null,
)

// --- Perfil / ajustes ---

@JsonClass(generateAdapter = true)
data class ActualizarPerfilRequest(
    val bio: String? = null,
    val fotoMediaId: String? = null,
    val ciudadOrigen: String? = null,
    val instagram: String? = null,
    val intereses: List<String>? = null,
    val busco: String? = null,
    val visibilidad: String? = null,
    val portadaMediaId: String? = null,
    /** Mes y día van juntos o ninguno (la API rechaza solo uno). */
    val cumpleMes: Int? = null,
    val cumpleDia: Int? = null,
)

@JsonClass(generateAdapter = true)
data class SilenciarComunidadRequest(val silenciada: Boolean)

@JsonClass(generateAdapter = true)
data class EliminarCuentaRequest(val confirmacion: String)

// --- Bloqueos ---

@JsonClass(generateAdapter = true)
data class BloqueoEstadoDto(
    val bloqueado: Boolean = false,
    val silenciado: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class BloquearRequest(val soloSilencio: Boolean = false)

// --- Notificaciones preferencias ---

@JsonClass(generateAdapter = true)
data class PreferenciaNotificacionDto(
    val tipo: String,
    val inApp: Boolean,
    val push: Boolean,
)

@JsonClass(generateAdapter = true)
data class PreferenciasNotificacionResponse(
    val preferencias: List<PreferenciaNotificacionDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class ActualizarPreferenciasRequest(
    val preferencias: List<PreferenciaNotificacionDto>,
)

// --- Push (FCM nativo vía suscripción sintética) ---

@JsonClass(generateAdapter = true)
data class PushKeysDto(
    val p256dh: String,
    val auth: String,
)

@JsonClass(generateAdapter = true)
data class PushSubscriptionRequest(
    val endpoint: String,
    val keys: PushKeysDto,
)

@JsonClass(generateAdapter = true)
data class PushSubscribeResponse(val ok: Boolean = false)

@JsonClass(generateAdapter = true)
data class ExpoPushTokenRequest(val token: String)

@JsonClass(generateAdapter = true)
data class FcmPushTokenRequest(val token: String)

// --- Moderación ---

@JsonClass(generateAdapter = true)
data class ModeracionAutorDto(
    val id: String,
    val handle: String,
    val nombre: String,
    val suspendido: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class ModeracionColaItemDto(
    val reporteId: String,
    val numReportes: Int,
    val motivos: List<String> = emptyList(),
    val tipo: String,
    val texto: String,
    val comunidad: String? = null,
    val autor: ModeracionAutorDto? = null,
)

@JsonClass(generateAdapter = true)
data class ModeracionColaResponse(
    val items: List<ModeracionColaItemDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class ResolverReporteRequest(
    val accion: String,
    val motivo: String,
)

/** `POST moderacion/posts/{id}/retirar`: el motivo lo ve el autor (3–500). */
@JsonClass(generateAdapter = true)
data class RetirarPostRequest(val motivo: String)

@JsonClass(generateAdapter = true)
data class AnalyticsEventoRequest(
    val nombre: String,
    val propiedades: Map<String, String>? = null,
    val timestamp: Long,
)

@JsonClass(generateAdapter = true)
data class AnalyticsCrashRequest(
    val mensaje: String,
    val stack: String? = null,
    val plataforma: String,
    val version: String? = null,
)

@JsonClass(generateAdapter = true)
data class HashtagTrendingDto(val tag: String, val usos: Int)

@JsonClass(generateAdapter = true)
data class HashtagsTrendingResponse(val hashtags: List<HashtagTrendingDto> = emptyList())

@JsonClass(generateAdapter = true)
data class CumpleDto(val handle: String, val nombre: String, val fotoUrl: String? = null)

@JsonClass(generateAdapter = true)
data class CumplesResponse(val cumples: List<CumpleDto> = emptyList())

@JsonClass(generateAdapter = true)
data class GamificacionBadgeDto(
    val codigo: String,
    val etiqueta: String,
    val emoji: String,
    val otorgadoAt: String,
)

@JsonClass(generateAdapter = true)
data class ComparacionCampusDto(
    val promedioRacha: Int,
    val tuRacha: Int,
    val porEncimaDelPromedio: Boolean,
)

@JsonClass(generateAdapter = true)
data class RetoSemanalDto(
    val titulo: String,
    val progreso: Int,
    val meta: Int = 7,
    val completado: Boolean,
)

@JsonClass(generateAdapter = true)
data class GamificacionDto(
    val rachaActual: Int = 0,
    val rachaMaxima: Int = 0,
    val badges: List<GamificacionBadgeDto> = emptyList(),
    val comparacionCampus: ComparacionCampusDto? = null,
    val retoSemanal: RetoSemanalDto? = null,
    val duelosGanados: Int? = null,
)

@JsonClass(generateAdapter = true)
data class GamificacionPingDto(
    val nuevasInsignias: List<String> = emptyList(),
    val gamificacion: GamificacionDto,
)

@JsonClass(generateAdapter = true)
data class LeaderboardEntryDto(
    val handle: String,
    val nombre: String,
    val fotoUrl: String? = null,
    val rachaActual: Int,
)

@JsonClass(generateAdapter = true)
data class LeaderboardResponseDto(
    val entradas: List<LeaderboardEntryDto> = emptyList(),
    val miPosicion: Int? = null,
)

@JsonClass(generateAdapter = true)
data class RetoAmigoParticipanteDto(
    val handle: String,
    val nombre: String,
)

@JsonClass(generateAdapter = true)
data class RetoAmigoDto(
    val id: String,
    val retador: RetoAmigoParticipanteDto,
    val retado: RetoAmigoParticipanteDto,
    val tipo: String,
    val estado: String,
    val puntajeRetador: Int = 0,
    val puntajeRetado: Int = 0,
    val ganando: String? = null,
)

@JsonClass(generateAdapter = true)
data class RetosActivosResponse(
    val pendientes: List<RetoAmigoDto> = emptyList(),
    val activos: List<RetoAmigoDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class ResponderRetoRequest(val aceptar: Boolean)

@JsonClass(generateAdapter = true)
data class PuedeRetarResponse(
    val puedeRetar: Boolean,
    val motivo: String? = null,
)

@JsonClass(generateAdapter = true)
data class CrearRetoRequest(
    val retadoHandle: String,
    val tipo: String,
)

@JsonClass(generateAdapter = true)
data class CrearRetoResponse(
    val id: String,
    val estado: String,
)

@JsonClass(generateAdapter = true)
data class RetosRankingSemanalEntradaDto(
    val handle: String,
    val nombre: String,
    val fotoUrl: String? = null,
    val victorias: Int,
)

@JsonClass(generateAdapter = true)
data class RetosRankingSemanalResponse(
    val entradas: List<RetosRankingSemanalEntradaDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class RetoHistorialDto(
    val id: String,
    val retador: RetoAmigoParticipanteDto,
    val retado: RetoAmigoParticipanteDto,
    val tipo: String,
    val estado: String,
    val puntajeRetador: Int? = null,
    val puntajeRetado: Int? = null,
    val ganando: String? = null,
    val createdAt: String,
    val activadoAt: String? = null,
    val resultado: String? = null,
)

@JsonClass(generateAdapter = true)
data class RetosHistorialResponse(
    val items: List<RetoHistorialDto> = emptyList(),
    val siguienteCursor: String? = null,
)
