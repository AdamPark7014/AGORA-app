package mx.agora.mobile.nativeapp.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.LocalPinnableContainer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import java.time.Instant
import java.util.Locale
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AventonDto
import mx.agora.mobile.nativeapp.data.api.AventonesApi
import mx.agora.mobile.nativeapp.data.api.EventoDto
import mx.agora.mobile.nativeapp.data.api.EventoEnVivoDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.FeedApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.data.api.ResponderEventoRequest
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.formatearHora
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics

/*
 * Piezas del inicio del diseño D (docs/diseno-d.md §3) que van como items de la
 * LazyColumn del feed: «Ahora en el campus», la fila de clips y el mini evento.
 * Igual que en la web (apps/web/componentes/inicio-d.tsx), cada una desaparece
 * si la API no tiene nada que mostrar: la D no inventa datos. Sin datos no se
 * emite nada, ni siquiera el `modifier`, para que el espaciado que pone el feed
 * no deje un hueco.
 *
 * Cada una trae sus datos por su cuenta, así que se anclan a la lista
 * ([AnclarEnLaLista], el mismo truco de CarruselFeed.kt): al bajar no se
 * desechan y al subir no vuelven vacías ni recargan.
 */

/** Ventana de «ahora»: eventos en curso o que empiezan en las próximas 3 h, igual que la web. */
private const val HORAS_EN_VIVO = 3

/** Clips en la fila; los demás están en «Ver todos». */
private const val MAX_CLIPS = 8

private val FormaTarjetaAhora = RoundedCornerShape(16.dp)
private val FormaClip = RoundedCornerShape(18.dp)
private val localeMx = Locale("es", "MX")

/**
 * Mantiene compuesto el item de la LazyColumn que lo llama aunque salga de
 * pantalla, para que su estado (datos ya cargados, scroll del carril, cuenta
 * regresiva) sobreviva al scroll. No pinta nada: llámalo antes de cualquier
 * `return` temprano.
 */
@Composable
internal fun AnclarEnLaLista() {
    val anclable = LocalPinnableContainer.current
    DisposableEffect(anclable) {
        val ancla = anclable?.pin()
        onDispose { ancla?.release() }
    }
}

// --- Ahora en el campus ----------------------------------------------------

/**
 * Punto `vivo` + «AHORA EN EL CAMPUS» y un carril de tarjetas pequeñas: eventos en
 * curso o en las próximas 3 h y, si hay, los aventones que salen en ese lapso
 * (`GET /aventones`, que ya existe). Va a lo ancho de la pantalla con su propio
 * margen de 18.
 *
 * [onAventonesClick] abre la pantalla de aventones; sin él, la tarjeta de
 * aventones se ve pero no se puede tocar.
 */
@Composable
fun AhoraEnCampus(
    tokenProvider: () -> String?,
    onEventoClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    onAventonesClick: (() -> Unit)? = null,
) {
    AnclarEnLaLista()

    var eventos by remember { mutableStateOf<List<EventoEnVivoDto>>(emptyList()) }
    var aventones by remember { mutableStateOf<List<AventonDto>>(emptyList()) }

    LaunchedEffect(Unit) {
        // Por separado: si una de las dos falla, la otra se sigue mostrando.
        launch {
            runCatching {
                ApiClient.api<EventosApi>(tokenProvider).enVivo(horas = HORAS_EN_VIVO).eventos
            }.onSuccess { eventos = it }
        }
        launch {
            runCatching { ApiClient.api<AventonesApi>(tokenProvider).proximos().aventones }
                .onSuccess { lista ->
                    val limite = System.currentTimeMillis() + HORAS_EN_VIVO * 3_600_000L
                    aventones = lista.filter { (instanteMs(it.salidaAt) ?: Long.MAX_VALUE) <= limite }
                }
        }
    }

    if (eventos.isEmpty() && aventones.isEmpty()) return

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = AgoraSpacing.Pantalla)
                .clearAndSetSemantics {
                    heading()
                    contentDescription = "Ahora en el campus"
                },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PuntoVivo()
            Text(
                "AHORA EN EL CAMPUS",
                style = MaterialTheme.typography.labelLarge.copy(
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp,
                ),
                color = AgoraColors.TextoMedio,
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = AgoraSpacing.Pantalla),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            eventos.forEach { evento ->
                TarjetaAhora(
                    titulo = evento.titulo,
                    detalle = listOfNotNull(
                        evento.lugar?.takeIf { it.isNotBlank() },
                        cuandoEmpieza(evento).takeIf { it.isNotBlank() },
                        evento.vanAIr.takeIf { it > 0 }?.let { cuenta(it, "va", "van") },
                    ).joinToString(" · "),
                    etiquetaAccion = "Ver evento",
                    onClick = { onEventoClick(evento.id) },
                )
            }
            if (aventones.isNotEmpty()) {
                val (titulo, detalle) = resumenAventones(aventones)
                TarjetaAhora(
                    titulo = titulo,
                    detalle = detalle,
                    etiquetaAccion = "Ver aventones",
                    onClick = onAventonesClick,
                )
            }
        }
    }
}

/** Punto verde de 8 con un halo suave, como en el mockup. */
@Composable
private fun PuntoVivo() {
    Box(
        modifier = Modifier
            .size(16.dp)
            .background(AgoraColors.Vivo.copy(alpha = 0.18f), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(AgoraColors.Vivo, CircleShape),
        )
    }
}

@Composable
private fun TarjetaAhora(
    titulo: String,
    detalle: String,
    etiquetaAccion: String,
    onClick: (() -> Unit)?,
) {
    Column(
        modifier = Modifier
            .widthIn(min = 150.dp, max = 240.dp)
            .heightIn(min = 48.dp)
            .clip(FormaTarjetaAhora)
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, FormaTarjetaAhora)
            .then(
                if (onClick != null) {
                    Modifier.clickable(role = Role.Button, onClickLabel = etiquetaAccion, onClick = onClick)
                } else {
                    Modifier.semantics(mergeDescendants = true) {}
                },
            )
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            titulo,
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
            color = AgoraColors.Texto,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (detalle.isNotEmpty()) {
            Text(
                detalle,
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp),
                color = AgoraColors.TextoMedio,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/** Mismas reglas que `cuandoEmpieza` de la web. */
private fun cuandoEmpieza(e: EventoEnVivoDto): String {
    if (e.enCurso) return "en curso"
    val min = e.empiezaEnMinutos ?: return formatearHora(e.inicioAt)
    return when {
        min <= 0 -> "ya empieza"
        min < 60 -> "en $min min"
        else -> formatearHora(e.inicioAt)
    }
}

/**
 * Un aventón: «Aventón a Angelópolis» / «sale en 20 min · 2 van». Varios: «3
 * aventones» / «a Angelópolis, 18:00» (el que sale primero; la API los da en orden).
 */
private fun resumenAventones(lista: List<AventonDto>): Pair<String, String> {
    val primero = lista.first()
    if (lista.size > 1) {
        val hora = formatearHora(primero.salidaAt)
        return cuenta(lista.size, "aventón", "aventones") to
            listOf("a ${primero.destino}", hora).filter { it.isNotBlank() }.joinToString(", ")
    }
    val min = instanteMs(primero.salidaAt)?.let { ((it - System.currentTimeMillis()) / 60_000).toInt() }
    val sale = when {
        min == null -> ""
        min <= 0 -> "ya sale"
        min < 60 -> "sale en $min min"
        else -> "sale ${formatearHora(primero.salidaAt)}"
    }
    return "Aventón a ${primero.destino}" to listOfNotNull(
        sale.takeIf { it.isNotBlank() },
        primero.ocupados.takeIf { it > 0 }?.let { cuenta(it, "va", "van") },
    ).joinToString(" · ")
}

// --- Clips del campus ------------------------------------------------------

/**
 * «Clips del campus» con «Ver todos» y un carril de tarjetas verticales 132×200.
 * Va a lo ancho de la pantalla: el título trae su margen de 18 y el carril el de
 * las tarjetas (14).
 */
@Composable
fun FilaClips(
    tokenProvider: () -> String?,
    onVerTodos: () -> Unit,
    onClipClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    AnclarEnLaLista()

    // null = cargando (esqueleto del mismo alto); vacía = no se pinta.
    var clips by remember { mutableStateOf<List<PostDto>?>(null) }

    LaunchedEffect(Unit) {
        clips = try {
            ApiClient.api<FeedApi>(tokenProvider).feed(tipo = "clips").publicaciones
                .filter { post -> post.media.any { it.esVideoMedia() } }
                .take(MAX_CLIPS)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Sin ruido: el feed sigue sin la fila.
            emptyList()
        }
    }

    val lista = clips
    if (lista == null) {
        EsqueletoClips(modifier)
        return
    }
    if (lista.isEmpty()) return

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        TituloSeccion("Clips del campus", accion = "Ver todos", onAccion = onVerTodos)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = AgoraSpacing.Tarjeta),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            lista.forEach { post ->
                TarjetaClip(post = post, onClick = { onClipClick(post.id) })
            }
        }
    }
}

/**
 * De portada va la que guarda la API al re-codificar el video; en clips de antes,
 * una foto de la misma publicación si la trae, y si no, fondo `oscuro` con el ▶.
 * Las vistas no salen porque la API no las da.
 */
@Composable
private fun TarjetaClip(post: PostDto, onClick: () -> Unit) {
    val portada = (
        post.media.firstOrNull { it.esVideoMedia() }?.thumbUrl
            ?: post.media.firstOrNull { !it.esVideoMedia() }?.url
        )?.let { ApiClient.resolveUrl(it) }
    val autor = post.autor?.nombre?.takeIf { it.isNotBlank() }
        ?: post.autor?.handle?.let { "@$it" }
        ?: "alguien"
    val texto = post.texto.trim()
    val descripcion = "Clip de $autor en ${post.comunidad.nombre}" +
        if (texto.isNotEmpty()) ". $texto" else ""

    Box(
        modifier = Modifier
            .size(width = 132.dp, height = 200.dp)
            .clip(FormaClip)
            .background(AgoraColors.Oscuro)
            .clickable(role = Role.Button, onClickLabel = "Ver clip", onClick = onClick)
            .semantics { contentDescription = descripcion },
    ) {
        if (portada != null) {
            AsyncImage(
                model = portada,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize(),
            )
        }
        // Velo arriba y abajo para leer el chip y el texto sobre cualquier portada.
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Black.copy(alpha = 0.35f),
                        0.35f to Color.Transparent,
                        0.55f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.7f),
                    ),
                ),
        )
        Text(
            post.comunidad.nombre,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(10.dp)
                .clip(RoundedCornerShape(50))
                .background(Color.White.copy(alpha = 0.18f))
                .padding(horizontal = 8.dp, vertical = 3.dp)
                .clearAndSetSemantics {},
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .size(34.dp)
                .background(Color.Black.copy(alpha = 0.55f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Rounded.PlayArrow,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(18.dp),
            )
        }
        if (texto.isNotEmpty()) {
            Text(
                texto,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(10.dp)
                    .clearAndSetSemantics {},
                style = MaterialTheme.typography.bodySmall.copy(
                    fontWeight = FontWeight.SemiBold,
                    lineHeight = 16.sp,
                ),
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/** Mismo alto que la fila cargada (título de 44 + 10 + tarjetas de 200): sin salto al llegar. */
@Composable
private fun EsqueletoClips(modifier: Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clearAndSetSemantics {},
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .padding(horizontal = AgoraSpacing.Pantalla)
                .height(44.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            Box(
                modifier = Modifier
                    .size(width = 150.dp, height = 18.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(AgoraColors.SkeletonBase),
            )
        }
        Row(
            // Sin desplazamiento, pero deja que las tarjetas se salgan por la derecha
            // en vez de encogerse.
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState(), enabled = false)
                .padding(horizontal = AgoraSpacing.Tarjeta),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            repeat(3) {
                Box(
                    modifier = Modifier
                        .size(width = 132.dp, height = 200.dp)
                        .clip(FormaClip)
                        .background(AgoraColors.SkeletonBase),
                )
            }
        }
    }
}

// --- Mini evento -----------------------------------------------------------

/**
 * El siguiente evento al que todavía no dices que vas, con «Voy» a un toque.
 * No pone margen lateral: el feed le da el de las tarjetas (14), como a la pregunta.
 */
@Composable
fun MiniEvento(
    tokenProvider: () -> String?,
    onEventoClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    AnclarEnLaLista()

    var evento by remember { mutableStateOf<EventoDto?>(null) }
    var cargado by remember { mutableStateOf(false) }
    var voy by remember { mutableStateOf(false) }
    var enviando by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val contexto = LocalContext.current
    val haptics = rememberHaptics()

    LaunchedEffect(Unit) {
        try {
            val ahora = System.currentTimeMillis()
            evento = ApiClient.api<EventosApi>(tokenProvider).proximos().eventos.firstOrNull { e ->
                e.miRespuesta != "VOY" && (instanteMs(e.inicioAt) ?: 0L) > ahora
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Sin ruido: el feed sigue sin el mini evento.
        }
        cargado = true
    }

    if (!cargado) {
        EsqueletoMiniEvento(modifier)
        return
    }
    val actual = evento ?: return

    fun marcarVoy() {
        if (enviando || voy) return
        enviando = true
        scope.launch {
            try {
                val api = ApiClient.api<EventosApi>(tokenProvider)
                var resp = api.responder(actual.id, ResponderEventoRequest("VOY"))
                // La API alterna: si la lista estaba vieja y ya ibas, el primer «Voy»
                // te quitó. El segundo te vuelve a poner, que es lo que pediste.
                val yaIbas = resp.miRespuesta != "VOY"
                if (yaIbas) resp = api.responder(actual.id, ResponderEventoRequest("VOY"))
                if (resp.miRespuesta == "VOY") {
                    voy = true
                    evento = actual.copy(
                        miRespuesta = "VOY",
                        vanAIr = if (yaIbas) actual.vanAIr else actual.vanAIr + 1,
                    )
                    haptics.perform(HapticType.Success)
                    AgoraAnalytics.eventoAsistencia(
                        tokenProvider,
                        mapOf("eventoId" to actual.id, "respuesta" to "VOY"),
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Un aviso corto y nada más: desde el evento se puede volver a intentar.
                Toast.makeText(
                    contexto,
                    ApiClient.mensajeDelServidor(e) ?: mensajeDe(e),
                    Toast.LENGTH_SHORT,
                ).show()
            } finally {
                enviando = false
            }
        }
    }

    val etiqueta = etiquetaEvento(actual)
    val detalle = listOfNotNull(
        formatearHora(actual.inicioAt).takeIf { it.isNotBlank() },
        actual.lugar?.takeIf { it.isNotBlank() },
    ).joinToString(" · ")

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgoraCardShape)
            .background(AgoraColors.Superficie)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(16.dp))
                .clickable(role = Role.Button, onClickLabel = "Ver evento") { onEventoClick(actual.id) },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            BloqueFecha(inicioIso = actual.inicioAt)
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(
                    etiqueta.uppercase(localeMx),
                    // En versalitas TalkBack podría deletrearla.
                    modifier = Modifier.semantics { contentDescription = etiqueta },
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp,
                    ),
                    color = AgoraColors.NaranjaTinta,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    actual.titulo,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        lineHeight = 20.sp,
                    ),
                    color = AgoraColors.Texto,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (detalle.isNotEmpty()) {
                    Text(
                        detalle,
                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp),
                        color = AgoraColors.TextoMedio,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        if (voy) {
            BotonVas(titulo = actual.titulo)
        } else {
            BotonTinta(
                texto = "Voy",
                onClick = { marcarVoy() },
                enabled = !enviando,
                modifier = Modifier.semantics { contentDescription = "Voy a ${actual.titulo}" },
            )
        }
    }
}

/** «Vas» con palomita: ya respondiste, así que no se vuelve a tocar desde aquí. */
@Composable
private fun BotonVas(titulo: String) {
    Row(
        modifier = Modifier
            .heightIn(min = 44.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.NaranjaSuave)
            .clearAndSetSemantics {
                role = Role.Button
                disabled()
                contentDescription = "Vas a $titulo"
            }
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(
            Icons.Rounded.Check,
            contentDescription = null,
            tint = AgoraColors.NaranjaTinta,
            modifier = Modifier.size(16.dp),
        )
        Text(
            "Vas",
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
            color = AgoraColors.NaranjaTinta,
        )
    }
}

/** Mismo alto que la tarjeta cargada (bloque de fecha de 72 + 14 arriba y abajo). */
@Composable
private fun EsqueletoMiniEvento(modifier: Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgoraCardShape)
            .background(AgoraColors.Superficie)
            .padding(14.dp)
            .clearAndSetSemantics {},
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(width = 64.dp, height = 72.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(AgoraColors.SkeletonBase),
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf(0.4f to 10.dp, 0.8f to 16.dp, 0.55f to 10.dp).forEach { (ancho, alto) ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth(ancho)
                        .height(alto)
                        .clip(RoundedCornerShape(4.dp))
                        .background(AgoraColors.SkeletonBase),
                )
            }
        }
    }
}

/**
 * Lógica de `etiquetaEvento` de la web. La lista solo trae eventos abiertos o de
 * mis comunidades: si es de una generación, es la mía.
 */
private fun etiquetaEvento(e: EventoDto): String {
    if (e.comunidad?.slug?.startsWith("generacion:") == true && e.vanAIr > 0) {
        return "Tu generación va · ${e.vanAIr}"
    }
    val primero = e.asistentes.firstOrNull()?.nombre?.trim()?.substringBefore(' ')?.takeIf { it.isNotEmpty() }
    return when {
        primero != null && e.vanAIr > 1 -> "Van $primero y ${e.vanAIr - 1} más"
        primero != null -> "Va $primero"
        e.vanAIr == 1 -> "Va 1 persona"
        e.vanAIr > 1 -> "Van ${e.vanAIr}"
        else -> e.comunidad?.nombre ?: "Próximo evento"
    }
}

private fun instanteMs(iso: String?): Long? =
    iso?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }
