package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.height
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.PreguntaApi
import mx.agora.mobile.nativeapp.data.api.PreguntaHoyDto
import mx.agora.mobile.nativeapp.data.api.ResponderPreguntaRequest
import mx.agora.mobile.nativeapp.data.api.SemanaPreguntaDto
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics

@Composable
fun PreguntaDelDiaBanner(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
) {
    var pregunta by remember { mutableStateOf<PreguntaHoyDto?>(null) }
    var respondiendo by remember { mutableStateOf(false) }
    var celebrando by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val haptics = rememberHaptics()

    LaunchedEffect(Unit) {
        runCatching {
            pregunta = ApiClient.api<PreguntaApi>(tokenProvider).hoy()
        }
    }

    val bannerScale by animateFloatAsState(
        targetValue = if (celebrando > 0) 1.03f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "bannerScale",
        finishedListener = { if (celebrando > 0) celebrando = 0 },
    )

    val actual = pregunta ?: return

    Box(
        modifier = modifier.fillMaxWidth(),
    ) {
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
                "Pregunta del día",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.Naranja,
            )
            if (celebrando > 0) {
                Text("🎉", style = MaterialTheme.typography.titleMedium)
            }
        }
        Text(
            actual.texto,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
        )

        actual.semanaPregunta?.let { semana ->
            ProgresoSemanaPregunta(semana = semana)
        }

        if (!actual.yaRespondi) {
            actual.opciones.forEach { opcion ->
                Text(
                    opcion.texto,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(AgoraColors.Superficie)
                        .clickable(enabled = !respondiendo) {
                            respondiendo = true
                            scope.launch {
                                val resultado = runCatching {
                                    ApiClient.api<PreguntaApi>(tokenProvider)
                                        .responder(actual.id, ResponderPreguntaRequest(opcion.indice))
                                }
                                if (resultado.isSuccess) {
                                    val resp = resultado.getOrNull()
                                    pregunta = resp
                                    GamificacionEvents.notifyPingResult(resp?.nuevasInsignias ?: emptyList())
                                    haptics.perform(HapticType.Success)
                                    celebrando++
                                    delay(400)
                                }
                                respondiendo = false
                            }
                        }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        } else {
            val total = actual.total.coerceAtLeast(1)
            actual.opciones.forEach { opcion ->
                val votos = opcion.votos ?: 0
                val pct = votos * 100 / total
                val seleccionada = opcion.indice == actual.miOpcion
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (seleccionada) AgoraColors.Superficie else AgoraColors.Superficie.copy(alpha = 0.7f),
                        )
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        opcion.texto,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (seleccionada) FontWeight.Bold else FontWeight.Normal,
                    )
                    Text(
                        "$pct%",
                        style = MaterialTheme.typography.labelSmall,
                        color = AgoraColors.TextoMedio,
                    )
                }
            }
            Text(
                "${actual.total} respuestas",
                style = MaterialTheme.typography.labelSmall,
                color = AgoraColors.TextoMedio,
            )
        }
        }
    }
}

@Composable
private fun ProgresoSemanaPregunta(semana: SemanaPreguntaDto) {
    val progreso = (semana.respondidas.toFloat() / semana.meta.coerceAtLeast(1)).coerceIn(0f, 1f)

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            "Esta semana: ${semana.respondidas}/${semana.meta} días",
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
            trackColor = AgoraColors.Borde,
        )
    }
}
