package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Alignment
import androidx.compose.material3.Icon
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.Icons
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/**
 * Sin conexión de B «Cholula» (WowB-Ajustes): talón maíz con el rayo y el corte punteado, y la frase
 * al lado. Paridad con `OfflineBanner.swift`.
 */
@Composable
fun OfflineBanner(modifier: Modifier = Modifier) {
    val forma = RoundedCornerShape(14.dp)
    Row(
        // TalkBack avisa en cuanto se pierde la conexión.
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .height(IntrinsicSize.Min)
            .clip(forma)
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, forma)
            .semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite },
    ) {
        val fondo = AgoraColors.Fondo
        Box(
            modifier = Modifier
                .width(70.dp)
                .fillMaxHeight()
                .background(AgoraColors.Maiz)
                .drawBehind {
                    val x = size.width - 1.dp.toPx()
                    drawLine(
                        color = fondo,
                        start = Offset(x, 0f),
                        end = Offset(x, size.height),
                        strokeWidth = 2.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(5.dp.toPx(), 4.dp.toPx())),
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Bolt, contentDescription = null, tint = AgoraColors.SobreMaiz, modifier = Modifier.size(24.dp))
        }
        Text(
            buildAnnotatedString {
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("Sin conexión. ") }
                append("Lo que ves es lo último que se guardó; se pone al día en cuanto vuelva la señal.")
            },
            fontSize = 13.sp,
            lineHeight = 18.sp,
            fontWeight = FontWeight.Medium,
            color = AgoraColors.Texto,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 14.dp, vertical = 12.dp),
        )
    }
}
