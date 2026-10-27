package mx.agora.mobile.nativeapp.ui.components

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
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
    portada: String? = null,
    /**
     * Si los controles aparecen solos al pausar o terminar. En el Feed B el video va de borde
     * a borde y los controles taparían la foto: ahí solo salen al tocarlo.
     */
    controlesSolos: Boolean = true,
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

    // Si el video no carga (red, formato), se avisa en vez de dejar el cuadro negro.
    var errorVideo by remember(player) { mutableStateOf(false) }
    var primerCuadro by remember(player) { mutableStateOf(false) }
    DisposableEffect(player) {
        val escucha = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                errorVideo = true
            }

            override fun onRenderedFirstFrame() {
                primerCuadro = true
            }
        }
        player.addListener(escucha)
        onDispose { player.removeListener(escucha) }
    }

    LaunchedEffect(isVisible, postId) {
        if (isVisible) {
            VideoPlaybackCoordinator.requestPlay(postId)
        } else {
            VideoPlaybackCoordinator.pause(postId)
        }
    }

    Box(modifier = modifier) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    // Antes de conectar el reproductor: al conectarlo, PlayerView ya decide
                    // si enseña los controles.
                    controllerAutoShow = controlesSolos
                    useController = true
                    this.player = player
                    if (!controlesSolos) hideController()
                    contentDescription = "Video de la publicación"
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
        // La portada de la API tapa el cuadro negro hasta que llega el primer cuadro.
        if (portada != null && !primerCuadro) {
            AsyncImage(
                model = ApiClient.resolveUrl(portada),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.matchParentSize(),
            )
        }
        if (errorVideo) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(Color.Black.copy(alpha = 0.6f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        "No se pudo reproducir el video",
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    TextButton(
                        onClick = {
                            errorVideo = false
                            player.prepare()
                        },
                    ) {
                        Text("Reintentar", color = Color.White)
                    }
                }
            }
        }
    }
}
