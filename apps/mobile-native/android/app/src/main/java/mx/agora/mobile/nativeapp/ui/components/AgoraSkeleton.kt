package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.theme.AgoraAvatarShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

@Composable
fun AgoraSkeletonBox(
    modifier: Modifier = Modifier,
    height: Dp = 16.dp,
) {
    val shimmerColors = listOf(
        AgoraColors.SkeletonBase,
        AgoraColors.SkeletonHighlight,
        AgoraColors.SkeletonBase,
    )
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerTranslate",
    )
    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateAnim - 300f, 0f),
        end = Offset(translateAnim, 0f),
    )

    Box(
        modifier = modifier
            .height(height)
            .clip(AgoraCardShape)
            .background(brush),
    )
}

@Composable
fun AgoraFeedSkeleton(
    modifier: Modifier = Modifier,
    itemCount: Int = 3,
) {
    Column(
        // Sin esto TalkBack no dice nada mientras carga.
        modifier = modifier
            .padding(horizontal = AgoraSpacing.Tarjeta)
            .clearAndSetSemantics { contentDescription = "Cargando publicaciones" },
        verticalArrangement = Arrangement.spacedBy(AgoraSpacing.EntreTarjetas),
    ) {
        repeat(itemCount) {
            AgoraPostCardSkeleton()
        }
    }
}

@Composable
fun AgoraPostCardSkeleton(
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgoraCardShape)
            .background(AgoraColors.SurfaceElevated)
            .padding(AgoraSpacing.Md),
        verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Sm),
    ) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            AgoraSkeletonBox(
                modifier = Modifier
                    .size(40.dp)
                    .clip(AgoraAvatarShape),
                height = 40.dp,
            )
            Spacer(Modifier.width(AgoraSpacing.Sm))
            Column(verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Xxs)) {
                AgoraSkeletonBox(
                    modifier = Modifier.width(120.dp),
                    height = 14.dp,
                )
                AgoraSkeletonBox(
                    modifier = Modifier.width(80.dp),
                    height = 12.dp,
                )
            }
        }
        AgoraSkeletonBox(
            modifier = Modifier.fillMaxWidth(),
            height = 14.dp,
        )
        AgoraSkeletonBox(
            modifier = Modifier
                .fillMaxWidth(0.85f),
            height = 14.dp,
        )
        AgoraSkeletonBox(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp),
            height = 180.dp,
        )
    }
}
