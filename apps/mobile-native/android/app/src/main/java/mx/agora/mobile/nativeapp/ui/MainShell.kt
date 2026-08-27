package mx.agora.mobile.nativeapp.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.NotificacionesApi
import mx.agora.mobile.nativeapp.ui.screens.EventosScreen
import mx.agora.mobile.nativeapp.ui.screens.FeedScreen
import mx.agora.mobile.nativeapp.ui.screens.NotificacionesScreen
import mx.agora.mobile.nativeapp.ui.screens.PublicarScreen
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics

private data class Tab(
    val label: String,
    val icon: @Composable (badge: Int, scale: Float, badgeScale: Float) -> Unit,
)

@Composable
fun MainShell(
    auth: AuthRepository,
    onLogout: () -> Unit,
    onNavigateToPost: (String) -> Unit = {},
    onNavigateToMensajes: () -> Unit = {},
    onNavigateToPerfil: (String) -> Unit = {},
    onNavigateToAjustes: () -> Unit = {},
    onNavigateToMas: () -> Unit = {},
    onNavigateToHashtag: (String) -> Unit = {},
    onNavigateToEvento: (String) -> Unit = {},
    onNavigateToCreateEvento: () -> Unit = {},
    onNavigateUrl: (String) -> Unit = {},
) {
    var tab by remember { mutableIntStateOf(0) }
    var feedKey by remember { mutableIntStateOf(0) }
    var avisosSinLeer by remember { mutableIntStateOf(0) }
    var prevAvisosSinLeer by remember { mutableIntStateOf(0) }
    var badgePulse by remember { mutableIntStateOf(0) }
    val haptics = rememberHaptics()

    LaunchedEffect(tab) {
        if (tab == 3) {
            avisosSinLeer = 0
            prevAvisosSinLeer = 0
        } else {
            val total = withContext(Dispatchers.IO) {
                runCatching {
                    ApiClient.api<NotificacionesApi> { auth.token() }.sinLeer().total
                }.getOrDefault(0)
            }
            avisosSinLeer = total
        }
    }

    LaunchedEffect(avisosSinLeer) {
        if (avisosSinLeer > prevAvisosSinLeer && tab != 3) {
            badgePulse++
        }
        prevAvisosSinLeer = avisosSinLeer
    }

    val tabs = listOf(
        Tab("Feed") { _, scale, _ ->
            Icon(Icons.Filled.Home, contentDescription = null, modifier = Modifier.scale(scale))
        },
        Tab("Eventos") { _, scale, _ ->
            Icon(Icons.Outlined.Event, contentDescription = null, modifier = Modifier.scale(scale))
        },
        Tab("Publicar") { _, scale, _ ->
            Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.scale(scale))
        },
        Tab("Avisos") { badge, scale, badgeScale ->
            if (badge > 0) {
                BadgedBox(
                    badge = {
                        Badge(
                            modifier = Modifier.graphicsLayer {
                                scaleX = badgeScale
                                scaleY = badgeScale
                            },
                        ) {
                            Text(if (badge > 9) "9+" else badge.toString())
                        }
                    },
                ) {
                    Icon(Icons.Filled.Notifications, contentDescription = null, modifier = Modifier.scale(scale))
                }
            } else {
                Icon(Icons.Filled.Notifications, contentDescription = null, modifier = Modifier.scale(scale))
            }
        },
        Tab("Más") { _, scale, _ ->
            Icon(Icons.Outlined.Menu, contentDescription = null, modifier = Modifier.scale(scale))
        },
    )

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = AgoraColors.Superficie) {
                tabs.forEachIndexed { index, item ->
                    val selected = tab == index
                    val iconScale = remember { Animatable(1f) }

                    LaunchedEffect(tab) {
                        if (selected) {
                            iconScale.snapTo(1f)
                            iconScale.animateTo(
                                1.15f,
                                spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessMedium,
                                ),
                            )
                            iconScale.animateTo(
                                1f,
                                spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessLow,
                                ),
                            )
                        }
                    }

                    val badgeScale by animateFloatAsState(
                        targetValue = if (index == 3 && badgePulse > 0) 1.25f else 1f,
                        animationSpec = spring(
                            dampingRatio = Spring.DampingRatioMediumBouncy,
                            stiffness = Spring.StiffnessMedium,
                        ),
                        label = "badgePulse",
                        finishedListener = {
                            if (index == 3 && badgePulse > 0) badgePulse = 0
                        },
                    )

                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            if (index == 4) {
                                onNavigateToMas()
                            } else if (tab != index) {
                                haptics.perform(HapticType.Light)
                                tab = index
                            }
                        },
                        icon = {
                            item.icon(
                                if (index == 3) avisosSinLeer else 0,
                                iconScale.value,
                                badgeScale,
                            )
                        },
                        label = { Text(item.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AgoraColors.Naranja,
                            selectedTextColor = AgoraColors.Naranja,
                            indicatorColor = AgoraColors.NaranjaSuave,
                        ),
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            AnimatedContent(
                targetState = tab,
                transitionSpec = {
                    fadeIn(animationSpec = tween(150)) togetherWith fadeOut(animationSpec = tween(150))
                },
                label = "tabContent",
            ) { currentTab ->
                when (currentTab) {
                    0 -> FeedScreen(
                        tokenProvider = { auth.token() },
                        reloadKey = feedKey,
                        onPostClick = onNavigateToPost,
                        onHashtagClick = onNavigateToHashtag,
                        onAuthorClick = onNavigateToPerfil,
                        onEventoClick = onNavigateToEvento,
                    )
                    1 -> EventosScreen(
                        tokenProvider = { auth.token() },
                        onEventoClick = onNavigateToEvento,
                        onCrearClick = onNavigateToCreateEvento,
                    )
                    2 -> key(feedKey) {
                        PublicarScreen(
                            tokenProvider = { auth.token() },
                            onPublicado = {
                                feedKey++
                                tab = 0
                            },
                        )
                    }
                    3 -> NotificacionesScreen(
                        tokenProvider = { auth.token() },
                        onNavigateUrl = onNavigateUrl,
                    )
                    else -> FeedScreen(
                        tokenProvider = { auth.token() },
                        reloadKey = feedKey,
                        onPostClick = onNavigateToPost,
                        onHashtagClick = onNavigateToHashtag,
                        onAuthorClick = onNavigateToPerfil,
                        onEventoClick = onNavigateToEvento,
                    )
                }
            }
        }
    }
}
