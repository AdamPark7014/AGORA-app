package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Tokens de color con variante clara y oscura (la oscura es la misma paleta
 * que la web). `AgoraTheme` fija [oscuro] según el sistema; cambiar el modo
 * recrea la Activity, así que leer un flag simple basta y sirve también fuera
 * de funciones @Composable (lambdas de dibujo, valores por defecto).
 */
object AgoraColors {
    @Volatile
    var oscuro: Boolean = false

    private fun par(claro: Long, noche: Long): Color = Color(if (oscuro) noche else claro)

    // Brand
    val Naranja get() = par(0xFFE35205, 0xFFFF6B26)
    val NaranjaSuave get() = par(0xFFFFF0E8, 0xFF2A1509)
    val NaranjaOscuro get() = par(0xFFB84004, 0xFFFF8547)

    // Surfaces
    val Fondo get() = par(0xFFF7F5F2, 0xFF0D1210)
    val Superficie get() = par(0xFFFFFFFF, 0xFF16191D)
    val SurfaceElevated get() = par(0xFFFFFCFA, 0xFF1E2227)

    // Text (TextMuted >= 4.5:1 sobre Superficie en ambos modos)
    val Texto get() = par(0xFF1A1A1A, 0xFFE7E9EA)
    val TextoMedio get() = par(0xFF6B6B6B, 0xFF9AA4AF)
    // Oscuro 848E99: con 7D8792 quedaba en 4.38:1 sobre SurfaceElevated.
    val TextMuted get() = par(0xFF6F6A65, 0xFF848E99)

    // Borders & dividers
    val Borde get() = par(0xFFE8E4DF, 0xFF2A2F36)
    val BordeSutil get() = par(0xFFF0ECE8, 0xFF1E2227)

    // Semantic
    // Claro 2A7449: 2E7D4F daba 4.49:1 sobre SuccessSuave.
    val Success get() = par(0xFF2A7449, 0xFF7FC9A8)
    val SuccessSuave get() = par(0xFFE8F5EC, 0xFF0D2925)
    val Danger get() = par(0xFFC62828, 0xFFF26161)
    val DangerSuave get() = par(0xFFFDECEA, 0xFF3A1414)
    val Warning get() = par(0xFFE6A817, 0xFFF2C14E)
    val WarningSuave get() = par(0xFFFFF8E6, 0xFF2A2210)
    /** Ámbar para TEXTO («Apartado»): Warning da 2:1 sobre fondo claro. */
    val WarningTexto get() = par(0xFF8A5A00, 0xFFF2C14E)

    // Interactive
    val ChipSelected get() = NaranjaSuave
    val ChipSelectedText get() = Naranja
    val SkeletonBase get() = par(0xFFE8E4DF, 0xFF2A2F36)
    val SkeletonHighlight get() = par(0xFFF5F2EF, 0xFF3D434B)
}
