package mx.agora.mobile.nativeapp.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.ui.MainShell
import mx.agora.mobile.nativeapp.ui.screens.AjustesScreen
import mx.agora.mobile.nativeapp.ui.screens.AnonimoScreen
import mx.agora.mobile.nativeapp.ui.screens.AventonesScreen
import mx.agora.mobile.nativeapp.ui.screens.BuscarScreen
import mx.agora.mobile.nativeapp.ui.screens.CreateAnuncioScreen
import mx.agora.mobile.nativeapp.ui.screens.CreateEventoScreen
import mx.agora.mobile.nativeapp.ui.screens.DirectorioScreen
import mx.agora.mobile.nativeapp.ui.screens.EventoDetalleScreen
import mx.agora.mobile.nativeapp.ui.screens.GuardadosScreen
import mx.agora.mobile.nativeapp.ui.screens.HashtagScreen
import mx.agora.mobile.nativeapp.ui.screens.MasScreen
import mx.agora.mobile.nativeapp.ui.screens.MarketplaceDetailScreen
import mx.agora.mobile.nativeapp.ui.screens.MarketplaceListScreen
import mx.agora.mobile.nativeapp.ui.screens.MensajeDetalleScreen
import mx.agora.mobile.nativeapp.ui.screens.MensajesListScreen
import mx.agora.mobile.nativeapp.ui.screens.ModeracionScreen
import mx.agora.mobile.nativeapp.ui.screens.NotificacionesScreen
import mx.agora.mobile.nativeapp.ui.screens.PerfilAjenoScreen
import mx.agora.mobile.nativeapp.ui.screens.PostDetailScreen
import mx.agora.mobile.nativeapp.ui.screens.ProfileScreen
import mx.agora.mobile.nativeapp.ui.screens.PrivacidadScreen
import mx.agora.mobile.nativeapp.ui.screens.TerminosScreen

object AgoraRoutes {
    const val MAIN = "main"
    const val POST = "post/{id}"
    const val MENSAJES = "mensajes"
    const val MENSAJE = "mensaje/{id}"
    const val PERFIL = "perfil/{handle}"
    const val PERFIL_YO = "perfil-yo"
    const val BUSCAR = "buscar"
    const val AJUSTES = "ajustes"
    const val TERMINOS = "terminos"
    const val PRIVACIDAD = "privacidad"
    const val MODERACION = "moderacion"
    const val MAS = "mas"
    const val DIRECTORIO = "directorio"
    const val GUARDADOS = "guardados"
    const val HASHTAG = "hashtag/{tag}"
    const val MARKETPLACE = "marketplace"
    const val MARKETPLACE_CREAR = "marketplace/crear"
    const val MARKETPLACE_DETALLE = "marketplace/{id}"
    const val AVENTONES = "aventones"
    const val ANONIMO = "anonimo"
    const val NOTIFICACIONES = "notificaciones"
    const val EVENTO = "evento/{id}"
    const val EVENTOS_CREAR = "eventos/crear"

    fun post(id: String) = "post/$id"
    fun mensaje(id: String) = "mensaje/$id"
    fun perfil(handle: String) = "perfil/$handle"
    fun hashtag(tag: String) = "hashtag/${java.net.URLEncoder.encode(tag, Charsets.UTF_8)}"
    fun marketplaceDetalle(id: String) = "marketplace/$id"
    fun evento(id: String) = "evento/$id"
}

@Composable
fun AgoraNavHost(
    auth: AuthRepository,
    onLogout: () -> Unit,
    navController: NavHostController = rememberNavController(),
) {
    val pendingDeepLink by DeepLinkBus.pendingRoute.collectAsState()
    LaunchedEffect(pendingDeepLink) {
        val route = pendingDeepLink
        if (route != null) {
            navigateToDeepLinkRoute(navController, route)
            DeepLinkBus.consume()
        }
    }

    NavHost(
        navController = navController,
        startDestination = AgoraRoutes.MAIN,
    ) {
        composable(AgoraRoutes.MAIN) {
            MainShell(
                auth = auth,
                onLogout = onLogout,
                onNavigateToPost = { id -> navController.navigate(AgoraRoutes.post(id)) },
                onNavigateToMensajes = { navController.navigate(AgoraRoutes.MENSAJES) },
                onNavigateToPerfil = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                onNavigateToMas = { navController.navigate(AgoraRoutes.MAS) },
                onNavigateToHashtag = { tag -> navController.navigate(AgoraRoutes.hashtag(tag)) },
                onNavigateToEvento = { id -> navController.navigate(AgoraRoutes.evento(id)) },
                onNavigateToCreateEvento = { navController.navigate(AgoraRoutes.EVENTOS_CREAR) },
                onNavigateUrl = { url ->
                    DeepLinkParser.parse(url)?.let { navigateToDeepLinkRoute(navController, it) }
                },
            )
        }

        composable(
            route = AgoraRoutes.POST,
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { entry ->
            val id = entry.arguments?.getString("id") ?: return@composable
            PostDetailScreen(
                postId = id,
                tokenProvider = { auth.token() },
                miHandle = auth.loadSession()?.handle,
                onBack = { navController.popBackStack() },
                onDeleted = { navController.popBackStack() },
                onHashtagClick = { tag -> navController.navigate(AgoraRoutes.hashtag(tag)) },
            )
        }

        composable(AgoraRoutes.MENSAJES) {
            SecondaryScaffold(title = "Mensajes", onBack = { navController.popBackStack() }) { padding ->
                MensajesListScreen(
                    tokenProvider = { auth.token() },
                    onConversacionClick = { id -> navController.navigate(AgoraRoutes.mensaje(id)) },
                    onBuscar = { navController.navigate(AgoraRoutes.BUSCAR) },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(
            route = AgoraRoutes.MENSAJE,
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { entry ->
            val id = entry.arguments?.getString("id") ?: return@composable
            MensajeDetalleScreen(
                conversacionId = id,
                tokenProvider = { auth.token() },
                onBack = { navController.popBackStack() },
                onPerfilClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
            )
        }

        composable(
            route = AgoraRoutes.PERFIL,
            arguments = listOf(navArgument("handle") { type = NavType.StringType }),
        ) { entry ->
            val handle = entry.arguments?.getString("handle") ?: return@composable
            PerfilAjenoScreen(
                handle = handle,
                tokenProvider = { auth.token() },
                miHandle = auth.loadSession()?.handle,
                onBack = { navController.popBackStack() },
                onMensaje = { conversacionId -> navController.navigate(AgoraRoutes.mensaje(conversacionId)) },
                onAjustes = { navController.navigate(AgoraRoutes.AJUSTES) },
            )
        }

        composable(AgoraRoutes.PERFIL_YO) {
            SecondaryScaffold(title = "Yo", onBack = { navController.popBackStack() }) { _ ->
                ProfileScreen(
                    auth = auth,
                    onLogout = {
                        auth.logout()
                        onLogout()
                    },
                    onMensajes = { navController.navigate(AgoraRoutes.MENSAJES) },
                    onAjustes = { navController.navigate(AgoraRoutes.AJUSTES) },
                    onMarketplace = { navController.navigate(AgoraRoutes.MARKETPLACE) },
                    onAventones = { navController.navigate(AgoraRoutes.AVENTONES) },
                    onAnonimo = { navController.navigate(AgoraRoutes.ANONIMO) },
                )
            }
        }

        composable(AgoraRoutes.BUSCAR) {
            SecondaryScaffold(title = "Buscar", onBack = { navController.popBackStack() }) { padding ->
                BuscarScreen(
                    tokenProvider = { auth.token() },
                    modifier = Modifier.padding(padding),
                    onPerfil = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                    onPublicacion = { id -> navController.navigate(AgoraRoutes.post(id)) },
                    onEvento = { id -> navController.navigate(AgoraRoutes.evento(id)) },
                    onAnuncio = { id -> navController.navigate(AgoraRoutes.marketplaceDetalle(id)) },
                )
            }
        }

        composable(AgoraRoutes.MAS) {
            SecondaryScaffold(title = "Más", onBack = { navController.popBackStack() }) { padding ->
                MasScreen(
                    auth = auth,
                    modifier = Modifier.padding(padding),
                    onNavigate = { route ->
                        when (route) {
                            "buscar" -> navController.navigate(AgoraRoutes.BUSCAR)
                            "guardados" -> navController.navigate(AgoraRoutes.GUARDADOS)
                            "notificaciones" -> navController.navigate(AgoraRoutes.NOTIFICACIONES)
                            "mensajes" -> navController.navigate(AgoraRoutes.MENSAJES)
                            "marketplace" -> navController.navigate(AgoraRoutes.MARKETPLACE)
                            "aventones" -> navController.navigate(AgoraRoutes.AVENTONES)
                            "anonimo" -> navController.navigate(AgoraRoutes.ANONIMO)
                            "directorio" -> navController.navigate(AgoraRoutes.DIRECTORIO)
                            "ajustes" -> navController.navigate(AgoraRoutes.AJUSTES)
                            "perfil-yo" -> navController.navigate(AgoraRoutes.PERFIL_YO)
                            else -> if (route.startsWith("perfil/")) navController.navigate(route)
                        }
                    },
                    onTerminos = { navController.navigate(AgoraRoutes.TERMINOS) },
                    onPrivacidad = { navController.navigate(AgoraRoutes.PRIVACIDAD) },
                    onLogout = {
                        auth.logout()
                        onLogout()
                    },
                )
            }
        }

        composable(AgoraRoutes.DIRECTORIO) {
            SecondaryScaffold(title = "Directorio", onBack = { navController.popBackStack() }) { padding ->
                DirectorioScreen(
                    tokenProvider = { auth.token() },
                    modifier = Modifier.padding(padding),
                    onPerfil = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                )
            }
        }

        composable(AgoraRoutes.GUARDADOS) {
            SecondaryScaffold(title = "Guardados", onBack = { navController.popBackStack() }) { padding ->
                GuardadosScreen(
                    tokenProvider = { auth.token() },
                    modifier = Modifier.padding(padding),
                    onPublicacion = { id -> navController.navigate(AgoraRoutes.post(id)) },
                    onHashtagClick = { tag -> navController.navigate(AgoraRoutes.hashtag(tag)) },
                    onAuthorClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                )
            }
        }

        composable(
            route = AgoraRoutes.HASHTAG,
            arguments = listOf(navArgument("tag") { type = NavType.StringType }),
        ) { entry ->
            val tag = java.net.URLDecoder.decode(entry.arguments?.getString("tag") ?: "", Charsets.UTF_8)
            SecondaryScaffold(title = "#$tag", onBack = { navController.popBackStack() }) { padding ->
                HashtagScreen(
                    tag = tag,
                    tokenProvider = { auth.token() },
                    modifier = Modifier.padding(padding),
                    onPublicacion = { id -> navController.navigate(AgoraRoutes.post(id)) },
                    onHashtagClick = { t -> navController.navigate(AgoraRoutes.hashtag(t)) },
                    onAuthorClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                )
            }
        }

        composable(AgoraRoutes.NOTIFICACIONES) {
            SecondaryScaffold(title = "Notificaciones", onBack = { navController.popBackStack() }) { padding ->
                NotificacionesScreen(
                    tokenProvider = { auth.token() },
                    onNavigateUrl = { url ->
                        DeepLinkParser.parse(url)?.let { navigateToDeepLinkRoute(navController, it) }
                    },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(AgoraRoutes.MARKETPLACE) {
            SecondaryScaffold(title = "Marketplace", onBack = { navController.popBackStack() }) { padding ->
                MarketplaceListScreen(
                    tokenProvider = { auth.token() },
                    onAnuncioClick = { id -> navController.navigate(AgoraRoutes.marketplaceDetalle(id)) },
                    onCrearClick = { navController.navigate(AgoraRoutes.MARKETPLACE_CREAR) },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(AgoraRoutes.MARKETPLACE_CREAR) {
            SecondaryScaffold(title = "Vender", onBack = { navController.popBackStack() }) { padding ->
                CreateAnuncioScreen(
                    tokenProvider = { auth.token() },
                    onCreado = { id ->
                        navController.popBackStack()
                        navController.navigate(AgoraRoutes.marketplaceDetalle(id))
                    },
                    onCancelar = { navController.popBackStack() },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(
            route = AgoraRoutes.MARKETPLACE_DETALLE,
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { entry ->
            val id = entry.arguments?.getString("id") ?: return@composable
            SecondaryScaffold(title = "Anuncio", onBack = { navController.popBackStack() }) { padding ->
                MarketplaceDetailScreen(
                    anuncioId = id,
                    tokenProvider = { auth.token() },
                    onPerfilClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                    onMensajeClick = { conversacionId -> navController.navigate(AgoraRoutes.mensaje(conversacionId)) },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(AgoraRoutes.AVENTONES) {
            SecondaryScaffold(title = "Aventones", onBack = { navController.popBackStack() }) { padding ->
                AventonesScreen(
                    tokenProvider = { auth.token() },
                    onPerfilClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(AgoraRoutes.ANONIMO) {
            SecondaryScaffold(title = "Sin nombre", onBack = { navController.popBackStack() }) { padding ->
                AnonimoScreen(
                    tokenProvider = { auth.token() },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(AgoraRoutes.AJUSTES) {
            SecondaryScaffold(title = "Ajustes", onBack = { navController.popBackStack() }) { padding ->
                AjustesScreen(auth = auth, modifier = Modifier.padding(padding))
            }
        }

        composable(AgoraRoutes.TERMINOS) {
            TerminosScreen(onBack = { navController.popBackStack() })
        }

        composable(AgoraRoutes.PRIVACIDAD) {
            PrivacidadScreen(onBack = { navController.popBackStack() })
        }

        composable(AgoraRoutes.MODERACION) {
            ModeracionScreen(
                tokenProvider = { auth.token() },
                onBack = { navController.popBackStack() },
            )
        }

        composable(AgoraRoutes.EVENTOS_CREAR) {
            SecondaryScaffold(title = "Nuevo evento", onBack = { navController.popBackStack() }) { padding ->
                CreateEventoScreen(
                    tokenProvider = { auth.token() },
                    onCreado = { id ->
                        navController.popBackStack()
                        navController.navigate(AgoraRoutes.evento(id))
                    },
                    onCancelar = { navController.popBackStack() },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(
            route = AgoraRoutes.EVENTO,
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { entry ->
            val id = entry.arguments?.getString("id") ?: return@composable
            SecondaryScaffold(title = "Evento", onBack = { navController.popBackStack() }) { padding ->
                EventoDetalleScreen(
                    eventoId = id,
                    tokenProvider = { auth.token() },
                    onPerfilClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                    onBorrado = { navController.popBackStack() },
                    modifier = Modifier.padding(padding),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SecondaryScaffold(
    title: String,
    onBack: () -> Unit,
    content: @Composable (padding: androidx.compose.foundation.layout.PaddingValues) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
            )
        },
        content = content,
    )
}
