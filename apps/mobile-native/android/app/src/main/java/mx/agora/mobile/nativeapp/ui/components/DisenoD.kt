package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.House
import androidx.compose.material.icons.outlined.Public
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Tag
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraChipShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

/*
 * Piezas compartidas del diseño D (docs/diseno-d.md §3). Las pantallas las usan
 * en vez de repetir colores, radios y tamaños a mano.
 */

/** Título de pestaña (Eventos, Publicar, Campus): Bricolage 30, acciones a la derecha. */
@Composable
fun EncabezadoPestana(
    titulo: String,
    modifier: Modifier = Modifier,
    acciones: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla - 4.dp, top = 16.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            titulo,
            style = MaterialTheme.typography.headlineLarge,
            color = AgoraColors.Texto,
            modifier = Modifier
                .weight(1f)
                .semantics { heading() },
        )
        acciones()
    }
}

/** Nombre de sección («Clips del campus») con una acción de texto opcional («Ver todos»). */
@Composable
fun TituloSeccion(
    titulo: String,
    modifier: Modifier = Modifier,
    accion: String? = null,
    onAccion: () -> Unit = {},
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AgoraSpacing.Pantalla),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            titulo,
            style = MaterialTheme.typography.titleLarge,
            color = AgoraColors.Texto,
            modifier = Modifier
                .weight(1f)
                .semantics { heading() },
        )
        if (accion != null) {
            Text(
                accion,
                style = MaterialTheme.typography.labelLarge,
                color = AgoraColors.NaranjaTinta,
                modifier = Modifier
                    .heightIn(min = 44.dp)
                    .clip(AgoraChipShape)
                    .clickable(role = Role.Button, onClick = onAccion)
                    .padding(horizontal = 6.dp, vertical = 12.dp),
            )
        }
    }
}

/** Tipo de comunidad deducido del slug (`carrera:…`, `generacion:2024`, `universidad:udlap`). */
enum class TipoComunidadD { CAMPUS, ESCUELA, DEPARTAMENTO, CARRERA, GENERACION, COLEGIO, ORGANIZACION, ABIERTA }

fun tipoComunidad(slug: String?): TipoComunidadD {
    val s = slug.orEmpty().lowercase()
    return when {
        s.startsWith("carrera") -> TipoComunidadD.CARRERA
        s.startsWith("generacion") -> TipoComunidadD.GENERACION
        s.startsWith("colegio") -> TipoComunidadD.COLEGIO
        s.startsWith("escuela") -> TipoComunidadD.ESCUELA
        s.startsWith("departamento") -> TipoComunidadD.DEPARTAMENTO
        s.startsWith("org") -> TipoComunidadD.ORGANIZACION
        s.startsWith("campus") || s.startsWith("udlap") || s.startsWith("universidad") || s.isEmpty() ->
            TipoComunidadD.CAMPUS
        else -> TipoComunidadD.ABIERTA
    }
}

fun iconoComunidad(tipo: TipoComunidadD): ImageVector = when (tipo) {
    TipoComunidadD.CAMPUS -> Icons.Outlined.Apartment
    TipoComunidadD.ESCUELA, TipoComunidadD.DEPARTAMENTO, TipoComunidadD.CARRERA -> Icons.Outlined.School
    TipoComunidadD.GENERACION -> Icons.Outlined.Groups
    TipoComunidadD.COLEGIO -> Icons.Outlined.House
    TipoComunidadD.ORGANIZACION -> Icons.Outlined.Public
    TipoComunidadD.ABIERTA -> Icons.Outlined.Tag
}

/**
 * Banda de comunidad de la tarjeta (ícono por tipo + NOMBRE en versalitas, sobre
 * naranja suave). Va pegada arriba de la tarjeta: el contenedor recorta las esquinas.
 */
@Composable
fun BandaComunidad(
    nombre: String,
    slug: String?,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
) {
    val tipo = tipoComunidad(slug)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(AgoraColors.NaranjaSuave)
            .then(
                if (onClick != null) {
                    Modifier.clickable(role = Role.Button, onClickLabel = "Ver comunidad", onClick = onClick)
                } else {
                    Modifier
                },
            )
            .padding(horizontal = 16.dp, vertical = 9.dp)
            .semantics(mergeDescendants = true) { contentDescription = "Comunidad: $nombre" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(iconoComunidad(tipo), contentDescription = null, tint = AgoraColors.NaranjaTinta, modifier = Modifier.size(14.dp))
        Text(
            nombre.uppercase(Locale("es", "MX")),
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.4.sp),
            color = AgoraColors.NaranjaTinta,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private val zonaMx = ZoneId.of("America/Mexico_City")
private val diaCorto = DateTimeFormatter.ofPattern("EEE", Locale("es", "MX"))
private val mesCorto = DateTimeFormatter.ofPattern("MMM", Locale("es", "MX"))

/**
 * Bloque de fecha («SÁB / 25»). Relleno naranja con texto blanco (mini evento) o
 * blanco con el día en naranja (encima de la portada del evento, con el mes).
 */
@Composable
fun BloqueFecha(
    inicioIso: String,
    modifier: Modifier = Modifier,
    relleno: Boolean = true,
    ancho: Dp = 64.dp,
    alto: Dp = 72.dp,
    conMes: Boolean = false,
) {
    val fecha = runCatching { Instant.parse(inicioIso).atZone(zonaMx) }.getOrNull()
    val dia = fecha?.let { diaCorto.format(it).trimEnd('.').uppercase(Locale("es", "MX")) }.orEmpty()
    val numero = fecha?.dayOfMonth?.toString().orEmpty()
    val mes = fecha?.let { mesCorto.format(it).trimEnd('.').uppercase(Locale("es", "MX")) }.orEmpty()
    // Sin relleno va sobre la portada en blanco fijo (claro y oscuro): la tinta
    // también es fija, o en oscuro el número claro desaparecería sobre el blanco.
    val fondo = if (relleno) AgoraColors.Naranja else Color.White
    val tinta = if (relleno) Color.White else Color(0xFFC44404)
    val numeroColor = if (relleno) Color.White else Color(0xFF14110F)
    val mesColor = Color(0xFF6B625B)
    Column(
        modifier = modifier
            .width(ancho)
            .heightIn(min = alto)
            .clip(RoundedCornerShape(16.dp))
            .background(fondo)
            .padding(vertical = 8.dp)
            .clearAndSetSemantics {
                contentDescription = fecha?.let {
                    DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", Locale("es", "MX")).format(it)
                }.orEmpty()
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(dia, color = tinta, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.6.sp)
        Text(
            numero,
            color = numeroColor,
            fontFamily = AgoraFonts.titulo,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 28.sp,
            lineHeight = 30.sp,
        )
        if (conMes) {
            Text(mes, color = mesColor, fontSize = 10.sp, fontWeight = FontWeight.Medium)
        }
    }
}

/**
 * Segmento (Campus / Mi carrera / Siguiendo): fondo `superficie-2`, el activo en
 * `superficie` con sombra leve.
 */
@Composable
fun Segmento(
    opciones: List<String>,
    seleccion: Int,
    onSeleccion: (Int) -> Unit,
    modifier: Modifier = Modifier,
    descripcion: String = "",
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AgoraSpacing.Pantalla)
            .clip(RoundedCornerShape(14.dp))
            .background(AgoraColors.Superficie2)
            .padding(4.dp)
            .semantics { if (descripcion.isNotEmpty()) contentDescription = descripcion },
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        opciones.forEachIndexed { i, texto ->
            val activo = i == seleccion
            Box(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 40.dp)
                    .then(if (activo) Modifier.shadow(1.dp, RoundedCornerShape(11.dp)) else Modifier)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (activo) AgoraColors.Superficie else Color.Transparent)
                    .clickable(role = Role.Tab) { onSeleccion(i) }
                    .semantics { selected = activo },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    texto,
                    style = MaterialTheme.typography.labelLarge.copy(
                        fontWeight = if (activo) FontWeight.Bold else FontWeight.Medium,
                    ),
                    color = if (activo) AgoraColors.Texto else AgoraColors.TextoMedio,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/**
 * Chip de la D (radio 12, alto mínimo 36 visible y 48 táctil). Activo: borde
 * naranja y fondo naranja suave con texto naranja-tinta.
 */
@Composable
fun ChipD(
    texto: String,
    activo: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    descripcion: String? = null,
) {
    Box(
        modifier = modifier
            .heightIn(min = 48.dp)
            .semantics {
                role = Role.Button
                selected = activo
                descripcion?.let { contentDescription = it }
            },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.labelLarge.copy(
                fontWeight = if (activo) FontWeight.SemiBold else FontWeight.Medium,
                fontSize = 13.sp,
            ),
            color = if (activo) AgoraColors.NaranjaTinta else AgoraColors.Texto,
            modifier = Modifier
                .heightIn(min = 36.dp)
                .clip(AgoraChipShape)
                .background(if (activo) AgoraColors.NaranjaSuave else AgoraColors.Superficie)
                .border(
                    if (activo) BorderStroke(1.5.dp, AgoraColors.Naranja) else BorderStroke(1.dp, AgoraColors.Borde),
                    AgoraChipShape,
                )
                .clickable(onClick = onClick)
                .padding(horizontal = 12.dp, vertical = 9.dp),
        )
    }
}

/** Botón oscuro (`tinta`): «Voy» del mini evento, «Seguir» del perfil. */
@Composable
fun BotonTinta(
    texto: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Box(
        modifier = modifier
            .heightIn(min = 44.dp)
            .clip(AgoraButtonShape)
            .background(if (enabled) AgoraColors.Texto else AgoraColors.Texto.copy(alpha = 0.4f))
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, color = AgoraColors.Fondo, style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold))
    }
}

/** Botón claro con borde (`superficie` + `borde`): «Mensaje». */
@Composable
fun BotonBorde(
    texto: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Box(
        modifier = modifier
            .heightIn(min = 44.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, AgoraButtonShape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, color = AgoraColors.Texto, style = MaterialTheme.typography.labelLarge)
    }
}

/** Fila de avatares superpuestos (quién va, seguidores en común). */
@Composable
fun AvataresApilados(
    personas: List<Pair<String, String?>>,
    modifier: Modifier = Modifier,
    tamano: Dp = 32.dp,
) {
    Row(modifier = modifier.clearAndSetSemantics {}) {
        personas.take(3).forEachIndexed { i, (nombre, foto) ->
            AgoraAvatar(
                nombre = nombre,
                fotoUrl = foto,
                size = tamano,
                // Encimados 10 dp, como en el mockup.
                modifier = Modifier
                    .offset(x = (-10 * i).dp)
                    .border(2.dp, AgoraColors.Superficie, RoundedCornerShape(tamano * 0.34f)),
            )
        }
    }
}
