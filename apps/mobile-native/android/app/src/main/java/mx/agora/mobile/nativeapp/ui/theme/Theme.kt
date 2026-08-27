package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = AgoraColors.Naranja,
    onPrimary = Color.White,
    primaryContainer = AgoraColors.NaranjaSuave,
    onPrimaryContainer = AgoraColors.NaranjaOscuro,
    secondary = AgoraColors.TextoMedio,
    onSecondary = Color.White,
    surface = AgoraColors.Superficie,
    surfaceVariant = AgoraColors.SurfaceElevated,
    background = AgoraColors.Fondo,
    onSurface = AgoraColors.Texto,
    onBackground = AgoraColors.Texto,
    onSurfaceVariant = AgoraColors.TextMuted,
    outline = AgoraColors.Borde,
    outlineVariant = AgoraColors.BordeSutil,
    error = AgoraColors.Danger,
    onError = Color.White,
    errorContainer = AgoraColors.DangerSuave,
    onErrorContainer = AgoraColors.Danger,
)

@Composable
fun AgoraTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as android.app.Activity).window
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }

    MaterialTheme(
        colorScheme = LightColors,
        typography = AgoraTypography,
        shapes = AgoraShapes,
        content = content,
    )
}
