package mx.agora.mobile.nativeapp.ui.components

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
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EncuestaDto
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.api.ReaccionarRequest
import mx.agora.mobile.nativeapp.data.api.VotarEncuestaRequest
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics

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
) {
    var miReaccion by remember(post.id) { mutableStateOf(post.miReaccion) }
    var totalReacciones by remember(post.id) { mutableIntStateOf(post.numReactions) }
    var encuesta by remember(post.id) { mutableStateOf(post.encuesta) }
    var votando by remember(post.id) { mutableStateOf(false) }
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
        haptics.perform(HapticType.Toggle)
        scope.launch {
            try {
                val resp = ApiClient.api<PostsApi>(tokenProvider).votar(post.id, VotarEncuestaRequest(opcionId))
                encuesta = encuesta?.copy(
                    pregunta = encuesta!!.pregunta,
                    opciones = resp.opciones,
                )
                haptics.perform(HapticType.Success)
            } catch (_: Exception) {
                // silencioso
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
                AvatarIniciales(post.autor?.nombre ?: "?")
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
            }

            if (post.texto.isNotBlank()) {
                TextoConHashtags(
                    texto = post.texto,
                    onHashtagClick = onHashtagClick,
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
                )
            }

            ReaccionesRow(
                miReaccion = miReaccion,
                totalReacciones = totalReacciones,
                numComments = post.numComments,
                onReaccionar = ::reaccionar,
                onCommentsClick = onPostClick,
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
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
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
            modifier = Modifier.padding(start = 4.dp, end = 8.dp, bottom = 6.dp),
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

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(horizontal = 2.dp),
    ) {
        Text(
            text = reaccion.emoji,
            modifier = Modifier
                .scale(scale)
                .clickable {
                    bounceKey++
                    onClick()
                }
                .padding(horizontal = 4.dp, vertical = 4.dp),
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
                    .padding(bottom = 2.dp),
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                color = AgoraColors.Naranja,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun AvatarIniciales(nombre: String) {
    val iniciales = nombre
        .split(" ")
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")
        .ifBlank { "?" }

    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(AgoraColors.NaranjaSuave),
        contentAlignment = Alignment.Center,
    ) {
        Text(iniciales, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = AgoraColors.Naranja)
    }
}

@Composable
fun TextoConHashtags(
    texto: String,
    onHashtagClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val partes = remember(texto) { texto.split(Regex("(#\\w+)")) }
    val annotated = buildAnnotatedString {
        partes.forEach { parte ->
            if (parte.startsWith("#")) {
                pushStringAnnotation(tag = "hashtag", annotation = parte.drop(1))
                withStyle(SpanStyle(color = AgoraColors.Naranja, fontWeight = FontWeight.SemiBold)) {
                    append(parte)
                }
                pop()
            } else {
                append(parte)
            }
        }
    }

    ClickableText(
        text = annotated,
        style = MaterialTheme.typography.bodyMedium,
        modifier = modifier,
        onClick = { offset ->
            annotated.getStringAnnotations("hashtag", offset, offset).firstOrNull()?.let {
                onHashtagClick(it.item)
            }
        },
    )
}

@Composable
fun EncuestaBloque(
    encuesta: EncuestaDto,
    onVotar: (String) -> Unit,
    votando: Boolean,
    modifier: Modifier = Modifier,
) {
    val votosTotales = encuesta.opciones.sumOf { it.votos }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(encuesta.pregunta, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        encuesta.opciones.forEach { opcion ->
            val pct = if (votosTotales > 0) opcion.votos * 100 / votosTotales else 0
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(AgoraColors.Fondo)
                    .clickable(enabled = !votando) { onVotar(opcion.id) },
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
                    "${opcion.texto} · $pct%",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .padding(horizontal = 10.dp),
                )
            }
        }
    }
}
