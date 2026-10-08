package mx.agora.mobile.nativeapp.ui.copy

object AgoraCopy {

    data class EmptyState(
        val emoji: String,
        val title: String,
        val subtitle: String,
    )

    val emptyFeed = EmptyState(
        emoji = "✨",
        title = "Tu feed está tranquilo",
        subtitle = "Sigue a más compañeros o publica algo para arrancar la conversación en el campus.",
    )

    val emptyEventos = EmptyState(
        emoji = "🎉",
        title = "Nada en el calendario por ahora",
        subtitle = "¿Sabes de algo cool en la UDLAP? Crea un evento y compártelo con tu comunidad.",
    )

    val emptyMensajes = EmptyState(
        emoji = "📚",
        title = "Tu bandeja está vacía",
        subtitle = "Encuentra a alguien en el directorio y escríbele. Tus chats aparecerán aquí.",
    )

    val emptyNotificaciones = EmptyState(
        emoji = "🔔",
        title = "Estás al día",
        subtitle = "— cuando pase algo en el campus, te avisamos aquí.",
    )

    val emptyGuardados = EmptyState(
        emoji = "🔖",
        title = "Nada guardado aún",
        subtitle = "Toca 🔖 en cualquier publicación del feed para leerla después.",
    )

    val emptyBuscar = EmptyState(
        emoji = "🔍",
        title = "Sin resultados",
        subtitle = "No encontramos nada con esa búsqueda. Prueba otro nombre, hashtag o palabra clave.",
    )

    val emptyBuscarHints = EmptyState(
        emoji = "🔍",
        title = "¿Qué andas buscando?",
        subtitle = "Personas, posts, eventos o cosas en el marketplace — escribe al menos 2 letras.",
    )

    val emptyMarketplace = EmptyState(
        emoji = "🛍",
        title = "Mercado tranquilo por ahora",
        subtitle = "¿Tienes algo que vender? Publica tu primer anuncio y llega a toda la comunidad.",
    )

    val emptyAventones = EmptyState(
        emoji = "🚗",
        title = "Sin rides disponibles",
        subtitle = "Nadie ha publicado un aventón con ese filtro. ¿Te animas a ofrecer uno?",
    )

    val emptyDirectorio = EmptyState(
        emoji = "📇",
        title = "No encontramos a nadie",
        subtitle = "Prueba otro nombre, @handle o generación. El directorio tiene a toda la comunidad.",
    )

    val emptyHashtag = EmptyState(
        emoji = "✨",
        title = "Todavía sin publicaciones",
        subtitle = "Sé el primero en usar este hashtag y arranca la conversación.",
    )

    val emptyAnonimo = EmptyState(
        emoji = "🎭",
        title = "Silencio en el foro",
        subtitle = "Nadie ha dicho nada todavía. Sé el primero — aquí nadie sabe quién eres.",
    )

    val emptyMensajeDetalle = EmptyState(
        emoji = "💬",
        title = "Empieza la conversación",
        subtitle = "Escribe el primer mensaje. Sin presión, sin formalidades.",
    )

    val emptyPerfilPublicaciones = EmptyState(
        emoji = "📷",
        title = "Sin publicaciones todavía",
        subtitle = "Cuando publique algo, lo verás aquí.",
    )

    val emptyModeracion = EmptyState(
        emoji = "✅",
        title = "Cola vacía",
        subtitle = "No hay reportes abiertos. El campus está en paz.",
    )

    val emptySeguidores = EmptyState(
        emoji = "👥",
        title = "Sin seguidores todavía",
        subtitle = "Cuando alguien siga este perfil, aparecerá aquí.",
    )

    val emptySiguiendo = EmptyState(
        emoji = "👥",
        title = "No sigue a nadie todavía",
        subtitle = "Las personas que siga aparecerán aquí.",
    )

    object errors {
        const val network = "Sin conexión. Revisa tu WiFi o datos y vuelve a intentar."
        const val session = "Tu sesión expiró. Vuelve a entrar con tu correo @udlap.mx."
        const val generic = "Algo salió mal. Intenta de nuevo en un momento."
        const val notFound = "No encontramos lo que buscas. Puede que ya no exista."
    }

    object cta {
        const val explorarDirectorio = "Explorar directorio"
        const val publicarAlgo = "Publicar algo"
        const val verEventos = "Ver eventos"
        const val buscarPersonas = "Buscar personas"
        const val reintentar = "Reintentar"
    }

    /** Mismo copy que la web (`apps/web/lib/copy.ts` → `login`). */
    object login {
        const val lema = "Red social verificada de la UDLAP"
        const val etiquetaCorreo = "Correo @udlap.mx"
        const val botonCorreo = "Enviar código"
        const val botonCorreoEnviando = "Enviando…"
        const val errorEnviar = "No se pudo enviar el código."
        const val errorVerificar = "Código incorrecto."

        const val tituloCodigo = "Revisa tu correo"
        fun entradillaCodigo(email: String) = "Te mandamos 6 dígitos a $email."
        const val etiquetaCodigo = "Código de 6 dígitos"
        const val botonCodigo = "Entrar al Ágora"
        const val botonVerificando = "Verificando…"
        const val cambiarCorreo = "Cambiar correo"
        const val reenviar = "Reenviar código"
        const val avisoOutlook =
            "Si no lo ves en la bandeja principal, busca \"Ágora\" o \"udlagora\" y revisa Correo no deseado, la pestaña Otros y Cuarentena en Outlook."
        const val pie = "Vence en 10 minutos y solo sirve una vez."
        const val remitente = "Llega de contacto@zynoratek.com («Ágora · Zynora Tek»)."

        object entrega {
            const val enviado = "Enviando tu código…"
            const val demorado = "Outlook está tardando en aceptarlo. Se reintenta solo; dale un minuto."
            const val entregado =
                "Entregado en tu buzón UDLAP. Si no está en la bandeja principal, revisa la pestaña Otros o Correo no deseado."
            fun rebotado(email: String) =
                "Outlook rechazó $email: esa dirección no existe en UDLAP. Revisa que esté bien escrita."
            const val bloqueado =
                "Esa dirección había rebotado antes y estaba en pausa. Ya la liberamos: pide el código otra vez."
            const val error = "No pudimos entregarlo. Intenta de nuevo en un minuto."
            const val sinNoticias = "Sigue en camino. Si en un par de minutos no aparece, reenvíalo."
        }
    }

    object legal {
        const val noAfiliada = "Ágora no está afiliada a la Universidad de las Américas Puebla."
        const val desarrolladoPor = "Developed by "
        const val zynora = "Zynora Tek"
        const val zynoraUrl = "https://zynoratek.com"
    }

    object compartir {
        const val accion = "Compartir"
        const val publicacion = "Publicación en Ágora"
    }

    val buscarEjemplos = listOf(
        "carrera ITC",
        "fiesta sigma",
        "libros cálculo",
    )
}
