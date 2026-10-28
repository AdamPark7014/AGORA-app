package mx.agora.mobile.nativeapp.ui.components

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.util.LruCache
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material.icons.outlined.SmartDisplay
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.CustomAccessibilityAction
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.customActions
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
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EncuestaDto
import mx.agora.mobile.nativeapp.data.api.MediaDto
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.haceCuanto

/*
 * Inicio con el Feed B que eligió Adam (artboard FeedB, docs/diseno-d.md §0): encabezado
 * «Ágora» en naranja, historias que son los clips del campus, publicaciones a todo lo ancho
 * con la foto de borde a borde. Paridad con `FeedView.swift` y `PostCardView.swift` (estilo
 * `.feedB`) de iOS.
 */

/** «Ágora» en naranja; a la derecha Avisos (punto si hay nuevos) y Mensajes (número, de Main). */
@Composable
fun EncabezadoInicioB(
    avisosSinLeer: Int,
    mensajesSinLeer: Int,
    onAvisos: () -> Unit,
    onMensajes: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 8.dp, top = 10.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // B «Cholula»: las terrazas de la pirámide, «Ágora» en tinta y la fecha (sin «semana 12»: no hay API).
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Terrazas(
                color = AgoraColors.Naranja,
                modifier = Modifier
                    .width(30.dp)
                    .height(20.dp),
            )
            Column {
                Text(
                    "Ágora",
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontFamily = AgoraFonts.titulo,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                        lineHeight = 30.sp,
                    ),
                    color = AgoraColors.TintaFeed,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    remember { fechaDeHoy() },
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp, fontWeight = FontWeight.Medium),
                    color = AgoraColors.SecundarioFeed,
                )
            }
        }
        BotonEncabezadoB(
            icono = Icons.Outlined.Notifications,
            descripcion = if (avisosSinLeer > 0) "Avisos, $avisosSinLeer nuevos" else "Avisos",
            onClick = onAvisos,
        ) {
            if (avisosSinLeer > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = (-10).dp, y = 10.dp)
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(AgoraColors.Naranja),
                )
            }
        }
        BotonEncabezadoB(
            icono = Icons.AutoMirrored.Outlined.Send,
            descripcion = if (mensajesSinLeer > 0) "Mensajes, $mensajesSinLeer sin leer" else "Mensajes",
            onClick = onMensajes,
        ) {
            if (mensajesSinLeer > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = (-4).dp, y = 6.dp)
                        .heightIn(min = 16.dp)
                        .widthIn(min = 16.dp)
                        .clip(RoundedCornerShape(50))
                        .background(AgoraColors.Naranja)
                        .padding(horizontal = 4.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (mensajesSinLeer > 9) "9+" else mensajesSinLeer.toString(),
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun BotonEncabezadoB(
    icono: androidx.compose.ui.graphics.vector.ImageVector,
    descripcion: String,
    onClick: () -> Unit,
    marca: @Composable androidx.compose.foundation.layout.BoxScope.() -> Unit,
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .clickable(role = Role.Button, onClick = onClick)
            .clearAndSetSemantics {
                contentDescription = descripcion
                role = Role.Button
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icono, contentDescription = null, tint = AgoraColors.TintaFeed, modifier = Modifier.size(24.dp))
        marca()
    }
}

private val formatoFecha = java.time.format.DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", java.util.Locale("es", "MX"))

/** «Miércoles 28 de octubre» en la hora del centro de México. */
private fun fechaDeHoy(): String =
    formatoFecha.format(java.time.ZonedDateTime.now(java.time.ZoneId.of("America/Mexico_City")))
        .replaceFirstChar { it.titlecase(java.util.Locale("es", "MX")) }

/** Preferencias donde se guardan los clips ya vistos (solo para pintar el anillo en gris). */
private const val PREFS_CLIPS = "agora_clips_vistos"
private const val CLAVE_VISTOS = "ids"

private fun clipsVistos(context: Context): Set<String> =
    context.getSharedPreferences(PREFS_CLIPS, Context.MODE_PRIVATE)
        .getString(CLAVE_VISTOS, "").orEmpty()
        .split(',')
        .filter { it.isNotBlank() }
        .toSet()

private fun marcarClipVisto(context: Context, id: String) {
    val prefs = context.getSharedPreferences(PREFS_CLIPS, Context.MODE_PRIVATE)
    val antes = prefs.getString(CLAVE_VISTOS, "").orEmpty().split(',').filter { it.isNotBlank() }
    if (id in antes) return
    prefs.edit().putString(CLAVE_VISTOS, (listOf(id) + antes).take(100).joinToString(",")).apply()
}

/**
 * Fila de historias del artboard FeedB. Ágora no tiene historias que caduquen: cada círculo
 * es un clip reciente del campus (anillo naranja si no lo has visto) y «Tu historia» lleva a
 * publicar.
 */
@Composable
fun HistoriasClips(
    clips: List<PostDto>,
    onTuHistoria: () -> Unit,
    onClip: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var vistos by remember { mutableStateOf(clipsVistos(context)) }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(start = 12.dp, end = 12.dp, top = 12.dp, bottom = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Historia(
            etiqueta = "Tu historia",
            colorEtiqueta = AgoraColors.SecundarioFeed,
            descripcion = "Subir un clip",
            onClick = onTuHistoria,
        ) {
            val borde = AgoraColors.AnilloVisto
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .padding(4.dp)
                    .drawBehind {
                        val grosor = 2.dp.toPx()
                        drawRoundRect(
                            color = borde,
                            topLeft = Offset(grosor / 2, grosor / 2),
                            size = Size(size.width - grosor, size.height - grosor),
                            cornerRadius = CornerRadius(18.dp.toPx()),
                            style = Stroke(
                                width = grosor,
                                pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx())),
                            ),
                        )
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Add, contentDescription = null, tint = AgoraColors.SecundarioFeed, modifier = Modifier.size(24.dp))
            }
        }
        clips.take(12).forEach { clip ->
            val medio = clip.media.firstOrNull { it.esVideoMedia() }
            val visto = clip.id in vistos
            val autor = clip.autor?.nombre?.trim()?.split(' ')?.firstOrNull()?.takeIf { it.isNotBlank() }
            Historia(
                etiqueta = autor ?: clip.comunidad.nombre,
                colorEtiqueta = AgoraColors.TintaFeed,
                descripcion = "Clip de ${clip.autor?.nombre ?: "alguien"} en ${clip.comunidad.nombre}",
                onClick = {
                    marcarClipVisto(context, clip.id)
                    vistos = vistos + clip.id
                    onClip(clip.id)
                },
            ) {
                // B «Cholula»: terraza con el anillo del color de la comunidad (gris si ya se vio).
                val anillo = if (visto) AgoraColors.AnilloVisto else colorComunidad(clip.comunidad.slug)
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(anillo)
                        .padding(if (visto) 2.dp else 3.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(AgoraColors.FondoFeed)
                        .padding(2.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    MiniaturaVideo(
                        url = medio?.url,
                        portada = medio?.thumbUrl,
                        modifier = Modifier
                            .matchParentSize()
                            .clip(RoundedCornerShape(18.dp)),
                    )
                    Terrazas(
                        color = anillo,
                        niveles = 2,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .width(34.dp)
                            .height(9.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun Historia(
    etiqueta: String,
    colorEtiqueta: Color,
    descripcion: String,
    onClick: () -> Unit,
    circulo: @Composable () -> Unit,
) {
    Column(
        modifier = Modifier
            .widthIn(min = 72.dp, max = 72.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .clearAndSetSemantics {
                contentDescription = descripcion
                role = Role.Button
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        circulo()
        Text(
            etiqueta,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal, letterSpacing = 0.sp),
            color = colorEtiqueta,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Cuadros sacados de videos sin portada (los de antes de que la API la guardara). */
private val cacheCuadros = LruCache<String, Bitmap>(32)

/**
 * Portada de un video: la que guarda la API al re-codificarlo y, en videos de antes, un
 * cuadro sacado del archivo en red (se guarda en memoria). Sin nada, el gris del borde.
 */
@Composable
fun MiniaturaVideo(url: String?, portada: String?, modifier: Modifier = Modifier) {
    if (portada != null) {
        AsyncImage(
            model = ApiClient.resolveUrl(portada),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.background(AgoraColors.BordeFeed),
        )
        return
    }
    val resuelta = remember(url) { url?.let { ApiClient.resolveUrl(it) } }
    var cuadro by remember(resuelta) { mutableStateOf(resuelta?.let { cacheCuadros.get(it) }) }
    LaunchedEffect(resuelta) {
        if (resuelta == null || cuadro != null) return@LaunchedEffect
        cuadro = withContext(Dispatchers.IO) { cuadroDe(resuelta) }?.also { cacheCuadros.put(resuelta, it) }
    }
    Box(modifier = modifier.background(AgoraColors.BordeFeed)) {
        cuadro?.let {
            Image(
                bitmap = it.asImageBitmap(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize(),
            )
        }
    }
}

private fun cuadroDe(url: String): Bitmap? = runCatching {
    val lector = MediaMetadataRetriever()
    try {
        lector.setDataSource(url, HashMap())
        val cuadro = lector.getFrameAtTime(500_000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC) ?: return@runCatching null
        // Para un círculo de 60 dp basta un cuadro chico; el original pesa megas.
        val ancho = 200
        val alto = (cuadro.height * ancho.toFloat() / cuadro.width).toInt().coerceAtLeast(1)
        Bitmap.createScaledBitmap(cuadro, ancho, alto, true).also { if (it !== cuadro) cuadro.recycle() }
    } finally {
        lector.release()
    }
}.getOrNull()

/**
 * Píldora de filtro (B «Cholula»): radio 10, la activa en tinta y las demás en superficie con
 * borde; [color] pone el cuadrito de la comunidad.
 */
@Composable
fun PildoraFiltro(texto: String, activa: Boolean, color: Color? = null, onClick: () -> Unit) {
    val forma = RoundedCornerShape(10.dp)
    Row(
        modifier = Modifier
            .heightIn(min = 34.dp)
            .clip(forma)
            .background(if (activa) AgoraColors.TintaFeed else AgoraColors.Superficie)
            .border(1.dp, if (activa) AgoraColors.TintaFeed else AgoraColors.BordeFeed, forma)
            .clickable(role = Role.Tab, onClick = onClick)
            .semantics { selected = activa }
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (color != null) {
            Box(
                Modifier
                    .size(8.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(color),
            )
        }
        Text(
            texto,
            style = MaterialTheme.typography.labelLarge.copy(
                fontSize = 13.sp,
                fontWeight = if (activa) FontWeight.SemiBold else FontWeight.Medium,
            ),
            color = if (activa) AgoraColors.FondoFeed else AgoraColors.TintaFeed,
            maxLines = 1,
        )
    }
}

/**
 * Campus sin publicaciones todavía (artboard «Inicio · campus sin publicaciones todavía»):
 * nada inventado, solo lo que la persona puede hacer para empezar.
 */
@Composable
fun InicioVacioTarjeta(
    onPublicar: () -> Unit,
    onClip: () -> Unit,
    onEvento: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgoraCardShape)
            .background(AgoraColors.FondoFeed)
            .border(1.dp, AgoraColors.BordeFeed, AgoraCardShape)
            .padding(start = 18.dp, end = 18.dp, top = 22.dp, bottom = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(AgoraColors.NaranjaSuave),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Campaign, contentDescription = null, tint = AgoraColors.NaranjaTinta, modifier = Modifier.size(24.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Tu campus apenas empieza",
                style = MaterialTheme.typography.headlineSmall.copy(fontSize = 24.sp, lineHeight = 28.sp),
                color = AgoraColors.TintaFeed,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                "Todavía no hay publicaciones aquí. Lo primero que subas lo ve toda la UDLAP.",
                style = MaterialTheme.typography.bodyLarge,
                color = AgoraColors.SecundarioFeed,
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 50.dp)
                .clip(AgoraButtonShape)
                .background(AgoraColors.Naranja)
                .clickable(role = Role.Button, onClick = onPublicar),
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
            Text("Publicar algo", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = Color.White)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            BotonSecundarioB("Subir un clip", Icons.Outlined.SmartDisplay, onClip, Modifier.weight(1f))
            BotonSecundarioB("Crear un evento", Icons.Outlined.CalendarMonth, onEvento, Modifier.weight(1f))
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 44.dp)
                .clip(AgoraButtonShape)
                .clickable(role = Role.Button) {
                    compartirEnlace(context, EnlacesWeb.BASE, "Estoy en Ágora, la red del campus de la UDLAP. Únete:")
                },
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.PersonAdd, contentDescription = null, tint = AgoraColors.NaranjaOscuro, modifier = Modifier.size(20.dp))
            Text(
                "Invitar a alguien de tu generación",
                style = MaterialTheme.typography.labelLarge,
                color = AgoraColors.NaranjaOscuro,
            )
        }
    }
}

@Composable
private fun BotonSecundarioB(
    texto: String,
    icono: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .heightIn(min = 50.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.FondoFeed)
            .border(1.dp, AgoraColors.BordeFeed, AgoraButtonShape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icono, contentDescription = null, tint = AgoraColors.TintaFeed, modifier = Modifier.size(20.dp))
        Text(
            texto,
            style = MaterialTheme.typography.labelLarge,
            color = AgoraColors.TintaFeed,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/**
 * Publicación del Feed B: a todo lo ancho y sin tarjeta. Autor con su comunidad, la foto de
 * borde a borde con «1/3», corazón con el total, comentar, compartir y guardar, el texto como
 * pie con el @ en negritas y «Ver los N comentarios · hace…». Sin foto, el texto va arriba en
 * grande (artboard Main). El estado (reacción, encuesta) lo lleva [PostCard].
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
internal fun PublicacionFeedB(
    post: PostDto,
    tokenProvider: () -> String?,
    miReaccion: String?,
    totalReacciones: Int,
    reacciones: mx.agora.mobile.nativeapp.data.api.ReaccionesDto?,
    encuesta: EncuestaDto?,
    votando: Boolean,
    miVoto: String?,
    errorVoto: String?,
    isActive: Boolean,
    onVotar: (String) -> Unit,
    onReaccionar: (String) -> Unit,
    onPostClick: () -> Unit,
    onHashtagClick: (String) -> Unit,
    onAuthorClick: (() -> Unit)?,
    onMentionClick: ((String) -> Unit)?,
    menu: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val nombre = post.autor?.handle ?: post.autor?.nombre ?: "Cuenta eliminada"
    val texto = post.texto.trim()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(AgoraColors.FondoFeed),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp)
                    .then(
                        if (onAuthorClick != null) {
                            Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .clickable(
                                    onClickLabel = "Ver perfil de $nombre",
                                    role = Role.Button,
                                    onClick = onAuthorClick,
                                )
                        } else {
                            Modifier
                        },
                    ),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                AgoraAvatar(post.autor?.nombre, post.autor?.fotoUrl, size = 36.dp, circular = true)
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        nombre,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        color = AgoraColors.TintaFeed,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        if (post.estado == "EN_REVISION") "${haceCuanto(post.createdAt)} · en revisión" else haceCuanto(post.createdAt),
                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp),
                        color = AgoraColors.SecundarioFeed,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            // B «Cholula»: la comunidad va en su sello, con su color.
            SelloComunidad(nombre = post.comunidad.nombre, slug = post.comunidad.slug, modifier = Modifier.padding(start = 6.dp))
            menu()
        }

        if (post.media.isNotEmpty()) {
            MediaFeedB(
                media = post.media,
                postId = post.id,
                isActive = isActive,
                onDobleToque = { if (miReaccion == null) onReaccionar(ME_LATE) },
            )
        } else if (texto.isNotEmpty() && encuesta == null) {
            PublicacionTipografica(
                post = post,
                texto = texto,
                onPostClick = onPostClick,
                onHashtagClick = onHashtagClick,
                onMentionClick = onMentionClick,
            )
        } else if (texto.isNotEmpty()) {
            TextoConHashtags(
                texto = texto,
                onHashtagClick = onHashtagClick,
                onMentionClick = onMentionClick,
                estilo = MaterialTheme.typography.bodyLarge,
                color = AgoraColors.TintaFeed,
                modifier = Modifier
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 4.dp)
                    .clickable(onClick = onPostClick),
            )
        }

        encuesta?.let { poll ->
            EncuestaBloque(
                encuesta = poll,
                onVotar = onVotar,
                votando = votando,
                miVoto = miVoto,
                error = errorVoto,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp),
            )
        }

        if (post.media.isEmpty() && encuesta == null && texto.isNotEmpty()) {
            // La tipográfica lleva las reacciones como chips con su número (artboard WowB-Inicio).
            ReaccionesChips(
                miReaccion = miReaccion,
                reacciones = reacciones,
                onReaccionar = onReaccionar,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 6.dp),
            )
        } else {
            AccionesFeedB(
                post = post,
                tokenProvider = tokenProvider,
                miReaccion = miReaccion,
                totalReacciones = totalReacciones,
                onReaccionar = onReaccionar,
                onComentar = onPostClick,
                onCompartir = { compartirEnlace(context, EnlacesWeb.publicacion(post.id)) },
                modifier = Modifier.padding(horizontal = 8.dp),
            )
        }

        if (post.media.isNotEmpty() && texto.isNotEmpty()) {
            TextoConHashtags(
                texto = texto,
                onHashtagClick = onHashtagClick,
                onMentionClick = onMentionClick,
                autor = nombre,
                estilo = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp),
                color = AgoraColors.TintaFeed,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
        }

        // El tiempo ya va arriba: el pie solo lleva a los comentarios.
        pieFeedB(post)?.let { pie ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 36.dp)
                    .clickable(role = Role.Button, onClickLabel = "Ver la publicación", onClick = onPostClick)
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                Text(
                    pie,
                    style = MaterialTheme.typography.bodySmall,
                    color = AgoraColors.SecundarioFeed,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
    }
}

private const val ME_LATE = "ME_LATE"

private fun pieFeedB(post: PostDto): String? = when (post.numComments) {
    0 -> null
    1 -> "Ver el comentario"
    else -> "Ver los ${post.numComments} comentarios"
}

/**
 * Publicación sin foto ni encuesta (B «Cholula», WowB-Inicio): tarjeta en el color de la comunidad,
 * texto grande en Bricolage, esquina de Talavera y las respuestas abajo.
 */
@Composable
private fun PublicacionTipografica(
    post: PostDto,
    texto: String,
    onPostClick: () -> Unit,
    onHashtagClick: (String) -> Unit,
    onMentionClick: ((String) -> Unit)?,
) {
    val fondo = colorComunidad(post.comunidad.slug)
    val tinta = textoSobreComunidad(post.comunidad.slug)
    val claro = tinta == Color.White
    val tam = when {
        texto.length <= 90 -> 26.sp
        texto.length <= 180 -> 21.sp
        else -> 17.sp
    }
    Box(
        modifier = Modifier
            .padding(horizontal = 12.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(fondo)
            .clickable(onClickLabel = "Ver la publicación", role = Role.Button, onClick = onPostClick),
    ) {
        Talavera(
            fondo = Color.White,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(x = 10.dp, y = (-10).dp)
                .size(96.dp)
                .clip(RoundedCornerShape(bottomStart = 28.dp))
                .alpha(if (claro) 0.9f else 0.55f),
        )
        Column(
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 22.dp, bottom = 18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            TextoConHashtags(
                texto = texto,
                onHashtagClick = onHashtagClick,
                onMentionClick = onMentionClick,
                estilo = MaterialTheme.typography.headlineSmall.copy(
                    fontFamily = AgoraFonts.titulo,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = tam,
                    lineHeight = tam * 1.1f,
                ),
                color = tinta,
                colorEnlace = if (claro) Color(0xFFC9D6FF) else AgoraColors.SobreMaiz,
                maxLines = 9,
                modifier = Modifier.padding(end = 56.dp),
            )
            if (post.numComments > 0) {
                Text(
                    if (post.numComments == 1) "Ver la respuesta" else "Ver las ${post.numComments} respuestas",
                    style = MaterialTheme.typography.labelLarge,
                    color = if (claro) Color(0xFFC9D6FF) else AgoraColors.SobreMaiz,
                )
            }
        }
    }
}

/** Corazón = «Me late» con el total de reacciones; las otras tres, con pulsación larga. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun AccionesFeedB(
    post: PostDto,
    tokenProvider: () -> String?,
    miReaccion: String?,
    totalReacciones: Int,
    onReaccionar: (String) -> Unit,
    onComentar: () -> Unit,
    onCompartir: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var otras by remember { mutableStateOf(false) }
    val reaccione = miReaccion != null
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Box {
            Row(
                modifier = Modifier
                    .heightIn(min = 44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .combinedClickable(
                        role = Role.Button,
                        onClickLabel = if (reaccione) "Quitar tu reacción" else "Me late",
                        onLongClickLabel = "Más reacciones",
                        onLongClick = { otras = true },
                        onClick = { onReaccionar(miReaccion ?: ME_LATE) },
                    )
                    .semantics(mergeDescendants = true) {
                        contentDescription = if (totalReacciones > 0) "Me late, $totalReacciones" else "Me late"
                        selected = reaccione
                        customActions = REACCIONES_POST.filter { it.tipo != ME_LATE }.map { r ->
                            CustomAccessibilityAction(r.etiqueta) {
                                onReaccionar(r.tipo)
                                true
                            }
                        }
                    }
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    if (reaccione) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = null,
                    tint = if (reaccione) AgoraColors.Naranja else AgoraColors.TintaFeed,
                    modifier = Modifier.size(24.dp),
                )
                if (totalReacciones > 0) {
                    Text(
                        totalReacciones.toString(),
                        style = MaterialTheme.typography.labelLarge.copy(fontFeatureSettings = "tnum"),
                        color = AgoraColors.TintaFeed,
                    )
                }
            }
            DropdownMenu(expanded = otras, onDismissRequest = { otras = false }) {
                REACCIONES_POST.forEach { r ->
                    DropdownMenuItem(
                        text = { Text(r.etiqueta) },
                        leadingIcon = {
                            if (miReaccion == r.tipo) Icon(Icons.Filled.Check, contentDescription = "Tu reacción")
                        },
                        onClick = {
                            otras = false
                            onReaccionar(r.tipo)
                        },
                    )
                }
            }
        }
        Row(
            modifier = Modifier
                .heightIn(min = 44.dp)
                .clip(RoundedCornerShape(12.dp))
                .clickable(role = Role.Button, onClick = onComentar)
                .clearAndSetSemantics {
                    contentDescription = if (post.numComments > 0) "Comentar, ${post.numComments}" else "Comentar"
                    role = Role.Button
                }
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = null, tint = AgoraColors.TintaFeed, modifier = Modifier.size(23.dp))
            if (post.numComments > 0) {
                Text(
                    post.numComments.toString(),
                    style = MaterialTheme.typography.labelLarge.copy(fontFeatureSettings = "tnum"),
                    color = AgoraColors.TintaFeed,
                )
            }
        }
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .clickable(role = Role.Button, onClick = onCompartir)
                .clearAndSetSemantics {
                    contentDescription = "Compartir"
                    role = Role.Button
                },
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = null, tint = AgoraColors.TintaFeed, modifier = Modifier.size(23.dp))
        }
        Spacer(Modifier.weight(1f))
        GuardarButton(
            postId = post.id,
            guardado = post.miGuardado,
            tokenProvider = tokenProvider,
            colorSinGuardar = AgoraColors.TintaFeed,
        )
    }
}

/** 330 de alto en el artboard de 390: misma proporción en cualquier teléfono. */
@Composable
private fun altoFotoB(): Dp = (LocalConfiguration.current.screenWidthDp * 330f / 390f).dp

/**
 * Fotos y videos de borde a borde, uno por página, con «1/3» arriba a la derecha. Doble toque
 * en una foto = Me late; un toque la abre en grande. El video de la página visible se
 * reproduce cuando la publicación es la activa del feed.
 */
@Composable
private fun MediaFeedB(
    media: List<MediaDto>,
    postId: String,
    isActive: Boolean,
    onDobleToque: () -> Unit,
) {
    val estado = rememberPagerState(pageCount = { media.size })
    val imagenes = remember(media) { media.filter { !it.esVideoMedia() } }
    var visor by remember(postId) { mutableStateOf<Int?>(null) }
    val videos = media.count { it.esVideoMedia() }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(altoFotoB())
            .background(AgoraColors.BordeFeed),
    ) {
        HorizontalPager(
            state = estado,
            modifier = Modifier.fillMaxSize(),
            key = { i -> "$postId:$i" },
        ) { pagina ->
            val pieza = media[pagina]
            if (pieza.esVideoMedia()) {
                PostVideoPlayer(
                    postId = if (videos == 1) postId else "$postId:$pagina",
                    url = pieza.url,
                    isVisible = isActive && pagina == estado.currentPage,
                    portada = pieza.thumbUrl,
                    controlesSolos = false,
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black),
                )
            } else {
                val indice = imagenes.indexOf(pieza)
                AsyncImage(
                    model = ApiClient.resolveUrl(pieza.url),
                    contentDescription = "Foto ${indice + 1} de ${imagenes.size}",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(pieza.url) {
                            detectTapGestures(
                                onTap = { visor = indice },
                                onDoubleTap = { onDobleToque() },
                            )
                        },
                )
            }
        }
        if (media.size > 1) {
            Text(
                "${estado.currentPage + 1}/${media.size}",
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Normal, fontSize = 12.sp),
                color = Color.White,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color(0xA60F1419))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
                    .clearAndSetSemantics {},
            )
        }
    }
    visor?.let { inicio ->
        VisorImagenes(
            urls = imagenes.mapNotNull { ApiClient.resolveUrl(it.url) },
            inicio = inicio,
            onCerrar = { visor = null },
        )
    }
}
