package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.PreguntaApi
import mx.agora.mobile.nativeapp.data.api.PreguntaHoyDto
import mx.agora.mobile.nativeapp.data.api.ResponderPreguntaRequest
import mx.agora.mobile.nativeapp.data.api.SemanaPreguntaDto
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraChipShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics
import java.time.Instant
import kotlin.math.roundToInt

/*
 * Pregunta relámpago del diseño D (docs/diseno-d.md §3): tarjeta `oscuro`, rayo
 * naranja, «cierra en m:ss» y los resultados como barras de porcentaje.
 *
 * `oscuro` es oscura en los dos temas, así que el texto va en blanco fijo y los
 * acentos toman los tonos de la paleta nocturna (igual que la web): con los
 * tokens del tema claro, `naranja-tinta` y `danger` no se leían sobre ella.
 */
private val NaranjaSobreOscuro = Color(0xFFFFB385)
private val RojoSobreOscuro = Color(0xFFF26161)
private val TextoSobreOscuro = Color.White
private val TextoSobreOscuroMedio = Color.White.copy(alpha = 0.75f)

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
                .clip(AgoraCardShape)
                .background(AgoraColors.Oscuro)
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CabezaRelampago(sello = null)
            Text(
                "Hoy cae a una hora sorpresa.",
                style = MaterialTheme.typography.headlineSmall.copy(lineHeight = 25.sp),
                color = TextoSobreOscuro,
            )
            Text(
                "Te avisamos en cuanto salga. Contesta en los primeros 2 minutos y sales a tiempo; " +
                    "antes de contestar no ves lo que dijeron los demás.",
                style = MaterialTheme.typography.bodySmall,
                color = TextoSobreOscuroMedio,
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

    val aTiempo = actual.aTiempo
    val sello: Pair<String, Color>? = when {
        corriendo && hastaMs != null -> "cierra en ${mmss(hastaMs - ahora)}" to TextoSobreOscuro
        actual.yaRespondi && aTiempo != null && actual.abreAt != null ->
            if (aTiempo) "Contestaste a tiempo" to NaranjaSobreOscuro else "Contestaste tarde" to TextoSobreOscuro
        else -> null
    }

    Box(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .scale(bannerScale)
                .clip(AgoraCardShape)
                .background(AgoraColors.Oscuro)
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CabezaRelampago(sello = sello)

            Text(
                actual.texto,
                style = MaterialTheme.typography.headlineSmall.copy(lineHeight = 25.sp),
                color = TextoSobreOscuro,
            )

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                actual.opciones.forEach { opcion ->
                    OpcionRelampago(
                        texto = opcion.texto,
                        respondida = actual.yaRespondi,
                        mia = actual.yaRespondi && opcion.indice == actual.miOpcion,
                        porcentaje = if (actual.yaRespondi) porcentaje(opcion.votos ?: 0, actual.total) else 0,
                        habilitada = !respondiendo,
                        onResponder = { responder(opcion.indice) },
                    )
                }
            }

            if (!actual.yaRespondi) {
                if (errorRespuesta) {
                    Text(
                        "No se pudo enviar tu respuesta. Intenta de nuevo.",
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                        style = MaterialTheme.typography.labelMedium,
                        color = RojoSobreOscuro,
                    )
                }
                Text(
                    "Contesta para ver qué dijeron los demás.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextoSobreOscuroMedio,
                )
            } else {
                PieResultados(actual)
            }

            actual.semanaPregunta?.let { semana ->
                ProgresoSemanaPregunta(semana = semana)
            }
        }

        // Encima de la tarjeta: sobre `oscuro` el confeti sí se ve.
        ConfettiOverlay(
            trigger = celebrando,
            modifier = Modifier.matchParentSize(),
        )
    }
}

/** Rayo + «PREGUNTA RELÁMPAGO» a la izquierda; a la derecha la cuenta regresiva o el sello. */
@Composable
private fun CabezaRelampago(sello: Pair<String, Color>?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                // En versalitas TalkBack podría deletrearlo: se lee en minúsculas.
                .clearAndSetSemantics {
                    heading()
                    contentDescription = "Pregunta relámpago"
                },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                Icons.Rounded.Bolt,
                contentDescription = null,
                tint = AgoraColors.Naranja,
                modifier = Modifier.size(16.dp),
            )
            Text(
                "PREGUNTA RELÁMPAGO",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.7.sp,
                ),
                color = NaranjaSobreOscuro,
                maxLines = 1,
            )
        }
        if (sello != null) {
            Text(
                sello.first,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color.White.copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                // Cifras de ancho fijo: la cuenta regresiva no baila cada segundo.
                style = MaterialTheme.typography.labelMedium.copy(fontFeatureSettings = "tnum"),
                color = sello.second,
                maxLines = 1,
            )
        }
    }
}

/**
 * Una opción. Antes de contestar es un botón; después, la misma fila se vuelve
 * barra de porcentaje (la mía en naranja). Es el mismo composable en los dos
 * estados para que la barra crezca desde cero al contestar.
 */
@Composable
private fun OpcionRelampago(
    texto: String,
    respondida: Boolean,
    mia: Boolean,
    porcentaje: Int,
    habilitada: Boolean,
    onResponder: () -> Unit,
) {
    val fraccion by animateFloatAsState(
        targetValue = if (respondida) (porcentaje / 100f).coerceIn(0f, 1f) else 0f,
        animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing),
        label = "barraOpcion",
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clip(AgoraChipShape)
            .background(Color.White.copy(alpha = 0.08f))
            .then(
                if (respondida) {
                    // TalkBack lee la opción como una sola unidad y marca la elegida.
                    Modifier.semantics(mergeDescendants = true) { if (mia) selected = true }
                } else {
                    Modifier.clickable(
                        enabled = habilitada,
                        role = Role.Button,
                        onClickLabel = "Responder",
                        onClick = onResponder,
                    )
                },
            ),
        contentAlignment = Alignment.CenterStart,
    ) {
        if (fraccion > 0f) {
            Box(modifier = Modifier.matchParentSize()) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(fraccion)
                        .background(if (mia) AgoraColors.Naranja else Color.White.copy(alpha = 0.22f)),
                )
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                if (mia) "$texto · tu respuesta" else texto,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.labelLarge.copy(
                    fontWeight = if (mia) FontWeight.Bold else FontWeight.Medium,
                ),
                color = TextoSobreOscuro,
            )
            if (respondida) {
                Text(
                    "$porcentaje %",
                    style = MaterialTheme.typography.labelLarge.copy(
                        fontWeight = FontWeight.Bold,
                        fontFeatureSettings = "tnum",
                    ),
                    color = TextoSobreOscuro,
                )
            }
        }
    }
}

/**
 * «<Tu carrera> votó X % <opción> · el campus Y %» (la opción que más eligió tu
 * carrera contra todo el campus), cuántos contestaron a tiempo y el total.
 */
@Composable
private fun PieResultados(actual: PreguntaHoyDto) {
    val carrera = actual.miCarrera?.takeIf { it.total > 0 }
    val comparacion = carrera?.let { c ->
        val favorita = actual.opciones.maxByOrNull { c.votos[it.indice.toString()] ?: 0 }
        favorita?.let {
            "${c.nombre} votó ${porcentaje(c.votos[it.indice.toString()] ?: 0, c.total)} % ${it.texto} · " +
                "el campus ${porcentaje(it.votos ?: 0, actual.total)} %"
        }
    }
    val aTiempoHoy = actual.totalATiempo?.takeIf { actual.abreAt != null }?.let {
        cuenta(it, "contestó a tiempo hoy", "contestaron a tiempo hoy")
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            comparacion?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = TextoSobreOscuroMedio)
            }
            aTiempoHoy?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = TextoSobreOscuroMedio)
            }
        }
        Text(
            cuenta(actual.total, "respuesta", "respuestas"),
            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
            color = NaranjaSobreOscuro,
        )
    }
}

@Composable
private fun ProgresoSemanaPregunta(semana: SemanaPreguntaDto) {
    val progreso = (semana.respondidas.toFloat() / semana.meta.coerceAtLeast(1)).coerceIn(0f, 1f)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clearAndSetSemantics {
                contentDescription = "Esta semana contestaste ${semana.respondidas} de " +
                    cuenta(semana.meta, "día", "días")
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            "Esta semana: ${semana.respondidas}/${semana.meta} días",
            style = MaterialTheme.typography.labelMedium,
            color = TextoSobreOscuroMedio,
        )
        Box(
            modifier = Modifier
                .weight(1f)
                .height(4.dp)
                .clip(RoundedCornerShape(50))
                .background(Color.White.copy(alpha = 0.15f)),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progreso)
                    .background(AgoraColors.Naranja),
            )
        }
    }
}

private fun porcentaje(votos: Int, total: Int): Int =
    if (total > 0) (votos * 100f / total).roundToInt() else 0

private fun isoAMs(iso: String?): Long? =
    iso?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }

internal fun mmss(ms: Long): String {
    val s = ((ms + 999) / 1000).coerceAtLeast(0)
    return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
}
