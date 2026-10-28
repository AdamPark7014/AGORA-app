package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.font.FontWeight
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

private val ButtonMinHeight = 52.dp

/** Botones de B «Cholula» (docs/diseno-cholula.md): radio 12, el primario relleno `boton`. */
private val FormaBoton = RoundedCornerShape(12.dp)

/** Botón primario relleno `boton` de B «Cholula» (radio 12, 52 de alto). Paridad con `AgoraPrimaryButton.swift`. */
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
        shape = FormaBoton,
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = AgoraColors.Boton,
            contentColor = AgoraColors.SobreBoton,
            disabledContainerColor = AgoraColors.Boton.copy(alpha = 0.4f),
            disabledContentColor = AgoraColors.SobreBoton.copy(alpha = 0.7f),
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(
                // TalkBack lee el texto del botón aunque se vea el spinner.
                modifier = Modifier
                    .defaultMinSize(minWidth = 20.dp, minHeight = 20.dp)
                    .semantics { contentDescription = text },
                strokeWidth = 2.dp,
                color = AgoraColors.SobreBoton,
            )
        } else {
            androidx.compose.material3.Text(
                text = text,
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
            )
        }
    }
}

/** Secundario: superficie con borde y texto en tinta. */
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
        shape = FormaBoton,
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = AgoraColors.Superficie,
            contentColor = AgoraColors.Texto,
            disabledContentColor = AgoraColors.TextMuted,
        ),
        border = ButtonDefaults.outlinedButtonBorder(enabled).copy(
            brush = androidx.compose.ui.graphics.SolidColor(AgoraColors.Borde),
        ),
    ) {
        androidx.compose.material3.Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
        )
    }
}
