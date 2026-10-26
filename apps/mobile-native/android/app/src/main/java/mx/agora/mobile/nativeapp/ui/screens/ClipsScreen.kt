package mx.agora.mobile.nativeapp.ui.screens

import android.net.Uri
import android.view.View
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.SmartDisplay
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableFloatState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.findRootCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.NetworkMonitor
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AutorDto
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.GuardadosApi
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.api.ReaccionarRequest
import mx.agora.mobile.nativeapp.data.api.ReaccionesDto
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import mx.agora.mobile.nativeapp.ui.components.TipoComunidadD
import mx.agora.mobile.nativeapp.ui.components.esVideoMedia
import mx.agora.mobile.nativeapp.ui.components.iconoComunidad
import mx.agora.mobile.nativeapp.ui.components.tipoComunidad
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics
import java.io.IOException
import java.util.Locale
import kotlin.math.roundToInt

/*
 * Clips del campus (diseño D, docs/diseno-d.md §4): pantalla completa oscura con un
 * video vertical por página. El fondo es fijo en claro y en oscuro, por eso aquí el
 * texto va en blanco y no con los tokens de tinta.
 */

/** `oscuro` claro: el mismo que pinta MainShell alrededor de la barra flotante. */
private val FondoClips = Color(0xFF14110F)

/**
 * Alto de la barra flotante de MainShell sin el inset del sistema (8 arriba, 6 + 48 + 6
 * de la píldora y 10 abajo). Con él se calcula cuánto tapa la barra si esta pantalla
 * llega hasta el borde de la ventana.
 */
private val AltoBarraFlotante = 78.dp

/** Respiro entre el borde visible de abajo y la barra de progreso. */
private val MargenInferior = 12.dp

private const val PESTANA_CARRERA = "carrera"
private const val PESTANA_CAMPUS = "campus"
private const val ME_LATE = "ME_LATE"

/** Sombra leve para que el texto blanco se lea también sobre un video claro. */
private val SombraTexto = Shadow(color = Color.Black.copy(alpha = 0.45f), offset = Offset(0f, 1f), blurRadius = 4f)

/**
 * [onEventoClick] queda listo para el «evento ligado» del mockup: `PostDto` todavía no
 * trae el evento, y sin el dato no se inventa la tarjeta.
 */
@Suppress("UNUSED_PARAMETER")
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ClipsScreen(
    tokenProvider: () -> String?,
    onAuthorClick: (String) -> Unit,
    onEventoClick: (String) -> Unit,
    onPostClick: (String) -> Unit,
    onVolver: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val haptics = rememberHaptics()
    val densidad = LocalDensity.current

    var pestana by rememberSaveable { mutableStateOf(PESTANA_CAMPUS) }
    var carrera by remember { mutableStateOf<ComunidadDto?>(null) }
    /** Falló traer mis comunidades: se reintenta cuando vuelve la red. */
    var carreraPendiente by remember { mutableStateOf(false) }

    var posts by remember { mutableStateOf<List<PostDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(true) }
    var cargandoMas by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Falló la siguiente página: aviso arriba con «Reintentar» y se frena la paginación. */
    var errorMas by remember { mutableStateOf<String?>(null) }
    var recarga by remember { mutableIntStateOf(0) }
    /** Clip a la vista: al volver del detalle o de un perfil se regresa a él. */
    var clipVisto by rememberSaveable { mutableStateOf<String?>(null) }
    val trabajoPagina = remember { mutableStateOf<Job?>(null) }
    // Una llamada a la vez por publicación: los dos endpoints son interruptores y dos
    // toques rápidos se cancelarían en el servidor.
    val reaccionando = remember { mutableStateListOf<String>() }
    val guardando = remember { mutableStateListOf<String>() }

    // Sin carrera (o mientras carga) solo existe «Campus».
    val pestanaActiva = if (carrera == null) PESTANA_CAMPUS else pestana
    val slugActual = if (pestanaActiva == PESTANA_CARRERA) carrera?.slug else null

    val lifecycleOwner = LocalLifecycleOwner.current
    var enPrimerPlano by remember {
        mutableStateOf(lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED))
    }
    DisposableEffect(lifecycleOwner) {
        val observador = LifecycleEventObserver { _, evento ->
            when (evento) {
                Lifecycle.Event.ON_RESUME -> enPrimerPlano = true
                Lifecycle.Event.ON_PAUSE -> enPrimerPlano = false
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observador)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observador) }
    }

    fun cargarCarrera() {
        scope.launch {
            try {
                val mias = ApiClient.api<PerfilApi>(tokenProvider).misComunidades()
                // `tipo` llegó con la D; con una API anterior se deduce del slug.
                carrera = mias.firstOrNull { it.tipo == "CARRERA" }
                    ?: mias.firstOrNull { it.tipo == null && tipoComunidad(it.slug) == TipoComunidadD.CARRERA }
                carreraPendiente = false
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                carreraPendiente = true
            }
        }
    }

    fun reemplazar(id: String, cambio: (PostDto) -> PostDto) {
        posts = posts.map { if (it.id == id) cambio(it) else it }
    }

    fun cargarMas() {
        val desde = cursor ?: return
        if (cargando || cargandoMas) return
        // Se lee del estado y no de `slugActual`: este callback vive en un efecto largo.
        val slug = if (pestana == PESTANA_CARRERA) carrera?.slug else null
        cargandoMas = true
        errorMas = null
        trabajoPagina.value = scope.launch {
            try {
                val resp = ApiClient.feedApi(tokenProvider).feed(cursor = desde, comunidadSlug = slug, tipo = "clips")
                val ya = posts.mapTo(HashSet()) { it.id }
                posts = posts + resp.publicaciones.filter { it.videoUrl() != null && it.id !in ya }
                cursor = resp.siguienteCursor
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMas = mensajeDe(e)
            } finally {
                cargandoMas = false
            }
        }
    }

    fun meLate(id: String) {
        val post = posts.firstOrNull { it.id == id } ?: return
        if (id in reaccionando) return
        val anterior = post.miReaccion
        val nueva = if (anterior == ME_LATE) null else ME_LATE
        val base = post.reacciones
        val totalBase = post.numReactions
        reemplazar(id) {
            it.copy(
                miReaccion = nueva,
                reacciones = base?.cambio(anterior, nueva),
                numReactions = totalBase + when {
                    nueva == null -> -1
                    anterior == null -> 1
                    else -> 0
                },
            )
        }
        haptics.perform(HapticType.Toggle)
        reaccionando.add(id)
        scope.launch {
            try {
                val resp = ApiClient.api<PostsApi>(tokenProvider).reaccionar(id, ReaccionarRequest(ME_LATE))
                if (resp.miReaccion != nueva) {
                    reemplazar(id) { it.copy(miReaccion = resp.miReaccion, reacciones = base?.cambio(anterior, resp.miReaccion)) }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                reemplazar(id) { it.copy(miReaccion = anterior, reacciones = base, numReactions = totalBase) }
                // Que se note que no se guardó, no solo que el corazón regresa.
                Toast.makeText(context, mensajeDe(e), Toast.LENGTH_SHORT).show()
            } finally {
                reaccionando.remove(id)
            }
        }
    }

    /** Misma lógica que `GuardarButton`; aquí cambia solo la forma del botón. */
    fun alternarGuardado(id: String) {
        val post = posts.firstOrNull { it.id == id } ?: return
        if (id in guardando) return
        val anterior = post.miGuardado
        haptics.perform(HapticType.Toggle)
        // Optimista. Un fallo NO se reintenta: si la primera llamada sí llegó, la
        // segunda desharía el guardado. Se revierte y se avisa.
        reemplazar(id) { it.copy(miGuardado = !anterior) }
        guardando.add(id)
        scope.launch {
            try {
                val resp = ApiClient.api<GuardadosApi>(tokenProvider).alternar(id)
                reemplazar(id) { it.copy(miGuardado = resp.guardado) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                reemplazar(id) { it.copy(miGuardado = anterior) }
                val accion = if (anterior) "No se pudo quitar de guardados." else "No se pudo guardar."
                val detalle = ApiClient.mensajeDelServidor(e)
                    ?: if (e is IOException) "Revisa tu conexión." else "Intenta de nuevo."
                Toast.makeText(context, "$accion $detalle", Toast.LENGTH_SHORT).show()
            } finally {
                guardando.remove(id)
            }
        }
    }

    val pagerState = rememberPagerState(pageCount = { posts.size })

    LaunchedEffect(Unit) { cargarCarrera() }

    LaunchedEffect(Unit) {
        NetworkMonitor.connectivityFlow(context).collect { enLinea ->
            if (!enLinea) return@collect
            if (carreraPendiente) cargarCarrera()
            if (error != null && posts.isEmpty()) recarga++
            if (errorMas != null) errorMas = null
        }
    }

    LaunchedEffect(slugActual, recarga) {
        trabajoPagina.value?.cancel()
        // `cargando` no se apaga en un finally: al cambiar de pestaña, el efecto
        // cancelado lo apagaría después de que el nuevo lo encendió.
        cargando = true
        cargandoMas = false
        error = null
        errorMas = null
        posts = emptyList()
        cursor = null
        try {
            val resp = ApiClient.feedApi(tokenProvider).feed(comunidadSlug = slugActual, tipo = "clips")
            val nuevos = resp.publicaciones.filter { it.videoUrl() != null }
            val volverA = nuevos.indexOfFirst { it.id == clipVisto }.coerceAtLeast(0)
            posts = nuevos
            cursor = resp.siguienteCursor
            cargando = false
            if (nuevos.isNotEmpty()) pagerState.scrollToPage(volverA)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = mensajeDe(e)
            cargando = false
        }
    }

    LaunchedEffect(pagerState) {
        snapshotFlow { posts.getOrNull(pagerState.settledPage)?.id }
            .collect { id -> if (id != null) clipVisto = id }
    }

    // Pide la siguiente página a tres clips del final. Un fallo frena la paginación
    // hasta que se toca «Reintentar» (o vuelve la red), para no reintentar en bucle.
    LaunchedEffect(pagerState) {
        snapshotFlow {
            val cerca = posts.isNotEmpty() && pagerState.currentPage >= posts.size - 3
            cerca && cursor != null && !cargando && !cargandoMas && errorMas == null
        }
            .distinctUntilChanged()
            .collect { toca -> if (toca) cargarMas() }
    }

    // Cuánto de esta pantalla queda bajo la barra flotante. Hoy MainShell ya descuenta
    // la barra con el padding del Scaffold y esto da cero; si un día los clips pasan
    // por debajo de la barra, el texto y la barra de progreso suben solos.
    var hastaElBorde by remember { mutableIntStateOf(0) }
    val navInferior = WindowInsets.navigationBars.getBottom(densidad)
    val reservaInferior = with(densidad) {
        (AltoBarraFlotante.roundToPx() + navInferior - hastaElBorde).coerceAtLeast(0).toDp()
    } + MargenInferior

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(FondoClips)
            .onGloballyPositioned { coordenadas ->
                val raiz = coordenadas.findRootCoordinates()
                hastaElBorde = (raiz.size.height - coordenadas.boundsInRoot().bottom).roundToInt().coerceAtLeast(0)
            },
    ) {
        val errorCarga = error
        when {
            cargando && posts.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.semantics { contentDescription = "Cargando clips" },
                    )
                }
            }
            errorCarga != null && posts.isEmpty() -> {
                EstadoClips(
                    titulo = errorCarga,
                    detalle = null,
                    esError = true,
                    accion = "Reintentar",
                    onAccion = { recarga++ },
                )
            }
            posts.isEmpty() -> {
                EstadoClips(
                    titulo = if (pestanaActiva == PESTANA_CARRERA) {
                        "Todavía no hay clips de tu carrera"
                    } else {
                        "Todavía no hay clips en el campus"
                    },
                    detalle = "Cuando alguien suba un video, aparece aquí.",
                    esError = false,
                )
            }
            else -> {
                VerticalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize(),
                    // Prepara el clip de arriba y el de abajo para que no salga negro al deslizar.
                    beyondViewportPageCount = 1,
                    key = { i -> posts.getOrNull(i)?.id ?: "pagina-$i" },
                ) { pagina ->
                    val post = posts.getOrNull(pagina) ?: return@VerticalPager
                    PaginaClip(
                        post = post,
                        // settledPage: el siguiente arranca cuando el deslizamiento termina.
                        activo = pagina == pagerState.settledPage,
                        enPrimerPlano = enPrimerPlano,
                        reservaInferior = reservaInferior,
                        onMeLate = { meLate(post.id) },
                        onComentarios = { onPostClick(post.id) },
                        onCompartir = { compartirEnlace(context, EnlacesWeb.publicacion(post.id)) },
                        onGuardar = { alternarGuardado(post.id) },
                        onAutor = onAuthorClick,
                    )
                }
            }
        }

        // Velo superior: las pestañas se leen sobre cualquier video.
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .height(120.dp)
                .background(Brush.verticalGradient(listOf(FondoClips.copy(alpha = 0.55f), Color.Transparent))),
        )

        EncabezadoClips(
            conCarrera = carrera != null,
            pestana = pestanaActiva,
            onPestana = { nueva ->
                if (nueva != pestanaActiva) {
                    haptics.perform(HapticType.Light)
                    pestana = nueva
                }
            },
            onVolver = onVolver,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding(),
        )

        val errorPagina = errorMas
        if (errorPagina != null && posts.isNotEmpty() && pagerState.currentPage >= posts.lastIndex) {
            Row(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(top = 64.dp, start = 16.dp, end = 16.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(FondoClips.copy(alpha = 0.85f))
                    .padding(start = 14.dp, end = 4.dp)
                    .semantics { liveRegion = LiveRegionMode.Polite },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    errorPagina,
                    color = Color.White,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.weight(1f, fill = false),
                )
                TextButton(onClick = { errorMas = null }) {
                    Text("Reintentar", color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

/** Pestañas «Mi carrera» / «Campus» y el botón de volver del mockup. */
@Composable
private fun EncabezadoClips(
    conCarrera: Boolean,
    pestana: String,
    onPestana: (String) -> Unit,
    onVolver: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 6.dp, vertical = 6.dp),
    ) {
        IconButton(onClick = onVolver, modifier = Modifier.align(Alignment.CenterStart)) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(FondoClips.copy(alpha = 0.35f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = "Volver al inicio",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
        Row(
            modifier = Modifier
                .align(Alignment.Center)
                .selectableGroup()
                .semantics { contentDescription = "Qué clips ver" },
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            if (conCarrera) {
                PestanaClips("Mi carrera", activa = pestana == PESTANA_CARRERA) { onPestana(PESTANA_CARRERA) }
            }
            PestanaClips("Campus", activa = pestana == PESTANA_CAMPUS) { onPestana(PESTANA_CAMPUS) }
        }
    }
}

@Composable
private fun PestanaClips(texto: String, activa: Boolean, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .selectable(selected = activa, role = Role.Tab, onClick = onClick)
            .padding(horizontal = 8.dp),
    ) {
        Text(
            texto,
            color = if (activa) Color.White else Color.White.copy(alpha = 0.72f),
            style = MaterialTheme.typography.titleSmall.copy(
                fontSize = 15.sp,
                fontWeight = if (activa) FontWeight.Bold else FontWeight.Medium,
                shadow = SombraTexto,
            ),
        )
        Spacer(Modifier.height(4.dp))
        // Subrayado corto naranja solo en la activa; el hueco se conserva para que no brinque.
        Box(
            modifier = Modifier
                .width(18.dp)
                .height(2.5.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(if (activa) AgoraColors.Naranja else Color.Transparent),
        )
    }
}

/** Cargando ya tiene su indicador; esto cubre error y lista vacía sobre el fondo oscuro. */
@Composable
private fun EstadoClips(
    titulo: String,
    detalle: String?,
    esError: Boolean,
    modifier: Modifier = Modifier,
    accion: String? = null,
    onAccion: () -> Unit = {},
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (!esError) {
            Icon(
                Icons.Outlined.SmartDisplay,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.6f),
                modifier = Modifier.size(44.dp),
            )
            Spacer(Modifier.height(12.dp))
        }
        Text(
            titulo,
            color = Color.White,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            textAlign = TextAlign.Center,
            modifier = Modifier.semantics {
                if (esError) liveRegion = LiveRegionMode.Polite
                if (!esError) heading()
            },
        )
        if (detalle != null) {
            Spacer(Modifier.height(6.dp))
            Text(
                detalle,
                color = Color.White.copy(alpha = 0.72f),
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
            )
        }
        if (accion != null) {
            Spacer(Modifier.height(16.dp))
            OutlinedButton(
                onClick = onAccion,
                shape = AgoraButtonShape,
                border = BorderStroke(1.5.dp, Color.White),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                modifier = Modifier.heightIn(min = 48.dp),
            ) {
                Text(accion, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

/** Una página: video, velo, datos abajo a la izquierda, acciones a la derecha y progreso. */
@Composable
private fun PaginaClip(
    post: PostDto,
    activo: Boolean,
    enPrimerPlano: Boolean,
    reservaInferior: Dp,
    onMeLate: () -> Unit,
    onComentarios: () -> Unit,
    onCompartir: () -> Unit,
    onGuardar: () -> Unit,
    onAutor: (String) -> Unit,
) {
    val url = remember(post.id) { post.videoUrl()?.let { ApiClient.resolveUrl(it) } }
    val progreso = remember(post.id) { mutableFloatStateOf(0f) }

    Box(Modifier.fillMaxSize()) {
        if (url != null) {
            VideoClip(
                url = url,
                activo = activo,
                enPrimerPlano = enPrimerPlano,
                progreso = progreso,
                descripcion = "Clip de ${post.autor?.nombre ?: "una cuenta eliminada"}",
                modifier = Modifier.fillMaxSize(),
            )
        }

        // Velo oscuro inferior para leer el texto encima del video.
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(0.5f)
                .background(Brush.verticalGradient(listOf(Color.Transparent, FondoClips.copy(alpha = 0.85f)))),
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(start = 16.dp, end = 84.dp, bottom = reservaInferior + 18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ChipComunidadClip(post.comunidad)
            AutorClip(autor = post.autor, createdAt = post.createdAt, onAutor = onAutor)
            if (post.texto.isNotBlank()) {
                TextoClip(id = post.id, texto = post.texto)
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 8.dp, bottom = reservaInferior + 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            val mia = post.miReaccion == ME_LATE
            // Sin `reacciones` (API anterior a la D) no hay conteo por tipo: no se muestra número.
            val meLate = post.reacciones?.meLate
            AccionClip(
                icono = if (mia) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                tinte = if (mia) AgoraColors.Naranja else Color.White,
                etiqueta = meLate?.let { cifraCorta(it) } ?: "Me late",
                descripcion = if (meLate != null) "Me late, ${cifraLarga(meLate)}" else "Me late",
                seleccionado = mia,
                onClick = onMeLate,
            )
            AccionClip(
                icono = Icons.Outlined.ChatBubbleOutline,
                etiqueta = cifraCorta(post.numComments),
                descripcion = "Comentarios: ${cuenta(post.numComments, "comentario", "comentarios")}",
                onClick = onComentarios,
            )
            AccionClip(
                icono = Icons.AutoMirrored.Outlined.Send,
                etiqueta = "Enviar",
                descripcion = AgoraCopy.compartir.accion,
                onClick = onCompartir,
            )
            AccionClip(
                icono = if (post.miGuardado) Icons.Outlined.Bookmark else Icons.Outlined.BookmarkBorder,
                etiqueta = if (post.miGuardado) "Guardado" else "Guardar",
                descripcion = if (post.miGuardado) "Quitar de guardados" else "Guardar publicación",
                seleccionado = post.miGuardado,
                onClick = onGuardar,
            )
        }

        // Progreso fino; se dibuja en la fase de dibujo para no recomponer cada 100 ms.
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(start = 16.dp, end = 16.dp, bottom = reservaInferior)
                .fillMaxWidth()
                .height(3.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(Color.White.copy(alpha = 0.25f))
                .drawBehind {
                    drawRect(Color.White, size = Size(size.width * progreso.floatValue, size.height))
                }
                .clearAndSetSemantics {},
        )
    }
}

/**
 * Video a pantalla completa con recorte (no cabe `PostVideoPlayer`: trae controles y
 * ajuste sin recorte). En bucle, solo suena el de la página activa con la app al frente
 * y un toque lo pausa o lo sigue.
 */
@androidx.annotation.OptIn(UnstableApi::class)
@Composable
private fun VideoClip(
    url: String,
    activo: Boolean,
    enPrimerPlano: Boolean,
    progreso: MutableFloatState,
    descripcion: String,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val player = remember(url) {
        ExoPlayer.Builder(context).build().apply {
            // Con el foco de audio, otra app que suena (o un audífono que se desconecta) lo pausa.
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                    .build(),
                true,
            )
            setHandleAudioBecomingNoisy(true)
            repeatMode = Player.REPEAT_MODE_ONE
            setMediaItem(MediaItem.fromUri(Uri.parse(url)))
            playWhenReady = false
            prepare()
        }
    }
    var pausado by remember(player) { mutableStateOf(false) }
    var errorVideo by remember(player) { mutableStateOf(false) }
    var cargandoVideo by remember(player) { mutableStateOf(player.playbackState == Player.STATE_BUFFERING) }

    DisposableEffect(player) {
        val escucha = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                errorVideo = true
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                cargandoVideo = playbackState == Player.STATE_BUFFERING
            }

            override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
                // Lo pausó el sistema: que la pantalla lo diga y un toque lo siga.
                if (!playWhenReady &&
                    (reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_FOCUS_LOSS ||
                        reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_BECOMING_NOISY)
                ) {
                    pausado = true
                }
            }
        }
        player.addListener(escucha)
        onDispose {
            player.removeListener(escucha)
            player.release()
        }
    }

    val reproducir = activo && enPrimerPlano && !pausado && !errorVideo
    LaunchedEffect(player, reproducir) {
        player.playWhenReady = reproducir
    }

    LaunchedEffect(player, activo) {
        if (!activo) {
            // Al dejar la página vuelve al inicio y sin pausa: al regresar empieza de cero.
            pausado = false
            player.seekTo(0)
            progreso.floatValue = 0f
            return@LaunchedEffect
        }
        while (true) {
            val duracion = player.duration
            progreso.floatValue = if (duracion > 0) {
                (player.currentPosition.toFloat() / duracion).coerceIn(0f, 1f)
            } else {
                0f
            }
            delay(100)
        }
    }

    Box(modifier = modifier) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = false
                    setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_ZOOM)
                    setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
                    setKeepContentOnPlayerReset(true)
                    // TalkBack lee la capa de Compose de encima, no la vista nativa.
                    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
                    this.player = player
                }
            },
            update = { vista -> if (vista.player !== player) vista.player = player },
            onRelease = { vista -> vista.player = null },
            modifier = Modifier.fillMaxSize(),
        )

        // Capa de toque encima de la vista nativa: así el PlayerView nunca se queda con el
        // gesto y el deslizamiento vertical sigue llegando al pager.
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    role = Role.Button,
                    onClickLabel = if (pausado) "Reproducir" else "Pausar",
                ) { pausado = !pausado }
                .semantics {
                    contentDescription = descripcion
                    stateDescription = if (pausado) "En pausa" else "Reproduciendo"
                },
        )

        if (activo && cargandoVideo && !errorVideo) {
            CircularProgressIndicator(
                color = Color.White,
                strokeWidth = 3.dp,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(40.dp)
                    .clearAndSetSemantics {},
            )
        }

        if (pausado && !errorVideo) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(FondoClips.copy(alpha = 0.45f))
                    .clearAndSetSemantics {},
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(40.dp))
            }
        }

        // Si el video no carga (red, formato), se avisa en vez de dejar el cuadro negro.
        if (errorVideo) {
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .clip(RoundedCornerShape(16.dp))
                    .background(FondoClips.copy(alpha = 0.75f))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    "No se pudo reproducir el video",
                    color = Color.White,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                )
                TextButton(
                    onClick = {
                        errorVideo = false
                        player.prepare()
                    },
                ) {
                    Text("Reintentar", color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

/** Ícono en círculo translúcido de 48 dp con su número o nombre debajo. */
@Composable
private fun AccionClip(
    icono: ImageVector,
    etiqueta: String,
    descripcion: String,
    onClick: () -> Unit,
    tinte: Color = Color.White,
    seleccionado: Boolean? = null,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .widthIn(min = 56.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .then(
                if (seleccionado != null) Modifier.semantics { selected = seleccionado } else Modifier,
            )
            .padding(vertical = 2.dp),
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(FondoClips.copy(alpha = 0.35f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icono, contentDescription = descripcion, tint = tinte, modifier = Modifier.size(26.dp))
        }
        // El número ya va en la descripción del ícono: TalkBack no lo repite.
        Text(
            etiqueta,
            color = Color.White,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                shadow = SombraTexto,
            ),
            maxLines = 1,
            modifier = Modifier.clearAndSetSemantics {},
        )
    }
}

/** Chip de comunidad sobre el video: ícono por tipo y nombre. */
@Composable
private fun ChipComunidadClip(comunidad: ComunidadDto) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color.White.copy(alpha = 0.16f))
            .padding(horizontal = 10.dp, vertical = 5.dp)
            .clearAndSetSemantics { contentDescription = "Comunidad: ${comunidad.nombre}" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            iconoComunidad(tipoComunidad(comunidad.slug)),
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(13.dp),
        )
        Text(
            comunidad.nombre,
            color = Color.White,
            style = MaterialTheme.typography.labelMedium.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/**
 * Avatar, nombre y antigüedad. Sin «Seguir»: `AutorDto` no dice si ya sigo a la persona
 * y un botón que no sabe su estado podría dejar de seguir sin querer.
 */
@Composable
private fun AutorClip(autor: AutorDto?, createdAt: String, onAutor: (String) -> Unit) {
    val nombre = autor?.nombre ?: "Cuenta eliminada"
    val handle = autor?.handle
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(14.dp))
            .then(
                if (handle != null) {
                    Modifier.clickable(
                        role = Role.Button,
                        onClickLabel = "Ver perfil de $nombre",
                    ) { onAutor(handle) }
                } else {
                    Modifier
                },
            )
            .padding(end = 6.dp),
    ) {
        AgoraAvatar(
            nombre = autor?.nombre,
            fotoUrl = autor?.fotoUrl,
            size = 40.dp,
            modifier = Modifier.border(2.dp, Color.White, RoundedCornerShape(40.dp * 0.34f)),
        )
        Column {
            Text(
                nombre,
                color = Color.White,
                style = MaterialTheme.typography.titleSmall.copy(
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    shadow = SombraTexto,
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                haceCuanto(createdAt),
                color = Color.White.copy(alpha = 0.78f),
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp, shadow = SombraTexto),
                maxLines = 1,
            )
        }
    }
}

/** Texto en dos líneas; un toque lo abre completo (con tope y desplazable para no tapar el video). */
@Composable
private fun TextoClip(id: String, texto: String) {
    var expandido by remember(id) { mutableStateOf(false) }
    var desborda by remember(id) { mutableStateOf(false) }
    val anotado = remember(texto) { resaltarHashtags(texto) }
    Text(
        text = anotado,
        color = Color.White,
        style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 21.sp, shadow = SombraTexto),
        maxLines = if (expandido) Int.MAX_VALUE else 2,
        overflow = TextOverflow.Ellipsis,
        onTextLayout = { resultado -> if (!expandido) desborda = resultado.hasVisualOverflow },
        modifier = Modifier
            .then(
                if (desborda || expandido) {
                    Modifier.clickable(
                        role = Role.Button,
                        onClickLabel = if (expandido) "Ver menos" else "Ver texto completo",
                    ) { expandido = !expandido }
                } else {
                    Modifier
                },
            )
            .then(
                if (expandido) {
                    Modifier
                        .heightIn(max = 240.dp)
                        .verticalScroll(rememberScrollState())
                } else {
                    Modifier
                },
            ),
    )
}

private val HASHTAG = Regex("#[\\p{L}\\p{N}_]{2,40}")

/** #hashtags en negritas. Sobre el video no hay naranja-tinta legible en el tema claro. */
private fun resaltarHashtags(texto: String): AnnotatedString = buildAnnotatedString {
    var ultimo = 0
    HASHTAG.findAll(texto).forEach { m ->
        if (m.range.first > ultimo) append(texto.substring(ultimo, m.range.first))
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(m.value) }
        ultimo = m.range.last + 1
    }
    if (ultimo < texto.length) append(texto.substring(ultimo))
}

/** URL del primer video de la publicación; null si no trae (no debería con `tipo=clips`). */
private fun PostDto.videoUrl(): String? = media.firstOrNull { it.esVideoMedia() }?.url

/** Conteo con la reacción [de] quitada y [a] puesta (cualquiera puede ser null). */
private fun ReaccionesDto.cambio(de: String?, a: String?): ReaccionesDto {
    var r = this
    if (de != null) r = r.mas(de, -1)
    if (a != null) r = r.mas(a, 1)
    return r
}

/** «86», «2.1 mil», «1.2 M», como en el mockup. */
private fun cifraCorta(n: Int): String = when {
    n < 1_000 -> n.toString()
    n < 1_000_000 -> "${conUnDecimal(n, 1_000)} mil"
    else -> "${conUnDecimal(n, 1_000_000)} M"
}

private fun conUnDecimal(n: Int, unidad: Int): String {
    val entero = n / unidad
    val decimal = (n % unidad) / (unidad / 10)
    return if (decimal == 0 || entero >= 100) "$entero" else "$entero.$decimal"
}

/** Número completo para TalkBack («2,100»). */
private fun cifraLarga(n: Int): String = "%,d".format(Locale("es", "MX"), n)
