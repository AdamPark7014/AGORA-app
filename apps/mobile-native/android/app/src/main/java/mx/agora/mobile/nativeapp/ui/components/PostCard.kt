package mx.agora.mobile.nativeapp.ui.components

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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.RemoveCircleOutline
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EncuestaDto
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.api.ReaccionarRequest
import mx.agora.mobile.nativeapp.data.api.VotarEncuestaRequest
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics
import java.io.IOException

data class ReaccionInfo(
    val tipo: String,
    val emoji: String,
    val etiqueta: String,
)

val REACCIONES_POST = listOf(
    ReaccionInfo("ME_LATE", "🧡", "Me late"),
    ReaccionInfo("ME_RIO", "😂", "Me rió"),
    ReaccionInfo("APOYO", "🤝", "Apoyo"),
    ReaccionInfo("NO_MAMES", "😮", "No mames"),
)

@Composable
fun PostCard(
    post: PostDto,
    tokenProvider: () -> String?,
    onPostClick: () -> Unit,
    onHashtagClick: (String) -> Unit = {},
    onAuthorClick: (() -> Unit)? = null,
    isActive: Boolean = false,
    modifier: Modifier = Modifier,
    /** Abre el perfil de un @mencionado. Sin esto las menciones son texto plano. */
    onMentionClick: ((String) -> Unit)? = null,
    /** Solo para staff con permiso de moderar: muestra "Retirar" en el menú. */
    onRetirar: (() -> Unit)? = null,
) {
    val context = LocalContext.current
    var menuAbierto by remember(post.id) { mutableStateOf(false) }
    var miReaccion by remember(post.id) { mutableStateOf(post.miReaccion) }
    var totalReacciones by remember(post.id) { mutableIntStateOf(post.numReactions) }
    var encuesta by remember(post.id) { mutableStateOf(post.encuesta) }
    var votando by remember(post.id) { mutableStateOf(false) }
    // El feed no trae el voto propio; solo la respuesta de votar (miVoto).
    var miVoto by remember(post.id) { mutableStateOf<String?>(null) }
    var errorVoto by remember(post.id) { mutableStateOf<String?>(null) }
    var suppressCardClick by remember(post.id) { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val haptics = rememberHaptics()

    fun reaccionar(tipo: String) {
        val activa = miReaccion == tipo
        val anterior = miReaccion
        miReaccion = if (activa) null else tipo
        totalReacciones += when {
            activa -> -1
            anterior != null -> 0
            else -> 1
        }
        haptics.perform(HapticType.Toggle)
        scope.launch {
            try {
                val resp = ApiClient.api<PostsApi>(tokenProvider).reaccionar(post.id, ReaccionarRequest(tipo))
                miReaccion = resp.miReaccion
            } catch (_: Exception) {
                miReaccion = anterior
                totalReacciones = post.numReactions
            }
        }
    }

    fun votar(opcionId: String) {
        if (votando || encuesta == null) return
        votando = true
        errorVoto = null
        haptics.perform(HapticType.Toggle)
        scope.launch {
            try {
                val resp = ApiClient.api<PostsApi>(tokenProvider).votar(post.id, VotarEncuestaRequest(opcionId))
                if (resp.opciones.isNotEmpty()) encuesta = encuesta?.copy(opciones = resp.opciones)
                miVoto = resp.miVoto ?: opcionId
                haptics.perform(HapticType.Success)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorVoto = mensajeErrorVoto(e)
            } finally {
                votando = false
            }
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        onClick = {
            if (!suppressCardClick) onPostClick()
        },
        colors = CardDefaults.cardColors(containerColor = AgoraColors.Superficie),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = if (onAuthorClick != null) Modifier.clickable(onClick = onAuthorClick) else Modifier,
            ) {
                AgoraAvatar(post.autor?.nombre, post.autor?.fotoUrl)
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        post.autor?.nombre ?: "Cuenta eliminada",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                    )
                    Text(
                        "${post.comunidad.nombre} · ${haceCuanto(post.createdAt)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = AgoraColors.TextoMedio,
                        maxLines = 1,
                    )
                }
                GuardarButton(
                    postId = post.id,
                    guardado = post.miGuardado,
                    tokenProvider = tokenProvider,
                )
                if (onRetirar != null) {
                    Box {
                        // Tamaño por defecto de IconButton: 48dp de área táctil.
                        IconButton(onClick = { menuAbierto = true }) {
                            Icon(
                                Icons.Filled.MoreVert,
                                contentDescription = "Más opciones",
                                tint = AgoraColors.TextoMedio,
                            )
                        }
                        DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                            DropdownMenuItem(
                                text = { Text("Retirar (moderación)") },
                                onClick = {
                                    menuAbierto = false
                                    onRetirar()
                                },
                                leadingIcon = {
                                    Icon(Icons.Outlined.RemoveCircleOutline, contentDescription = null)
                                },
                            )
                        }
                    }
                }
            }

            if (post.texto.isNotBlank()) {
                TextoConHashtags(
                    texto = post.texto,
                    onHashtagClick = onHashtagClick,
                    onMentionClick = onMentionClick,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            if (post.media.isNotEmpty()) {
                PostMediaGrid(
                    media = post.media,
                    postId = post.id,
                    isVisible = isActive,
                    onDoubleTapReact = {
                        reaccionar("ME_LATE")
                        suppressCardClick = true
                        scope.launch {
                            delay(350)
                            suppressCardClick = false
                        }
                    },
                    modifier = Modifier.padding(top = 10.dp),
                )
            }

            encuesta?.let { poll ->
                EncuestaBloque(
                    encuesta = poll,
                    onVotar = ::votar,
                    votando = votando,
                    modifier = Modifier.padding(top = 10.dp),
                    miVoto = miVoto,
                    error = errorVoto,
                )
            }

            ReaccionesRow(
                miReaccion = miReaccion,
                totalReacciones = totalReacciones,
                numComments = post.numComments,
                onReaccionar = ::reaccionar,
                onCommentsClick = onPostClick,
                onCompartir = { compartirEnlace(context, EnlacesWeb.publicacion(post.id)) },
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}

@Composable
fun ReaccionesRow(
    miReaccion: String?,
    totalReacciones: Int,
    numComments: Int,
    onReaccionar: (String) -> Unit,
    onCommentsClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    onCompartir: (() -> Unit)? = null,
) {
    // Cada reacción ya ocupa 48dp de área táctil: sin espacio extra entre ellas
    // para que la fila quepa en pantallas de 360dp.
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        REACCIONES_POST.forEach { reaccion ->
            ReaccionButton(
                reaccion = reaccion,
                selected = miReaccion == reaccion.tipo,
                onClick = { onReaccionar(reaccion.tipo) },
            )
        }
        Text(
            totalReacciones.toString(),
            style = MaterialTheme.typography.labelSmall,
            color = AgoraColors.TextoMedio,
            modifier = Modifier
                .padding(start = 2.dp, end = 8.dp)
                .semantics {
                    contentDescription = if (totalReacciones == 1) "1 reacción" else "$totalReacciones reacciones"
                },
        )
        Text(
            "💬 $numComments",
            style = MaterialTheme.typography.labelMedium,
            color = AgoraColors.TextoMedio,
            modifier = Modifier
                .then(
                    if (onCommentsClick != null) {
                        Modifier.clickable(onClick = onCommentsClick)
                    } else {
                        Modifier
                    },
                )
                .padding(horizontal = 4.dp, vertical = 6.dp),
        )
        if (onCompartir != null) {
            Spacer(Modifier.weight(1f))
            // Tamaño por defecto de IconButton: 48dp de área táctil; el icono sigue en 18dp.
            IconButton(onClick = onCompartir) {
                Icon(
                    Icons.Outlined.Share,
                    contentDescription = AgoraCopy.compartir.accion,
                    tint = AgoraColors.TextoMedio,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

@Composable
private fun ReaccionButton(
    reaccion: ReaccionInfo,
    selected: Boolean,
    onClick: () -> Unit,
) {
    var bounceKey by remember { mutableIntStateOf(0) }

    val scale by animateFloatAsState(
        targetValue = when {
            bounceKey > 0 -> 1.4f
            selected -> 1.12f
            else -> 1f
        },
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "reaccionScale",
        finishedListener = { if (bounceKey > 0) bounceKey = 0 },
    )

    val labelScale by animateFloatAsState(
        targetValue = if (selected) 1f else 0.6f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessHigh,
        ),
        label = "labelScale",
    )

    val labelAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0f,
        animationSpec = tween(durationMillis = 150),
        label = "labelAlpha",
    )

    // 48dp de área táctil sin agrandar el emoji. TalkBack lee la etiqueta en
    // español y el estado, no el nombre del emoji.
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .sizeIn(minWidth = 48.dp, minHeight = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Button) {
                bounceKey++
                onClick()
            }
            .semantics {
                contentDescription = "Reaccionar con ${reaccion.etiqueta.lowercase()}"
                this.selected = selected
            },
    ) {
        Text(
            text = reaccion.emoji,
            modifier = Modifier
                .scale(scale)
                .clearAndSetSemantics {},
            style = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            ),
            color = if (selected) AgoraColors.Naranja else AgoraColors.TextoMedio,
        )
        if (selected || labelAlpha > 0.01f) {
            Text(
                text = reaccion.etiqueta,
                modifier = Modifier
                    .scale(labelScale)
                    .alpha(labelAlpha)
                    .clearAndSetSemantics {},
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                color = AgoraColors.Naranja,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
            )
        }
    }
}

/**
 * Mismo patrón que `partirTextoSocial` (packages/shared): @menciones de 3–30
 * caracteres y #hashtags de 2–40 letras o números (con acentos).
 */
private val TOKEN_SOCIAL = Regex("(@[a-z][a-z0-9_]{2,29}|#[\\p{L}\\p{N}_]{2,40})", RegexOption.IGNORE_CASE)

/**
 * Texto de un post con #hashtags y @menciones tocables. Usa LinkAnnotation:
 * un toque fuera de los enlaces sigue llegando a la tarjeta (abre el detalle).
 */
@Composable
fun TextoConHashtags(
    texto: String,
    onHashtagClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    onMentionClick: ((String) -> Unit)? = null,
) {
    val alHashtag by rememberUpdatedState(onHashtagClick)
    val alMencion by rememberUpdatedState(onMentionClick)
    val conMenciones = onMentionClick != null
    val estiloEnlace = TextLinkStyles(
        style = SpanStyle(color = AgoraColors.Naranja, fontWeight = FontWeight.SemiBold),
    )
    val annotated = remember(texto, conMenciones, AgoraColors.oscuro) {
        buildAnnotatedString {
            var ultimo = 0
            TOKEN_SOCIAL.findAll(texto).forEach { m ->
                if (m.range.first > ultimo) append(texto.substring(ultimo, m.range.first))
                val token = m.value
                when {
                    token.startsWith("#") -> {
                        val tag = token.drop(1)
                        withLink(
                            LinkAnnotation.Clickable(
                                tag = "hashtag:$tag",
                                styles = estiloEnlace,
                                linkInteractionListener = { alHashtag(tag) },
                            ),
                        ) { append(token) }
                    }
                    conMenciones -> {
                        val handle = token.drop(1).lowercase()
                        withLink(
                            LinkAnnotation.Clickable(
                                tag = "mencion:$handle",
                                styles = estiloEnlace,
                                linkInteractionListener = { alMencion?.invoke(handle) },
                            ),
                        ) { append(token) }
                    }
                    else -> append(token)
                }
                ultimo = m.range.last + 1
            }
            if (ultimo < texto.length) append(texto.substring(ultimo))
        }
    }

    Text(
        text = annotated,
        style = MaterialTheme.typography.bodyMedium.copy(color = AgoraColors.Texto),
        modifier = modifier,
    )
}

/**
 * Encuesta de un post. [miVoto] resalta la opción elegida (viene en la
 * respuesta de votar) y [error] se muestra debajo si el voto falló.
 */
@Composable
fun EncuestaBloque(
    encuesta: EncuestaDto,
    onVotar: (String) -> Unit,
    votando: Boolean,
    modifier: Modifier = Modifier,
    miVoto: String? = null,
    error: String? = null,
) {
    val votosTotales = encuesta.opciones.sumOf { it.votos }
    val forma = RoundedCornerShape(8.dp)

    Column(modifier = modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(encuesta.pregunta, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        encuesta.opciones.forEach { opcion ->
            val pct = if (votosTotales > 0) opcion.votos * 100 / votosTotales else 0
            val elegida = opcion.id == miVoto
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(36.dp)
                    .clip(forma)
                    .background(AgoraColors.Fondo)
                    .then(
                        if (elegida) Modifier.border(1.5.dp, AgoraColors.Naranja, forma) else Modifier,
                    )
                    .selectable(
                        selected = elegida,
                        enabled = !votando,
                        role = Role.RadioButton,
                        onClick = { onVotar(opcion.id) },
                    )
                    .semantics { if (elegida) stateDescription = "Tu voto" },
            ) {
                if (pct > 0) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(fraction = pct / 100f)
                            .background(AgoraColors.NaranjaSuave),
                    )
                }
                Text(
                    if (elegida) "✓ ${opcion.texto} · $pct%" else "${opcion.texto} · $pct%",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = if (elegida) FontWeight.Bold else FontWeight.Normal,
                    color = if (elegida) AgoraColors.Naranja else Color.Unspecified,
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .padding(horizontal = 10.dp),
                )
            }
        }
        if (error != null) {
            Text(
                error,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
    }
}

/** Mensaje del servidor (p. ej. «Esa encuesta ya cerró.») o uno genérico según el tipo de fallo. */
fun mensajeErrorVoto(e: Throwable): String =
    ApiClient.mensajeDelServidor(e)
        ?: if (e is IOException) {
            "No se pudo registrar tu voto. Revisa tu conexión."
        } else {
            "No se pudo registrar tu voto. Intenta de nuevo."
        }
