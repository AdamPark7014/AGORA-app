package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.PersonSearch
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

private data class DestinoCampus(
    val titulo: String,
    val nota: String,
    val icono: ImageVector,
    val abrir: () -> Unit,
)

/**
 * Pestaña Campus de la barra del diseño D: lo que antes vivía en «Más» y en la
 * barra (Mercado, Aventones, Directorio, Sin nombre) en una cuadrícula a un toque.
 */
@Composable
fun CampusScreen(
    onMarketplace: () -> Unit,
    onAventones: () -> Unit,
    onDirectorio: () -> Unit,
    onAnonimo: () -> Unit,
    onMas: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val destinos = listOf(
        DestinoCampus("Mercado", "Compra y vende en el campus", Icons.Outlined.Storefront, onMarketplace),
        DestinoCampus("Aventones", "Comparte coche a Cholula", Icons.Outlined.DirectionsCar, onAventones),
        DestinoCampus("Directorio", "Busca gente por carrera", Icons.Outlined.PersonSearch, onDirectorio),
        DestinoCampus("Sin nombre", "Publica sin firmar", Icons.Outlined.TheaterComedy, onAnonimo),
    )

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            start = AgoraSpacing.Tarjeta,
            end = AgoraSpacing.Tarjeta,
            top = AgoraSpacing.Xxs,
            bottom = AgoraSpacing.Lg,
        ),
        horizontalArrangement = Arrangement.spacedBy(AgoraSpacing.EntreTarjetas),
        verticalArrangement = Arrangement.spacedBy(AgoraSpacing.EntreTarjetas),
    ) {
        items(destinos, key = { it.titulo }) { destino ->
            TarjetaDestino(destino)
        }
        // «Más» a lo ancho: guardados, avisos, mensajes, ajustes y lo legal.
        item(key = "mas", span = { GridItemSpan(maxLineSpan) }) {
            TarjetaDestino(
                DestinoCampus("Más", "Buscar, guardados, avisos y ajustes", Icons.Outlined.MoreHoriz, onMas),
                ancha = true,
            )
        }
    }
}

@Composable
private fun TarjetaDestino(destino: DestinoCampus, ancha: Boolean = false) {
    val contenido: @Composable () -> Unit = {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(AgoraColors.NaranjaSuave),
            contentAlignment = Alignment.Center,
        ) {
            Icon(destino.icono, contentDescription = null, tint = AgoraColors.NaranjaTinta, modifier = Modifier.size(24.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                destino.titulo,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = AgoraColors.Texto,
            )
            Text(destino.nota, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
        }
    }
    val base = Modifier
        .fillMaxWidth()
        .clip(AgoraCardShape)
        .background(AgoraColors.Superficie)
        .border(1.dp, AgoraColors.Borde, AgoraCardShape)
        .clickable(role = Role.Button, onClick = destino.abrir)
        .semantics(mergeDescendants = true) {}
        .padding(16.dp)
    if (ancha) {
        Row(
            modifier = base,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) { contenido() }
    } else {
        Column(
            modifier = base.heightIn(min = 132.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) { contenido() }
    }
}
