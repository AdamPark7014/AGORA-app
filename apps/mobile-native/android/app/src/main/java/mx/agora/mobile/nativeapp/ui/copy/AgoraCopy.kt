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

    val buscarEjemplos = listOf(
        "carrera ITC",
        "fiesta sigma",
        "libros cálculo",
    )
}
