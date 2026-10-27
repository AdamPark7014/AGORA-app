package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.PreguntaApi
import mx.agora.mobile.nativeapp.data.api.PreguntaHoyDto
import mx.agora.mobile.nativeapp.data.api.ResponderPreguntaRequest
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics
import java.time.Instant
import kotlin.math.roundToInt

/*
 * Pregunta del día con el estilo del artboard Main (el Feed B no la define, docs/diseno-d.md
 * §0): tarjeta naranja muy suave, «QUEDAN m:ss», opciones en cuadrícula de dos y, al contestar,
 * barras de porcentaje (la mía en naranja) con tu carrera contra el campus. Misma lógica de
 * antes; paridad con `PreguntaDelDiaBanner.swift`.
 */
private val FormaPregunta = RoundedCornerShape(16.dp)
private val FormaOpcion = RoundedCornerShape(8.dp)
private val FormaBarra = RoundedCornerShape(10.dp)

@Composable
fun PreguntaDelDiaBanner(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
) {
    // Es un item de la LazyColumn del feed: anclado, al subir no vuelve a pedir
    // la pregunta ni reinicia la cuenta regresiva.
    AnclarEnLaLista()

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
        targetValue = if (celebrando > 0) 1.02f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "bannerScale",
        finishedListener = { if (celebrando > 0) celebrando = 0 },
    )

    val actual = pregunta ?: return

    if (esperando) {
        TarjetaPregunta(modifier) {
            CabezaPregunta(dato = null)
            TituloPregunta("Hoy cae a una hora sorpresa.")
            Text(
                "Te avisamos en cuanto salga. Contesta en los primeros 2 minutos y sales a tiempo; " +
                    "antes de contestar no ves lo que dijeron los demás.",
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.SecundarioFeed,
            )
        }
        return
    }

    fun responder(indice: Int) {
        if (respondiendo || actual.yaRespondi) return
        respondiendo = true
        errorRespuesta = false
        scope.launch {
            val resultado = runCatching {
                ApiClient.api<PreguntaApi>(tokenProvider)
                    .responder(actual.id, ResponderPreguntaRequest(indice))
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

    // A la derecha de «PREGUNTA DEL DÍA»: la cuenta regresiva, las respuestas o la semana.
    val semana = actual.semanaPregunta
    val dato: Pair<String, Boolean>? = when {
        corriendo && hastaMs != null -> "QUEDAN ${mmss(hastaMs - ahora)}" to true
        actual.yaRespondi -> cuenta(actual.total, "respuesta", "respuestas") to false
        semana != null -> "${semana.respondidas}/${semana.meta} esta semana" to false
        else -> null
    }

    Box(modifier = modifier.fillMaxWidth()) {
        TarjetaPregunta(Modifier.scale(bannerScale)) {
            CabezaPregunta(dato = dato)
            TituloPregunta(actual.texto)

            if (actual.yaRespondi) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    actual.opciones.forEach { opcion ->
                        BarraResultado(
                            texto = opcion.texto,
                            mia = opcion.indice == actual.miOpcion,
                            porcentaje = porcentaje(opcion.votos ?: 0, actual.total),
                        )
                    }
                }
                val pie = comparacion(actual)
                    ?: if (actual.aTiempo == true && actual.abreAt != null) "Contestaste a tiempo" else null
                pie?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = AgoraColors.SecundarioFeed)
                }
            } else {
                // Dos columnas, como el artboard Main.
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    actual.opciones.chunked(2).forEach { fila ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            fila.forEach { opcion ->
                                BotonOpcion(
                                    texto = opcion.texto,
                                    habilitada = !respondiendo,
                                    onClick = { responder(opcion.indice) },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (fila.size == 1) Box(Modifier.weight(1f))
                        }
                    }
                }
                if (errorRespuesta) {
                    Text(
                        "No se pudo enviar tu respuesta. Intenta de nuevo.",
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                        style = MaterialTheme.typography.labelMedium,
                        color = AgoraColors.Danger,
                    )
                }
            }
        }

        ConfettiOverlay(
            trigger = celebrando,
            modifier = Modifier.matchParentSize(),
        )
    }
}

@Composable
private fun TarjetaPregunta(modifier: Modifier, contenido: @Composable () -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(FormaPregunta)
            .background(AgoraColors.PreguntaFondo)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        contenido()
    }
}

/** «PREGUNTA DEL DÍA» a la izquierda; a la derecha la cuenta regresiva (resaltada) u otro dato. */
@Composable
private fun CabezaPregunta(dato: Pair<String, Boolean>?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            "PREGUNTA DEL DÍA",
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp),
            color = AgoraColors.NaranjaOscuro,
            maxLines = 1,
            modifier = Modifier
                .weight(1f)
                // En versalitas TalkBack podría deletrearlo: se lee en minúsculas.
                .clearAndSetSemantics {
                    heading()
                    contentDescription = "Pregunta del día"
                },
        )
        if (dato != null) {
            Text(
                dato.first,
                // Cifras de ancho fijo: la cuenta regresiva no baila cada segundo.
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = if (dato.second) FontWeight.Bold else FontWeight.Normal,
                    fontFeatureSettings = "tnum",
                ),
                color = if (dato.second) AgoraColors.NaranjaOscuro else AgoraColors.SecundarioFeed,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun TituloPregunta(texto: String) {
    Text(
        texto,
        style = MaterialTheme.typography.headlineSmall.copy(
            fontFamily = AgoraFonts.titulo,
            fontSize = 18.sp,
            lineHeight = 23.sp,
        ),
        color = AgoraColors.TintaFeed,
    )
}

@Composable
private fun BotonOpcion(
    texto: String,
    habilitada: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .heightIn(min = 44.dp)
            .clip(FormaOpcion)
            .background(AgoraColors.FondoFeed)
            .border(1.dp, AgoraColors.PreguntaBorde, FormaOpcion)
            .clickable(enabled = habilitada, role = Role.Button, onClickLabel = "Responder", onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Medium),
            color = AgoraColors.TintaFeed,
            textAlign = TextAlign.Center,
        )
    }
}

/** Una opción ya contestada: barra de porcentaje que crece desde cero (la mía en naranja). */
@Composable
private fun BarraResultado(texto: String, mia: Boolean, porcentaje: Int) {
    var mostrada by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { mostrada = true }
    val fraccion by animateFloatAsState(
        targetValue = if (mostrada) (porcentaje / 100f).coerceIn(0f, 1f) else 0f,
        animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing),
        label = "barraOpcion",
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 40.dp)
            .clip(FormaBarra)
            .background(AgoraColors.FondoFeed.copy(alpha = 0.7f))
            // TalkBack lee la opción como una sola unidad y marca la elegida.
            .clearAndSetSemantics {
                contentDescription = "$texto, $porcentaje por ciento"
                if (mia) selected = true
            },
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(modifier = Modifier.matchParentSize()) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraccion)
                    .background(
                        if (mia) AgoraColors.Naranja.copy(alpha = 0.3f) else AgoraColors.SecundarioFeed.copy(alpha = 0.14f),
                    ),
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            val peso = if (mia) FontWeight.SemiBold else FontWeight.Normal
            Text(
                if (mia) "$texto · tu respuesta" else texto,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, fontWeight = peso),
                color = AgoraColors.TintaFeed,
            )
            Text(
                "$porcentaje %",
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, fontWeight = peso, fontFeatureSettings = "tnum"),
                color = AgoraColors.TintaFeed,
            )
        }
    }
}

/**
 * «Sistemas votó 71 % Biblioteca · el campus 58 %»: la opción que más eligió tu carrera,
 * comparada con todo el campus. Sin datos de carrera, cuántos contestaron a tiempo.
 */
private fun comparacion(p: PreguntaHoyDto): String? {
    val carrera = p.miCarrera?.takeIf { it.total > 0 }
    if (carrera != null) {
        val favorita = p.opciones.maxByOrNull { carrera.votos[it.indice.toString()] ?: 0 }
        if (favorita != null) {
            return "${carrera.nombre} votó ${porcentaje(carrera.votos[favorita.indice.toString()] ?: 0, carrera.total)} % " +
                "${favorita.texto} · el campus ${porcentaje(favorita.votos ?: 0, p.total)} %"
        }
    }
    val aTiempo = p.totalATiempo
    if (aTiempo != null && p.abreAt != null) {
        return cuenta(aTiempo, "contestó a tiempo", "contestaron a tiempo")
    }
    return null
}

private fun porcentaje(votos: Int, total: Int): Int =
    if (total > 0) (votos * 100f / total).roundToInt() else 0

private fun isoAMs(iso: String?): Long? =
    iso?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }

internal fun mmss(ms: Long): String {
    val s = ((ms + 999) / 1000).coerceAtLeast(0)
    return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
}
