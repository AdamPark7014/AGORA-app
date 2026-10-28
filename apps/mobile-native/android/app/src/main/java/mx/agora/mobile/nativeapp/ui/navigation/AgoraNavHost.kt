package mx.agora.mobile.nativeapp.ui.navigation

import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.components.FranjaTalavera
import mx.agora.mobile.nativeapp.ui.components.BotonCabeza
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.SessionUser
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.ui.MainShell
import mx.agora.mobile.nativeapp.ui.components.CarruselFeed
import mx.agora.mobile.nativeapp.ui.components.udlapPorConfirmar
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.screens.AjustesScreen
import mx.agora.mobile.nativeapp.ui.screens.ConfirmarUdlapScreen
import mx.agora.mobile.nativeapp.ui.screens.AnonimoScreen
import mx.agora.mobile.nativeapp.ui.screens.AventonesScreen
import mx.agora.mobile.nativeapp.ui.screens.CampusScreen
import mx.agora.mobile.nativeapp.ui.screens.BuscarScreen
import mx.agora.mobile.nativeapp.ui.screens.ConexionesScreen
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
import mx.agora.mobile.nativeapp.ui.screens.ReglasScreen
import mx.agora.mobile.nativeapp.ui.screens.TerminosScreen
import mx.agora.mobile.nativeapp.ui.screens.TipoConexion
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

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
    const val REGLAS = "reglas"
    const val MODERACION = "moderacion"
    const val MAS = "mas"
    const val CAMPUS = "campus"
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
    const val CONEXIONES = "conexiones/{handle}/{tipo}"
    const val CONFIRMAR_UDLAP = "confirmar-udlap"

    /**
     * La pestaña Eventos de MainShell (deep link `/eventos`). No es destino del
     * NavHost: [navigateToDeepLinkRoute] vuelve a MAIN y pide la pestaña por
     * [PestanaBus]. No usar con `navController.navigate` directo.
     */
    const val EVENTOS = "eventos"

    fun post(id: String) = "post/$id"
    fun mensaje(id: String) = "mensaje/$id"
    fun perfil(handle: String) = "perfil/$handle"
    fun hashtag(tag: String) = "hashtag/${java.net.URLEncoder.encode(tag, Charsets.UTF_8)}"
    fun marketplaceDetalle(id: String) = "marketplace/$id"
    fun evento(id: String) = "evento/$id"
    fun conexiones(handle: String, tipo: String) = "conexiones/$handle/$tipo"
}

@Composable
fun AgoraNavHost(
    auth: AuthRepository,
    onLogout: () -> Unit,
    navController: NavHostController = rememberNavController(),
    /** `auth/yo` de la sesión (lo lee [mx.agora.mobile.nativeapp.ui.AgoraApp]): aviso de la UDLAP por confirmar. */
    yo: YoResponse? = null,
    /** Se confirmó la UDLAP: la sesión nueva ya está guardada y hay contraseña otra vez. */
    onUdlapConfirmada: (SessionUser) -> Unit = {},
) {
    val scope = rememberCoroutineScope()
    var cerrandoSesion by remember { mutableStateOf(false) }

    /** Cierre completo (push + `auth/salir` + local) y luego vuelve al login. */
    fun cerrarSesion() {
        if (cerrandoSesion) return
        cerrandoSesion = true
        scope.launch {
            auth.cerrarSesion()
            onLogout()
        }
    }

    val pestanaSolicitada by PestanaBus.solicitada.collectAsState()
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
                onLogout = ::cerrarSesion,
                avisoUdlap = yo?.takeIf { it.udlapPorConfirmar() },
                onConfirmarUdlap = { navController.navigate(AgoraRoutes.CONFIRMAR_UDLAP) },
                pestanaSolicitada = pestanaSolicitada,
                onPestanaAtendida = { PestanaBus.consumir() },
                onNavigateToPost = { id -> navController.navigate(AgoraRoutes.post(id)) },
                onNavigateToMensajes = { navController.navigate(AgoraRoutes.MENSAJES) },
                onNavigateToMensaje = { id -> navController.navigate(AgoraRoutes.mensaje(id)) },
                onNavigateToPerfil = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                onNavigateToAvisos = { navController.navigate(AgoraRoutes.NOTIFICACIONES) },
                onNavigateToAjustes = { navController.navigate(AgoraRoutes.AJUSTES) },
                onNavigateToCampus = { navController.navigate(AgoraRoutes.CAMPUS) },
                onNavigateToConexiones = { handle, tipo -> navController.navigate(AgoraRoutes.conexiones(handle, tipo)) },
                onNavigateToHashtag = { tag -> navController.navigate(AgoraRoutes.hashtag(tag)) },
                onNavigateToEvento = { id -> navController.navigate(AgoraRoutes.evento(id)) },
                onNavigateToCreateEvento = { navController.navigate(AgoraRoutes.EVENTOS_CREAR) },
                onNavigateToAnuncio = { id -> navController.navigate(AgoraRoutes.marketplaceDetalle(id)) },
                onNavigateToCrearAnuncio = { navController.navigate(AgoraRoutes.MARKETPLACE_CREAR) },
                onNavigateToReglas = { navController.navigate(AgoraRoutes.REGLAS) },
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
                onAuthorClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
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
                onConexiones = { tipo -> navController.navigate(AgoraRoutes.conexiones(handle, tipo)) },
                onPublicacion = { id -> navController.navigate(AgoraRoutes.post(id)) },
            )
        }

        composable(
            route = AgoraRoutes.CONEXIONES,
            arguments = listOf(
                navArgument("handle") { type = NavType.StringType },
                navArgument("tipo") { type = NavType.StringType },
            ),
        ) { entry ->
            val handle = entry.arguments?.getString("handle") ?: return@composable
            val tipo = entry.arguments?.getString("tipo") ?: TipoConexion.SEGUIDORES
            val titulo = if (tipo == TipoConexion.SIGUIENDO) "@$handle sigue a" else "Seguidores de @$handle"
            SecondaryScaffold(title = titulo, onBack = { navController.popBackStack() }) { padding ->
                ConexionesScreen(
                    handle = handle,
                    tipo = tipo,
                    tokenProvider = { auth.token() },
                    onPerfil = { h -> navController.navigate(AgoraRoutes.perfil(h)) },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(AgoraRoutes.PERFIL_YO) {
            SecondaryScaffold(title = "Tu perfil", onBack = { navController.popBackStack() }) { padding ->
                ProfileScreen(
                    auth = auth,
                    onLogout = ::cerrarSesion,
                    modifier = Modifier.padding(padding),
                    onConexiones = { handle, tipo -> navController.navigate(AgoraRoutes.conexiones(handle, tipo)) },
                    onMensajes = { navController.navigate(AgoraRoutes.MENSAJES) },
                    onAjustes = { navController.navigate(AgoraRoutes.AJUSTES) },
                    onMarketplace = { navController.navigate(AgoraRoutes.MARKETPLACE) },
                    onAventones = { navController.navigate(AgoraRoutes.AVENTONES) },
                    onAnonimo = { navController.navigate(AgoraRoutes.ANONIMO) },
                    onMas = { navController.navigate(AgoraRoutes.MAS) },
                    onPublicacion = { id -> navController.navigate(AgoraRoutes.post(id)) },
                    onPerfilPublico = { h -> navController.navigate(AgoraRoutes.perfil(h)) },
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
                            "moderacion" -> navController.navigate(AgoraRoutes.MODERACION)
                            else -> if (route.startsWith("perfil/")) navController.navigate(route)
                        }
                    },
                    onTerminos = { navController.navigate(AgoraRoutes.TERMINOS) },
                    onPrivacidad = { navController.navigate(AgoraRoutes.PRIVACIDAD) },
                    onReglas = { navController.navigate(AgoraRoutes.REGLAS) },
                    onLogout = ::cerrarSesion,
                )
            }
        }

        // Campus (Feed B): se abre desde el menú ☰ de la pestaña Tu perfil.
        composable(AgoraRoutes.CAMPUS) {
            SecondaryScaffold(
                title = "Campus",
                onBack = { navController.popBackStack() },
                subtitulo = "Todo lo de la UDLAP, a un toque",
            ) { padding ->
                CampusScreen(
                    onMarketplace = { navController.navigate(AgoraRoutes.MARKETPLACE) },
                    onAventones = { navController.navigate(AgoraRoutes.AVENTONES) },
                    onDirectorio = { navController.navigate(AgoraRoutes.DIRECTORIO) },
                    onAnonimo = { navController.navigate(AgoraRoutes.ANONIMO) },
                    onMas = { navController.navigate(AgoraRoutes.MAS) },
                    onBuscar = { navController.navigate(AgoraRoutes.BUSCAR) },
                    onGuardados = { navController.navigate(AgoraRoutes.GUARDADOS) },
                    tuDia = {
                        CarruselFeed(
                            tokenProvider = { auth.token() },
                            onHashtagClick = { tag -> navController.navigate(AgoraRoutes.hashtag(tag)) },
                            onPerfilClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                        )
                    },
                    modifier = Modifier.padding(padding),
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
            SecondaryScaffold(title = "Avisos", onBack = { navController.popBackStack() }) { padding ->
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
            SecondaryScaffold(
                title = "Mercado",
                onBack = { navController.popBackStack() },
                subtitulo = "El tianguis del campus",
                acciones = {
                    BotonCabeza("Vender", onClick = { navController.navigate(AgoraRoutes.MARKETPLACE_CREAR) }, descripcion = "Vender algo")
                },
            ) { padding ->
                MarketplaceListScreen(
                    tokenProvider = { auth.token() },
                    onAnuncioClick = { id -> navController.navigate(AgoraRoutes.marketplaceDetalle(id)) },
                    onCrearClick = { navController.navigate(AgoraRoutes.MARKETPLACE_CREAR) },
                    modifier = Modifier.padding(padding),
                    onConsejosClick = { navController.navigate(AgoraRoutes.REGLAS) },
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
            SecondaryScaffold(
                title = "Aventones",
                onBack = { navController.popBackStack() },
                subtitulo = "Boletos de ida y vuelta",
            ) { padding ->
                AventonesScreen(
                    tokenProvider = { auth.token() },
                    onPerfilClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                    modifier = Modifier.padding(padding),
                    onMensajeClick = { conversacionId -> navController.navigate(AgoraRoutes.mensaje(conversacionId)) },
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
                AjustesScreen(
                    auth = auth,
                    modifier = Modifier.padding(padding),
                    onCuentaEliminada = {
                        auth.logout()
                        onLogout()
                    },
                    onUdlapConfirmada = onUdlapConfirmada,
                )
            }
        }

        composable(AgoraRoutes.CONFIRMAR_UDLAP) {
            SecondaryScaffold(
                title = AgoraCopy.login.udlap.confirmarTitulo,
                onBack = { navController.popBackStack() },
            ) { padding ->
                ConfirmarUdlapScreen(
                    auth = auth,
                    email = yo?.email ?: auth.loadSession()?.email.orEmpty(),
                    onConfirmada = { user ->
                        onUdlapConfirmada(user)
                        navController.popBackStack()
                    },
                    modifier = Modifier.padding(padding),
                )
            }
        }

        composable(AgoraRoutes.TERMINOS) {
            TerminosScreen(onBack = { navController.popBackStack() })
        }

        composable(AgoraRoutes.PRIVACIDAD) {
            PrivacidadScreen(onBack = { navController.popBackStack() })
        }

        composable(AgoraRoutes.REGLAS) {
            ReglasScreen(onBack = { navController.popBackStack() })
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
            // Diseño D: la portada llega hasta arriba con su propio «Volver»; la
            // pantalla se encarga de las barras de estado y de navegación.
            EventoDetalleScreen(
                eventoId = id,
                tokenProvider = { auth.token() },
                onPerfilClick = { handle -> navController.navigate(AgoraRoutes.perfil(handle)) },
                onBorrado = { navController.popBackStack() },
                onVolver = { navController.popBackStack() },
                onAventones = { navController.navigate(AgoraRoutes.AVENTONES) },
                onMensaje = { conversacionId -> navController.navigate(AgoraRoutes.mensaje(conversacionId)) },
            )
        }
    }
}

/**
 * Cabeza de B «Cholula» para las pantallas que se abren encima (CabezaCholula de iOS): volver,
 * título Bricolage 28, subtítulo opcional, acciones a la derecha y la franja de Talavera debajo.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SecondaryScaffold(
    title: String,
    onBack: () -> Unit,
    subtitulo: String? = null,
    acciones: @Composable RowScope.() -> Unit = {},
    content: @Composable (padding: androidx.compose.foundation.layout.PaddingValues) -> Unit,
) {
    Scaffold(
        containerColor = AgoraColors.Fondo,
        topBar = {
            Column(
                Modifier
                    .background(AgoraColors.Fondo)
                    .windowInsetsPadding(TopAppBarDefaults.windowInsets),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 60.dp)
                        .padding(start = 4.dp, end = 10.dp, top = 6.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = AgoraColors.Texto)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(
                            title,
                            fontFamily = AgoraFonts.titulo,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 28.sp,
                            lineHeight = 30.sp,
                            letterSpacing = (-0.6).sp,
                            color = AgoraColors.Texto,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.semantics { heading() },
                        )
                        if (subtitulo != null) {
                            Text(
                                subtitulo,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = AgoraColors.TextoMedio,
                                maxLines = 1,
                            )
                        }
                    }
                    acciones()
                }
                FranjaTalavera()
            }
        },
        content = content,
    )
}
