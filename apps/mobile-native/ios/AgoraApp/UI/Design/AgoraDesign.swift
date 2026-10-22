import SwiftUI
import UIKit

// MARK: - Colors (paridad con `AgoraColors.kt`; modo oscuro = tokens de `apps/web/app/globals.css`)

enum AgoraDesign {
    enum Colors {
        static let naranja = dinamico(claro: (227, 82, 5), oscuro: (255, 107, 38))
        static let naranjaSuave = dinamico(claro: (255, 240, 232), oscuro: (42, 21, 9))
        static let naranjaOscuro = dinamico(claro: (184, 64, 4), oscuro: (255, 133, 71))

        static let fondo = dinamico(claro: (247, 245, 242), oscuro: (13, 18, 16))
        static let superficie = dinamico(claro: (255, 255, 255), oscuro: (22, 25, 29))
        static let superficieElevada = dinamico(claro: (255, 252, 250), oscuro: (30, 34, 39))

        static let texto = dinamico(claro: (26, 26, 26), oscuro: (231, 233, 234))
        static let textoMedio = dinamico(claro: (107, 107, 107), oscuro: (154, 164, 175))
        static let textoMuted = dinamico(claro: (154, 149, 144), oscuro: (125, 135, 146))

        static let borde = dinamico(claro: (232, 228, 223), oscuro: (42, 47, 54))
        static let bordeSutil = dinamico(claro: (240, 236, 232), oscuro: (34, 38, 44))

        static let success = dinamico(claro: (46, 125, 79), oscuro: (127, 201, 168))
        static let danger = dinamico(claro: (198, 40, 40), oscuro: (242, 97, 97))
        static let dangerSuave = dinamico(claro: (253, 236, 234), oscuro: (58, 24, 24))

        static let skeletonBase = dinamico(claro: (232, 228, 223), oscuro: (34, 38, 44))
        static let skeletonHighlight = dinamico(claro: (245, 242, 239), oscuro: (46, 51, 58))

        /// Color que cambia solo con el modo claro/oscuro del sistema (o el que
        /// fije el usuario en Ajustes → Apariencia).
        private static func dinamico(claro: (Int, Int, Int), oscuro: (Int, Int, Int)) -> Color {
            let uiClaro = uiColor(claro)
            let uiOscuro = uiColor(oscuro)
            return Color(UIColor { rasgos in
                rasgos.userInterfaceStyle == .dark ? uiOscuro : uiClaro
            })
        }

        private static func uiColor(_ rgb: (Int, Int, Int)) -> UIColor {
            UIColor(
                red: CGFloat(rgb.0) / 255,
                green: CGFloat(rgb.1) / 255,
                blue: CGFloat(rgb.2) / 255,
                alpha: 1
            )
        }
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
    static let loginResend = "Reenviar código"
    static let loginPie = "Vence en 15 minutos y solo sirve una vez. Llega de contacto@zynoratek.com («Ágora · Zynora Tek»). En Outlook: busca Zynora o Ágora, revisa Correo no deseado y la pestaña Otros."
    static let loginAvisoOutlook = "Si no lo ves en la bandeja principal, busca \"Ágora\" o \"udlagora\" y revisa Correo no deseado, la pestaña Otros y Cuarentena en Outlook."
    static let loginDemasiadosIntentos = "Ya pediste un código hace poco. Usa el último que te llegó o espera un minuto."

    // Entrar con contraseña (paridad con `copy.login` en la web, 21-10-2026)
    static let loginTitulo = "Tu red en el campus"
    static let loginEntradilla = "Entra con tu correo @udlap.mx y tu contraseña. El código al correo solo se pide una vez, al crear tu cuenta."
    static let loginContrasenaLabel = "Contraseña"
    static let loginMostrarContrasena = "Mostrar contraseña"
    static let loginOcultarContrasena = "Ocultar contraseña"
    static let loginRecordarme = "Recordarme en este dispositivo"
    static let loginEntrando = "Entrando…"
    static let loginOlvide = "¿Olvidaste tu contraseña?"
    static let loginPrimeraVez = "¿Primera vez aquí?"
    static let loginCrearCuenta = "Crea tu cuenta"
    static let loginErrorEntrar = "No se pudo entrar. Intenta de nuevo."
    /// Pedir el código: registro, cuenta de antes sin contraseña, u «olvidé».
    static let loginPedirTituloRegistro = "Verifica tu correo UDLAP"
    static let loginPedirTituloOlvide = "Recupera tu acceso"
    static let loginPedirExplicacionRegistro = "Te mandamos un código de 6 dígitos a tu buzón @udlap.mx para comprobar que eres de la UDLAP. Solo esta vez: después entras con tu contraseña."
    static let loginPedirExplicacionOlvide = "Te mandamos un código a tu buzón @udlap.mx. Con él entras y eliges una contraseña nueva. Si tu cuenta es de antes y nunca tuvo contraseña, este también es tu camino."
    static let loginPedirBoton = "Enviarme el código"
    static let loginPedirVolver = "Ya tengo contraseña"
    /// Crear la contraseña después del código, o cambiarla desde Ajustes.
    static let contrasenaTituloCrear = "Crea tu contraseña"
    static let contrasenaTituloOlvide = "Elige una contraseña nueva"
    static let contrasenaEntradillaCrear = "Con ella entrarás de ahora en adelante. No volverás a necesitar un código."
    static let contrasenaEntradillaOlvide = "Tus otras sesiones se cerrarán por seguridad."
    static let contrasenaActual = "Contraseña actual"
    static let contrasenaNueva = "Contraseña nueva"
    static let contrasenaConfirmar = "Repítela"
    static let contrasenaAyuda = "Mínimo 8 caracteres. Que no sea tu correo ni una de las típicas."
    static let contrasenaNoCoincide = "Las contraseñas no coinciden."
    static let contrasenaGuardar = "Guardar contraseña"
    static let contrasenaGuardando = "Guardando…"
    static let contrasenaError = "No se pudo guardar la contraseña."
    /// Tarjeta «Contraseña» de Ajustes (`componentes/seccion-contrasena.tsx` en la web).
    static let ajustesContrasenaTitulo = "Contraseña"
    static let ajustesContrasenaTiene = "Entras con tu correo @udlap.mx y esta contraseña. Si la cambias, tus otras sesiones se cierran."
    static let ajustesContrasenaNoTiene = "Tu cuenta es de antes de las contraseñas. Crea una y entrarás sin esperar el código del correo."
    static let ajustesContrasenaCrear = "Crear mi contraseña"
    static let ajustesContrasenaCambiar = "Cambiar contraseña…"
    static let ajustesContrasenaCambiarBoton = "Cambiar contraseña"
    static let ajustesContrasenaCancelar = "Cancelar"
    static let ajustesContrasenaCreada = "Listo: ya entras con tu contraseña."
    static let ajustesContrasenaCambiada = "Contraseña cambiada."

    // Registro con correo personal cuando el código UDLAP no llega (22-10-2026)
    static let loginNoLlego = "¿No te llegó? Regístrate con tu correo personal"
    static let personalTitulo = "Regístrate con tu correo personal"
    static let personalExplicacion = "Le preguntamos a Microsoft si tu correo UDLAP existe y te mandamos el código a tu correo personal. Después tendrás 30 días para confirmar tu correo UDLAP desde Ajustes."
    static let personalEtiqueta = "Tu correo personal"
    static let personalPlaceholder = "nombre@gmail.com"
    static let personalBoton = "Mandar el código a mi correo personal"
    static let personalVolver = "Volver al código UDLAP"
    static func personalEntradillaCodigo(_ correo: String) -> String {
        "Te mandamos 6 dígitos a \(correo)."
    }
    static let udlapAvisoTitulo = "Confirma tu correo UDLAP"
    static func udlapAvisoTexto(_ dias: Int) -> String {
        "Te registraste con tu correo personal. Te quedan \(dias) \(dias == 1 ? "día" : "días") para confirmar tu correo @udlap.mx."
    }
    static let udlapAvisoBoton = "Confirmar ahora"
    static let udlapAjustesBoton = "Confirmar mi correo UDLAP"
    static let udlapVencidoTitulo = "Confirma tu correo UDLAP para seguir"
    static let udlapVencidoTexto = "Pasaron los 30 días para confirmar tu correo @udlap.mx. Pide el código a tu correo UDLAP para seguir usando Ágora."
    static let udlapConfirmarTitulo = "Confirma tu correo UDLAP"
    static func udlapConfirmarExplicacion(_ email: String) -> String {
        "Te mandamos un código a \(email). Al confirmarlo, tu cuenta queda verificada y elegirás tu contraseña de nuevo por seguridad."
    }
    static let udlapBoton = "Mandarme el código"
    static let udlapConfirmar = "Confirmar"
    static let udlapContrasenaTitulo = "Elige tu contraseña de nuevo"
    static let udlapContrasenaTexto = "Confirmaste tu correo UDLAP. Por seguridad, vuelve a elegir tu contraseña."
    static let udlapConfirmada = "Listo: confirmaste tu correo UDLAP."
    static let cerrarSesion = "Cerrar sesión"

    // Entrega del código (paridad con `copy.login.codigo.entrega` en la web)
    static let entregaEnviado = "Enviando tu código…"
    static let entregaDemorado = "Outlook está tardando en aceptarlo. Se reintenta solo; dale un minuto."
    static let entregaEntregado = "Entregado en tu buzón UDLAP. Si no está en la bandeja principal, revisa la pestaña Otros o Correo no deseado."
    static func entregaRebotado(_ email: String) -> String {
        "Outlook rechazó \(email): esa dirección no existe en UDLAP. Revisa que esté bien escrita."
    }
    static let entregaBloqueado = "Esa dirección había rebotado antes y estaba en pausa. Ya la liberamos: pide el código otra vez."
    static let entregaError = "No pudimos entregarlo. Intenta de nuevo en un minuto."
    static let entregaSinNoticias = "Sigue en camino. Si en un par de minutos no aparece, reenvíalo."

    // Legal / crédito
    static let legalNoAfiliada = "Ágora no está afiliada a la Universidad de las Américas Puebla."
    static let creditoPrefijo = "Developed by"
    static let creditoNombre = "Zynora Tek"
    static let creditoUrl = "https://zynoratek.com"

    // Compartir (rutas públicas de la web)
    static let webBase = "https://udlagora.com"

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
