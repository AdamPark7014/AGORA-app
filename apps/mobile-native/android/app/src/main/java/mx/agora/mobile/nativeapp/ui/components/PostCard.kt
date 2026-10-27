package mx.agora.mobile.nativeapp.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.RemoveCircleOutline
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CrearReporteRequest
import mx.agora.mobile.nativeapp.data.api.EncuestaDto
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.api.ReaccionarRequest
import mx.agora.mobile.nativeapp.data.api.ReaccionesDto
import mx.agora.mobile.nativeapp.data.api.ReportesApi
import mx.agora.mobile.nativeapp.data.api.VotarEncuestaRequest
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraChipShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics
import retrofit2.HttpException
import java.io.IOException

/**
 * Una reacción propia de Ágora. En la D se pinta como chip con texto y número;
 * [emoji] ya no se muestra (sin emojis como íconos) y se queda por compatibilidad.
 */
data class ReaccionInfo(
    val tipo: String,
    val emoji: String,
    val etiqueta: String,
)

val REACCIONES_POST = listOf(
    ReaccionInfo("ME_LATE", "🧡", "Me late"),
    ReaccionInfo("ME_RIO", "😂", "Me río"),
    ReaccionInfo("APOYO", "🤝", "Apoyo"),
    ReaccionInfo("NO_MAMES", "😮", "No mames"),
)

/**
 * Tarjeta de publicación del diseño D (docs/diseno-d.md §3): banda de comunidad,
 * autor con menú «…», texto, fotos y videos en cuadrícula, chips de reacción con
 * conteo y el pie con comentarios y acciones. Ocupa el ancho que le dé la lista,
 * que es quien pone el margen de 14 dp.
 */
@Composable
fun PostCard(
    post: PostDto,
    tokenProvider: () -> String?,
    onPostClick: () -> Unit,
    onHashtagClick: (String) -> Unit = {},
    onAuthorClick: (() -> Unit)? = null,
    isActive: Boolean = false,
    modifier: Modifier = Modifier,
    /** Abre el perfil de un @mencionado. Sin esto las menciones son texto plano. */
    onMentionClick: ((String) -> Unit)? = null,
    /** Solo para staff con permiso de moderar: muestra "Retirar" en el menú. */
    onRetirar: (() -> Unit)? = null,
    /** Abre la comunidad de la banda (recibe el slug). Sin esto la banda no se toca. */
    onComunidadClick: ((String) -> Unit)? = null,
    /** Solo en publicaciones propias: «Borrar» en el menú. La pantalla confirma, borra y la quita. */
    onBorrar: (() -> Unit)? = null,
    /** [EstiloPost.FeedB] en el inicio (artboard FeedB); [EstiloPost.Tarjeta] en el resto de las listas. */
    estilo: EstiloPost = EstiloPost.Tarjeta,
) {
    val context = LocalContext.current
    var menuAbierto by remember(post.id) { mutableStateOf(false) }
    var reportando by remember(post.id) { mutableStateOf(false) }
    var miReaccion by remember(post.id) { mutableStateOf(post.miReaccion) }
    var totalReacciones by remember(post.id) { mutableIntStateOf(post.numReactions) }
    // Conteo por tipo (diseño D). Null con una API anterior: los chips van sin número.
    var reacciones by remember(post.id) { mutableStateOf(post.reacciones) }
    var encuesta by remember(post.id) { mutableStateOf(post.encuesta) }
    var votando by remember(post.id) { mutableStateOf(false) }
    // El feed trae el voto propio (`encuesta.miVoto`, 22-10-2026); null con una API anterior.
    var miVoto by remember(post.id) { mutableStateOf(post.encuesta?.miVoto) }
    var errorVoto by remember(post.id) { mutableStateOf<String?>(null) }
    var suppressCardClick by remember(post.id) { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val haptics = rememberHaptics()

    /**
     * Pasa mi reacción de [desde] a [hacia] moviendo a la vez el total y el
     * conteo por tipo, para que los dos números nunca se contradigan.
     */
    fun moverReaccion(desde: String?, hacia: String?) {
        if (desde == hacia) return
        reacciones = reacciones?.let { r ->
            val sinAnterior = if (desde != null) r.mas(desde, -1) else r
            if (hacia != null) sinAnterior.mas(hacia, 1) else sinAnterior
        }
        val delta = (if (hacia != null) 1 else 0) - (if (desde != null) 1 else 0)
        totalReacciones = (totalReacciones + delta).coerceAtLeast(0)
        miReaccion = hacia
    }

    fun reaccionar(tipo: String) {
        val anterior = miReaccion
        moverReaccion(anterior, if (anterior == tipo) null else tipo)
        haptics.perform(HapticType.Toggle)
        scope.launch {
            try {
                val resp = ApiClient.api<PostsApi>(tokenProvider).reaccionar(post.id, ReaccionarRequest(tipo))
                // Manda el servidor: si su estado no es el que supusimos, el conteo lo sigue.
                moverReaccion(miReaccion, resp.miReaccion)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                moverReaccion(miReaccion, anterior)
                // Que se note que no se guardó, no solo que el chip regresa.
                Toast.makeText(context, mensajeDe(e), Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun votar(opcionId: String) {
        if (votando || encuesta == null) return
        votando = true
        errorVoto = null
        haptics.perform(HapticType.Toggle)
        scope.launch {
            try {
                val resp = ApiClient.api<PostsApi>(tokenProvider).votar(post.id, VotarEncuestaRequest(opcionId))
                if (resp.opciones.isNotEmpty()) encuesta = encuesta?.copy(opciones = resp.opciones)
                miVoto = resp.miVoto ?: opcionId
                haptics.perform(HapticType.Success)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorVoto = mensajeErrorVoto(e)
            } finally {
                votando = false
            }
        }
    }

    fun reportar(motivo: String) {
        reportando = false
        scope.launch {
            try {
                val resp = ApiClient.api<ReportesApi>(tokenProvider)
                    .reportar(CrearReporteRequest(postId = post.id, motivo = motivo))
                // Response<Unit> no lanza con 4xx/5xx: sin esto un fallo diría «gracias».
                if (!resp.isSuccessful) throw HttpException(resp)
                Toast.makeText(context, "Publicación reportada. Gracias.", Toast.LENGTH_SHORT).show()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Toast.makeText(context, mensajeDe(e), Toast.LENGTH_SHORT).show()
            }
        }
    }

    // «…» con Reportar, Borrar y Retirar: el mismo en los dos estilos.
    val menu: @Composable () -> Unit = {
        Box {
            // Tamaño por defecto de IconButton: 48dp de área táctil.
            IconButton(onClick = { menuAbierto = true }) {
                Icon(
                    Icons.Rounded.MoreHoriz,
                    contentDescription = "Más opciones de la publicación",
                    tint = if (estilo == EstiloPost.FeedB) AgoraColors.SecundarioFeed else AgoraColors.TextoMedio,
                )
            }
            DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                DropdownMenuItem(
                    text = { Text("Reportar") },
                    onClick = {
                        menuAbierto = false
                        reportando = true
                    },
                    leadingIcon = { Icon(Icons.Outlined.Flag, contentDescription = null) },
                )
                if (onBorrar != null) {
                    DropdownMenuItem(
                        text = { Text("Borrar", color = AgoraColors.Danger) },
                        onClick = {
                            menuAbierto = false
                            onBorrar()
                        },
                        leadingIcon = {
                            Icon(Icons.Outlined.Delete, contentDescription = null, tint = AgoraColors.Danger)
                        },
                    )
                }
                if (onRetirar != null) {
                    DropdownMenuItem(
                        text = { Text("Retirar (moderación)") },
                        onClick = {
                            menuAbierto = false
                            onRetirar()
                        },
                        leadingIcon = {
                            Icon(Icons.Outlined.RemoveCircleOutline, contentDescription = null)
                        },
                    )
                }
            }
        }
    }

    if (reportando) {
        ReportarDialogo(
            titulo = "Reportar publicación",
            onMotivo = ::reportar,
            onCerrar = { reportando = false },
        )
    }

    if (estilo == EstiloPost.FeedB) {
        PublicacionFeedB(
            post = post,
            tokenProvider = tokenProvider,
            miReaccion = miReaccion,
            totalReacciones = totalReacciones,
            encuesta = encuesta,
            votando = votando,
            miVoto = miVoto,
            errorVoto = errorVoto,
            isActive = isActive,
            onVotar = ::votar,
            onReaccionar = ::reaccionar,
            onPostClick = onPostClick,
            onHashtagClick = onHashtagClick,
            onAuthorClick = onAuthorClick,
            onMentionClick = onMentionClick,
            menu = menu,
            modifier = modifier,
        )
        return
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        onClick = {
            if (!suppressCardClick) onPostClick()
        },
        shape = AgoraCardShape,
        colors = CardDefaults.cardColors(
            containerColor = AgoraColors.Superficie,
            contentColor = AgoraColors.Texto,
        ),
        // Sin sombra: en la D la tarjeta se separa del fondo cálido por el color.
        elevation = CardDefaults.cardElevation(
            defaultElevation = 0.dp,
            pressedElevation = 0.dp,
            focusedElevation = 0.dp,
            hoveredElevation = 0.dp,
        ),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // La comunidad va primero (§1): en Ágora importa dónde se dijo algo
            // tanto como quién lo dijo. La tarjeta recorta sus esquinas.
            if (post.comunidad.nombre.isNotBlank()) {
                BandaComunidad(
                    nombre = post.comunidad.nombre,
                    slug = post.comunidad.slug,
                    onClick = onComunidadClick?.let { abrir -> { abrir(post.comunidad.slug) } },
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    // El área táctil del autor mide 48: arriba y abajo se ven 12 y 8, como el mockup.
                    .padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 48.dp)
                        .then(
                            if (onAuthorClick != null) {
                                Modifier
                                    .clip(AgoraChipShape)
                                    .clickable(
                                        onClickLabel = post.autor?.nombre?.let { "Ver perfil de $it" } ?: "Ver perfil",
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
                    AgoraAvatar(post.autor?.nombre, post.autor?.fotoUrl, size = 40.dp)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            post.autor?.nombre ?: "Cuenta eliminada",
                            style = MaterialTheme.typography.titleSmall.copy(fontSize = 15.sp),
                            fontWeight = FontWeight.Bold,
                            color = AgoraColors.Texto,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        // La API no manda la generación del autor: solo el tiempo.
                        Text(
                            if (post.estado == "EN_REVISION") {
                                "${haceCuanto(post.createdAt)} · en revisión"
                            } else {
                                haceCuanto(post.createdAt)
                            },
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Normal),
                            color = AgoraColors.TextoMedio,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                menu()
            }

            if (post.texto.isNotBlank()) {
                TextoConHashtags(
                    texto = post.texto,
                    onHashtagClick = onHashtagClick,
                    onMentionClick = onMentionClick,
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
                )
            }

            if (post.media.isNotEmpty()) {
                PostMediaGrid(
                    media = post.media,
                    postId = post.id,
                    isVisible = isActive,
                    onDoubleTapReact = {
                        reaccionar("ME_LATE")
                        suppressCardClick = true
                        scope.launch {
                            delay(350)
                            suppressCardClick = false
                        }
                    },
                    // Fotos dentro de la tarjeta (§1.4), no a sangre.
                    modifier = Modifier.padding(horizontal = AgoraSpacing.Tarjeta),
                )
            }

            encuesta?.let { poll ->
                EncuestaBloque(
                    encuesta = poll,
                    onVotar = ::votar,
                    votando = votando,
                    modifier = Modifier.padding(
                        start = 16.dp,
                        end = 16.dp,
                        top = if (post.media.isNotEmpty()) 12.dp else 0.dp,
                    ),
                    miVoto = miVoto,
                    error = errorVoto,
                )
            }

            ReaccionesChips(
                miReaccion = miReaccion,
                reacciones = reacciones,
                onReaccionar = ::reaccionar,
                // Los chips ya dejan 6 dp de área táctil arriba y abajo.
                modifier = Modifier.padding(
                    start = 16.dp,
                    end = 16.dp,
                    top = if (post.media.isNotEmpty() || encuesta != null) 6.dp else 0.dp,
                ),
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 12.dp, end = 4.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    ConteoComentarios(
                        numComments = post.numComments,
                        // Con la API vieja no hay conteo por chip: el total va aquí.
                        totalReacciones = if (reacciones == null) totalReacciones else null,
                        onClick = onPostClick,
                    )
                }
                IconButton(onClick = onPostClick) {
                    Icon(
                        Icons.Outlined.ChatBubbleOutline,
                        contentDescription = "Comentar",
                        tint = AgoraColors.TextoMedio,
                        modifier = Modifier.size(22.dp),
                    )
                }
                IconButton(onClick = { compartirEnlace(context, EnlacesWeb.publicacion(post.id)) }) {
                    Icon(
                        Icons.Outlined.Share,
                        contentDescription = AgoraCopy.compartir.accion,
                        tint = AgoraColors.TextoMedio,
                        modifier = Modifier.size(22.dp),
                    )
                }
                GuardarButton(
                    postId = post.id,
                    guardado = post.miGuardado,
                    tokenProvider = tokenProvider,
                )
            }
        }
    }
}

/** Cómo se pinta una publicación en una lista. */
enum class EstiloPost {
    /** Tarjeta del diseño D, con banda de comunidad y chips de reacción. */
    Tarjeta,

    /** A todo lo ancho, como el artboard FeedB (solo el inicio). */
    FeedB,
}

/**
 * Las cuatro reacciones como chips con su número (docs/diseno-d.md §3); la mía
 * con borde naranja sobre naranja suave. Se ven las cuatro siempre, para poder
 * reaccionar aunque nadie lo haya hecho, y el número solo si pasa de cero. Con
 * [reacciones] null (API anterior) van sin número.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReaccionesChips(
    miReaccion: String?,
    reacciones: ReaccionesDto?,
    onReaccionar: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        REACCIONES_POST.forEach { reaccion ->
            ChipReaccion(
                etiqueta = reaccion.etiqueta,
                conteo = reacciones?.de(reaccion.tipo),
                activo = miReaccion == reaccion.tipo,
                onClick = { onReaccionar(reaccion.tipo) },
            )
        }
    }
}

@Composable
private fun ChipReaccion(
    etiqueta: String,
    conteo: Int?,
    activo: Boolean,
    onClick: () -> Unit,
) {
    val descripcion = if (conteo != null) "$etiqueta, ${cuenta(conteo, "reacción", "reacciones")}" else etiqueta
    val estilo = MaterialTheme.typography.labelLarge.copy(
        fontSize = 13.sp,
        fontWeight = if (activo) FontWeight.SemiBold else FontWeight.Medium,
    )
    val tinta = if (activo) AgoraColors.NaranjaTinta else AgoraColors.Texto
    Row(
        modifier = Modifier
            // 36 dp a la vista y 48 dp de área táctil.
            .minimumInteractiveComponentSize()
            .heightIn(min = 36.dp)
            .clip(AgoraChipShape)
            .background(if (activo) AgoraColors.NaranjaSuave else AgoraColors.Superficie2)
            // Borde transparente en los demás: al elegir uno el chip no cambia de tamaño.
            .border(1.5.dp, if (activo) AgoraColors.Naranja else Color.Transparent, AgoraChipShape)
            .clickable(
                role = Role.Button,
                onClickLabel = if (activo) "Quitar reacción" else "Reaccionar",
                onClick = onClick,
            )
            .semantics {
                contentDescription = descripcion
                selected = activo
            }
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Text(
            etiqueta,
            style = estilo,
            color = tinta,
            maxLines = 1,
            modifier = Modifier.clearAndSetSemantics {},
        )
        if (conteo != null && conteo > 0) {
            Text(
                conteo.toString(),
                style = estilo.copy(fontWeight = FontWeight.SemiBold, fontFeatureSettings = "tnum"),
                color = tinta,
                maxLines = 1,
                modifier = Modifier.clearAndSetSemantics {},
            )
        }
    }
}

/**
 * «6 comentarios» del pie; con [totalReacciones] (API sin conteo por tipo) añade
 * el total. Con [onClick], sin comentarios dice «Comentar» como en la web.
 */
@Composable
private fun ConteoComentarios(
    numComments: Int,
    totalReacciones: Int?,
    onClick: (() -> Unit)?,
) {
    val comentarios = if (numComments == 0 && onClick != null) {
        "Comentar"
    } else {
        cuenta(numComments, "comentario", "comentarios")
    }
    val texto = if (totalReacciones != null && totalReacciones > 0) {
        "$comentarios · ${cuenta(totalReacciones, "reacción", "reacciones")}"
    } else {
        comentarios
    }
    Box(
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(AgoraChipShape)
            .then(
                if (onClick != null) {
                    Modifier
                        .clickable(role = Role.Button, onClickLabel = "Ver comentarios", onClick = onClick)
                        .padding(horizontal = 4.dp)
                } else {
                    Modifier
                },
            ),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.bodySmall,
            color = AgoraColors.TextoMedio,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/**
 * Reacciones y conteos fuera de [PostCard] (el detalle): los mismos chips de la
 * D y, debajo, los comentarios y Compartir. Con [reacciones] null el total va
 * en texto junto a los comentarios.
 */
@Composable
fun ReaccionesRow(
    miReaccion: String?,
    totalReacciones: Int,
    numComments: Int,
    onReaccionar: (String) -> Unit,
    onCommentsClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    onCompartir: (() -> Unit)? = null,
    /** Conteo por tipo (diseño D, `reacciones` del DTO). Null con una API anterior. */
    reacciones: ReaccionesDto? = null,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        ReaccionesChips(
            miReaccion = miReaccion,
            reacciones = reacciones,
            onReaccionar = onReaccionar,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(modifier = Modifier.weight(1f)) {
                ConteoComentarios(
                    numComments = numComments,
                    totalReacciones = if (reacciones == null) totalReacciones else null,
                    onClick = onCommentsClick,
                )
            }
            if (onCompartir != null) {
                // Tamaño por defecto de IconButton: 48dp de área táctil.
                IconButton(onClick = onCompartir) {
                    Icon(
                        Icons.Outlined.Share,
                        contentDescription = AgoraCopy.compartir.accion,
                        tint = AgoraColors.TextoMedio,
                        modifier = Modifier.size(22.dp),
                    )
                }
            }
        }
    }
}

/**
 * Mismo patrón que `partirTextoSocial` (packages/shared): @menciones de 3–30
 * caracteres y #hashtags de 2–40 letras o números (con acentos).
 */
private val TOKEN_SOCIAL = Regex("(@[a-z][a-z0-9_]{2,29}|#[\\p{L}\\p{N}_]{2,40})", RegexOption.IGNORE_CASE)

/**
 * Texto de un post con #hashtags y @menciones tocables. Usa LinkAnnotation:
 * un toque fuera de los enlaces sigue llegando a la tarjeta (abre el detalle).
 */
@Composable
fun TextoConHashtags(
    texto: String,
    onHashtagClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    onMentionClick: ((String) -> Unit)? = null,
    /** Feed B: el @ de quien publicó va en negritas antes del texto, como pie de foto. */
    autor: String? = null,
    estilo: TextStyle = MaterialTheme.typography.bodyMedium,
    color: Color = AgoraColors.Texto,
) {
    val alHashtag by rememberUpdatedState(onHashtagClick)
    val alMencion by rememberUpdatedState(onMentionClick)
    val conMenciones = onMentionClick != null
    // `naranja-tinta`: el naranja de marca no llega a 4.5:1 como texto sobre blanco.
    val estiloEnlace = TextLinkStyles(
        style = SpanStyle(color = AgoraColors.NaranjaTinta, fontWeight = FontWeight.SemiBold),
    )
    val annotated = remember(texto, conMenciones, autor, AgoraColors.oscuro) {
        buildAnnotatedString {
            if (autor != null) {
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(autor) }
                append(" ")
            }
            var ultimo = 0
            TOKEN_SOCIAL.findAll(texto).forEach { m ->
                if (m.range.first > ultimo) append(texto.substring(ultimo, m.range.first))
                val token = m.value
                when {
                    token.startsWith("#") -> {
                        val tag = token.drop(1)
                        withLink(
                            LinkAnnotation.Clickable(
                                tag = "hashtag:$tag",
                                styles = estiloEnlace,
                                linkInteractionListener = { alHashtag(tag) },
                            ),
                        ) { append(token) }
                    }
                    conMenciones -> {
                        val handle = token.drop(1).lowercase()
                        withLink(
                            LinkAnnotation.Clickable(
                                tag = "mencion:$handle",
                                styles = estiloEnlace,
                                linkInteractionListener = { alMencion?.invoke(handle) },
                            ),
                        ) { append(token) }
                    }
                    else -> append(token)
                }
                ultimo = m.range.last + 1
            }
            if (ultimo < texto.length) append(texto.substring(ultimo))
        }
    }

    Text(
        text = annotated,
        style = estilo.copy(color = color),
        modifier = modifier,
    )
}

/**
 * Encuesta de un post. [miVoto] resalta la opción elegida (viene en la
 * encuesta del feed/detalle y en la respuesta de votar) y [error] se muestra
 * debajo si el voto falló.
 */
@Composable
fun EncuestaBloque(
    encuesta: EncuestaDto,
    onVotar: (String) -> Unit,
    votando: Boolean,
    modifier: Modifier = Modifier,
    miVoto: String? = null,
    error: String? = null,
) {
    val votosTotales = encuesta.opciones.sumOf { it.votos }
    val forma = AgoraChipShape

    Column(modifier = modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            encuesta.pregunta,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = AgoraColors.Texto,
        )
        encuesta.opciones.forEach { opcion ->
            val pct = if (votosTotales > 0) opcion.votos * 100 / votosTotales else 0
            val elegida = opcion.id == miVoto
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    // Área táctil de 48 dp; crece si el texto ocupa dos líneas.
                    .heightIn(min = 48.dp)
                    .clip(forma)
                    .background(AgoraColors.Fondo)
                    .border(
                        if (elegida) 1.5.dp else 1.dp,
                        if (elegida) AgoraColors.Naranja else AgoraColors.Borde,
                        forma,
                    )
                    .selectable(
                        selected = elegida,
                        enabled = !votando,
                        role = Role.RadioButton,
                        onClick = { onVotar(opcion.id) },
                    )
                    .semantics { if (elegida) stateDescription = "Tu voto" },
            ) {
                if (pct > 0) {
                    // Sin alto fijo, fillMaxHeight no tendría tope: la barra se mide contra la opción.
                    Box(Modifier.matchParentSize()) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(fraction = pct / 100f)
                                .background(AgoraColors.NaranjaSuave),
                        )
                    }
                }
                Text(
                    if (elegida) "✓ ${opcion.texto} · $pct%" else "${opcion.texto} · $pct%",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = if (elegida) FontWeight.Bold else FontWeight.Normal,
                    color = if (elegida) AgoraColors.NaranjaTinta else AgoraColors.Texto,
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        // El «✓» no se lee: el estado ya va en stateDescription.
                        .clearAndSetSemantics { contentDescription = "${opcion.texto}, $pct%" },
                )
            }
        }
        if (error != null) {
            Text(
                error,
                style = MaterialTheme.typography.labelSmall,
                color = AgoraColors.Danger,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
    }
}

/** Mensaje del servidor (p. ej. «Esa encuesta ya cerró.») o uno genérico según el tipo de fallo. */
fun mensajeErrorVoto(e: Throwable): String =
    ApiClient.mensajeDelServidor(e)
        ?: if (e is IOException) {
            "No se pudo registrar tu voto. Revisa tu conexión."
        } else {
            "No se pudo registrar tu voto. Intenta de nuevo."
        }
