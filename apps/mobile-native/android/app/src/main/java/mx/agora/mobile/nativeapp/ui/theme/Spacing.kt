package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * 4-point spacing grid for consistent layout rhythm.
 */
object AgoraSpacing {
    val Xxs: Dp = 4.dp
    val Xs: Dp = 8.dp
    val Sm: Dp = 12.dp
    val Md: Dp = 16.dp
    val Lg: Dp = 24.dp
    val Xl: Dp = 32.dp
    val Xxl: Dp = 48.dp

    // Diseño D (docs/diseno-d.md §2)
    /** Margen lateral de pantalla (títulos, encabezado, segmento). */
    val Pantalla: Dp = 18.dp
    /** Margen lateral de las tarjetas. */
    val Tarjeta: Dp = 14.dp
    /** Separación entre tarjetas. */
    val EntreTarjetas: Dp = 12.dp
}
