package mx.agora.mobile.nativeapp.data.gamificacion

data class BadgeDef(
    val codigo: String,
    val etiqueta: String,
    val emoji: String,
    val subtitulo: String,
)

/** Definiciones de insignias — paridad con `@agora/contracts` BADGES_CAMPUS. */
object BadgesCampus {
    private val badges = mapOf(
        "PREGUNTA_7" to BadgeDef(
            codigo = "PREGUNTA_7",
            etiqueta = "7 días de pregunta",
            emoji = "💬",
            subtitulo = "7 días respondiendo la pregunta del día",
        ),
        "AVENTONERO" to BadgeDef(
            codigo = "AVENTONERO",
            etiqueta = "Conductor de confianza",
            emoji = "🚗",
            subtitulo = "3 aventones ofrecidos",
        ),
        "EARLY_BIRD" to BadgeDef(
            codigo = "EARLY_BIRD",
            etiqueta = "Madrugador",
            emoji = "🌅",
            subtitulo = "7 días seguidos",
        ),
        "SOCIAL" to BadgeDef(
            codigo = "SOCIAL",
            etiqueta = "Voz del campus",
            emoji = "📣",
            subtitulo = "10 publicaciones en el campus",
        ),
    )

    fun badge(codigo: String): BadgeDef? = badges[codigo]

    fun mensajeNuevaInsignia(codigo: String): String {
        val def = badges[codigo]
        return if (def != null) {
            "¡Nueva insignia! ${def.emoji} ${def.etiqueta} — ${def.subtitulo}"
        } else {
            "¡Nueva insignia! 🏆"
        }
    }
}
