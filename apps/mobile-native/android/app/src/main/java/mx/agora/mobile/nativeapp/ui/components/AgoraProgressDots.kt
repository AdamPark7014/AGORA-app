package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

@Composable
fun AgoraProgressDots(
    pageCount: Int,
    currentPage: Int,
    modifier: Modifier = Modifier,
) {
    Row(
        // TalkBack: los puntos solos no dicen nada.
        modifier = modifier.semantics {
            contentDescription = "Página ${currentPage + 1} de $pageCount"
        },
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        repeat(pageCount) { index ->
            val active = index == currentPage
            Box(
                modifier = Modifier
                    .size(if (active) 10.dp else 8.dp)
                    .clip(CircleShape)
                    .background(
                        if (active) AgoraColors.Naranja
                        else AgoraColors.TextMuted.copy(alpha = 0.5f),
                    ),
            )
        }
    }
}
