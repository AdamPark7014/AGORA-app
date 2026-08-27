package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

@Composable
fun AgoraEmptyState(
    emoji: String,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    ctaLabel: String? = null,
    onCta: (() -> Unit)? = null,
    secondaryCtaLabel: String? = null,
    onSecondaryCta: (() -> Unit)? = null,
    isError: Boolean = false,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AgoraSpacing.Lg, vertical = AgoraSpacing.Md),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs),
    ) {
        Text(text = emoji, fontSize = 48.sp)
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
            color = if (isError) AgoraColors.Danger else AgoraColors.Texto,
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = if (isError) AgoraColors.Danger.copy(alpha = 0.85f) else AgoraColors.TextMuted,
        )
        if (ctaLabel != null && onCta != null) {
            Spacer(Modifier.height(AgoraSpacing.Xs))
            AgoraPrimaryButton(
                text = ctaLabel,
                onClick = onCta,
                modifier = Modifier.fillMaxWidth(0.75f),
            )
        }
        if (secondaryCtaLabel != null && onSecondaryCta != null) {
            AgoraOutlinedButton(
                text = secondaryCtaLabel,
                onClick = onSecondaryCta,
                modifier = Modifier.fillMaxWidth(0.75f),
            )
        }
    }
}

@Composable
fun AgoraEmptyState(
    state: AgoraCopy.EmptyState,
    modifier: Modifier = Modifier,
    ctaLabel: String? = null,
    onCta: (() -> Unit)? = null,
    secondaryCtaLabel: String? = null,
    onSecondaryCta: (() -> Unit)? = null,
    isError: Boolean = false,
) {
    AgoraEmptyState(
        emoji = state.emoji,
        title = state.title,
        subtitle = state.subtitle,
        modifier = modifier,
        ctaLabel = ctaLabel,
        onCta = onCta,
        secondaryCtaLabel = secondaryCtaLabel,
        onSecondaryCta = onSecondaryCta,
        isError = isError,
    )
}

@Composable
fun AgoraErrorState(
    message: String,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
    retryLabel: String = AgoraCopy.cta.reintentar,
    title: String = "Algo salió mal",
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(AgoraSpacing.Lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = "😕", fontSize = 48.sp)
        Spacer(Modifier.height(AgoraSpacing.Md))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = AgoraColors.Texto,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(AgoraSpacing.Xxs))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = AgoraColors.Danger,
            textAlign = TextAlign.Center,
        )
        if (onRetry != null) {
            Spacer(Modifier.height(AgoraSpacing.Lg))
            AgoraOutlinedButton(
                text = retryLabel,
                onClick = onRetry,
                modifier = Modifier.fillMaxWidth(0.6f),
            )
        }
    }
}
