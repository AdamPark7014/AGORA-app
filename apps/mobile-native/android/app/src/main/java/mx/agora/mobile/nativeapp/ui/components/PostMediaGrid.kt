package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MediaDto
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFotoShape
import mx.agora.mobile.nativeapp.ui.util.cuenta
import kotlin.math.roundToInt

private data class FloatingReaction(
    val id: Long,
    val offset: Offset,
)

/** Separación entre piezas de la cuadrícula (mockup FeedD: 6 px). */
private val EspacioCuadricula = 6.dp

/** Proporción de la cuadrícula de 3 o más (mockup FeedD: 366 × 230). */
private const val PROPORCION_TRES = 1.6f

/**
 * Fotos y videos de una publicación en cuadrícula (docs/diseno-d.md §3): 1,
 * completa; 2, en mitades; 3 o más, una grande y dos chicas, la última con «+N».
 * Cada pieza lleva su radio 16; el margen lateral lo pone quien la usa.
 *
 * Los videos van primero, como antes: el primero cae en la casilla grande y es
 * el único que arranca solo cuando la publicación está a la vista ([isVisible]).
 * En una casilla chica un reproductor con controles no cabe: se pinta con ▶ y
 * se abre a pantalla completa. La API no manda la duración, así que no se pinta.
 */
@Composable
fun PostMediaGrid(
    media: List<MediaDto>,
    postId: String,
    isVisible: Boolean = false,
    onDoubleTapReact: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    if (media.isEmpty()) return

    val videos = media.filter { it.esVideoMedia() }
    val imagenes = media.filter { !it.esVideoMedia() }
    val piezas = videos + imagenes
    val floatingReactions = remember(postId) { mutableStateListOf<FloatingReaction>() }
    /** Índice de la imagen abierta en el visor a pantalla completa. */
    var visor by remember(postId) { mutableStateOf<Int?>(null) }
    /** Índice del video de casilla chica abierto a pantalla completa. */
    var visorVideo by remember(postId) { mutableStateOf<Int?>(null) }
    /**
     * Esquina de cada casilla y de la cuadrícula (coordenadas de la raíz): el
     * corazón del doble toque se pinta encima de todo, justo donde se tocó.
     */
    val esquinas = remember(postId) { mutableStateMapOf<Int, Offset>() }
    var origen by remember(postId) { mutableStateOf(Offset.Zero) }
    val alReaccionar by rememberUpdatedState(onDoubleTapReact)

    val extra = (piezas.size - 3).coerceAtLeast(0)
    val restantes = piezas.drop(3)
    val textoExtra = when {
        extra == 0 -> ""
        restantes.all { it.esVideoMedia() } -> cuenta(extra, "video más", "videos más")
        restantes.none { it.esVideoMedia() } -> cuenta(extra, "foto más", "fotos más")
        else -> cuenta(extra, "foto o video más", "fotos o videos más")
    }

    // Una casilla de la cuadrícula: [enLinea] dice si un video cabe con su reproductor.
    val casilla: @Composable (Int, Boolean, Modifier, Int) -> Unit = { slot, enLinea, mod, mas ->
        val pieza = piezas[slot]
        val esVideo = slot < videos.size
        val descripcion = if (esVideo) {
            "Video ${slot + 1} de ${videos.size}"
        } else {
            "Foto ${slot - videos.size + 1} de ${imagenes.size}"
        }
        val dobleToque: ((Offset) -> Unit)? = if (onDoubleTapReact != null && !esVideo) {
            { local ->
                alReaccionar?.invoke()
                val esquina = esquinas[slot] ?: origen
                floatingReactions.add(
                    FloatingReaction(
                        id = System.nanoTime(),
                        offset = esquina - origen + local,
                    ),
                )
            }
        } else {
            null
        }
        CasillaMedia(
            pieza = pieza,
            esVideo = esVideo,
            descripcion = if (mas > 0) "$descripcion, y $textoExtra" else descripcion,
            extra = mas,
            reproductorId = if (videos.size == 1) postId else "$postId:$slot",
            enLinea = enLinea,
            reproducir = isVisible && slot == 0,
            onAbrir = {
                if (esVideo) visorVideo = slot else visor = slot - videos.size
            },
            onDobleToque = dobleToque,
            onPosicion = { esquinas[slot] = it },
            modifier = mod,
        )
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .onGloballyPositioned { origen = it.positionInRoot() },
    ) {
        when (piezas.size) {
            1 -> casilla(
                0,
                true,
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(if (videos.isNotEmpty()) 16f / 9f else 4f / 3f),
                0,
            )
            2 -> Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(EspacioCuadricula),
            ) {
                casilla(0, true, Modifier.weight(1f).aspectRatio(1f), 0)
                casilla(1, true, Modifier.weight(1f).aspectRatio(1f), 0)
            }
            else -> Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(PROPORCION_TRES),
                horizontalArrangement = Arrangement.spacedBy(EspacioCuadricula),
            ) {
                casilla(0, true, Modifier.weight(2f).fillMaxHeight(), 0)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(EspacioCuadricula),
                ) {
                    casilla(1, false, Modifier.fillMaxWidth().weight(1f), 0)
                    casilla(2, false, Modifier.fillMaxWidth().weight(1f), extra)
                }
            }
        }

        floatingReactions.forEach { reaction ->
            FloatingHeartReaction(
                offset = reaction.offset,
                onFinished = { floatingReactions.remove(reaction) },
            )
        }
    }

    visor?.let { inicio ->
        VisorImagenes(
            urls = imagenes.mapNotNull { ApiClient.resolveUrl(it.url) },
            inicio = inicio,
            onCerrar = { visor = null },
        )
    }
    visorVideo?.let { indice ->
        videos.getOrNull(indice)?.let { video ->
            VisorVideo(
                url = video.url,
                portada = video.thumbUrl,
                // Id propio: el de la casilla sigue registrado mientras el visor está abierto.
                reproductorId = "$postId:visor:$indice",
                onCerrar = { visorVideo = null },
            )
        }
    }
}

@Composable
private fun CasillaMedia(
    pieza: MediaDto,
    esVideo: Boolean,
    descripcion: String,
    extra: Int,
    reproductorId: String,
    enLinea: Boolean,
    reproducir: Boolean,
    onAbrir: () -> Unit,
    onDobleToque: ((Offset) -> Unit)?,
    onPosicion: (Offset) -> Unit,
    modifier: Modifier = Modifier,
) {
    val abrir by rememberUpdatedState(onAbrir)
    val doble by rememberUpdatedState(onDobleToque)
    val base = modifier
        .onGloballyPositioned { onPosicion(it.positionInRoot()) }
        .clip(AgoraFotoShape)

    when {
        esVideo && enLinea -> PostVideoPlayer(
            postId = reproductorId,
            url = pieza.url,
            isVisible = reproducir,
            portada = pieza.thumbUrl,
            modifier = base.background(Color.Black),
        )
        esVideo -> Box(
            modifier = base
                .background(AgoraColors.Oscuro)
                .clickable(role = Role.Button, onClickLabel = "Reproducir video", onClick = onAbrir)
                .semantics { contentDescription = descripcion },
            contentAlignment = Alignment.Center,
        ) {
            pieza.thumbUrl?.let { portada ->
                AsyncImage(
                    model = ApiClient.resolveUrl(portada),
                    contentDescription = null,
                    modifier = Modifier.matchParentSize(),
                    contentScale = ContentScale.Crop,
                )
            }
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.16f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Rounded.PlayArrow,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }
            if (extra > 0) {
                Text(
                    "+$extra",
                    color = Color.White,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(end = 8.dp, bottom = 6.dp)
                        .clearAndSetSemantics {},
                )
            }
        }
        else -> Box(
            modifier = base
                .background(AgoraColors.Superficie2)
                .pointerInput(pieza.url, onDobleToque != null) {
                    detectTapGestures(
                        onTap = { abrir() },
                        onDoubleTap = if (onDobleToque != null) {
                            { punto -> doble?.invoke(punto) }
                        } else {
                            null
                        },
                    )
                }
                // El toque va por pointerInput; TalkBack necesita además una
                // acción propia en cada foto para abrir el visor.
                .semantics {
                    role = Role.Image
                    contentDescription = descripcion
                    onClick(label = "Ver foto") {
                        abrir()
                        true
                    }
                },
        ) {
            AsyncImage(
                model = ApiClient.resolveUrl(pieza.url),
                contentDescription = null,
                modifier = Modifier.matchParentSize(),
                contentScale = ContentScale.Crop,
            )
            if (extra > 0) {
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(Color.Black.copy(alpha = 0.45f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "+$extra",
                        style = MaterialTheme.typography.titleLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clearAndSetSemantics {},
                    )
                }
            }
        }
    }
}

/** Video de una casilla chica a pantalla completa, con el mismo reproductor del feed. */
@Composable
private fun VisorVideo(
    url: String,
    portada: String?,
    reproductorId: String,
    onCerrar: () -> Unit,
) {
    Dialog(
        onDismissRequest = onCerrar,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
        ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
        ) {
            PostVideoPlayer(
                postId = reproductorId,
                url = url,
                isVisible = true,
                modifier = Modifier.fillMaxSize(),
                portada = portada,
            )
            IconButton(
                onClick = onCerrar,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .safeDrawingPadding()
                    .padding(8.dp),
            ) {
                Icon(Icons.Filled.Close, contentDescription = "Cerrar", tint = Color.White)
            }
        }
    }
}

@Composable
private fun FloatingHeartReaction(
    offset: Offset,
    onFinished: () -> Unit,
) {
    val scale = remember { Animatable(0.4f) }
    val alpha = remember { Animatable(1f) }

    LaunchedEffect(Unit) {
        scale.animateTo(1.4f, animationSpec = tween(durationMillis = 250))
        alpha.animateTo(0f, animationSpec = tween(durationMillis = 550))
        onFinished()
    }

    // Ícono en naranja de marca, no emoji (docs/diseno-d.md §6).
    Icon(
        Icons.Rounded.Favorite,
        contentDescription = null,
        tint = AgoraColors.Naranja,
        modifier = Modifier
            .offset {
                IntOffset(
                    (offset.x - 22.dp.toPx()).roundToInt(),
                    (offset.y - 22.dp.toPx()).roundToInt(),
                )
            }
            .size(44.dp)
            .scale(scale.value)
            .alpha(alpha.value)
            // Animación decorativa: la reacción ya se anuncia en el chip.
            .clearAndSetSemantics {},
    )
}
