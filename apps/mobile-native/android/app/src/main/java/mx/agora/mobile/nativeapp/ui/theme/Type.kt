package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import mx.agora.mobile.nativeapp.R

/**
 * Familias del diseño D: Bricolage Grotesque (700–800) para títulos, nombres de
 * sección, títulos de evento y de perfil y cifras; Outfit (400–700) para todo lo
 * demás. Van empaquetadas en `res/font` como instancias estáticas de Google Fonts
 * (OFL, licencias en `licencias-fuentes/`): las variables necesitarían API 26 para
 * elegir el peso y la app arranca en 24.
 */
object AgoraFonts {
    val titulo: FontFamily = FontFamily(
        Font(R.font.bricolage_bold, FontWeight.Bold),
        Font(R.font.bricolage_extrabold, FontWeight.ExtraBold),
    )
    val cuerpo: FontFamily = FontFamily(
        Font(R.font.outfit_regular, FontWeight.Normal),
        Font(R.font.outfit_medium, FontWeight.Medium),
        Font(R.font.outfit_semibold, FontWeight.SemiBold),
        Font(R.font.outfit_bold, FontWeight.Bold),
    )
}

private fun titulo(peso: FontWeight, tam: Int, alto: Int, espacio: Double = -0.2) = TextStyle(
    fontFamily = AgoraFonts.titulo,
    fontWeight = peso,
    fontSize = tam.sp,
    lineHeight = alto.sp,
    letterSpacing = espacio.sp,
)

private fun cuerpo(peso: FontWeight, tam: Int, alto: Int, espacio: Double = 0.0) = TextStyle(
    fontFamily = AgoraFonts.cuerpo,
    fontWeight = peso,
    fontSize = tam.sp,
    lineHeight = alto.sp,
    letterSpacing = espacio.sp,
)

val AgoraTypography = Typography(
    displayLarge = titulo(FontWeight.ExtraBold, 57, 64, -0.5),
    displayMedium = titulo(FontWeight.ExtraBold, 45, 52, -0.5),
    displaySmall = titulo(FontWeight.ExtraBold, 36, 44, -0.4),
    // «Ágora» del encabezado (30) y títulos grandes de pantalla.
    headlineLarge = titulo(FontWeight.ExtraBold, 30, 34, -0.6),
    // Título de evento (27) y nombre en el perfil (26).
    headlineMedium = titulo(FontWeight.ExtraBold, 27, 31, -0.5),
    headlineSmall = titulo(FontWeight.Bold, 22, 27, -0.3),
    // Nombres de sección («Clips del campus»).
    titleLarge = titulo(FontWeight.ExtraBold, 20, 25, -0.2),
    titleMedium = cuerpo(FontWeight.SemiBold, 16, 22),
    titleSmall = cuerpo(FontWeight.SemiBold, 14, 20),
    bodyLarge = cuerpo(FontWeight.Normal, 16, 24),
    bodyMedium = cuerpo(FontWeight.Normal, 15, 22),
    bodySmall = cuerpo(FontWeight.Normal, 13, 18),
    labelLarge = cuerpo(FontWeight.SemiBold, 14, 20),
    labelMedium = cuerpo(FontWeight.SemiBold, 12, 16),
    labelSmall = cuerpo(FontWeight.Medium, 11, 16, 0.2),
)
