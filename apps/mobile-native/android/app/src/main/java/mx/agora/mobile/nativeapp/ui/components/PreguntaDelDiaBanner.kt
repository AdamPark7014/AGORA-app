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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
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
import java.time.Instant

@Composable
fun PreguntaDelDiaBanner(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
) {
    var pregunta by remember { mutableStateOf<PreguntaHoyDto?>(null) }
    var respondiendo by remember { mutableStateOf(false) }
    var errorRespuesta by remember { mutableStateOf(false) }
    var celebrando by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val haptics = rememberHaptics()

    var ahora by remember { mutableLongStateOf(System.currentTimeMillis()) }
    // Sube cada vez que hay que volver a pedir la pregunta (al caer la hora sorpresa).
    var recargas by remember { mutableIntStateOf(0) }

    LaunchedEffect(recargas) {
        runCatching {
            pregunta = ApiClient.api<PreguntaApi>(tokenProvider).hoy()
        }
    }

    val abreMs = isoAMs(pregunta?.abreAt)
    val esperando = pregunta?.abierta == false && abreMs != null
    val hastaMs = isoAMs(pregunta?.aTiempoHasta)
    val corriendo = pregunta?.yaRespondi == false && !esperando &&
        hastaMs != null && ahora < hastaMs

    // Antes de la hora sorpresa: se vuelve a pedir justo cuando cae.
    LaunchedEffect(esperando, abreMs) {
        if (!esperando || abreMs == null) return@LaunchedEffect
        delay((abreMs - System.currentTimeMillis() + 500).coerceAtLeast(0))
        recargas++
    }

    // Mientras corre la ventana "a tiempo", la cuenta regresiva avanza sola.
    LaunchedEffect(corriendo) {
        while (corriendo) {
            ahora = System.currentTimeMillis()
            delay(1000)
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

    if (esperando) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(AgoraColors.NaranjaSuave)
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                "Pregunta del día",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.Naranja,
            )
            Text(
                "⚡ Hoy cae a una hora sorpresa.",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                "Te avisamos en cuanto salga. Contesta en los primeros 2 minutos y sales a tiempo; " +
                    "antes de contestar no ves lo que dijeron los demás.",
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextoMedio,
            )
        }
        return
    }

    val carrera = if (actual.yaRespondi) actual.miCarrera else null

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
        if (corriendo && hastaMs != null) {
            Text(
                "⚡ ${mmss(hastaMs - ahora)} para contestar a tiempo",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.Naranja,
            )
        }
        val aTiempo = actual.aTiempo
        if (actual.yaRespondi && aTiempo != null && actual.abreAt != null) {
            val sello = if (aTiempo) "⚡ Contestaste a tiempo" else "Contestaste tarde"
            val cuantos = actual.totalATiempo?.let { " · $it a tiempo hoy" } ?: ""
            Text(
                sello + cuantos,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (aTiempo) AgoraColors.Naranja else AgoraColors.TextoMedio,
            )
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
                        .clickable(enabled = !respondiendo, role = Role.Button) {
                            respondiendo = true
                            errorRespuesta = false
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
                                } else {
                                    errorRespuesta = true
                                }
                                respondiendo = false
                            }
                        }
                        // Área táctil de 48 dp; el texto queda centrado en vertical.
                        .heightIn(min = 48.dp)
                        .wrapContentHeight(Alignment.CenterVertically)
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            if (errorRespuesta) {
                Text(
                    "No se pudo enviar tu respuesta. Intenta de nuevo.",
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                    style = MaterialTheme.typography.labelSmall,
                    color = AgoraColors.Danger,
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
                        // TalkBack lee la opción como una sola unidad y marca la elegida.
                        .semantics(mergeDescendants = true) {
                            if (seleccionada) {
                                selected = true
                                stateDescription = "Tu respuesta"
                            }
                        }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        opcion.texto,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (seleccionada) FontWeight.Bold else FontWeight.Normal,
                    )
                    val deCarrera = carrera?.takeIf { it.total > 0 }?.let {
                        " · tu carrera ${(it.votos[opcion.indice.toString()] ?: 0) * 100 / it.total}%"
                    } ?: ""
                    Text(
                        "$pct%$deCarrera",
                        style = MaterialTheme.typography.labelSmall,
                        color = AgoraColors.TextoMedio,
                    )
                }
            }
            val deCarrera = carrera?.takeIf { it.total > 0 }?.let { ", ${it.total} de ${it.nombre}" } ?: ""
            val contestaron = if (actual.total == 1) {
                "1 persona de tu comunidad ya contestó hoy"
            } else {
                "${actual.total} personas de tu comunidad ya contestaron hoy"
            }
            Text(
                "$contestaron$deCarrera.",
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
            // Borde no se veía sobre el degradado.
            trackColor = AgoraColors.Naranja.copy(alpha = 0.2f),
        )
    }
}

private fun isoAMs(iso: String?): Long? =
    iso?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }

internal fun mmss(ms: Long): String {
    val s = ((ms + 999) / 1000).coerceAtLeast(0)
    return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
}
