package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import java.time.Instant
import kotlin.math.ceil

/** La cuenta se registró con el correo personal y aún está a tiempo de confirmar la UDLAP. */
fun YoResponse.udlapPorConfirmar(): Boolean = udlapPendiente == true && udlapVencida != true

/**
 * Días para confirmar la UDLAP: los que diga la API, o los que faltan hasta
 * `udlapVenceEn` si no los manda. Null si no hay ni lo uno ni lo otro.
 */
fun YoResponse.diasParaConfirmarUdlap(ahoraMs: Long = System.currentTimeMillis()): Int? {
    udlapDiasRestantes?.let { return it.coerceAtLeast(0) }
    val venceMs = udlapVenceEn?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() } ?: return null
    val faltan = (venceMs - ahoraMs) / 86_400_000.0
    return ceil(faltan).toInt().coerceAtLeast(0)
}

/**
 * Aviso arriba del feed: «Confirma tu correo UDLAP» con los días que quedan y
 * «Confirmar ahora». Sin días conocidos queda solo el título y el botón.
 */
@Composable
fun AvisoUdlap(
    dias: Int?,
    onConfirmar: () -> Unit,
    modifier: Modifier = Modifier,
    textoBoton: String = AgoraCopy.login.udlap.avisoBoton,
) {
    val textos = AgoraCopy.login.udlap
    val forma = RoundedCornerShape(12.dp)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(AgoraColors.WarningSuave, forma)
            .border(1.dp, AgoraColors.Warning.copy(alpha = 0.45f), forma)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(
            textos.avisoTitulo,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = AgoraColors.Texto,
        )
        if (dias != null) {
            Text(
                textos.avisoTexto(dias),
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextoMedio,
            )
        }
        TextButton(onClick = onConfirmar, contentPadding = PaddingValues(0.dp)) {
            Text(
                textoBoton,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.Naranja,
            )
        }
    }
}
