package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import kotlin.random.Random

private data class ConfettiParticle(
    val startXFraction: Float,
    val startYFraction: Float,
    val color: Color,
    val delayMs: Int,
    val drift: Float,
)

@Composable
fun ConfettiOverlay(
    trigger: Int,
    modifier: Modifier = Modifier,
) {
    if (trigger <= 0) return

    val particles = remember(trigger) {
        List(8) { index ->
            ConfettiParticle(
                startXFraction = 0.15f + index * 0.1f,
                startYFraction = 0.25f + Random.nextFloat() * 0.15f,
                // Tokens del tema: los fijos de antes no se veían en oscuro.
                color = when (index % 4) {
                    0 -> AgoraColors.Naranja
                    1 -> AgoraColors.Success
                    2 -> AgoraColors.Warning
                    else -> AgoraColors.NaranjaOscuro
                },
                delayMs = index * 40,
                drift = (Random.nextFloat() - 0.5f) * 24f,
            )
        }
    }

    val progress = remember(trigger) { particles.map { Animatable(0f) } }

    LaunchedEffect(trigger) {
        progress.forEachIndexed { index, anim ->
            launch {
                kotlinx.coroutines.delay(particles[index].delayMs.toLong())
                anim.animateTo(1f, animationSpec = tween(durationMillis = 600))
            }
        }
    }

    Canvas(modifier = modifier.fillMaxSize()) {
        val fallDistance = 80.dp.toPx()
        val pieceSize = 8.dp.toPx()

        particles.forEachIndexed { index, particle ->
            val t = progress[index].value
            if (t <= 0f) return@forEachIndexed

            val alpha = 1f - t
            val x = size.width * particle.startXFraction + particle.drift * t
            val y = size.height * particle.startYFraction + fallDistance * t

            rotate(degrees = t * 360f, pivot = Offset(x, y)) {
                drawRect(
                    color = particle.color.copy(alpha = alpha),
                    topLeft = Offset(x - pieceSize / 2f, y - pieceSize / 2f),
                    size = androidx.compose.ui.geometry.Size(pieceSize, pieceSize),
                )
            }
        }
    }
}
