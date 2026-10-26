package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Tokens de color con variante clara y oscura (la oscura es la misma paleta
 * que la web). `AgoraTheme` fija [oscuro] según el tema elegido (claro si no
 * hay elección); cambiar el modo
 * recrea la Activity, así que leer un flag simple basta y sirve también fuera
 * de funciones @Composable (lambdas de dibujo, valores por defecto).
 */
object AgoraColors {
    @Volatile
    var oscuro: Boolean = false

    private fun par(claro: Long, noche: Long): Color = Color(if (oscuro) noche else claro)

    // Diseño D (docs/diseno-d.md, aprobado el 23-10-2026). Los nombres de antes se
    // conservan para que todas las pantallas tomen la paleta nueva sin tocarlas.

    // Marca
    val Naranja get() = par(0xFFE35205, 0xFFFF6B26)
    /** `naranja-suave`: banda de comunidad, chip de reacción activo. */
    val NaranjaSuave get() = par(0xFFFDE8DC, 0xFF2A1509)
    /** `naranja-tinta`: texto sobre naranja-suave y #hashtags. */
    val NaranjaTinta get() = par(0xFF9A3503, 0xFFFFB385)
    val NaranjaOscuro get() = par(0xFFB84004, 0xFFFF8547)

    // Superficies (fondo cálido, no gris frío)
    val Fondo get() = par(0xFFF4F2EF, 0xFF0F0D0B)
    val Superficie get() = par(0xFFFFFFFF, 0xFF1B1815)
    /** Las tarjetas de la D van en `superficie`. */
    val SurfaceElevated get() = par(0xFFFFFFFF, 0xFF1B1815)
    /** `superficie-2`: segmentos y chips inactivos. */
    val Superficie2 get() = par(0xFFE9E5DF, 0xFF24201C)
    /** `oscuro`: tarjeta de la pregunta, barra de navegación flotante, barra del evento. */
    val Oscuro get() = par(0xFF14110F, 0xFF24201C)

    // Texto (`tinta-media` >= 4.5:1 sobre fondo y superficie en ambos modos)
    val Texto get() = par(0xFF14110F, 0xFFF4F2EF)
    val TextoMedio get() = par(0xFF6B625B, 0xFFB3AAA1)
    val TextMuted get() = par(0xFF6B625B, 0xFFB3AAA1)

    // Bordes
    val Borde get() = par(0xFFE6E1DB, 0xFF2E2925)
    val BordeSutil get() = par(0xFFEFEBE6, 0xFF24201C)

    // Semánticos
    // Claro 2A7449: 2E7D4F daba 4.49:1 sobre SuccessSuave.
    val Success get() = par(0xFF2A7449, 0xFF7FC9A8)
    val SuccessSuave get() = par(0xFFE8F5EC, 0xFF0D2925)
    val Danger get() = par(0xFFC62828, 0xFFF26161)
    val DangerSuave get() = par(0xFFFDECEA, 0xFF3A1414)
    val Warning get() = par(0xFFE6A817, 0xFFF2C14E)
    val WarningSuave get() = par(0xFFFFF8E6, 0xFF2A2210)
    /** Ámbar para TEXTO («Apartado»): Warning da 2:1 sobre fondo claro. */
    val WarningTexto get() = par(0xFF8A5A00, 0xFFF2C14E)
    /** `vivo`: punto de «Ahora en el campus». */
    val Vivo get() = par(0xFF16A34A, 0xFF22C55E)

    // Interactivos
    val ChipSelected get() = NaranjaSuave
    val ChipSelectedText get() = NaranjaTinta
    val SkeletonBase get() = par(0xFFE9E5DF, 0xFF24201C)
    val SkeletonHighlight get() = par(0xFFF4F2EF, 0xFF2E2925)
}
