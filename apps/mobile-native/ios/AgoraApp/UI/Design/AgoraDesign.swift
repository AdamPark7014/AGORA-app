import SwiftUI

// MARK: - Colors (paridad con `AgoraColors.kt`)

enum AgoraDesign {
    enum Colors {
        static let naranja = Color(red: 227 / 255, green: 82 / 255, blue: 5 / 255)
        static let naranjaSuave = Color(red: 1, green: 240 / 255, blue: 232 / 255)
        static let naranjaOscuro = Color(red: 184 / 255, green: 64 / 255, blue: 4 / 255)

        static let fondo = Color(red: 247 / 255, green: 245 / 255, blue: 242 / 255)
        static let superficie = Color.white
        static let superficieElevada = Color(red: 1, green: 252 / 255, blue: 250 / 255)

        static let texto = Color(red: 26 / 255, green: 26 / 255, blue: 26 / 255)
        static let textoMedio = Color(red: 107 / 255, green: 107 / 255, blue: 107 / 255)
        static let textoMuted = Color(red: 154 / 255, green: 149 / 255, blue: 144 / 255)

        static let borde = Color(red: 232 / 255, green: 228 / 255, blue: 223 / 255)
        static let bordeSutil = Color(red: 240 / 255, green: 236 / 255, blue: 232 / 255)

        static let success = Color(red: 46 / 255, green: 125 / 255, blue: 79 / 255)
        static let danger = Color(red: 198 / 255, green: 40 / 255, blue: 40 / 255)
        static let dangerSuave = Color(red: 253 / 255, green: 236 / 255, blue: 234 / 255)

        static let skeletonBase = Color(red: 232 / 255, green: 228 / 255, blue: 223 / 255)
        static let skeletonHighlight = Color(red: 245 / 255, green: 242 / 255, blue: 239 / 255)
    }

    enum Spacing {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    enum Radii {
        static let card: CGFloat = 16
        static let button: CGFloat = 12
        static let small: CGFloat = 8
        static let medium: CGFloat = 12
    }

    enum Animation {
        static let spring = SwiftUI.Animation.spring(response: 0.4, dampingFraction: 0.78)
        static let press = SwiftUI.Animation.spring(response: 0.25, dampingFraction: 0.6)
    }
}

// MARK: - Copy (voz cálida — paridad con Android Login/Registro/empty states)

enum AgoraCopy {
    // Login
    static let appName = "Ágora"
    static let appTagline = "La red social verificada de la UDLAP"
    static let loginWelcomeBack = "Bienvenido de vuelta"
    static let loginCheckEmail = "Revisa tu correo"
    static let loginSubtitleEmail = "Inicia sesión con tu cuenta institucional"
    static func loginSubtitleCode(_ email: String) -> String {
        "Te enviamos un código de 6 dígitos a \(email)"
    }
    static let loginEmailLabel = "Tu correo @udlap.mx"
    static let loginEmailPlaceholder = "nombre@udlap.mx"
    static let loginSendCode = "Enviar código"
    static let loginSending = "Enviando…"
    static let loginCodeLabel = "Código de 6 dígitos"
    static let loginEnter = "Entrar"
    static let loginVerifying = "Verificando…"
    static let loginChangeEmail = "Cambiar correo"

    // Registro
    static let registroTitle = "Crea tu perfil"
    static let registroSubtitle = "Último paso para entrar a Ágora."
    static let registroHandleHint = "Elige tu @ — será tu identidad en el campus"
    static let registroHandleLabel = "Tu @ en Ágora"
    static let registroCarreraHint = "Así te conectamos con tu comunidad"
    static let registroSubmit = "Entrar a Ágora"
    static let registroCreating = "Creando…"

    // Empty states
    static let feedEmptyTitle = "Todavía no hay nada"
    static let feedEmptySubtitle = "Publica algo y arranca la conversación en tu comunidad."
    static let eventosEmptyTitle = "Nada en el calendario"
    static let eventosEmptySubtitle = "Cuando haya fiestas, charlas o torneos, aparecerán aquí."
    static let avisosEmptyTitle = "Todo tranquilo"
    static let avisosEmptySubtitle = "Sin avisos por ahora. Te avisamos cuando pase algo."

    // Mensajes
    static let mensajesEmptyTitle = "Tu bandeja está vacía"
    static let mensajesEmptySubtitle = "Encuentra a alguien en el directorio y escríbele. Tus chats aparecerán aquí."
    static let mensajeDetalleEmptyTitle = "Empieza la conversación"
    static let mensajeDetalleEmptySubtitle = "Escribe el primer mensaje. Sin presión, sin formalidades."

    static let guardadosEmptyTitle = "Nada guardado aún"
    static let guardadosEmptySubtitle = "Toca 🔖 en cualquier publicación del feed para leerla después."
    static let buscarEmptyTitle = "Sin resultados"
    static let buscarHintsTitle = "¿Qué andas buscando?"
    static let buscarHintsSubtitle = "Personas, posts, eventos o cosas en el marketplace — escribe al menos 2 letras."
    static let directorioEmptyTitle = "No encontramos a nadie"
    static let directorioEmptySubtitle = "Prueba otro nombre, @handle o generación. El directorio tiene a toda la comunidad."
    static let perfilPublicacionesEmptyTitle = "Sin publicaciones todavía"
    static let perfilPublicacionesEmptySubtitle = "Cuando publique algo, lo verás aquí."

    static let hashtagEmptyTitle = "Todavía sin publicaciones"
    static let hashtagEmptySubtitle = "Sé el primero en usar este hashtag y arranca la conversación."
    static let anonimoEmptyTitle = "Silencio en el foro"
    static let anonimoEmptySubtitle = "Nadie ha dicho nada todavía. Sé el primero — aquí nadie sabe quién eres."

    static let marketplaceEmptyTitle = "Mercado tranquilo por ahora"
    static let marketplaceEmptySubtitle = "¿Tienes algo que vender? Publica tu primer anuncio y llega a toda la comunidad."
    static let aventonesEmptyTitle = "Sin rides disponibles"
    static let aventonesEmptySubtitle = "Nadie ha publicado un aventón con ese filtro. ¿Te animas a ofrecer uno?"

    static let buscarEjemplos = ["carrera ITC", "fiesta sigma", "libros cálculo"]
    static let ctaPublicarAlgo = "Publicar algo"

    // Errors
    static let errorTitle = "Algo salió mal"
    static let retry = "Reintentar"
}

// MARK: - View helpers

extension View {
    func agoraScreenBackground() -> some View {
        background(AgoraDesign.Colors.fondo.ignoresSafeArea())
    }

    func agoraCard() -> some View {
        padding(AgoraDesign.Spacing.sm + 2)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
    }
}
