package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.api.RetoSemanalDto
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

@Composable
fun RetoSemanalBanner(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
) {
    var reto by remember { mutableStateOf<RetoSemanalDto?>(null) }
    var celebrando by remember { mutableIntStateOf(0) }
    var ultimoRetoCelebrado by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        suspend fun cargar() {
            val token = tokenProvider() ?: return
            runCatching {
                reto = ApiClient.api<GamificacionApi> { token }.mio().retoSemanal
            }
        }
        cargar()
        GamificacionEvents.refresh.collect {
            cargar()
        }
    }

    val actual = reto ?: return

    LaunchedEffect(actual.titulo, actual.completado) {
        if (actual.completado && ultimoRetoCelebrado != actual.titulo) {
            celebrando++
            ultimoRetoCelebrado = actual.titulo
        }
    }

    val bannerScale by animateFloatAsState(
        targetValue = if (celebrando > 0) 1.03f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "retoBannerScale",
        finishedListener = { if (celebrando > 0) celebrando = 0 },
    )

    Box(modifier = modifier.fillMaxWidth()) {
        ConfettiOverlay(
            trigger = celebrando,
            modifier = Modifier.matchParentSize(),
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .scale(bannerScale)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            AgoraColors.NaranjaSuave,
                            AgoraColors.Superficie,
                            AgoraColors.NaranjaSuave.copy(alpha = 0.6f),
                        ),
                    ),
                )
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    actual.titulo,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = AgoraColors.Naranja,
                )
                if (actual.completado) {
                    Text("🎉", style = MaterialTheme.typography.titleMedium)
                }
            }

            if (actual.completado) {
                Text(
                    "¡Reto completado! Semana perfecta ⭐",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = AgoraColors.Naranja,
                )
            } else {
                Text(
                    "Responde la pregunta del día todos los días de esta semana",
                    style = MaterialTheme.typography.bodySmall,
                    color = AgoraColors.TextoMedio,
                )
            }

            val progreso = (actual.progreso.toFloat() / actual.meta.coerceAtLeast(1)).coerceIn(0f, 1f)
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "${actual.progreso}/${actual.meta} preguntas",
                    style = MaterialTheme.typography.labelSmall,
                    color = AgoraColors.TextoMedio,
                )
                LinearProgressIndicator(
                    progress = { progreso },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(50)),
                    color = AgoraColors.Naranja,
                    // Borde no se veía sobre el degradado.
                    trackColor = AgoraColors.Naranja.copy(alpha = 0.2f),
                )
            }
        }
    }
}
