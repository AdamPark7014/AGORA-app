package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgoraCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val cardModifier = modifier.fillMaxWidth()
    val colors = CardDefaults.cardColors(
        containerColor = AgoraColors.SurfaceElevated,
        // Sin esto el texto hereda onSurfaceVariant (gris).
        contentColor = AgoraColors.Texto,
    )
    val elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    val border = BorderStroke(1.dp, AgoraColors.BordeSutil)

    if (onClick != null) {
        Card(
            onClick = onClick,
            modifier = cardModifier,
            shape = AgoraCardShape,
            colors = colors,
            elevation = elevation,
            border = border,
        ) {
            Column(Modifier.padding(AgoraSpacing.Md), content = content)
        }
    } else {
        Card(
            modifier = cardModifier,
            shape = AgoraCardShape,
            colors = colors,
            elevation = elevation,
            border = border,
        ) {
            Column(Modifier.padding(AgoraSpacing.Md), content = content)
        }
    }
}
