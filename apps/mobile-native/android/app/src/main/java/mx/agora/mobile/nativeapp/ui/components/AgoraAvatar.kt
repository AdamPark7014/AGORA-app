package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/**
 * Foto de perfil si hay; si no carga o no existe, iniciales blancas sobre un tono
 * propio de la persona. Diseño D: cuadrado redondeado (radio 14 a 40 dp, 28 a 88
 * dp en el perfil), no círculo.
 */
@Composable
fun AgoraAvatar(
    nombre: String?,
    fotoUrl: String?,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
) {
    val url = ApiClient.resolveUrl(fotoUrl)
    val forma = modifier.size(size).clip(RoundedCornerShape(size * 0.34f))
    if (url == null) {
        Iniciales(nombre, forma, size)
        return
    }
    SubcomposeAsyncImage(
        model = url,
        contentDescription = null,
        modifier = forma,
        contentScale = ContentScale.Crop,
        loading = { Iniciales(nombre, Modifier.size(size), size) },
        error = { Iniciales(nombre, Modifier.size(size), size) },
    )
}

@Composable
private fun Iniciales(nombre: String?, modifier: Modifier, size: Dp) {
    val iniciales = inicialesDe(nombre)
    Box(
        modifier = modifier.background(tonoDe(nombre)),
        contentAlignment = Alignment.Center,
    ) {
        // Decorativas: el nombre ya se lee junto al avatar. El tamaño va en dp
        // para que con letra grande del sistema no se salgan del cuadro.
        Text(
            iniciales,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            fontSize = with(LocalDensity.current) { (size * 0.38f).toSp() },
            modifier = Modifier.clearAndSetSemantics {},
        )
    }
}

/**
 * Tonos de los mockups de la D, ajustados para que las iniciales blancas den
 * al menos 4.5:1. El mismo nombre siempre cae en el mismo tono.
 */
private val tonos = listOf(
    Color(0xFF0F7A6A),
    Color(0xFFC2407C),
    Color(0xFF6B4BD6),
    Color(0xFF3F63C8),
    Color(0xFFA35F00),
    Color(0xFF9A3503),
)

private fun tonoDe(nombre: String?): Color =
    tonos[Math.floorMod(nombre.orEmpty().trim().lowercase().hashCode(), tonos.size)]

fun inicialesDe(nombre: String?): String =
    nombre.orEmpty()
        .trim()
        .split(Regex("\\s+"))
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")
        .ifBlank { "?" }
