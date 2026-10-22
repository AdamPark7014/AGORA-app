package mx.agora.mobile.nativeapp.ui.navigation

import android.content.Intent
import android.net.Uri

/**
 * Convierte rutas web (`/publicacion/{id}`), deep links (`agora://…`) y URLs
 * de udlagora.com a rutas de [AgoraNavHost].
 */
object DeepLinkParser {

    private val WEB_HOSTS = setOf("udlagora.com", "www.udlagora.com")

    /** Parsea intent de deep link o extras de notificación push. */
    fun parseIntent(intent: Intent?): String? {
        if (intent == null) return null
        intent.data?.let { return parseUri(it) }
        val extras = intent.extras
        if (extras != null) {
            val url = extras.getString("agora_url")
                ?: extras.getString("url")
            if (!url.isNullOrBlank()) return parse(url)
        }
        return null
    }

    /** Parsea URI `agora://`, `https://udlagora.com/…` o path relativo `/publicacion/{id}`. */
    fun parse(urlOrPath: String): String? {
        val path = extractPath(urlOrPath.trim())
        return pathToRoute(path)
    }

    fun parseUri(uri: Uri): String? {
        when (uri.scheme?.lowercase()) {
            "agora" -> return pathToRoute(agoraUriToPath(uri))
            "http", "https" -> {
                val host = uri.host?.lowercase()
                if (host != null && host !in WEB_HOSTS) return null
                return pathToRoute(uri.path ?: "/")
            }
        }
        return null
    }

    /** Convierte path web a URI `agora://` para PendingIntent de notificaciones. */
    fun toAgoraUri(urlOrPath: String): Uri {
        val path = extractPath(urlOrPath.trim())
        val normalized = if (path.startsWith("/")) path else "/$path"
        return Uri.parse("agora://" + normalized.removePrefix("/"))
    }

    private fun agoraUriToPath(uri: Uri): String {
        val host = uri.host
        val segments = uri.pathSegments
        return when {
            host.isNullOrEmpty() -> uri.path ?: "/"
            segments.isEmpty() -> "/$host"
            else -> "/$host/${segments.joinToString("/")}"
        }
    }

    private fun extractPath(input: String): String {
        if (input.startsWith("agora://", ignoreCase = true)) {
            val rest = input.substring("agora://".length)
            return if (rest.startsWith("/")) rest else "/$rest"
        }
        if (input.startsWith("http://", ignoreCase = true) ||
            input.startsWith("https://", ignoreCase = true)
        ) {
            return Uri.parse(input).path ?: "/"
        }
        return if (input.startsWith("/")) input else "/$input"
    }

    private fun pathToRoute(path: String): String? {
        val segments = path.trim('/').split('/').filter { it.isNotEmpty() }
        if (segments.isEmpty()) return AgoraRoutes.MAIN

        return when (segments[0].lowercase()) {
            "publicacion", "post" -> segments.getOrNull(1)?.let { AgoraRoutes.post(it) }
            "perfil" -> when (segments.getOrNull(1)?.lowercase()) {
                "mio" -> AgoraRoutes.PERFIL_YO
                null -> null
                else -> AgoraRoutes.perfil(segments[1])
            }
            "perfil-yo" -> AgoraRoutes.PERFIL_YO
            "mensajes" -> segments.getOrNull(1)?.let { AgoraRoutes.mensaje(it) } ?: AgoraRoutes.MENSAJES
            "evento", "eventos" -> when (segments.getOrNull(1)?.lowercase()) {
                "crear" -> AgoraRoutes.EVENTOS_CREAR
                // `/eventos` (la lista): en nativo es la pestaña Eventos de
                // MainShell; navigateToDeepLinkRoute la abre por PestanaBus.
                null -> AgoraRoutes.EVENTOS
                else -> AgoraRoutes.evento(segments[1])
            }
            "hashtag" -> segments.getOrNull(1)?.let { AgoraRoutes.hashtag(it) }
            "marketplace" -> segments.getOrNull(1)?.let { AgoraRoutes.marketplaceDetalle(it) }
                ?: AgoraRoutes.MARKETPLACE
            "ajustes" -> AgoraRoutes.AJUSTES
            "terminos" -> AgoraRoutes.TERMINOS
            "privacidad" -> AgoraRoutes.PRIVACIDAD
            "reglas" -> AgoraRoutes.REGLAS
            "moderacion" -> AgoraRoutes.MODERACION
            "notificaciones" -> AgoraRoutes.NOTIFICACIONES
            "aventones" -> AgoraRoutes.AVENTONES
            "anonimo" -> AgoraRoutes.ANONIMO
            "guardados" -> AgoraRoutes.GUARDADOS
            "directorio" -> AgoraRoutes.DIRECTORIO
            "buscar" -> AgoraRoutes.BUSCAR
            "mas" -> AgoraRoutes.MAS
            "feed" -> AgoraRoutes.MAIN
            // `/retos` y `/retos/...`: a propósito al feed. En nativo no hay
            // pantalla de retos; la racha, el reto semanal, los retos con amigos,
            // el ranking y el historial viven en el carrusel de arriba del feed
            // (ui/components/CarruselFeed.kt), que es lo primero que se ve.
            "retos" -> AgoraRoutes.MAIN
            else -> null
        }
    }
}
