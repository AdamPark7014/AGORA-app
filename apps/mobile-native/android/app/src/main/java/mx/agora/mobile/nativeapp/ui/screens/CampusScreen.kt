package mx.agora.mobile.nativeapp.ui.screens

import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.components.Terrazas
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.offset
import androidx.compose.ui.graphics.Color
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
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.PersonSearch
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
import androidx.compose.ui.layout.layout
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
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
    /** Color del cuadro del ícono y de las terrazas (B «Cholula»). */
    val color: Color = AgoraColors.Texto,
)

/**
 * Campus: se abre desde el menú ☰ de tu perfil (barra del Feed B, docs/diseno-d.md §0).
 * Mercado, Aventones, Directorio, Sin nombre, Buscar y Guardados en una cuadrícula a un
 * toque, «Tu día» (racha, retos y ranking, que salieron del inicio) y «Más» con avisos,
 * ajustes y lo legal. Paridad con `MasView.swift` de iOS.
 */
@Composable
fun CampusScreen(
    onMarketplace: () -> Unit,
    onAventones: () -> Unit,
    onDirectorio: () -> Unit,
    onAnonimo: () -> Unit,
    onMas: () -> Unit,
    modifier: Modifier = Modifier,
    onBuscar: () -> Unit = {},
    onGuardados: () -> Unit = {},
    /** «Tu día»: el carrusel de racha, retos y ranking. Sin él no sale la sección. */
    tuDia: (@Composable () -> Unit)? = null,
) {
    val destinos = listOf(
        DestinoCampus("Mercado", "El tianguis del campus", Icons.Outlined.Storefront, onMarketplace, AgoraColors.Adobe),
        DestinoCampus("Aventones", "A Cholula y a Puebla", Icons.Outlined.DirectionsCar, onAventones, AgoraColors.Jade),
        DestinoCampus("Directorio", "Gente por carrera", Icons.Outlined.PersonSearch, onDirectorio, AgoraColors.Talavera),
        DestinoCampus("Sin nombre", "Publica sin firmar", Icons.Outlined.TheaterComedy, onAnonimo, AgoraColors.Maiz),
        DestinoCampus("Buscar", "Personas y publicaciones", Icons.Outlined.Search, onBuscar, AgoraColors.Talavera),
        DestinoCampus("Guardados", "Para ver después", Icons.Outlined.BookmarkBorder, onGuardados, AgoraColors.Adobe),
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
        if (tuDia != null) {
            item(key = "tu-dia", span = { GridItemSpan(maxLineSpan) }) {
                Column(verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs)) {
                    Text(
                        "Tu día",
                        style = MaterialTheme.typography.titleLarge,
                        color = AgoraColors.Texto,
                        modifier = Modifier
                            .padding(start = 4.dp, top = AgoraSpacing.Xs)
                            .semantics { heading() },
                    )
                    // El carrusel trae su propio margen de 14 y se desliza de borde a borde:
                    // se mide 14 más ancho de cada lado para no sumar el de la cuadrícula.
                    Box(
                        Modifier.layout { medible, limites ->
                            val extra = AgoraSpacing.Tarjeta.roundToPx() * 2
                            val ancho = limites.maxWidth + extra
                            val pieza = medible.measure(limites.copy(minWidth = ancho, maxWidth = ancho))
                            layout(limites.maxWidth, pieza.height) { pieza.place(-extra / 2, 0) }
                        },
                    ) { tuDia() }
                }
            }
        }
        // «Más» a lo ancho: guardados, avisos, mensajes, ajustes y lo legal.
        item(key = "mas", span = { GridItemSpan(maxLineSpan) }) {
            TarjetaDestino(
                DestinoCampus("Más", "Buscar, guardados, avisos y ajustes", Icons.Outlined.MoreHoriz, onMas, AgoraColors.Jade),
                ancha = true,
            )
        }
    }
}

/** Acceso del campus (B «Cholula»): cuadro de ícono en su color, terrazas tenues en la esquina y nombre en Bricolage. */
@Composable
private fun TarjetaDestino(destino: DestinoCampus, ancha: Boolean = false) {
    val tintaIcono = if (destino.color == AgoraColors.Maiz) AgoraColors.SobreMaiz else Color.White
    val forma = RoundedCornerShape(18.dp)
    val contenido: @Composable () -> Unit = {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(destino.color),
            contentAlignment = Alignment.Center,
        ) {
            Icon(destino.icono, contentDescription = null, tint = tintaIcono, modifier = Modifier.size(21.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                destino.titulo,
                fontFamily = AgoraFonts.titulo,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 16.sp,
                color = AgoraColors.Texto,
            )
            Text(destino.nota, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
        }
    }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(forma)
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, forma)
            .clickable(role = Role.Button, onClick = destino.abrir)
            .semantics(mergeDescendants = true) {},
    ) {
        Terrazas(
            destino.color.copy(alpha = 0.18f),
            Modifier
                .align(Alignment.BottomEnd)
                .offset(x = 6.dp, y = 4.dp)
                .size(90.dp, 48.dp),
        )
        if (ancha) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(14.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) { contenido() }
        } else {
            Column(
                modifier = Modifier.fillMaxWidth().heightIn(min = 118.dp).padding(14.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) { contenido() }
        }
    }
}
