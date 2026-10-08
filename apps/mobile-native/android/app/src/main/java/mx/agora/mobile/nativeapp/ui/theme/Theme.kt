package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/** Se arma después de fijar [AgoraColors.oscuro]: los getters ya devuelven la variante correcta. */
private fun esquema(oscuro: Boolean): ColorScheme {
    // En oscuro el naranja es más claro: texto oscuro encima, como en la web.
    val sobreNaranja = if (oscuro) Color(0xFF1A0A02) else Color.White
    val base = if (oscuro) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = AgoraColors.Naranja,
        onPrimary = sobreNaranja,
        primaryContainer = AgoraColors.NaranjaSuave,
        onPrimaryContainer = AgoraColors.NaranjaOscuro,
        secondary = AgoraColors.TextoMedio,
        onSecondary = if (oscuro) AgoraColors.Fondo else Color.White,
        surface = AgoraColors.Superficie,
        surfaceVariant = AgoraColors.SurfaceElevated,
        background = AgoraColors.Fondo,
        onSurface = AgoraColors.Texto,
        onBackground = AgoraColors.Texto,
        onSurfaceVariant = AgoraColors.TextMuted,
        outline = AgoraColors.Borde,
        outlineVariant = AgoraColors.BordeSutil,
        error = AgoraColors.Danger,
        onError = if (oscuro) AgoraColors.Fondo else Color.White,
        errorContainer = AgoraColors.DangerSuave,
        onErrorContainer = AgoraColors.Danger,
    )
}

@Composable
fun AgoraTheme(oscuro: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    AgoraColors.oscuro = oscuro
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as android.app.Activity).window
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !oscuro
        }
    }

    MaterialTheme(
        colorScheme = esquema(oscuro),
        typography = AgoraTypography,
        shapes = AgoraShapes,
        content = content,
    )
}
