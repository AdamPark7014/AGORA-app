package mx.agora.mobile.nativeapp.ui

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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.SmartDisplay
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.SmartDisplay
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
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
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.NotificacionesApi
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.ui.components.AvisoUdlap
import mx.agora.mobile.nativeapp.ui.components.EncabezadoPestana
import mx.agora.mobile.nativeapp.ui.components.diasParaConfirmarUdlap
import mx.agora.mobile.nativeapp.ui.navigation.PestanaBus
import mx.agora.mobile.nativeapp.ui.screens.CampusScreen
import mx.agora.mobile.nativeapp.ui.screens.ClipsScreen
import mx.agora.mobile.nativeapp.ui.screens.EventosScreen
import mx.agora.mobile.nativeapp.ui.screens.FeedScreen
import mx.agora.mobile.nativeapp.ui.screens.PublicarScreen
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraRadii
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics

/** Destino de la barra flotante del diseño D. */
private data class Destino(
    val etiqueta: String,
    val icono: ImageVector,
    val iconoActivo: ImageVector,
)

private val destinos = listOf(
    Destino("Inicio", Icons.Outlined.Home, Icons.Filled.Home),
    Destino("Clips", Icons.Outlined.SmartDisplay, Icons.Filled.SmartDisplay),
    Destino("Publicar", Icons.Filled.Add, Icons.Filled.Add),
    Destino("Eventos", Icons.Outlined.CalendarMonth, Icons.Filled.CalendarMonth),
    Destino("Campus: mercado, aventones y directorio", Icons.Outlined.GridView, Icons.Filled.GridView),
)

@Composable
fun MainShell(
    auth: AuthRepository,
    onLogout: () -> Unit,
    onNavigateToPost: (String) -> Unit = {},
    onNavigateToMensajes: () -> Unit = {},
    onNavigateToPerfil: (String) -> Unit = {},
    onNavigateToMiPerfil: () -> Unit = {},
    onNavigateToAvisos: () -> Unit = {},
    onNavigateToAjustes: () -> Unit = {},
    onNavigateToMas: () -> Unit = {},
    onNavigateToHashtag: (String) -> Unit = {},
    onNavigateToEvento: (String) -> Unit = {},
    onNavigateToCreateEvento: () -> Unit = {},
    onNavigateToMarketplace: () -> Unit = {},
    onNavigateToAventones: () -> Unit = {},
    onNavigateToDirectorio: () -> Unit = {},
    onNavigateToAnonimo: () -> Unit = {},
    onNavigateUrl: (String) -> Unit = {},
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
    var feedKey by remember { mutableIntStateOf(0) }
    var avisosSinLeer by remember { mutableIntStateOf(0) }
    var mensajesSinLeer by remember { mutableIntStateOf(0) }
    /** Sube cada vez que la pantalla vuelve al frente (app reanudada o regreso de otra ruta). */
    var reanudaciones by remember { mutableIntStateOf(0) }
    val haptics = rememberHaptics()
    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(pestanaSolicitada) {
        val pedida = pestanaSolicitada ?: return@LaunchedEffect
        if (pedida in destinos.indices) tab = pedida
        onPestanaAtendida()
    }

    // Atrás en cualquier otra pestaña vuelve al inicio; en el inicio sale de la app.
    BackHandler(enabled = tab != PestanaBus.FEED) {
        tab = PestanaBus.FEED
    }

    DisposableEffect(lifecycleOwner) {
        val observador = LifecycleEventObserver { _, evento ->
            if (evento == Lifecycle.Event.ON_RESUME) reanudaciones++
        }
        lifecycleOwner.lifecycle.addObserver(observador)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observador) }
    }

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

    // Los clips van a pantalla completa oscura: el fondo alrededor de la barra también.
    val enClips = tab == PestanaBus.CLIPS
    val fondo = if (enClips) Color(0xFF14110F) else AgoraColors.Fondo

    // Sobre el negro de los clips, la hora y la batería van en claro aunque el tema sea claro.
    val vista = LocalView.current
    val temaOscuro = AgoraColors.oscuro
    DisposableEffect(enClips, temaOscuro) {
        val ventana = (vista.context as? Activity)?.window
        val barras = ventana?.let { WindowCompat.getInsetsController(it, vista) }
        barras?.isAppearanceLightStatusBars = !enClips && !temaOscuro
        onDispose { barras?.isAppearanceLightStatusBars = !temaOscuro }
    }

    Scaffold(
        containerColor = fondo,
        bottomBar = {
            BarraFlotante(
                tab = tab,
                sobreOscuro = enClips,
                onTab = { index ->
                    if (tab != index) {
                        haptics.perform(HapticType.Light)
                        tab = index
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
                    PestanaBus.CLIPS -> ClipsScreen(
                        tokenProvider = { auth.token() },
                        onAuthorClick = onNavigateToPerfil,
                        onEventoClick = onNavigateToEvento,
                        onPostClick = onNavigateToPost,
                        onVolver = { tab = PestanaBus.FEED },
                    )
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
                        EncabezadoPestana("Eventos") {
                            BotonCrear(descripcion = "Crear evento", onClick = onNavigateToCreateEvento)
                        }
                        EventosScreen(
                            tokenProvider = { auth.token() },
                            onEventoClick = onNavigateToEvento,
                            onCrearClick = onNavigateToCreateEvento,
                        )
                    }
                    PestanaBus.CAMPUS -> Column {
                        EncabezadoPestana("Campus")
                        CampusScreen(
                            onMarketplace = onNavigateToMarketplace,
                            onAventones = onNavigateToAventones,
                            onDirectorio = onNavigateToDirectorio,
                            onAnonimo = onNavigateToAnonimo,
                            onMas = onNavigateToMas,
                        )
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
                            onPostClick = onNavigateToPost,
                            onHashtagClick = onNavigateToHashtag,
                            onAuthorClick = onNavigateToPerfil,
                            onEventoClick = onNavigateToEvento,
                            mensajesSinLeer = mensajesSinLeer,
                            avisosSinLeer = avisosSinLeer,
                            onMensajes = onNavigateToMensajes,
                            onAvisos = {
                                avisosSinLeer = 0
                                onNavigateToAvisos()
                            },
                            onMiPerfil = onNavigateToMiPerfil,
                            onVerClips = { tab = PestanaBus.CLIPS },
                            onAventones = onNavigateToAventones,
                        )
                    }
                }
            }
        }
    }
}

/** «+» del encabezado de una pestaña (crear evento): cuadrado de 44 con borde, como los del inicio. */
@Composable
private fun BotonCrear(descripcion: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, RoundedCornerShape(14.dp))
            .semantics { contentDescription = descripcion }
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Filled.Add, contentDescription = null, tint = AgoraColors.Texto, modifier = Modifier.size(22.dp))
    }
}

/**
 * Barra de navegación flotante del diseño D: píldora `oscuro` con márgenes de 14,
 * cinco destinos y Publicar como botón naranja. Solo íconos; el nombre lo lee TalkBack.
 */
@Composable
private fun BarraFlotante(tab: Int, sobreOscuro: Boolean, onTab: (Int) -> Unit) {
    // Sobre el negro de los clips la píldora `oscuro` desaparecería: se aclara un
    // tono y lleva un filo tenue para que se lea como barra.
    val forma = RoundedCornerShape(AgoraRadii.Barra)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(start = 14.dp, end = 14.dp, top = 8.dp, bottom = 10.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(forma)
                .background(if (sobreOscuro) Color(0xFF2B2622) else AgoraColors.Oscuro)
                .then(if (sobreOscuro) Modifier.border(1.dp, Color.White.copy(alpha = 0.10f), forma) else Modifier)
                .padding(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            destinos.forEachIndexed { index, destino ->
                val activo = tab == index
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .semantics {
                            role = Role.Tab
                            selected = activo
                            contentDescription = destino.etiqueta
                        }
                        .clip(RoundedCornerShape(18.dp))
                        .then(
                            if (activo && index != PestanaBus.PUBLICAR) {
                                Modifier.background(Color.White.copy(alpha = 0.12f))
                            } else {
                                Modifier
                            },
                        )
                        .clickable { onTab(index) },
                    contentAlignment = Alignment.Center,
                ) {
                    if (index == PestanaBus.PUBLICAR) {
                        Box(
                            modifier = Modifier
                                .width(52.dp)
                                .height(48.dp)
                                .clip(RoundedCornerShape(18.dp))
                                .background(AgoraColors.Naranja),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(destino.icono, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                        }
                    } else {
                        Icon(
                            if (activo) destino.iconoActivo else destino.icono,
                            contentDescription = null,
                            tint = if (activo) Color.White else Color(0xFFBDB6AD),
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }
            }
        }
    }
}
