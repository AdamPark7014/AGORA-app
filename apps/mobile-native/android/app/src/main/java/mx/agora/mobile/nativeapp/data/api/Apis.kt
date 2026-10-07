package mx.agora.mobile.nativeapp.data.api

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface AuthApi {
    @POST("auth/otp/solicitar")
    suspend fun solicitarOtp(@Body body: SolicitarOtpRequest): Response<Unit>

    @POST("auth/otp/verificar")
    suspend fun verificarOtp(@Body body: VerificarOtpRequest): VerificarOtpResponse

    @GET("auth/yo")
    suspend fun yo(): YoResponse
}

interface FeedApi {
    @GET("feed")
    suspend fun feed(
        @Query("cursor") cursor: String? = null,
        @Query("comunidadSlug") comunidadSlug: String? = null,
        @Query("siguiendo") siguiendo: String? = null,
    ): FeedResponse
}

interface PostsApi {
    @POST("posts")
    suspend fun crear(@Body body: CrearPostRequest): CrearPostResponse

    @GET("posts/{id}")
    suspend fun detalle(@Path("id") id: String): PostDetalleDto

    @POST("posts/{id}/comentarios")
    suspend fun comentar(
        @Path("id") id: String,
        @Body body: CrearComentarioRequest,
    ): CrearComentarioResponse

    @POST("posts/{id}/reacciones")
    suspend fun reaccionar(
        @Path("id") id: String,
        @Body body: ReaccionarRequest,
    ): ReaccionarResponse

    @POST("posts/{id}/votos")
    suspend fun votar(
        @Path("id") id: String,
        @Body body: VotarEncuestaRequest,
    ): VotarEncuestaResponse

    @POST("posts/{id}/guardar")
    suspend fun guardar(@Path("id") id: String): GuardarResponse

    @PATCH("posts/{id}")
    suspend fun editar(
        @Path("id") id: String,
        @Body body: EditarPostRequest,
    ): EditarPostResponse

    @DELETE("posts/{id}")
    suspend fun borrar(@Path("id") id: String): Response<Unit>
}

interface PreguntaApi {
    @GET("pregunta/hoy")
    suspend fun hoy(): PreguntaHoyDto

    @POST("pregunta/{id}/responder")
    suspend fun responder(
        @Path("id") id: String,
        @Body body: ResponderPreguntaRequest,
    ): PreguntaHoyDto
}

interface ReportesApi {
    @POST("reportes")
    suspend fun reportar(@Body body: CrearReporteRequest): Response<Unit>
}

interface PerfilApi {
    @GET("perfil/mio")
    suspend fun mio(): PerfilMioDto

    @PATCH("perfil")
    suspend fun actualizar(@Body body: ActualizarPerfilRequest): PerfilMioDto

    @POST("perfil")
    suspend fun crear(@Body body: CrearPerfilRequest): CrearPerfilResponse

    @GET("perfil/mis-comunidades")
    suspend fun misComunidades(): List<ComunidadDto>

    @PATCH("perfil/comunidades/{slug}")
    suspend fun silenciarComunidad(
        @Path("slug") slug: String,
        @Body body: SilenciarComunidadRequest,
    ): ComunidadDto

    @GET("perfil/{handle}")
    suspend fun porHandle(@Path("handle") handle: String): PerfilAjenoDto

    @POST("perfil/{handle}/seguir")
    suspend fun seguir(@Path("handle") handle: String): SeguirResponse

    @GET("perfil/{handle}/publicaciones")
    suspend fun publicaciones(
        @Path("handle") handle: String,
        @Query("cursor") cursor: String? = null,
        @Query("limite") limite: Int? = null,
    ): PerfilPublicacionesResponse
}

interface MensajesApi {
    @GET("mensajes")
    suspend fun bandeja(): BandejaResponse

    @GET("mensajes/{id}")
    suspend fun conversacion(
        @Path("id") id: String,
        @Query("cursor") cursor: String? = null,
        @Query("limite") limite: Int? = null,
    ): ConversacionDetalleResponse

    @POST("mensajes/{id}")
    suspend fun enviar(
        @Path("id") id: String,
        @Body body: EnviarMensajeRequest,
    ): Response<Unit>

    @POST("mensajes/abrir")
    suspend fun abrir(@Body body: AbrirConversacionRequest): AbrirConversacionResponse
}

interface CatalogoApi {
    @GET("catalogo")
    suspend fun todo(): CatalogoDto
}

interface MediaApi {
    @Multipart
    @POST("media")
    suspend fun subir(@Part archivo: MultipartBody.Part): MediaUploadResponse
}

interface EventosApi {
    @GET("eventos/en-vivo")
    suspend fun enVivo(@Query("horas") horas: Int? = null): EventosEnVivoResponse

    @GET("eventos")
    suspend fun proximos(): EventosResponse

    @POST("eventos")
    suspend fun crear(@Body body: CrearEventoRequest): CrearEventoResponse

    @GET("eventos/{id}")
    suspend fun detalle(@Path("id") id: String): EventoDetalleDto

    @POST("eventos/{id}/asistencia")
    suspend fun responder(
        @Path("id") id: String,
        @Body body: ResponderEventoRequest,
    ): ResponderEventoResponse

    @DELETE("eventos/{id}")
    suspend fun borrar(@Path("id") id: String): Response<Unit>
}

interface MarketplaceApi {
    @GET("anuncios")
    suspend fun listar(
        @Query("categoria") categoria: String? = null,
        @Query("q") q: String? = null,
        @Query("cursor") cursor: String? = null,
    ): AnunciosResponse

    @GET("anuncios/{id}")
    suspend fun detalle(@Path("id") id: String): AnuncioDetalleDto

    @POST("anuncios")
    suspend fun crear(@Body body: CrearAnuncioRequest): CrearAnuncioResponse

    @PATCH("anuncios/{id}")
    suspend fun actualizar(
        @Path("id") id: String,
        @Body body: ActualizarAnuncioRequest,
    ): ActualizarAnuncioResponse
}

interface AventonesApi {
    @GET("aventones")
    suspend fun proximos(@Query("sentido") sentido: String? = null): AventonesResponse

    @POST("aventones")
    suspend fun crear(@Body body: CrearAventonRequest): CrearAventonResponse

    @POST("aventones/{id}/asiento")
    suspend fun apartar(@Path("id") id: String): ApartarAsientoResponse

    @DELETE("aventones/{id}")
    suspend fun cancelar(@Path("id") id: String): Response<Unit>
}

interface AnonimoApi {
    @GET("anonimo/estado")
    suspend fun estado(): AnonimoEstadoResponse

    @GET("anonimo/alias")
    suspend fun alias(): AnonimoAliasResponse

    @GET("anonimo")
    suspend fun feed(@Query("cursor") cursor: String? = null): AnonimoFeedResponse

    @POST("anonimo")
    suspend fun publicar(@Body body: PublicarAnonimoRequest): PublicarAnonimoResponse

    @DELETE("anonimo/{id}")
    suspend fun borrar(@Path("id") id: String): Response<Unit>
}

interface NotificacionesApi {
    @GET("notificaciones")
    suspend fun listar(
        @Query("cursor") cursor: String? = null,
        @Query("limite") limite: Int? = null,
    ): NotificacionesResponse

    @GET("notificaciones/preferencias")
    suspend fun preferencias(): PreferenciasNotificacionResponse

    @PATCH("notificaciones/preferencias")
    suspend fun actualizarPreferencias(
        @Body body: ActualizarPreferenciasRequest,
    ): PreferenciasNotificacionResponse

    @GET("notificaciones/sin-leer")
    suspend fun sinLeer(): SinLeerResponse

    @POST("notificaciones/leidas")
    suspend fun marcarLeidas(): Response<Unit>

    @GET("notificaciones/cumples")
    suspend fun cumples(): CumplesResponse
}

interface PushApi {
    @POST("push/suscribir")
    suspend fun suscribir(@Body body: PushSubscriptionRequest): PushSubscribeResponse

    @POST("push/suscribir-expo")
    suspend fun suscribirExpo(@Body body: ExpoPushTokenRequest): PushSubscribeResponse

    @POST("push/suscribir-fcm")
    suspend fun suscribirFcm(@Body body: FcmPushTokenRequest): PushSubscribeResponse

    @HTTP(method = "DELETE", path = "push/suscribir-fcm", hasBody = true)
    suspend fun desuscribirFcm(@Body body: FcmPushTokenRequest): Response<Unit>
}

interface ModeracionApi {
    @GET("moderacion/cola")
    suspend fun cola(@Query("estado") estado: String? = "ABIERTO"): ModeracionColaResponse

    @POST("moderacion/reportes/{id}/resolver")
    suspend fun resolver(
        @Path("id") id: String,
        @Body body: ResolverReporteRequest,
    ): Response<Unit>
}

interface BusquedaApi {
    @GET("buscar")
    suspend fun buscar(
        @Query("q") q: String,
        @Query("tipo") tipo: String = "todo",
    ): BuscarResponse
}

interface DirectorioApi {
    @GET("directorio")
    suspend fun buscar(
        @Query("q") q: String? = null,
        @Query("generacion") generacion: Int? = null,
        @Query("cursor") cursor: String? = null,
    ): DirectorioResponse
}

interface HashtagsApi {
    @GET("hashtags/trending")
    suspend fun trending(): HashtagsTrendingResponse

    @GET("hashtags/{tag}")
    suspend fun publicaciones(
        @Path("tag") tag: String,
        @Query("cursor") cursor: String? = null,
    ): HashtagPublicacionesResponse
}

interface GuardadosApi {
    @GET("guardados")
    suspend fun listar(
        @Query("cursor") cursor: String? = null,
    ): GuardadosResponse

    @POST("posts/{id}/guardar")
    suspend fun alternar(@Path("id") id: String): GuardarResponse
}

interface BloqueosApi {
    @GET("bloqueos/{handle}")
    suspend fun estado(@Path("handle") handle: String): BloqueoEstadoDto

    @POST("bloqueos/{handle}")
    suspend fun aplicar(
        @Path("handle") handle: String,
        @Body body: BloquearRequest,
    ): BloqueoEstadoDto

    @DELETE("bloqueos/{handle}")
    suspend fun quitar(@Path("handle") handle: String): Response<Unit>
}

interface CuentaApi {
    @POST("cuenta/eliminar")
    suspend fun eliminar(@Body body: EliminarCuentaRequest): Response<Unit>
}

interface AnalyticsApi {
    @POST("analytics/evento")
    suspend fun evento(@Body body: AnalyticsEventoRequest): Response<Unit>

    @POST("analytics/crash")
    suspend fun crash(@Body body: AnalyticsCrashRequest): Response<Unit>
}

interface RetosApi {
    @GET("retos/activos")
    suspend fun activos(): RetosActivosResponse

    @GET("retos/puede/{handle}")
    suspend fun puede(@Path("handle") handle: String): PuedeRetarResponse

    @GET("retos/ranking-semanal")
    suspend fun rankingSemanal(@Query("limite") limite: Int = 5): RetosRankingSemanalResponse

    @GET("retos/historial")
    suspend fun historial(
        @Query("cursor") cursor: String? = null,
        @Query("limite") limite: Int = 10,
    ): RetosHistorialResponse

    @POST("retos")
    suspend fun crear(@Body body: CrearRetoRequest): CrearRetoResponse

    @POST("retos/{id}/responder")
    suspend fun responder(
        @Path("id") id: String,
        @Body body: ResponderRetoRequest,
    ): RetoAmigoDto
}

interface GamificacionApi {
    @GET("gamificacion/mio")
    suspend fun mio(): GamificacionDto

    @GET("gamificacion/{handle}")
    suspend fun porHandle(@Path("handle") handle: String): GamificacionDto

    @POST("gamificacion/ping")
    suspend fun ping(): GamificacionPingDto

    @GET("gamificacion/leaderboard")
    suspend fun leaderboard(@Query("limite") limite: Int = 5): LeaderboardResponseDto
}
