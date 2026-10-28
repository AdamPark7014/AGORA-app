package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.Canvas
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.draw.rotate
import androidx.compose.foundation.shape.GenericShape
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/*
 * Piezas de B «Cholula» (docs/diseno-cholula.md §3): el azulejo de Talavera, las terrazas de la
 * pirámide y los sellos con el color de cada comunidad. Mismos trazos que `Cholula.swift` de iOS.
 */

/** Azul del dibujo del azulejo (más vivo que el fondo Talavera para que la flor se lea). */
private val AzulAzulejo = Color(0xFF2347A6)

/**
 * Azulejo poblano repetido: cuadro de 28 con flor de cuatro pétalos, punto al centro y esquinas en
 * triángulo. [fondo] y [trazo] cambian para la portada del perfil (azul sobre azul).
 */
@Composable
fun Talavera(
    modifier: Modifier = Modifier,
    fondo: Color = AgoraColors.AzulejoFondo,
    trazo: Color = AzulAzulejo,
    lado: Dp = 28.dp,
) {
    Canvas(modifier = modifier) {
        val l = lado.toPx()
        drawRect(fondo)
        var y = 0f
        while (y < size.height) {
            var x = 0f
            while (x < size.width) {
                translate(x, y) { azulejo(l, fondo, trazo) }
                x += l
            }
            y += l
        }
    }
}

private fun DrawScope.azulejo(l: Float, fondo: Color, trazo: Color) {
    val u = l / 28f
    val c = 14f * u
    val petalos = Path().apply {
        // Arriba y abajo
        moveTo(c, 4 * u); cubicTo(17 * u, 8 * u, 17 * u, 10 * u, c, c); cubicTo(11 * u, 10 * u, 11 * u, 8 * u, c, 4 * u)
        moveTo(c, 24 * u); cubicTo(11 * u, 20 * u, 11 * u, 18 * u, c, c); cubicTo(17 * u, 18 * u, 17 * u, 20 * u, c, 24 * u)
        // Izquierda y derecha
        moveTo(4 * u, c); cubicTo(8 * u, 11 * u, 10 * u, 11 * u, c, c); cubicTo(10 * u, 17 * u, 8 * u, 17 * u, 4 * u, c)
        moveTo(24 * u, c); cubicTo(20 * u, 17 * u, 18 * u, 17 * u, c, c); cubicTo(18 * u, 11 * u, 20 * u, 11 * u, 24 * u, c)
    }
    drawPath(petalos, trazo)
    drawCircle(fondo, radius = 2 * u, center = Offset(c, c))
    val e = 5 * u
    val esquinas = Path().apply {
        moveTo(0f, 0f); lineTo(e, 0f); lineTo(0f, e); close()
        moveTo(l, 0f); lineTo(l - e, 0f); lineTo(l, e); close()
        moveTo(0f, l); lineTo(e, l); lineTo(0f, l - e); close()
        moveTo(l, l); lineTo(l - e, l); lineTo(l, l - e); close()
    }
    drawPath(esquinas, trazo)
}

/** Silueta escalonada de la pirámide, con [niveles] terrazas, que llena su caja. */
@Composable
fun Terrazas(color: Color, modifier: Modifier = Modifier, niveles: Int = 3) {
    Canvas(modifier = modifier) { terrazas(color, size, niveles) }
}

fun DrawScope.terrazas(color: Color, caja: Size, niveles: Int) {
    val pasoX = caja.width / (2 * niveles + 2)
    val pasoY = caja.height / niveles
    val ruta = Path().apply {
        moveTo(0f, caja.height)
        for (i in 0 until niveles) {
            val x = i * pasoX
            val y0 = caja.height - i * pasoY
            lineTo(x, y0)
            lineTo(x, y0 - pasoY)
            lineTo(x + pasoX, y0 - pasoY)
        }
        for (i in niveles - 1 downTo 0) {
            val x = caja.width - i * pasoX
            val y0 = caja.height - i * pasoY
            lineTo(x - pasoX, y0 - pasoY)
            lineTo(x, y0 - pasoY)
            lineTo(x, y0)
        }
        close()
    }
    drawPath(ruta, color)
}

/** Tipo de comunidad por el prefijo del slug (docs/diseno-cholula.md §2). */
enum class TipoComunidadCholula { CARRERA, GENERACION, COLEGIO, UNIVERSIDAD, OTRA }

fun tipoCholula(slug: String?): TipoComunidadCholula = when {
    slug == null -> TipoComunidadCholula.OTRA
    slug.startsWith("carrera:") -> TipoComunidadCholula.CARRERA
    slug.startsWith("generacion:") -> TipoComunidadCholula.GENERACION
    slug.startsWith("colegio:") -> TipoComunidadCholula.COLEGIO
    slug.startsWith("universidad:") -> TipoComunidadCholula.UNIVERSIDAD
    else -> TipoComunidadCholula.OTRA
}

/** Color fijo de una comunidad: carrera Talavera, generación jade, colegio maíz, toda la UDLAP adobe. */
fun colorComunidad(slug: String?): Color = when (tipoCholula(slug)) {
    TipoComunidadCholula.CARRERA -> AgoraColors.Talavera
    TipoComunidadCholula.GENERACION -> AgoraColors.Jade
    TipoComunidadCholula.COLEGIO -> AgoraColors.Maiz
    TipoComunidadCholula.UNIVERSIDAD -> AgoraColors.Adobe
    TipoComunidadCholula.OTRA -> AgoraColors.Jade
}

/** Texto sobre el color de la comunidad: oscuro sobre maíz, blanco sobre los demás. */
fun textoSobreComunidad(slug: String?): Color =
    if (tipoCholula(slug) == TipoComunidadCholula.COLEGIO) AgoraColors.SobreMaiz else Color.White

private val prefijosCarrera = listOf(
    "Licenciatura en ", "Ingeniería en ", "Ingeniería ", "Lic. en ", "Licenciatura ",
)

/**
 * Nombre corto en mayúsculas para el sello: «Ingeniería en Sistemas Computacionales» → SISTEMAS,
 * «Generación 2024» → GEN 2024, «Colegio Cain Murray» → CAIN MURRAY, la plaza → TODA LA UDLAP.
 */
fun nombreSello(nombre: String, slug: String?): String = nombreCortoComunidad(nombre, slug).uppercase()

/** El mismo nombre corto, sin mayúsculas forzadas, para las píldoras («Sistemas», «Gen 2024»). */
fun nombreCortoComunidad(nombre: String, slug: String?): String {
    val n = nombre.trim()
    val corto = when (tipoCholula(slug)) {
        TipoComunidadCholula.UNIVERSIDAD -> "Toda la UDLAP"
        TipoComunidadCholula.GENERACION -> n.replace("Generación ", "Gen ")
        TipoComunidadCholula.COLEGIO -> n.removePrefix("Colegio ").trim()
        TipoComunidadCholula.CARRERA -> {
            val sinPrefijo = prefijosCarrera.fold(n) { acc, p -> if (acc.startsWith(p)) acc.removePrefix(p) else acc }
            sinPrefijo.split(' ', ',').firstOrNull { it.length > 2 } ?: sinPrefijo
        }
        TipoComunidadCholula.OTRA -> n
    }
    return corto
}

/** Sello: rectángulo de radio 8 en el color de la comunidad, mayúsculas en negritas. */
@Composable
fun Sello(
    texto: String,
    fondo: Color,
    modifier: Modifier = Modifier,
    color: Color = Color.White,
    alto: Dp = 26.dp,
) {
    Box(
        modifier = modifier
            .heightIn(min = alto)
            .clip(RoundedCornerShape(8.dp))
            .background(fondo)
            .padding(horizontal = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 0.5.sp),
            color = color,
            maxLines = 1,
        )
    }
}

/** Sello de la comunidad de una publicación o persona. */
@Composable
fun SelloComunidad(nombre: String, slug: String?, modifier: Modifier = Modifier, alto: Dp = 24.dp) {
    Sello(
        texto = nombreSello(nombre, slug),
        fondo = colorComunidad(slug),
        color = textoSobreComunidad(slug),
        modifier = modifier,
        alto = alto,
    )
}

/** Franja de azulejo bajo los encabezados (10 de alto, como `talavera(t, 10)` del artboard). */
@Composable
fun FranjaTalavera(modifier: Modifier = Modifier, alto: Dp = 10.dp) {
    Talavera(modifier.fillMaxWidth().height(alto), lado = alto)
}

/** Botón corto relleno `boton` de los encabezados («Vender», «Ofrecer»). */
@Composable
fun BotonCabeza(texto: String, onClick: () -> Unit, modifier: Modifier = Modifier, descripcion: String? = null) {
    Box(
        modifier = modifier
            .heightIn(min = 40.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(AgoraColors.Boton)
            .clickable(role = Role.Button, onClick = onClick)
            .then(if (descripcion != null) Modifier.semantics { contentDescription = descripcion } else Modifier)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, color = AgoraColors.SobreBoton, fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}

/** Etiqueta de precio del tianguis: punta a la izquierda, adobe con texto blanco, girada. */
@Composable
fun EtiquetaPrecio(texto: String, modifier: Modifier = Modifier, giro: Float = -6f) {
    Text(
        texto,
        color = Color.White,
        fontFamily = AgoraFonts.titulo,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 15.sp,
        maxLines = 1,
        modifier = modifier
            .rotate(giro)
            .background(AgoraColors.Adobe, FormaEtiqueta)
            .padding(start = 14.dp, end = 10.dp, top = 5.dp, bottom = 5.dp),
    )
}

private val FormaEtiqueta = GenericShape { tam, _ ->
    val punta = 10f * (tam.height / 30f).coerceAtLeast(1f)
    moveTo(punta, 0f)
    lineTo(tam.width, 0f)
    lineTo(tam.width, tam.height)
    lineTo(punta, tam.height)
    lineTo(0f, tam.height / 2)
    close()
}
