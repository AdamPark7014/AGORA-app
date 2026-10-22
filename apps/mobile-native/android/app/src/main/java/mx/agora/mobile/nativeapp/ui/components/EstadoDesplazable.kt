package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

/**
 * Contenedor para estados vacío / error / cargando dentro de un
 * `AgoraPullToRefreshBox`.
 *
 * El jalón para refrescar solo se entera si lo de adentro se puede desplazar;
 * un `AgoraEmptyState` suelto no lo es, así que en las pantallas vacías o con
 * error no había forma de refrescar con el dedo. Esto ocupa todo el alto, centra
 * el contenido y es desplazable aunque no haya nada que desplazar.
 */
/**
 * Pie de lista cuando falló traer la siguiente página: el motivo y
 * «Reintentar». Antes el fallo era mudo y la lista simplemente se acababa.
 */
@Composable
fun AgoraPieErrorPagina(
    mensaje: String,
    onReintentar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = AgoraSpacing.Sm),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            mensaje,
            style = MaterialTheme.typography.bodySmall,
            color = AgoraColors.Danger,
            textAlign = TextAlign.Center,
        )
        TextButton(onClick = onReintentar) {
            Text(AgoraCopy.cta.reintentar)
        }
    }
}

@Composable
fun AgoraEstadoDesplazable(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val alto = maxHeight
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .heightIn(min = alto),
            contentAlignment = Alignment.Center,
            content = content,
        )
    }
}
