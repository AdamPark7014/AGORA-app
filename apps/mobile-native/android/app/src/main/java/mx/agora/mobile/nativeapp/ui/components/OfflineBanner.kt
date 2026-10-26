package mx.agora.mobile.nativeapp.ui.components

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

@Composable
fun OfflineBanner(modifier: Modifier = Modifier) {
    Surface(
        // TalkBack avisa en cuanto se pierde la conexión.
        modifier = modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        color = AgoraColors.NaranjaSuave,
    ) {
        Text(
            text = "Sin conexión",
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            style = MaterialTheme.typography.labelLarge,
            color = AgoraColors.NaranjaOscuro,
        )
    }
}
