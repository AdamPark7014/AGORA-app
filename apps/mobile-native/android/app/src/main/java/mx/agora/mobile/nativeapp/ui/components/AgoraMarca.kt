package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.R
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/** Isotipo de Ágora (escuadra naranja con la Á en arco). Decorativo: sin contentDescription. */
@Composable
fun AgoraIsotipo(
    modifier: Modifier = Modifier,
    size: Dp = 32.dp,
) {
    Image(
        painter = painterResource(R.drawable.agora_isotipo),
        contentDescription = null,
        modifier = modifier.size(size),
    )
}

/** Isotipo + palabra "Ágora" en una línea (barras superiores, cabeceras compactas). */
@Composable
fun AgoraMarcaHorizontal(
    modifier: Modifier = Modifier,
    isotipo: Dp = 28.dp,
    estilo: TextStyle = MaterialTheme.typography.titleLarge,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        AgoraIsotipo(size = isotipo)
        Text("Ágora", style = estilo, fontWeight = FontWeight.Bold, color = AgoraColors.Texto)
    }
}

/**
 * Leyenda legal y crédito: "Ágora no está afiliada a la UDLAP" + "Developed by
 * Zynora Tek" con enlace a zynoratek.com (abre el navegador).
 */
@Composable
fun AgoraPieLegal(modifier: Modifier = Modifier) {
    val estilo = MaterialTheme.typography.bodySmall
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            AgoraCopy.legal.noAfiliada,
            style = estilo,
            color = AgoraColors.TextMuted,
            textAlign = TextAlign.Center,
        )
        Text(
            buildAnnotatedString {
                append(AgoraCopy.legal.desarrolladoPor)
                withLink(
                    LinkAnnotation.Url(
                        url = AgoraCopy.legal.zynoraUrl,
                        styles = TextLinkStyles(
                            style = SpanStyle(color = AgoraColors.Naranja, fontWeight = FontWeight.SemiBold),
                        ),
                    ),
                ) {
                    append(AgoraCopy.legal.zynora)
                }
            },
            style = estilo,
            color = AgoraColors.TextMuted,
            textAlign = TextAlign.Center,
        )
    }
}
