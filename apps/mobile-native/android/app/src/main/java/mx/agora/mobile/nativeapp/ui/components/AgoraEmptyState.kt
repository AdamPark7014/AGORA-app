package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Celebration
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PersonSearch
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.TheaterComedy
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

/**
 * Los textos de vacío (AgoraCopy) siguen trayendo un emoji como pista del tema; el
 * diseño D no usa emojis como íconos, así que aquí se cambia por su ícono de línea.
 */
private fun iconoDeVacio(emoji: String): ImageVector = when (emoji.codePointAtOrNull()) {
    0x2705 -> Icons.Outlined.CheckCircle
    0x2728 -> Icons.Outlined.AutoAwesome
    0x1F389 -> Icons.Outlined.Celebration
    0x1F3AD -> Icons.Outlined.TheaterComedy
    0x1F465 -> Icons.Outlined.Groups
    0x1F4AC -> Icons.Outlined.ChatBubbleOutline
    0x1F4C7 -> Icons.Outlined.PersonSearch
    0x1F4DA -> Icons.AutoMirrored.Outlined.MenuBook
    0x1F4F7 -> Icons.Outlined.PhotoCamera
    0x1F50D -> Icons.Outlined.Search
    0x1F514 -> Icons.Outlined.Notifications
    0x1F516 -> Icons.Outlined.BookmarkBorder
    0x1F615 -> Icons.Outlined.ErrorOutline
    0x1F697 -> Icons.Outlined.DirectionsCar
    0x1F6CD -> Icons.Outlined.Storefront
    else -> Icons.Outlined.Inbox
}

private fun String.codePointAtOrNull(): Int? = if (isEmpty()) null else codePointAt(0)

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
        // El ícono es decoración: TalkBack no lo lee.
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(if (isError) AgoraColors.DangerSuave else AgoraColors.NaranjaSuave)
                .clearAndSetSemantics {},
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                iconoDeVacio(emoji),
                contentDescription = null,
                tint = if (isError) AgoraColors.Danger else AgoraColors.NaranjaTinta,
                modifier = Modifier.size(30.dp),
            )
        }
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
            color = if (isError) AgoraColors.Danger else AgoraColors.Texto,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            // Sin alpha: al 85 % bajaba del contraste mínimo.
            color = if (isError) AgoraColors.Danger else AgoraColors.TextMuted,
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
    // El mensaje genérico ya dice «Algo salió mal»: no repetirlo en el título.
    title: String = "No se pudo cargar",
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(AgoraSpacing.Lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(AgoraColors.DangerSuave)
                .clearAndSetSemantics {},
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.ErrorOutline, contentDescription = null, tint = AgoraColors.Danger, modifier = Modifier.size(30.dp))
        }
        Spacer(Modifier.height(AgoraSpacing.Md))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = AgoraColors.Texto,
            textAlign = TextAlign.Center,
            modifier = Modifier.semantics { heading() },
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
