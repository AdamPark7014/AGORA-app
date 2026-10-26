package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

private val ButtonMinHeight = 48.dp

@Composable
fun AgoraPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Button(
        // Cargando: sigue con su color normal (no el 40 %) y solo ignora el clic.
        onClick = { if (!loading) onClick() },
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = ButtonMinHeight),
        enabled = enabled,
        shape = AgoraButtonShape,
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = AgoraColors.Naranja,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            disabledContainerColor = AgoraColors.Naranja.copy(alpha = 0.4f),
            disabledContentColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(
                // TalkBack lee el texto del botón aunque se vea el spinner.
                modifier = Modifier
                    .defaultMinSize(minWidth = 20.dp, minHeight = 20.dp)
                    .semantics { contentDescription = text },
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        } else {
            androidx.compose.material3.Text(
                text = text,
                style = MaterialTheme.typography.labelLarge,
            )
        }
    }
}

@Composable
fun AgoraOutlinedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = ButtonMinHeight),
        enabled = enabled,
        shape = AgoraButtonShape,
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = AgoraColors.Naranja,
        ),
        border = ButtonDefaults.outlinedButtonBorder(enabled).copy(
            brush = androidx.compose.ui.graphics.SolidColor(
                if (enabled) AgoraColors.Naranja else AgoraColors.Borde,
            ),
        ),
    ) {
        androidx.compose.material3.Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
        )
    }
}
