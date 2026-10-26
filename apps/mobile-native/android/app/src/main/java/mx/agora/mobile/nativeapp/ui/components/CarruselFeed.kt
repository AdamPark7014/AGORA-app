package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.LocalPinnableContainer
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

/**
 * «Tu día»: pulso del campus, racha, retos, ranking y tip en un solo carrusel
 * horizontal. Con el diseño D, «Ahora en el campus» y la pregunta relámpago van
 * aparte, arriba de este carrusel, así que aquí ya no entran.
 *
 * Antes eran hasta 10 items sueltos de la `LazyColumn` antes del primer post:
 * cada uno trae sus datos por su cuenta, así que al bajar se desechaban y al
 * subir se volvían a crear vacíos, cargaban otra vez y empujaban el contenido.
 *
 * Para que no parpadeen:
 * - Este carrusel es **un solo item** de la lista y se queda «anclado»
 *   ([LocalPinnableContainer]): la lista lo mantiene compuesto aunque salga de
 *   pantalla, así que el estado de cada tarjeta sobrevive al scroll.
 * - Dentro va un `Row` desplazable y no una `LazyRow`: la `LazyRow` también
 *   desecha lo que sale por el costado, y como cada tarjeta guarda su estado
 *   adentro (no se pueden tocar desde aquí), volvería a recargarlas.
 * - Una tarjeta sin nada que enseñar (sin retos, sin eventos en vivo…) no ocupa
 *   lugar: su ranura mide cero, sin huecos en el carrusel.
 */
@Composable
fun CarruselFeed(
    tokenProvider: () -> String?,
    onHashtagClick: (String) -> Unit,
    onPerfilClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val anclable = LocalPinnableContainer.current
    DisposableEffect(anclable) {
        val ancla = anclable?.pin()
        onDispose { ancla?.release() }
    }

    val anchoPantalla = LocalConfiguration.current.screenWidthDp.dp
    // Deja asomar la siguiente tarjeta para que se note que se desliza.
    val ancho = (anchoPantalla - AgoraSpacing.Tarjeta * 2) * 0.88f
    val separacion = AgoraSpacing.Xs

    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            // La ranura ya suma la separación a su derecha: el margen final la descuenta.
            .padding(start = AgoraSpacing.Tarjeta, end = AgoraSpacing.Tarjeta - separacion, bottom = AgoraSpacing.Xxs),
        verticalAlignment = Alignment.Top,
    ) {
        RanuraCarrusel(ancho, separacion) {
            CampusPulseBanner(
                tokenProvider = tokenProvider,
                onHashtagClick = onHashtagClick,
                onPerfilClick = onPerfilClick,
            )
        }
        RanuraCarrusel(ancho, separacion) { RachaBadgeRow(tokenProvider = tokenProvider) }
        RanuraCarrusel(ancho, separacion) { RetoSemanalBanner(tokenProvider = tokenProvider) }
        RanuraCarrusel(ancho, separacion) { RetosAmigosRow(tokenProvider = tokenProvider) }
        RanuraCarrusel(ancho, separacion) {
            RetosRankingSemanalRow(tokenProvider = tokenProvider, onPerfilClick = onPerfilClick)
        }
        RanuraCarrusel(ancho, separacion) {
            RetosHistorialRow(tokenProvider = tokenProvider, onPerfilClick = onPerfilClick)
        }
        RanuraCarrusel(ancho, separacion) {
            LeaderboardRachasRow(tokenProvider = tokenProvider, onPerfilClick = onPerfilClick)
        }
        RanuraCarrusel(ancho, separacion) { CampusTipBanner() }
    }
}

/**
 * Ranura de ancho fijo. Si la tarjeta no pinta nada (o mide 0 de alto), la
 * ranura mide 0 y no deja hueco; si pinta algo, suma la separación a su derecha.
 */
@Composable
private fun RanuraCarrusel(
    ancho: Dp,
    separacion: Dp,
    content: @Composable () -> Unit,
) {
    Layout(content = content) { medibles, restricciones ->
        if (medibles.isEmpty()) return@Layout layout(0, 0) {}
        val anchoPx = ancho.roundToPx()
        val hijo = Constraints(
            minWidth = anchoPx,
            maxWidth = anchoPx,
            minHeight = 0,
            maxHeight = restricciones.maxHeight,
        )
        val colocables = medibles.map { it.measure(hijo) }
        val alto = colocables.maxOf { it.height }
        if (alto == 0) return@Layout layout(0, 0) {}
        layout(anchoPx + separacion.roundToPx(), alto) {
            colocables.forEach { it.placeRelative(0, 0) }
        }
    }
}
