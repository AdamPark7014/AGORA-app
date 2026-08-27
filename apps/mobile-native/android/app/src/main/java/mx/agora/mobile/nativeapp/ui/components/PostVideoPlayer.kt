package mx.agora.mobile.nativeapp.ui.components

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MediaDto
import mx.agora.mobile.nativeapp.ui.util.VideoPlaybackCoordinator

fun MediaDto.esVideoMedia(): Boolean =
    esVideo || mime?.startsWith("video/") == true

@Composable
fun PostVideoPlayer(
    postId: String,
    url: String,
    isVisible: Boolean,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val resolvedUrl = remember(url) { ApiClient.resolveUrl(url) }
    val player = remember(resolvedUrl) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(Uri.parse(resolvedUrl)))
            playWhenReady = false
            prepare()
        }
    }

    DisposableEffect(postId, player) {
        VideoPlaybackCoordinator.register(postId, player)
        onDispose {
            VideoPlaybackCoordinator.unregister(postId)
            player.release()
        }
    }

    LaunchedEffect(isVisible, postId) {
        if (isVisible) {
            VideoPlaybackCoordinator.requestPlay(postId)
        } else {
            VideoPlaybackCoordinator.pause(postId)
        }
    }

    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                this.player = player
                useController = true
            }
        },
        modifier = modifier,
    )
}
