package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/**
 * Miniatura de una foto o video adjunto antes de publicar, con botón para
 * quitarlo. El botón tiene área táctil de 48dp (el círculo visible es de 28dp)
 * y queda deshabilitado mientras ese adjunto se sube.
 */
@Composable
fun MiniaturaAdjunto(
    model: Any?,
    esVideo: Boolean,
    subiendo: Boolean,
    onQuitar: () -> Unit,
    modifier: Modifier = Modifier,
    tamano: Dp = 120.dp,
) {
    Box(modifier = modifier) {
        if (esVideo) {
            Surface(
                modifier = Modifier
                    .size(tamano)
                    .clip(RoundedCornerShape(8.dp)),
                color = AgoraColors.Naranja.copy(alpha = 0.15f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (subiendo) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(28.dp),
                            color = AgoraColors.Naranja,
                        )
                    } else {
                        Text("🎬", style = MaterialTheme.typography.headlineMedium)
                    }
                }
            }
        } else {
            AsyncImage(
                model = model,
                contentDescription = null,
                modifier = Modifier
                    .size(tamano)
                    .clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop,
            )
            if (subiendo) {
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(tamano)
                        .padding(tamano / 3),
                    color = AgoraColors.Naranja,
                )
            }
        }
        IconButton(
            onClick = onQuitar,
            enabled = !subiendo,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .size(48.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .alpha(if (subiendo) 0.4f else 1f)
                    .background(Color.Black.copy(alpha = 0.5f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = if (esVideo) "Quitar video" else "Quitar foto",
                    tint = Color.White,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}
