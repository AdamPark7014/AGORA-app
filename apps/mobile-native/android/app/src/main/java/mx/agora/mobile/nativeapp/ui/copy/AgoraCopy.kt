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
        const val entradilla =
            "Entra con tu correo @udlap.mx y tu contraseña. El código al correo solo se pide una vez, al crear tu cuenta."
        const val etiquetaCorreo = "Correo @udlap.mx"
        const val etiquetaContrasena = "Contraseña"
        const val mostrarContrasena = "Mostrar contraseña"
        const val ocultarContrasena = "Ocultar contraseña"
        const val recordarme = "Recordarme en este dispositivo"
        const val botonEntrar = "Entrar"
        const val botonEntrando = "Entrando…"
        const val olvide = "¿Olvidaste tu contraseña?"
        const val primeraVez = "¿Primera vez aquí?"
        const val crearCuenta = "Crea tu cuenta"
        const val errorEntrar = "No se pudo entrar. Intenta de nuevo."
        const val errorEnviar = "No se pudo enviar el código."
        const val errorVerificar = "Código incorrecto."
        const val errorContrasena = "No se pudo guardar la contraseña."

        /** Pedir el código: registro, cuenta de antes sin contraseña, u «olvidé». */
        object pedir {
            const val tituloRegistro = "Verifica tu correo UDLAP"
            const val tituloOlvide = "Recupera tu acceso"
            const val explicacionRegistro =
                "Te mandamos un código de 6 dígitos a tu buzón @udlap.mx para comprobar que eres de la UDLAP. Solo esta vez: después entras con tu contraseña."
            const val explicacionOlvide =
                "Te mandamos un código a tu buzón @udlap.mx. Con él entras y eliges una contraseña nueva. Si tu cuenta es de antes y nunca tuvo contraseña, este también es tu camino."
            const val boton = "Enviarme el código"
            const val botonEnviando = "Enviando…"
            const val volver = "Ya tengo contraseña"
        }

        /** Crear la contraseña después del código, o cambiarla desde Ajustes. */
        object nuevaContrasena {
            const val tituloCrear = "Crea tu contraseña"
            const val tituloOlvide = "Elige una contraseña nueva"
            const val entradillaCrear = "Con ella entrarás de ahora en adelante. No volverás a necesitar un código."
            const val entradillaOlvide = "Tus otras sesiones se cerrarán por seguridad."
            const val etiquetaActual = "Contraseña actual"
            const val etiqueta = "Contraseña nueva"
            const val confirmar = "Repítela"
            const val ayuda = "Mínimo 8 caracteres. Que no sea tu correo ni una de las típicas."
            const val noCoincide = "Las contraseñas no coinciden."
            const val boton = "Guardar contraseña"
            const val botonGuardando = "Guardando…"
        }

        /** Tarjeta «Contraseña» de Ajustes (`componentes/seccion-contrasena.tsx` en la web). */
        object ajustes {
            const val titulo = "Contraseña"
            const val tiene =
                "Entras con tu correo @udlap.mx y esta contraseña. Si la cambias, tus otras sesiones se cierran."
            const val noTiene =
                "Tu cuenta es de antes de las contraseñas. Crea una y entrarás sin esperar el código del correo."
            const val botonCrear = "Crear mi contraseña"
            const val botonCambiar = "Cambiar contraseña…"
            const val cancelar = "Cancelar"
            const val creada = "Listo: ya entras con tu contraseña."
            const val cambiada = "Contraseña cambiada."
        }

        const val tituloCodigo = "Revisa tu correo"
        fun entradillaCodigo(email: String) = "Te mandamos 6 dígitos a $email."
        const val etiquetaCodigo = "Código de 6 dígitos"
        const val botonCodigo = "Entrar al Ágora"
        const val botonVerificando = "Verificando…"
        const val cambiarCorreo = "Cambiar correo"
        const val reenviar = "Reenviar código"
        const val avisoOutlook =
            "Si no lo ves en la bandeja principal, busca \"Ágora\" o \"udlagora\" y revisa Correo no deseado, la pestaña Otros y Cuarentena en Outlook."
        const val pie = "Vence en 15 minutos y solo sirve una vez."
        const val remitente = "Llega de contacto@zynoratek.com («Ágora · Zynora Tek»)."

        /** «¿No te llegó?» en el paso del código: el registro con el correo personal. */
        const val noLlego = "¿No te llegó? Regístrate con tu correo personal"

        /** Registro con correo personal (22-10-2026): el código va al personal y la UDLAP se confirma después. */
        object personal {
            const val titulo = "Regístrate con tu correo personal"
            const val explicacion =
                "Le preguntamos a Microsoft si tu correo UDLAP existe y te mandamos el código a tu correo personal. Después tendrás 30 días para confirmar tu correo UDLAP desde Ajustes."
            const val etiqueta = "Tu correo personal"
            const val placeholder = "nombre@gmail.com"
            const val boton = "Mandar el código a mi correo personal"
            const val botonEnviando = "Enviando…"
            const val volver = "Volver al código UDLAP"
            const val confirmaremos = "Vamos a confirmar"
            const val cambiar = "Cambiar"
            fun entradillaCodigo(correoPersonal: String) = "Te mandamos 6 dígitos a $correoPersonal."
        }

        /** Confirmar el correo @udlap.mx de una cuenta registrada con el personal (aviso, Ajustes y bloqueo). */
        object udlap {
            const val avisoTitulo = "Confirma tu correo UDLAP"
            fun avisoTexto(dias: Int) =
                "Te registraste con tu correo personal. Te quedan $dias ${if (dias == 1) "día" else "días"} para confirmar tu correo @udlap.mx."
            const val avisoBoton = "Confirmar ahora"
            const val ajustesTitulo = "Correo UDLAP"
            const val ajustesBoton = "Confirmar mi correo UDLAP"
            const val vencidoTitulo = "Confirma tu correo UDLAP para seguir"
            const val vencidoTexto =
                "Pasaron los 30 días para confirmar tu correo @udlap.mx. Pide el código a tu correo UDLAP para seguir usando Ágora."
            const val cerrarSesion = "Cerrar sesión"
            const val confirmarTitulo = "Confirma tu correo UDLAP"
            fun confirmarTexto(email: String) =
                "Te mandamos un código a $email. Al confirmarlo, tu cuenta queda verificada y elegirás tu contraseña de nuevo por seguridad."
            const val boton = "Mandarme el código"
            const val botonEnviando = "Enviando…"
            const val confirmar = "Confirmar"
            const val confirmando = "Confirmando…"
            const val contrasenaTitulo = "Elige tu contraseña de nuevo"
            const val contrasenaTexto = "Confirmaste tu correo UDLAP. Por seguridad, vuelve a elegir tu contraseña."
            const val confirmada = "Listo: confirmaste tu correo UDLAP."
        }

        object entrega {
            const val enviado = "Enviando tu código…"
            const val demorado = "Outlook está tardando en aceptarlo. Se reintenta solo; dale un minuto."
            const val entregado =
                "Entregado en tu buzón UDLAP. Si no está en la bandeja principal, revisa la pestaña Otros o Correo no deseado."
            fun rebotado(email: String) =
                "Outlook rechazó $email: esa dirección no existe en UDLAP. Revisa que esté bien escrita."
            /** El código fue al correo personal: ni Outlook ni la UDLAP vienen al caso. */
            const val entregadoPersonal =
                "Entregado en tu correo personal. Si no está en la bandeja principal, revisa Spam o Promociones."
            const val demoradoPersonal = "Tu proveedor de correo está tardando en aceptarlo. Se reintenta solo; dale un minuto."
            fun rebotadoPersonal(email: String) =
                "Tu proveedor rechazó $email: esa dirección no existe. Revisa que esté bien escrita."
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
