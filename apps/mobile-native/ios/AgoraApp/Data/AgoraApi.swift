import Foundation

/// Endpoints de producto. Paridad con interfaces Retrofit en `Apis.kt`.
enum AgoraApi {
  private static let client = ApiClient.shared

  // MARK: Feed

  static func feed(
    cursor: String? = nil,
    comunidadSlug: String? = nil,
    siguiendo: Bool? = nil
  ) async throws -> FeedResponse {
    var query: [String: String] = [:]
    if let cursor { query["cursor"] = cursor }
    if let comunidadSlug { query["comunidadSlug"] = comunidadSlug }
    if siguiendo == true { query["siguiendo"] = "true" }
    let data = try await client.get("feed", query: query)
    return try ApiClient.decodeOne(data)
  }

  // MARK: Posts

  static func crearPost(_ body: CrearPostRequest) async throws -> CrearPostResponse {
    let data = try await client.postJSON("posts", body: body)
    return try ApiClient.decodeOne(data)
  }

  static func postDetalle(id: String) async throws -> PostDetalleDto {
    let data = try await client.get("posts/\(id)")
    return try ApiClient.decodeOne(data)
  }

  /// `PATCH posts/:id` — solo el autor; la API vuelve a moderar el texto.
  static func editarPost(id: String, texto: String) async throws -> EditarPostResponse {
    let data = try await client.patchJSON("posts/\(id)", body: EditarPostRequest(texto: texto))
    return try ApiClient.decodeOne(data)
  }

  /// `DELETE posts/:id` (204) — solo el autor.
  static func borrarPost(id: String) async throws {
    try await client.delete("posts/\(id)")
  }

  // MARK: Perfil

  static func perfilMio() async throws -> PerfilMioDto {
    let data = try await client.get("perfil/mio")
    return try ApiClient.decodeOne(data)
  }

  static func perfilPorHandle(_ handle: String) async throws -> PerfilAjenoDto {
    let data = try await client.get("perfil/\(handle)")
    return try ApiClient.decodeOne(data)
  }

  /// `PATCH perfil` responde `{ ok: true }` (no el perfil): decodificar
  /// `PerfilMioDto` fallaba y la app mostraba error aunque se hubiera guardado.
  /// Devuelve el perfil solo si algún día la API lo manda.
  @discardableResult
  static func actualizarPerfil(_ body: ActualizarPerfilRequest) async throws -> PerfilMioDto? {
    let data = try await client.patchJSON("perfil", body: body)
    return try? ApiClient.decodeOne(data)
  }

  static func seguir(handle: String) async throws -> SeguirResponse {
    let data = try await client.postJSON("perfil/\(handle)/seguir", body: EmptyBody())
    return try ApiClient.decodeOne(data)
  }

  static func seguidores(handle: String) async throws -> ListaPersonasResponse {
    // Sin pre-codificar: `appendingPathComponent` ya codifica (antes "%" salía doble).
    let encoded = handle
    let data = try await client.get("perfil/\(encoded)/seguidores")
    return try ApiClient.decodeOne(data)
  }

  static func siguiendo(handle: String) async throws -> ListaPersonasResponse {
    // Sin pre-codificar: `appendingPathComponent` ya codifica (antes "%" salía doble).
    let encoded = handle
    let data = try await client.get("perfil/\(encoded)/siguiendo")
    return try ApiClient.decodeOne(data)
  }

  /// Cumpleaños (mes + día) o `nil` en ambos para quitarlo.
  static func actualizarCumple(mes: Int?, dia: Int?) async throws {
    _ = try await client.patchJSON("perfil", body: ActualizarCumpleRequest(cumpleMes: mes, cumpleDia: dia))
  }

  /// Push cuando cae la pregunta relámpago.
  static func actualizarAvisoPregunta(_ activo: Bool) async throws {
    _ = try await client.patchJSON("perfil", body: AvisoPreguntaRequest(avisoPregunta: activo))
  }

  static func publicacionesPerfil(handle: String, cursor: String? = nil, limite: Int? = nil) async throws -> PerfilPublicacionesResponse {
    var query: [String: String] = [:]
    if let cursor { query["cursor"] = cursor }
    if let limite { query["limite"] = String(limite) }
    let data = try await client.get("perfil/\(handle)/publicaciones", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func silenciarComunidad(slug: String, silenciada: Bool) async throws -> ComunidadDto {
    let data = try await client.patchJSON(
      "perfil/comunidades/\(slug)",
      body: SilenciarComunidadRequest(silenciada: silenciada)
    )
    return try ApiClient.decodeOne(data)
  }

  static func reportar(postId: String, motivo: String) async throws {
    _ = try await client.postJSON(
      "reportes",
      body: CrearReporteRequest(postId: postId, commentId: nil, motivo: motivo)
    )
  }

  static func eliminarCuenta(confirmacion: String) async throws {
    _ = try await client.postJSON("cuenta/eliminar", body: EliminarCuentaRequest(confirmacion: confirmacion))
  }

  static func misComunidades() async throws -> [ComunidadDto] {
    let data = try await client.get("perfil/mis-comunidades")
    return try ApiClient.decodeOne(data)
  }

  static func crearPerfil(_ body: CrearPerfilRequest) async throws -> CrearPerfilResponse {
    let data = try await client.postJSON("perfil", body: body)
    return try ApiClient.decodeOne(data)
  }

  static func catalogo() async throws -> CatalogoDto {
    let data = try await client.get("catalogo")
    return try ApiClient.decodeOne(data)
  }

  // MARK: Eventos

  static func eventosProximos(tipo: String? = nil) async throws -> EventosResponse {
    var query: [String: String] = [:]
    if let tipo, !tipo.isEmpty { query["tipo"] = tipo }
    let data = try await client.get("eventos", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func eventosEnVivo(horas: Int? = nil) async throws -> EventosEnVivoResponse {
    var query: [String: String] = [:]
    if let horas { query["horas"] = String(horas) }
    let data = try await client.get("eventos/en-vivo", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func eventoDetalle(id: String) async throws -> EventoDetalleDto {
    let data = try await client.get("eventos/\(id)")
    return try ApiClient.decodeOne(data)
  }

  static func crearEvento(_ body: CrearEventoRequest) async throws -> CrearEventoResponse {
    let data = try await client.postJSON("eventos", body: body)
    return try ApiClient.decodeOne(data)
  }

  static func responderEvento(id: String, respuesta: String) async throws {
    _ = try await client.postJSON(
      "eventos/\(id)/asistencia",
      body: ResponderEventoRequest(respuesta: respuesta)
    )
  }

  static func borrarEvento(id: String) async throws {
    try await client.delete("eventos/\(id)")
  }

  // MARK: Notificaciones

  static func notificaciones(cursor: String? = nil, limite: Int? = nil) async throws -> NotificacionesResponse {
    var query: [String: String] = [:]
    if let cursor { query["cursor"] = cursor }
    if let limite { query["limite"] = String(limite) }
    let data = try await client.get("notificaciones", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func sinLeer() async throws -> SinLeerResponse {
    let data = try await client.get("notificaciones/sin-leer")
    return try ApiClient.decodeOne(data)
  }

  static func marcarLeidas() async throws {
    _ = try await client.postJSON("notificaciones/leidas", body: EmptyBody())
  }

  static func preferenciasNotificacion() async throws -> PreferenciasNotificacionResponse {
    let data = try await client.get("notificaciones/preferencias")
    return try ApiClient.decodeOne(data)
  }

  static func actualizarPreferenciasNotificacion(_ body: ActualizarPreferenciasRequest) async throws -> PreferenciasNotificacionResponse {
    let data = try await client.patchJSON("notificaciones/preferencias", body: body)
    return try ApiClient.decodeOne(data)
  }

  // MARK: Posts — interacciones

  /// Interruptor: la misma reacción la quita, otra distinta la reemplaza.
  static func reaccionar(postId: String, tipo: String) async throws -> ReaccionarResponse {
    let data = try await client.postJSON(
      "posts/\(postId)/reacciones",
      body: ReaccionarRequest(tipo: tipo)
    )
    return try ApiClient.decodeOne(data)
  }

  static func votarEncuesta(postId: String, opcionId: String) async throws -> VotarEncuestaResponse {
    let data = try await client.postJSON(
      "posts/\(postId)/votos",
      body: VotarEncuestaRequest(opcionId: opcionId)
    )
    return try ApiClient.decodeOne(data)
  }

  static func hashtagsTrending() async throws -> HashtagsTrendingResponse {
    let data = try await client.get("hashtags/trending")
    return try ApiClient.decodeOne(data)
  }

  static func cumplesHoy() async throws -> CumplesResponse {
    let data = try await client.get("notificaciones/cumples")
    return try ApiClient.decodeOne(data)
  }

  static func comentar(postId: String, texto: String) async throws {
    _ = try await client.postJSON(
      "posts/\(postId)/comentarios",
      body: CrearComentarioRequest(texto: texto)
    )
  }

  /// Comentarios anteriores al id `antesDe` (cursor `comentariosAnteriores` del detalle).
  static func comentariosAnteriores(postId: String, antesDe: String) async throws -> ComentariosPaginaResponse {
    let data = try await client.get("posts/\(postId)/comentarios", query: ["antesDe": antesDe])
    return try ApiClient.decodeOne(data)
  }

  static func guardarPost(id: String) async throws -> GuardarResponse {
    let data = try await client.postJSON("posts/\(id)/guardar", body: EmptyBody())
    return try ApiClient.decodeOne(data)
  }

  // MARK: Media

  static func subirMedia(fileData: Data, fileName: String, mimeType: String) async throws -> MediaUploadResponse {
    let data = try await client.uploadMultipart(
      "media",
      fileData: fileData,
      fileName: fileName,
      mimeType: mimeType
    )
    return try ApiClient.decodeOne(data)
  }

  // MARK: Mensajes

  static func bandejaMensajes() async throws -> BandejaResponse {
    let data = try await client.get("mensajes")
    return try ApiClient.decodeOne(data)
  }

  static func conversacion(id: String, cursor: String? = nil) async throws -> ConversacionDetalleResponse {
    var query: [String: String] = [:]
    if let cursor { query["cursor"] = cursor }
    let data = try await client.get("mensajes/\(id)", query: query)
    return try ApiClient.decodeOne(data)
  }

  /// `POST mensajes/:id` responde `{ id, createdAt }`. Devuelve nil si la
  /// respuesta no trae esa forma (el mensaje sí se envió: toca recargar).
  @discardableResult
  static func enviarMensaje(conversacionId: String, texto: String) async throws -> EnviarMensajeResponse? {
    let data = try await client.postJSON(
      "mensajes/\(conversacionId)",
      body: EnviarMensajeRequest(texto: texto)
    )
    return try? ApiClient.decodeOne(data)
  }

  /// Total de mensajes sin leer (`{ total }`), para el globo de Mensajes.
  static func mensajesNoLeidos() async throws -> SinLeerResponse {
    let data = try await client.get("mensajes/no-leidos")
    return try ApiClient.decodeOne(data)
  }

  static func abrirConversacion(handle: String) async throws -> AbrirConversacionResponse {
    let data = try await client.postJSON(
      "mensajes/abrir",
      body: AbrirConversacionRequest(handle: handle)
    )
    return try ApiClient.decodeOne(data)
  }

  // MARK: Pregunta del día

  static func preguntaHoy() async throws -> PreguntaHoyDto {
    let data = try await client.get("pregunta/hoy")
    return try ApiClient.decodeOne(data)
  }

  static func responderPregunta(id: String, opcion: Int) async throws -> PreguntaHoyDto {
    let data = try await client.postJSON(
      "pregunta/\(id)/responder",
      body: ResponderPreguntaRequest(opcion: opcion)
    )
    return try ApiClient.decodeOne(data)
  }

  // MARK: Búsqueda / directorio / guardados / bloqueos

  static func buscar(q: String, tipo: String = "todo") async throws -> BuscarResponse {
    let data = try await client.get("buscar", query: ["q": q, "tipo": tipo])
    return try ApiClient.decodeOne(data)
  }

  static func directorio(
    q: String? = nil,
    generacion: Int? = nil,
    cursor: String? = nil,
    escuela: String? = nil,
    carrera: String? = nil,
    colegio: String? = nil
  ) async throws -> DirectorioResponse {
    var query: [String: String] = [:]
    if let q, !q.isEmpty { query["q"] = q }
    if let generacion { query["generacion"] = String(generacion) }
    if let cursor { query["cursor"] = cursor }
    if let escuela, !escuela.isEmpty { query["escuela"] = escuela }
    if let carrera, !carrera.isEmpty { query["carrera"] = carrera }
    if let colegio, !colegio.isEmpty { query["colegio"] = colegio }
    let data = try await client.get("directorio", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func guardados(cursor: String? = nil) async throws -> GuardadosResponse {
    var query: [String: String] = [:]
    if let cursor { query["cursor"] = cursor }
    let data = try await client.get("guardados", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func estadoBloqueo(handle: String) async throws -> BloqueoEstadoDto {
    let data = try await client.get("bloqueos/\(handle)")
    return try ApiClient.decodeOne(data)
  }

  static func bloquear(handle: String, soloSilencio: Bool = false) async throws -> BloqueoEstadoDto {
    let data = try await client.postJSON("bloqueos/\(handle)", body: BloquearRequest(soloSilencio: soloSilencio))
    return try ApiClient.decodeOne(data)
  }

  static func desbloquear(handle: String) async throws {
    try await client.delete("bloqueos/\(handle)")
  }

  // MARK: - Push

  static func suscribirApns(token: String) async throws -> PushSubscribeResponse {
    let data = try await client.postJSON("push/suscribir-apns", body: ApnsPushTokenRequest(token: token))
    return try ApiClient.decodeOne(data)
  }

  /// `DELETE push/suscribir-apns` con `{ token }` (204). `sesion` permite usar
  /// el token de sesión capturado justo antes de cerrar sesión.
  static func desuscribirApns(token: String, sesion: String? = nil) async throws {
    try await client.deleteJSON(
      "push/suscribir-apns",
      body: ApnsPushTokenRequest(token: token),
      token: sesion,
      avisarSiExpira: false
    )
  }

  // MARK: - Sesión

  /// `POST auth/salir` (204): invalida la sesión en el servidor.
  static func salir(sesion: String? = nil) async throws {
    try await client.postJSONSilencioso("auth/salir", body: EmptyBody(), token: sesion)
  }

  // MARK: - Marketplace

  static func anuncios(
    categoria: String? = nil,
    q: String? = nil,
    cursor: String? = nil
  ) async throws -> AnunciosResponse {
    var query: [String: String] = [:]
    if let categoria, !categoria.isEmpty { query["categoria"] = categoria }
    if let q, !q.isEmpty { query["q"] = q }
    if let cursor { query["cursor"] = cursor }
    let data = try await client.get("anuncios", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func anuncioDetalle(id: String) async throws -> AnuncioDetalleDto {
    let data = try await client.get("anuncios/\(id)")
    return try ApiClient.decodeOne(data)
  }

  static func crearAnuncio(_ body: CrearAnuncioRequest) async throws -> CrearAnuncioResponse {
    let data = try await client.postJSON("anuncios", body: body)
    return try ApiClient.decodeOne(data)
  }

  static func actualizarAnuncio(id: String, estadoVenta: String) async throws -> ActualizarAnuncioResponse {
    let data = try await client.patchJSON(
      "anuncios/\(id)",
      body: ActualizarAnuncioRequest(estadoVenta: estadoVenta)
    )
    return try ApiClient.decodeOne(data)
  }

  // MARK: - Aventones

  static func aventones(sentido: String? = nil) async throws -> AventonesResponse {
    var query: [String: String] = [:]
    if let sentido, !sentido.isEmpty { query["sentido"] = sentido }
    let data = try await client.get("aventones", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func crearAventon(_ body: CrearAventonRequest) async throws -> CrearAventonResponse {
    let data = try await client.postJSON("aventones", body: body)
    return try ApiClient.decodeOne(data)
  }

  static func apartarAsiento(aventonId: String) async throws -> ApartarAsientoResponse {
    let data = try await client.postJSON("aventones/\(aventonId)/asiento", body: EmptyBody())
    return try ApiClient.decodeOne(data)
  }

  static func cancelarAventon(id: String) async throws {
    try await client.delete("aventones/\(id)")
  }

  // MARK: - Hashtags

  static func publicacionesHashtag(tag: String, cursor: String? = nil) async throws -> HashtagPublicacionesResponse {
    var query: [String: String] = [:]
    if let cursor { query["cursor"] = cursor }
    // Sin pre-codificar: `appendingPathComponent` ya codifica (antes "%" salía doble).
    let encoded = tag
    let data = try await client.get("hashtags/\(encoded)", query: query)
    return try ApiClient.decodeOne(data)
  }

  // MARK: - Anónimo

  static func anonimoEstado() async throws -> AnonimoEstadoResponse {
    let data = try await client.get("anonimo/estado")
    return try ApiClient.decodeOne(data)
  }

  static func anonimoAlias() async throws -> AnonimoAliasResponse {
    let data = try await client.get("anonimo/alias")
    return try ApiClient.decodeOne(data)
  }

  static func anonimoFeed(cursor: String? = nil) async throws -> AnonimoFeedResponse {
    var query: [String: String] = [:]
    if let cursor { query["cursor"] = cursor }
    let data = try await client.get("anonimo", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func publicarAnonimo(_ body: PublicarAnonimoRequest) async throws -> PublicarAnonimoResponse {
    let data = try await client.postJSON("anonimo", body: body)
    return try ApiClient.decodeOne(data)
  }

  static func borrarAnonimo(id: String) async throws {
    try await client.delete("anonimo/\(id)")
  }

  // MARK: - Moderación

  static func moderacionCola(estado: String = "ABIERTO") async throws -> ModeracionColaResponse {
    let data = try await client.get("moderacion/cola", query: ["estado": estado])
    return try ApiClient.decodeOne(data)
  }

  static func resolverReporte(id: String, accion: String, motivo: String) async throws {
    _ = try await client.postJSON(
      "moderacion/reportes/\(id)/resolver",
      body: ResolverReporteRequest(accion: accion, motivo: motivo)
    )
  }

  /// Retiro directo de una publicación por staff (`MODERACION_ACTUAR`).
  static func retirarPost(id: String, motivo: String) async throws {
    _ = try await client.postJSON(
      "moderacion/posts/\(id)/retirar",
      body: RetirarPostRequest(motivo: motivo)
    )
  }

  // MARK: - Gamificación

  static func gamificacionMio() async throws -> GamificacionDto {
    let data = try await client.get("gamificacion/mio")
    return try ApiClient.decodeOne(data)
  }

  static func gamificacionPorHandle(_ handle: String) async throws -> GamificacionDto {
    // Sin pre-codificar: `appendingPathComponent` ya codifica (antes "%" salía doble).
    let encoded = handle
    let data = try await client.get("gamificacion/\(encoded)")
    return try ApiClient.decodeOne(data)
  }

  static func gamificacionPing() async throws -> GamificacionPingDto {
    let data = try await client.postJSON("gamificacion/ping", body: EmptyBody())
    return try ApiClient.decodeOne(data)
  }

  static func gamificacionLeaderboard(limite: Int = 5) async throws -> LeaderboardResponseDto {
    // La query va en `query:`: en la ruta, `appendingPathComponent` convertía "?" en %3F (404).
    let data = try await client.get("gamificacion/leaderboard", query: ["limite": String(limite)])
    return try ApiClient.decodeOne(data)
  }

  // MARK: - Retos entre amigos

  static func retosActivos() async throws -> RetosActivosResponse {
    let data = try await client.get("retos/activos")
    return try ApiClient.decodeOne(data)
  }

  static func responderReto(id: String, aceptar: Bool) async throws -> RetoAmigoDto {
    let data = try await client.postJSON(
      "retos/\(id)/responder",
      body: ResponderRetoRequest(aceptar: aceptar)
    )
    return try ApiClient.decodeOne(data)
  }

  static func retosPuede(handle: String) async throws -> PuedeRetarResponse {
    // Sin pre-codificar: `appendingPathComponent` ya codifica (antes "%" salía doble).
    let encoded = handle
    let data = try await client.get("retos/puede/\(encoded)")
    return try ApiClient.decodeOne(data)
  }

  static func retosRankingSemanal(limite: Int = 5) async throws -> RetosRankingSemanalResponse {
    let data = try await client.get("retos/ranking-semanal", query: ["limite": String(limite)])
    return try ApiClient.decodeOne(data)
  }

  static func retosHistorial(cursor: String? = nil, limite: Int = 8) async throws -> RetosHistorialResponse {
    var query = ["limite": String(limite)]
    if let cursor, !cursor.isEmpty { query["cursor"] = cursor }
    let data = try await client.get("retos/historial", query: query)
    return try ApiClient.decodeOne(data)
  }

  static func crearReto(retadoHandle: String, tipo: String) async throws -> CrearRetoResponse {
    let data = try await client.postJSON(
      "retos",
      body: CrearRetoRequest(retadoHandle: retadoHandle, tipo: tipo)
    )
    return try ApiClient.decodeOne(data)
  }
}

private struct EmptyBody: Encodable {}
