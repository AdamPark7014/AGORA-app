package mx.agora.mobile.nativeapp.ui

import mx.agora.mobile.nativeapp.ui.components.BotonCabeza
import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.NotificacionesApi
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import mx.agora.mobile.nativeapp.ui.components.AvisoUdlap
import mx.agora.mobile.nativeapp.ui.components.EncabezadoPestana
import mx.agora.mobile.nativeapp.ui.components.Terrazas
import mx.agora.mobile.nativeapp.ui.components.diasParaConfirmarUdlap
import mx.agora.mobile.nativeapp.ui.navigation.PestanaBus
import mx.agora.mobile.nativeapp.ui.screens.ClipsScreen
import mx.agora.mobile.nativeapp.ui.screens.EventosScreen
import mx.agora.mobile.nativeapp.ui.screens.FeedScreen
import mx.agora.mobile.nativeapp.ui.screens.MarketplaceListScreen
import mx.agora.mobile.nativeapp.ui.screens.PerfilAjenoScreen
import mx.agora.mobile.nativeapp.ui.screens.PublicarScreen
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics

/** Destino de la barra del Feed B. */
private data class Destino(
    val etiqueta: String,
    val icono: ImageVector,
    val iconoActivo: ImageVector,
)

/** Inicio, Eventos, Publicar, Mercado y Tu perfil (artboard FeedB, docs/diseno-d.md §0). */
private val destinos = listOf(
    Destino("Inicio", Icons.Outlined.Home, Icons.Filled.Home),
    Destino("Eventos", Icons.Outlined.CalendarMonth, Icons.Filled.CalendarMonth),
    Destino("Publicar", Icons.Filled.Add, Icons.Filled.Add),
    Destino("Mercado", Icons.Outlined.ShoppingBag, Icons.Filled.ShoppingBag),
    // Va tu foto en vez del ícono (BarraFeedB); este solo es el de reserva.
    Destino("Tu perfil", Icons.Outlined.AccountCircle, Icons.Filled.AccountCircle),
)

/** Los clips van a pantalla completa sobre un negro cálido (el `oscuro` de la D). */
private val FondoClips = Color(0xFF14110F)

@Composable
fun MainShell(
    auth: AuthRepository,
    onLogout: () -> Unit,
    onNavigateToPost: (String) -> Unit = {},
    onNavigateToMensajes: () -> Unit = {},
    onNavigateToMensaje: (String) -> Unit = {},
    onNavigateToPerfil: (String) -> Unit = {},
    onNavigateToAvisos: () -> Unit = {},
    onNavigateToAjustes: () -> Unit = {},
    onNavigateToCampus: () -> Unit = {},
    onNavigateToConexiones: (handle: String, tipo: String) -> Unit = { _, _ -> },
    onNavigateToHashtag: (String) -> Unit = {},
    onNavigateToEvento: (String) -> Unit = {},
    onNavigateToCreateEvento: () -> Unit = {},
    onNavigateToAnuncio: (String) -> Unit = {},
    onNavigateToCrearAnuncio: () -> Unit = {},
    onNavigateToReglas: () -> Unit = {},
    /** `auth/yo` cuando la cuenta aún debe confirmar la UDLAP (dentro del plazo); null si no. */
    avisoUdlap: YoResponse? = null,
    onConfirmarUdlap: () -> Unit = {},
    /** Pestaña pedida desde fuera ([PestanaBus], p. ej. el deep link `/eventos`); null si ninguna. */
    pestanaSolicitada: Int? = null,
    /** Se aplicó [pestanaSolicitada]: hay que limpiarla para no repetirla. */
    onPestanaAtendida: () -> Unit = {},
) {
    // Saveable: al volver de otra ruta o tras recrear la Activity (cambio de
    // tema, rotación) se sigue en la misma pestaña en vez de saltar al inicio.
    var tab by rememberSaveable { mutableIntStateOf(PestanaBus.FEED) }
    /** Clips a pantalla completa (se abren desde las historias del inicio). */
    var clipsAbiertos by rememberSaveable { mutableStateOf(false) }
    var clipInicial by rememberSaveable { mutableStateOf<String?>(null) }
    var feedKey by remember { mutableIntStateOf(0) }
    /** Sube al volver a tocar Inicio estando en Inicio: la lista regresa arriba. */
    var irArriba by remember { mutableIntStateOf(0) }
    var avisosSinLeer by remember { mutableIntStateOf(0) }
    var mensajesSinLeer by remember { mutableIntStateOf(0) }
    var yo by remember { mutableStateOf<YoResponse?>(null) }
    /** Sube cada vez que la pantalla vuelve al frente (app reanudada o regreso de otra ruta). */
    var reanudaciones by remember { mutableIntStateOf(0) }
    val haptics = rememberHaptics()
    val lifecycleOwner = LocalLifecycleOwner.current
    val miHandle = remember { auth.loadSession()?.handle }

    LaunchedEffect(pestanaSolicitada) {
        val pedida = pestanaSolicitada ?: return@LaunchedEffect
        if (pedida in destinos.indices) {
            tab = pedida
            clipsAbiertos = false
        }
        onPestanaAtendida()
    }

    // Atrás: cierra los clips; en otra pestaña vuelve al inicio; en el inicio sale de la app.
    BackHandler(enabled = clipsAbiertos || tab != PestanaBus.FEED) {
        if (clipsAbiertos) clipsAbiertos = false else tab = PestanaBus.FEED
    }

    DisposableEffect(lifecycleOwner) {
        val observador = LifecycleEventObserver { _, evento ->
            if (evento == Lifecycle.Event.ON_RESUME) reanudaciones++
        }
        lifecycleOwner.lifecycle.addObserver(observador)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observador) }
    }

    // Tu foto va en la barra (pestaña Tu perfil).
    LaunchedEffect(Unit) { yo = YoCache.obtener { auth.token() } }

    // Mensajes y avisos sin leer: los dice el encabezado de Inicio.
    LaunchedEffect(reanudaciones) {
        mensajesSinLeer = withContext(Dispatchers.IO) {
            runCatching {
                ApiClient.api<MensajesApi> { auth.token() }.noLeidos().total
            }.getOrDefault(0)
        }
        avisosSinLeer = withContext(Dispatchers.IO) {
            runCatching {
                ApiClient.api<NotificacionesApi> { auth.token() }.sinLeer().total
            }.getOrDefault(0)
        }
    }

    // Sobre el negro de los clips, la hora y la batería van en claro aunque el tema sea claro.
    val vista = LocalView.current
    val temaOscuro = AgoraColors.oscuro
    DisposableEffect(clipsAbiertos, temaOscuro) {
        val ventana = (vista.context as? Activity)?.window
        val barras = ventana?.let { WindowCompat.getInsetsController(it, vista) }
        barras?.isAppearanceLightStatusBars = !clipsAbiertos && !temaOscuro
        onDispose { barras?.isAppearanceLightStatusBars = !temaOscuro }
    }

    if (clipsAbiertos) {
        Box(
            Modifier
                .fillMaxSize()
                .background(FondoClips),
        ) {
            ClipsScreen(
                tokenProvider = { auth.token() },
                onAuthorClick = onNavigateToPerfil,
                onEventoClick = onNavigateToEvento,
                onPostClick = onNavigateToPost,
                onVolver = { clipsAbiertos = false },
                clipInicial = clipInicial,
            )
        }
        return
    }

    // El inicio es blanco (Feed B); las demás pestañas siguen con el fondo cálido de la D.
    val fondo = if (tab == PestanaBus.FEED) AgoraColors.FondoFeed else AgoraColors.Fondo

    Scaffold(
        containerColor = fondo,
        bottomBar = {
            BarraFeedB(
                tab = tab,
                nombre = yo?.nombre ?: yo?.handle,
                fotoUrl = yo?.fotoUrl,
                onTab = { index ->
                    if (tab != index) {
                        haptics.perform(HapticType.Light)
                        tab = index
                    } else if (index == PestanaBus.FEED) {
                        irArriba++
                    }
                },
            )
        },
    ) { padding ->
        // consumeWindowInsets: las pantallas con imePadding (Publicar) ya no
        // vuelven a sumar la barra que este Scaffold descontó.
        Column(
            Modifier
                .padding(padding)
                .consumeWindowInsets(padding),
        ) {
            AnimatedContent(
                modifier = Modifier.weight(1f),
                targetState = tab,
                transitionSpec = {
                    fadeIn(animationSpec = tween(150)) togetherWith fadeOut(animationSpec = tween(150))
                },
                label = "tabContent",
            ) { actual ->
                when (actual) {
                    PestanaBus.PUBLICAR -> Column {
                        EncabezadoPestana("Publicar")
                        key(feedKey) {
                            PublicarScreen(
                                tokenProvider = { auth.token() },
                                onPublicado = {
                                    feedKey++
                                    tab = PestanaBus.FEED
                                },
                            )
                        }
                    }
                    PestanaBus.EVENTOS -> Column {
                        // «Cartelera» trae su propio encabezado (B «Cholula»).
                        EventosScreen(
                            tokenProvider = { auth.token() },
                            onEventoClick = onNavigateToEvento,
                            onCrearClick = onNavigateToCreateEvento,
                        )
                    }
                    PestanaBus.MERCADO -> Column {
                        EncabezadoPestana("Mercado", subtitulo = "El tianguis del campus") {
                            BotonCabeza("Vender", onClick = onNavigateToCrearAnuncio, descripcion = "Vender algo")
                        }
                        MarketplaceListScreen(
                            tokenProvider = { auth.token() },
                            onAnuncioClick = onNavigateToAnuncio,
                            onCrearClick = onNavigateToCrearAnuncio,
                            onConsejosClick = onNavigateToReglas,
                        )
                    }
                    PestanaBus.PERFIL -> {
                        val handle = miHandle ?: yo?.handle
                        if (handle != null) {
                            PerfilAjenoScreen(
                                handle = handle,
                                tokenProvider = { auth.token() },
                                miHandle = handle,
                                onBack = { tab = PestanaBus.FEED },
                                onMensaje = onNavigateToMensaje,
                                onAjustes = onNavigateToAjustes,
                                onConexiones = { tipo -> onNavigateToConexiones(handle, tipo) },
                                onPublicacion = onNavigateToPost,
                                onCampus = onNavigateToCampus,
                            )
                        }
                    }
                    else -> Column {
                        // Arriba del feed y fuera de su lista: el feed calcula el video
                        // activo por la posición de sus filas.
                        if (avisoUdlap != null) {
                            AvisoUdlap(
                                dias = avisoUdlap.diasParaConfirmarUdlap(),
                                onConfirmar = onConfirmarUdlap,
                                modifier = Modifier.padding(start = 12.dp, end = 12.dp, top = 8.dp),
                            )
                        }
                        FeedScreen(
                            tokenProvider = { auth.token() },
                            reloadKey = feedKey,
                            irArriba = irArriba,
                            onPostClick = onNavigateToPost,
                            onHashtagClick = onNavigateToHashtag,
                            onAuthorClick = onNavigateToPerfil,
                            mensajesSinLeer = mensajesSinLeer,
                            avisosSinLeer = avisosSinLeer,
                            onMensajes = onNavigateToMensajes,
                            onAvisos = {
                                avisosSinLeer = 0
                                onNavigateToAvisos()
                            },
                            onClip = { id ->
                                clipInicial = id
                                clipsAbiertos = true
                            },
                            onPublicar = { tab = PestanaBus.PUBLICAR },
                            onCrearEvento = onNavigateToCreateEvento,
                        )
                    }
                }
            }
        }
    }
}

/**
 * Barra del Feed B con la capa B «Cholula» (docs/diseno-cholula.md §3): cantera con un filo
 * arriba, cinco destinos, Publicar como rectángulo relleno y la pestaña activa marcada con las
 * terrazas de la pirámide. Solo íconos; el nombre lo lee TalkBack. Paridad con iOS.
 */
@Composable
private fun BarraFeedB(
    tab: Int,
    nombre: String?,
    fotoUrl: String?,
    onTab: (Int) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(AgoraColors.FondoFeed),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(AgoraColors.BordeFeed),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            destinos.forEachIndexed { index, destino ->
                val activo = tab == index
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { onTab(index) }
                        .clearAndSetSemantics {
                            role = Role.Tab
                            selected = activo
                            contentDescription = destino.etiqueta
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    when (index) {
                        PestanaBus.PUBLICAR -> Box(
                            modifier = Modifier
                                .width(52.dp)
                                .height(38.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(AgoraColors.Boton),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(destino.icono, contentDescription = null, tint = AgoraColors.SobreBoton, modifier = Modifier.size(24.dp))
                        }
                        PestanaBus.PERFIL -> Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .then(
                                    if (activo) Modifier.border(2.dp, AgoraColors.TintaFeed, CircleShape) else Modifier,
                                )
                                .padding(2.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            AgoraAvatar(nombre = nombre, fotoUrl = fotoUrl, size = 28.dp, circular = true)
                        }
                        else -> Icon(
                            if (activo) destino.iconoActivo else destino.icono,
                            contentDescription = null,
                            tint = AgoraColors.TintaFeed,
                            modifier = Modifier.size(26.dp),
                        )
                    }
                    if (activo && index != PestanaBus.PUBLICAR) {
                        Terrazas(
                            color = AgoraColors.Naranja,
                            niveles = 2,
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(bottom = 2.dp)
                                .width(22.dp)
                                .height(6.dp),
                        )
                    }
                }
            }
        }
    }
}
