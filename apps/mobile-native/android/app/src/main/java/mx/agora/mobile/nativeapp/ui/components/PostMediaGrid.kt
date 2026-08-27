package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MediaDto
import kotlin.math.roundToInt

private data class FloatingReaction(
    val id: Long,
    val offset: Offset,
)

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
    val floatingReactions = remember(postId) { mutableStateListOf<FloatingReaction>() }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (onDoubleTapReact != null && imagenes.isNotEmpty()) {
                    Modifier.pointerInput(postId) {
                        detectTapGestures(
                            onDoubleTap = { offset ->
                                onDoubleTapReact()
                                floatingReactions.add(
                                    FloatingReaction(
                                        id = System.nanoTime(),
                                        offset = offset,
                                    ),
                                )
                            },
                        )
                    }
                } else {
                    Modifier
                },
            ),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            videos.forEachIndexed { index, video ->
                val playerId = if (videos.size == 1) postId else "$postId:$index"
                PostVideoPlayer(
                    postId = playerId,
                    url = video.url,
                    isVisible = isVisible && index == 0,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(16f / 9f)
                        .clip(RoundedCornerShape(8.dp)),
                )
            }

            when (imagenes.size) {
                0 -> Unit
                1 -> {
                    AsyncImage(
                        model = ApiClient.resolveUrl(imagenes[0].url),
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(4f / 3f)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Crop,
                    )
                }
                2 -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        imagenes.take(2).forEach { img ->
                            AsyncImage(
                                model = ApiClient.resolveUrl(img.url),
                                contentDescription = null,
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .clip(RoundedCornerShape(8.dp)),
                                contentScale = ContentScale.Crop,
                            )
                        }
                    }
                }
                else -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        AsyncImage(
                            model = ApiClient.resolveUrl(imagenes[0].url),
                            contentDescription = null,
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            imagenes.drop(1).take(2).forEach { img ->
                                Box {
                                    AsyncImage(
                                        model = ApiClient.resolveUrl(img.url),
                                        contentDescription = null,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(if (imagenes.size == 3) 2f else 1f)
                                            .clip(RoundedCornerShape(8.dp)),
                                        contentScale = ContentScale.Crop,
                                    )
                                    if (imagenes.size > 3 && img == imagenes[2]) {
                                        Box(
                                            modifier = Modifier
                                                .matchParentSize()
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.45f)),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text(
                                                "+${imagenes.size - 3}",
                                                style = MaterialTheme.typography.titleLarge,
                                                color = androidx.compose.ui.graphics.Color.White,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
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

    Text(
        text = "🧡",
        fontSize = 36.sp,
        modifier = Modifier
            .offset {
                IntOffset(
                    (offset.x - 18.dp.toPx()).roundToInt(),
                    (offset.y - 36.dp.toPx()).roundToInt(),
                )
            }
            .scale(scale.value)
            .alpha(alpha.value),
    )
}
