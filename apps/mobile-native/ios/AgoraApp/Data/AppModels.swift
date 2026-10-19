import Foundation

// MARK: - Autor / media / comunidad

struct AutorDto: Codable {
    let handle: String?
    let nombre: String?
    let fotoUrl: String?
    let verificado: Bool?
}

struct MediaDto: Codable {
    let url: String
    let mime: String?
    let esVideo: Bool?
}

struct ComunidadDto: Codable, Hashable {
    let slug: String
    let nombre: String
    let silenciada: Bool?

    var estaSilenciada: Bool { silenciada ?? false }
}

struct OpcionEncuestaDto: Codable {
    let id: String
    let texto: String
    let votos: Int?
}

struct EncuestaDto: Codable {
    let pregunta: String
    let opciones: [OpcionEncuestaDto]?
}

// MARK: - Feed / posts

struct PostDto: Codable, Identifiable {
    let id: String
    let texto: String
    let createdAt: String
    let estado: String?
    let autor: AutorDto?
    let comunidad: ComunidadDto
    let media: [MediaDto]?
    let encuesta: EncuestaDto?
    let numComments: Int?
    let numReactions: Int?
    let miReaccion: String?
    let miGuardado: Bool?
    /// Publicación de la zona sin nombre: sin autor, con alias.
    let anonimo: Bool?
    let alias: String?
}

struct FeedResponse: Codable {
    let publicaciones: [PostDto]?
    let siguienteCursor: String?
}

struct CrearEncuestaRequest: Encodable {
    let pregunta: String
    let opciones: [String]
}

struct CrearPostRequest: Encodable {
    let comunidadSlug: String
    let texto: String
    let mediaIds: [String]
    let encuesta: CrearEncuestaRequest?
}

struct CrearPostResponse: Decodable {
    let id: String
    let nuevasInsignias: [String]?
}

struct PostDetalleDto: Decodable {
    let id: String
    let texto: String
    let createdAt: String
    let autor: AutorDto?
    let comunidad: ComunidadDto
    let media: [MediaDto]?
    let encuesta: EncuestaDto?
    let numComments: Int?
    let numReactions: Int?
    let miReaccion: String?
    let miGuardado: Bool?
    let comentarios: [ComentarioDto]?
    let anonimo: Bool?
    let alias: String?
}

/// `PATCH posts/:id` — solo el autor; las anónimas no se editan.
struct EditarPostRequest: Encodable {
    let texto: String
}

struct EditarPostResponse: Decodable {
    let aviso: String?
}

struct ComentarioDto: Decodable, Identifiable {
    let id: String
    let texto: String
    let createdAt: String
    let autor: AutorDto?
}

struct CrearComentarioRequest: Encodable {
    let texto: String
}

struct ReaccionarRequest: Encodable {
    let tipo: String?
}

struct ReaccionarResponse: Decodable {
    let miReaccion: String?
}

struct VotarEncuestaRequest: Encodable {
    let opcionId: String
}

struct VotarEncuestaResponse: Decodable {
    let opciones: [OpcionEncuestaDto]?
    let miVoto: String?
}

struct HashtagTrendingDto: Decodable {
    let tag: String
    let usos: Int
}

struct HashtagsTrendingResponse: Decodable {
    let hashtags: [HashtagTrendingDto]?
}

struct CumpleDto: Decodable {
    let handle: String
    let nombre: String
    let fotoUrl: String?
}

struct CumplesResponse: Decodable {
    let cumples: [CumpleDto]?
}

struct GuardarResponse: Decodable {
    let guardado: Bool
}

struct MediaUploadResponse: Decodable {
    let id: String
    let url: String
    let mime: String?
}

// MARK: - Perfil / catálogo

struct PerfilMioDto: Codable {
    let handle: String
    let nombre: String
    let apellidos: String
    let bio: String?
    let fotoUrl: String?
    let ciudadOrigen: String?
    let instagram: String?
    let intereses: [String]?
    let busco: String?
    let visibilidad: String?
    let portadaUrl: String?
    let cumpleMes: Int?
    let cumpleDia: Int?
    var avisoPregunta: Bool? = nil
}

struct PerfilAjenoDto: Decodable {
    let handle: String
    let nombre: String
    let apellidos: String
    let bio: String?
    let fotoUrl: String?
    let ciudadOrigen: String?
    let instagram: String?
    let intereses: [String]?
    let seguidores: Int?
    let siguiendo: Int?
    let publicaciones: Int?
    let generacion: Int?
    let carrera: String?
    let escuela: String?
    let restringido: Bool?
    let yoLeSigo: Bool?
    let verificado: Bool?
    let portadaUrl: String?
}

/// Fila de `GET perfil/:handle/seguidores` y `/siguiendo`.
struct PersonaListaDto: Decodable, Identifiable {
    var id: String { handle }
    let handle: String
    let nombre: String
    let fotoUrl: String?
    let verificado: Bool?
}

struct ListaPersonasResponse: Decodable {
    let restringido: Bool?
    let personas: [PersonaListaDto]?
}

struct PerfilPublicacionDto: Decodable, Identifiable {
    let id: String
    let texto: String
    let createdAt: String
    let comunidad: String
    let numComments: Int?
    let numReactions: Int?
}

struct PerfilPublicacionesResponse: Decodable {
    let publicaciones: [PerfilPublicacionDto]?
    let siguienteCursor: String?
}

struct SeguirResponse: Decodable {
    let siguiendo: Bool
}

struct ActualizarPerfilRequest: Encodable {
    let bio: String?
    let fotoMediaId: String?
    let ciudadOrigen: String?
    let instagram: String?
    let intereses: [String]?
    let busco: String?
    let visibilidad: String?
    var portadaMediaId: String? = nil
}

/// Cumpleaños por separado: se manda `null` explícito para quitarlo
/// (el `Encodable` sintetizado omitiría los nil).
struct ActualizarCumpleRequest: Encodable {
    let cumpleMes: Int?
    let cumpleDia: Int?

    private enum CodingKeys: String, CodingKey {
        case cumpleMes
        case cumpleDia
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        if let cumpleMes {
            try c.encode(cumpleMes, forKey: .cumpleMes)
        } else {
            try c.encodeNil(forKey: .cumpleMes)
        }
        if let cumpleDia {
            try c.encode(cumpleDia, forKey: .cumpleDia)
        } else {
            try c.encodeNil(forKey: .cumpleDia)
        }
    }
}

struct SilenciarComunidadRequest: Encodable {
    let silenciada: Bool
}

struct EliminarCuentaRequest: Encodable {
    let confirmacion: String
}

struct CrearReporteRequest: Encodable {
    let postId: String?
    let commentId: String?
    let motivo: String
}

struct BloqueoEstadoDto: Decodable {
    let bloqueado: Bool
    /// `true` cuando solo está silenciado (no lo ves, él sí te ve).
    let silenciado: Bool?
}

struct BloquearRequest: Encodable {
    let soloSilencio: Bool
}

struct CrearPerfilRequest: Encodable {
    let handle: String
    let nombre: String
    let apellidos: String
    let generacion: Int
    let carreraSlug: String
    let colegioSlug: String?
}

struct CrearPerfilResponse: Decodable {
    let handle: String
    let comunidades: Int
}

struct CarreraDto: Decodable, Identifiable {
    var id: String { slug }
    let slug: String
    let nombre: String
}

struct EscuelaDto: Decodable, Identifiable {
    var id: String { slug }
    let slug: String
    let nombre: String
    let carreras: [CarreraDto]?
}

struct ColegioDto: Decodable, Identifiable {
    var id: String { slug }
    let slug: String
    let nombre: String
}

struct CatalogoDto: Decodable {
    let escuelas: [EscuelaDto]?
    let colegios: [ColegioDto]?
}

// MARK: - Eventos

struct EventoDto: Decodable, Identifiable {
    let id: String
    let titulo: String
    let descripcion: String?
    let tipo: String
    let lugar: String?
    let inicioAt: String
    let costoMxn: Int?
    let vanAIr: Int?
    let miRespuesta: String?
    let comunidad: ComunidadDto?
    let cupo: Int?
}

struct EventosResponse: Decodable {
    let eventos: [EventoDto]?
}

struct EventoEnVivoDto: Decodable, Identifiable {
    let id: String
    let titulo: String
    let inicioAt: String
    let lugar: String?
    let vanAIr: Int?
    let empiezaEnMinutos: Int?
    let enCurso: Bool
}

struct EventosEnVivoResponse: Decodable {
    let eventos: [EventoEnVivoDto]?
}

struct EventoDetalleDto: Decodable {
    let id: String
    let titulo: String
    let descripcion: String?
    let tipo: String
    let lugar: String?
    let inicioAt: String
    let finAt: String?
    let costoMxn: Int?
    let cupo: Int?
    let esMio: Bool?
    let autor: AutorDto?
    let comunidad: ComunidadDto?
    let vanAIr: Int?
    let miRespuesta: String?
}

struct ResponderEventoRequest: Encodable {
    let respuesta: String
}

struct CrearEventoRequest: Encodable {
    let titulo: String
    let descripcion: String
    let tipo: String
    let lugar: String
    let inicioAt: String
    let finAt: String?
    let costoMxn: Int?
    let cupo: Int?
    let comunidadSlug: String?
}

struct CrearEventoResponse: Decodable {
    let id: String
    let estado: String?
    let aviso: String?
}

// MARK: - Notificaciones

struct NotificacionDto: Decodable, Identifiable {
    let id: String
    let tipo: String
    let texto: String
    let url: String?
    let leida: Bool
    let createdAt: String
    let actor: AutorDto?
}

struct NotificacionesResponse: Decodable {
    let notificaciones: [NotificacionDto]?
    let siguienteCursor: String?
}

struct SinLeerResponse: Decodable {
    let total: Int
}

// MARK: - Mensajes

struct ParticipanteConversacionDto: Decodable {
    let handle: String
    let nombre: String
    let fotoUrl: String?
}

struct ConversacionDto: Decodable, Identifiable {
    let id: String
    let con: ParticipanteConversacionDto?
    let ultimoTexto: String?
    let ultimoAt: String
    let mioElUltimo: Bool?
    let noLeidos: Int?
}

struct BandejaResponse: Decodable {
    let conversaciones: [ConversacionDto]?
}

struct MensajeDto: Decodable, Identifiable {
    let id: String
    let texto: String
    let createdAt: String
    let mio: Bool
    let autor: AutorDto?
}

struct ConversacionDetalleResponse: Decodable {
    let con: ParticipanteConversacionDto?
    let mensajes: [MensajeDto]?
    let siguienteCursor: String?
}

struct EnviarMensajeRequest: Encodable {
    let texto: String
}

struct AbrirConversacionRequest: Encodable {
    let handle: String
}

struct AbrirConversacionResponse: Decodable {
    let id: String
}

// MARK: - Pregunta del día

struct PreguntaOpcionDto: Decodable, Identifiable {
    var id: Int { indice }
    let indice: Int
    let texto: String
    let votos: Int?
}

struct SemanaPreguntaDto: Decodable {
    let respondidas: Int
    let meta: Int
}

struct PreguntaHoyDto: Decodable {
    let id: String
    let texto: String
    let yaRespondi: Bool
    let miOpcion: Int?
    let total: Int?
    let opciones: [PreguntaOpcionDto]?
    let nuevasInsignias: [String]?
    let semanaPregunta: SemanaPreguntaDto?
    /// Hora sorpresa (ISO). nil = abierta todo el día (preguntas de antes de la mecánica).
    let abreAt: String?
    /// Fin de la ventana de 2 minutos para contestar "a tiempo" (ISO).
    let aTiempoHasta: String?
    /// false = todavía no cae. nil en APIs viejas = abierta.
    let abierta: Bool?
    let aTiempo: Bool?
    let totalATiempo: Int?
    let miCarrera: MiCarreraPreguntaDto?
}

struct MiCarreraPreguntaDto: Decodable {
    let nombre: String
    let total: Int
    /// Llave = índice de la opción como texto.
    let votos: [String: Int]
}

struct AvisoPreguntaRequest: Encodable {
    let avisoPregunta: Bool
}

struct ResponderPreguntaRequest: Encodable {
    let opcion: Int
}

// MARK: - Búsqueda / directorio / guardados

struct BuscarPersonaDto: Decodable, Identifiable {
    var id: String { handle }
    let handle: String
    let nombre: String
    let fotoUrl: String?
    let carrera: String?
}

struct BuscarPublicacionDto: Decodable, Identifiable {
    let id: String
    let texto: String
    let createdAt: String
    let autor: AutorDto?
    let comunidad: String
}

struct BuscarEventoDto: Decodable, Identifiable {
    let id: String
    let titulo: String
    let lugar: String?
    let inicioAt: String
}

struct BuscarAnuncioDto: Decodable, Identifiable {
    let id: String
    let titulo: String
    let precioMxn: Int
}

struct BuscarResponse: Decodable {
    let personas: [BuscarPersonaDto]?
    let publicaciones: [BuscarPublicacionDto]?
    let eventos: [BuscarEventoDto]?
    let anuncios: [BuscarAnuncioDto]?
}

struct DirectorioPersonaDto: Decodable, Identifiable {
    var id: String { handle }
    let handle: String
    let nombre: String
    let apellidos: String
    let generacion: Int?
    let carrera: String?
    let escuela: String?
}

struct DirectorioResponse: Decodable {
    let resultados: [DirectorioPersonaDto]?
    let siguienteCursor: String?
}

struct GuardadosResponse: Decodable {
    let publicaciones: [PostDto]?
    let siguienteCursor: String?
}

struct PreferenciaNotificacionDto: Codable, Hashable {
    let tipo: String
    var inApp: Bool
    var push: Bool
}

struct PreferenciasNotificacionResponse: Decodable {
    let preferencias: [PreferenciaNotificacionDto]?
}

struct ActualizarPreferenciasRequest: Encodable {
    let preferencias: [PreferenciaNotificacionDto]
}

// MARK: - Marketplace

struct AnuncioDto: Decodable, Identifiable {
    let id: String
    let titulo: String
    let descripcion: String
    let categoria: String
    let precioMxn: Int
    let estadoVenta: String
    let createdAt: String
    let imagenes: [String]?
    let vendedor: AutorDto?
    let esMio: Bool?
}

struct AnunciosResponse: Decodable {
    let anuncios: [AnuncioDto]?
    let siguienteCursor: String?
}

struct AnuncioDetalleDto: Decodable {
    let id: String
    let titulo: String
    let descripcion: String
    let categoria: String
    let precioMxn: Int
    let estadoVenta: String
    let createdAt: String
    let imagenes: [MediaDto]?
    let vendedor: AutorDto?
    let esMio: Bool?
}

struct CrearAnuncioRequest: Encodable {
    let titulo: String
    let descripcion: String
    let categoria: String
    let precioMxn: Int
    let imagenIds: [String]
}

struct CrearAnuncioResponse: Decodable {
    let id: String
}

struct ActualizarAnuncioRequest: Encodable {
    let estadoVenta: String
}

struct ActualizarAnuncioResponse: Decodable {
    let estadoVenta: String
}

// MARK: - Aventones

struct AventonDto: Decodable, Identifiable {
    let id: String
    let sentido: String
    let origen: String
    let destino: String
    let salidaAt: String
    let lugares: Int
    let ocupados: Int
    let cuotaMxn: Int
    let nota: String?
    let conductor: AutorDto?
    let voyYo: Bool?
    let esMio: Bool?
}

struct AventonesResponse: Decodable {
    let aventones: [AventonDto]?
}

struct CrearAventonRequest: Encodable {
    let sentido: String
    let origen: String
    let destino: String
    let salidaAt: String
    let lugares: Int
    let cuotaMxn: Int
    let nota: String?
}

struct CrearAventonResponse: Decodable {
    let id: String
    let nuevasInsignias: [String]?
}

struct ApartarAsientoResponse: Decodable {
    let voyYo: Bool
    let ocupados: Int
}

// MARK: - Hashtags

struct HashtagPublicacionesResponse: Decodable {
    let publicaciones: [PostDto]?
    let siguienteCursor: String?
}

// MARK: - Anónimo

struct AnonimoEstadoResponse: Decodable {
    let habilitada: Bool
}

struct AnonimoAliasResponse: Decodable {
    let alias: String
}

struct AnonimoPostDto: Decodable, Identifiable {
    let id: String
    let texto: String
    let createdAt: String
    let alias: String
    let esMio: Bool?
    let numComments: Int?
    let numReactions: Int?
    let miReaccion: String?
}

struct AnonimoFeedResponse: Decodable {
    let publicaciones: [AnonimoPostDto]?
    let siguienteCursor: String?
}

struct PublicarAnonimoRequest: Encodable {
    let texto: String
}

struct PublicarAnonimoResponse: Decodable {
    let id: String
    let alias: String
    let aviso: String?
}

// MARK: - Moderación

struct ModeracionAutorDto: Decodable {
    let handle: String?
    let nombre: String?
}

struct ModeracionColaItemDto: Decodable, Identifiable {
    var id: String { reporteId }
    let reporteId: String
    let numReportes: Int
    let motivos: [String]
    let tipo: String
    let texto: String
    let comunidad: String?
    let autor: ModeracionAutorDto?
}

struct ModeracionColaResponse: Decodable {
    let items: [ModeracionColaItemDto]?

    var lista: [ModeracionColaItemDto] { items ?? [] }
}

struct ResolverReporteRequest: Encodable {
    let accion: String
    let motivo: String
}

/// `POST moderacion/posts/:id/retirar` — motivo obligatorio (3–500).
struct RetirarPostRequest: Encodable {
    let motivo: String
}

// MARK: - Push

struct ApnsPushTokenRequest: Encodable {
    let token: String
}

struct PushSubscribeResponse: Decodable {
    let ok: Bool
}

// MARK: - Gamificación

struct GamificacionBadgeDto: Codable, Identifiable {
    var id: String { codigo }
    let codigo: String
    let etiqueta: String
    let emoji: String
    let otorgadoAt: String
}

struct ComparacionCampusDto: Codable {
    let promedioRacha: Double
    let tuRacha: Int
    let porEncimaDelPromedio: Bool
}

struct RetoSemanalDto: Codable {
    let titulo: String
    let progreso: Int
    let meta: Int
    let completado: Bool
}

struct GamificacionDto: Codable {
    let rachaActual: Int
    let rachaMaxima: Int
    let badges: [GamificacionBadgeDto]
    let comparacionCampus: ComparacionCampusDto?
    let retoSemanal: RetoSemanalDto?
    let duelosGanados: Int?
}

struct GamificacionPingDto: Codable {
    let nuevasInsignias: [String]
    let gamificacion: GamificacionDto
}

struct LeaderboardEntryDto: Codable, Identifiable {
    var id: String { handle }
    let handle: String
    let nombre: String
    let fotoUrl: String?
    let rachaActual: Int
}

struct LeaderboardResponseDto: Codable {
    let entradas: [LeaderboardEntryDto]
    let miPosicion: Int?
}

// MARK: - Retos entre amigos

struct RetoAmigoParticipanteDto: Decodable {
    let handle: String
    let nombre: String
}

struct RetoAmigoDto: Decodable, Identifiable {
    let id: String
    let retador: RetoAmigoParticipanteDto
    let retado: RetoAmigoParticipanteDto
    let tipo: String
    let estado: String
    let puntajeRetador: Int?
    let puntajeRetado: Int?
    let ganando: String?
}

struct RetosActivosResponse: Decodable {
    let pendientes: [RetoAmigoDto]?
    let activos: [RetoAmigoDto]?
}

struct ResponderRetoRequest: Encodable {
    let aceptar: Bool
}

struct PuedeRetarResponse: Decodable {
    let puedeRetar: Bool
    let motivo: String?
}

struct CrearRetoRequest: Encodable {
    let retadoHandle: String
    let tipo: String
}

struct CrearRetoResponse: Decodable {
    let id: String
    let estado: String
}

struct RetosRankingSemanalEntradaDto: Decodable, Identifiable {
    var id: String { handle }
    let handle: String
    let nombre: String
    let fotoUrl: String?
    let victorias: Int
}

struct RetosRankingSemanalResponse: Decodable {
    let entradas: [RetosRankingSemanalEntradaDto]?
}

struct RetoHistorialDto: Decodable, Identifiable {
    let id: String
    let retador: RetoAmigoParticipanteDto
    let retado: RetoAmigoParticipanteDto
    let tipo: String
    let estado: String
    let puntajeRetador: Int?
    let puntajeRetado: Int?
    let ganando: String?
    let createdAt: String
    let activadoAt: String?
    let resultado: String?
}

struct RetosHistorialResponse: Decodable {
    let items: [RetoHistorialDto]?
    let siguienteCursor: String?
}
