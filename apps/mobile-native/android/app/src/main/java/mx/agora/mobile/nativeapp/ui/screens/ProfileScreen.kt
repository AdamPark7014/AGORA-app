package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.TheaterComedy
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.api.GamificacionDto
import mx.agora.mobile.nativeapp.data.api.PerfilAjenoDto
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PerfilMioDto
import mx.agora.mobile.nativeapp.data.api.PerfilPublicacionDto
import mx.agora.mobile.nativeapp.data.local.OfflineCache
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.BotonBorde
import mx.agora.mobile.nativeapp.ui.components.GamificacionProfileSection
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.navigation.AgoraRoutes
import mx.agora.mobile.nativeapp.ui.navigation.DeepLinkBus
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraChipShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

private sealed class ProfileRoute {
    data object Home : ProfileRoute()
    data object Moderacion : ProfileRoute()
    data object Terminos : ProfileRoute()
    data object Privacidad : ProfileRoute()
    data object Reglas : ProfileRoute()
}

@Composable
fun ProfileScreen(
    auth: AuthRepository,
    onLogout: () -> Unit,
    onMensajes: () -> Unit = {},
    onAjustes: () -> Unit = {},
    /** «Más opciones» (AgoraNavHost lo pasa en PERFIL_YO). Si es null el botón no se enseña. */
    onMas: (() -> Unit)? = null,
    onMarketplace: () -> Unit = {},
    onAventones: () -> Unit = {},
    onAnonimo: () -> Unit = {},
    /** Lista de seguidores/seguidos del handle ([TipoConexion]). */
    onConexiones: (handle: String, tipo: String) -> Unit = { _, _ -> },
    modifier: Modifier = Modifier,
    /**
     * Abre una de mis publicaciones (AgoraNavHost lo pasa en PERFIL_YO). Si es
     * null se abre por [DeepLinkBus] (al volver regresa al inicio).
     */
    onPublicacion: ((String) -> Unit)? = null,
    /**
     * «Ver todas»: mi perfil público con la lista completa (AgoraNavHost lo pasa
     * en PERFIL_YO). Si es null se abre por [DeepLinkBus].
     */
    onPerfilPublico: ((String) -> Unit)? = null,
) {
    var ruta by remember { mutableStateOf<ProfileRoute>(ProfileRoute.Home) }
    val tokenProvider = { auth.token() }

    when (val destino = ruta) {
        ProfileRoute.Moderacion -> ModeracionScreen(tokenProvider = tokenProvider, onBack = { ruta = ProfileRoute.Home })
        ProfileRoute.Terminos -> TerminosScreen(onBack = { ruta = ProfileRoute.Home })
        ProfileRoute.Privacidad -> PrivacidadScreen(onBack = { ruta = ProfileRoute.Home })
        ProfileRoute.Reglas -> ReglasScreen(onBack = { ruta = ProfileRoute.Home })
        ProfileRoute.Home -> ProfileHome(
            auth = auth,
            onLogout = onLogout,
            onMensajes = onMensajes,
            onAjustes = onAjustes,
            onMas = onMas,
            onMarketplace = onMarketplace,
            onAventones = onAventones,
            onAnonimo = onAnonimo,
            onConexiones = onConexiones,
            modifier = modifier,
            onPublicacion = onPublicacion ?: { id -> DeepLinkBus.emit(AgoraRoutes.post(id)) },
            onPerfilPublico = onPerfilPublico ?: { h -> DeepLinkBus.emit(AgoraRoutes.perfil(h)) },
            onModeracion = { ruta = ProfileRoute.Moderacion },
            onTerminos = { ruta = ProfileRoute.Terminos },
            onPrivacidad = { ruta = ProfileRoute.Privacidad },
            onReglas = { ruta = ProfileRoute.Reglas },
        )
    }
}

@Composable
private fun ProfileHome(
    auth: AuthRepository,
    onLogout: () -> Unit,
    onMensajes: () -> Unit,
    onAjustes: () -> Unit,
    onMas: (() -> Unit)?,
    onMarketplace: () -> Unit,
    onAventones: () -> Unit,
    onAnonimo: () -> Unit,
    onConexiones: (handle: String, tipo: String) -> Unit,
    modifier: Modifier,
    onPublicacion: (String) -> Unit,
    onPerfilPublico: (String) -> Unit,
    onModeracion: () -> Unit,
    onTerminos: () -> Unit,
    onPrivacidad: () -> Unit,
    onReglas: () -> Unit,
) {
    var perfil by remember { mutableStateOf<PerfilMioDto?>(null) }
    /** El perfil público propio: trae los contadores de seguidores y siguiendo. */
    var publico by remember { mutableStateOf<PerfilAjenoDto?>(null) }
    var gamificacion by remember { mutableStateOf<GamificacionDto?>(null) }
    var puedeModerar by remember { mutableStateOf(false) }
    var cargando by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Sube con «Reintentar» para volver a correr la carga. */
    var intento by remember { mutableIntStateOf(0) }
    var misPublicaciones by remember { mutableStateOf<List<PerfilPublicacionDto>>(emptyList()) }
    var hayMasPublicaciones by remember { mutableStateOf(false) }
    var cargandoPublicaciones by remember { mutableStateOf(false) }
    var errorPublicaciones by remember { mutableStateOf<String?>(null) }
    var intentoPublicaciones by remember { mutableIntStateOf(0) }
    val session = auth.loadSession()
    val context = LocalContext.current
    val offlineCache = remember { OfflineCache.get(context) }

    LaunchedEffect(intento) {
        cargando = true
        error = null
        try {
            val api = ApiClient.api<PerfilApi> { auth.token() }
            perfil = api.mio().also { offlineCache.savePerfil(it) }
            publico = runCatching { api.porHandle(perfil!!.handle) }.getOrNull()
            runCatching {
                gamificacion = ApiClient.api<GamificacionApi> { auth.token() }.mio()
            }
            // Solo decide si se ve «Moderación»: si falla no debe tapar el perfil con la caché.
            puedeModerar = runCatching {
                ApiClient.api<AuthApi> { auth.token() }.yo().puedeModerar
            }.getOrDefault(false)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            val cached = offlineCache.loadPerfil()
            if (cached != null) {
                perfil = cached
            } else {
                error = mensajeDe(e)
            }
        } finally {
            cargando = false
        }
    }

    val handlePublicaciones = perfil?.handle ?: session?.handle
    /** Vista previa de mis publicaciones; la lista completa está en mi perfil público. */
    LaunchedEffect(handlePublicaciones, intentoPublicaciones) {
        val h = handlePublicaciones ?: return@LaunchedEffect
        cargandoPublicaciones = true
        errorPublicaciones = null
        try {
            val resp = ApiClient.api<PerfilApi> { auth.token() }
                .publicaciones(h, limite = VISTA_PREVIA_PUBLICACIONES)
            misPublicaciones = resp.publicaciones
            hayMasPublicaciones = resp.siguienteCursor != null
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            errorPublicaciones = mensajeDe(e)
        } finally {
            cargandoPublicaciones = false
        }
    }

    when {
        cargando -> {
            Box(modifier.fillMaxSize().background(AgoraColors.Fondo), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AgoraColors.Naranja)
            }
        }
        error != null -> {
            // Sin red ni caché: lo primero es reintentar, no cerrar sesión.
            Box(modifier.fillMaxSize().background(AgoraColors.Fondo), contentAlignment = Alignment.Center) {
                AgoraEmptyState(
                    emoji = "😕",
                    title = "No pudimos cargar tu perfil",
                    subtitle = error!!,
                    isError = true,
                    ctaLabel = AgoraCopy.cta.reintentar,
                    onCta = { intento++ },
                    secondaryCtaLabel = "Cerrar sesión",
                    onSecondaryCta = onLogout,
                )
            }
        }
        else -> {
            // Sin handle no se enseña nada (antes salía «@tu»).
            val miHandle = perfil?.handle ?: session?.handle
            val nombreCompleto = "${perfil?.nombre ?: ""} ${perfil?.apellidos ?: ""}".trim()
            val p = publico

            fun abrirLista(tipo: String): (() -> Unit)? =
                miHandle?.let { h -> { onConexiones(h, tipo) } }

            // Mismas cifras que ve cualquiera en mi perfil, y solo las que dio la API.
            val cifras = buildList<CifraPerfil> {
                p?.publicaciones?.let { add(cifraConteo(it, "publicación", "publicaciones")) }
                p?.seguidores?.let {
                    add(cifraConteo(it, "seguidor", "seguidores", onClick = abrirLista(TipoConexion.SEGUIDORES)))
                }
                p?.siguiendo?.let { add(cifraSiguiendo(it, onClick = abrirLista(TipoConexion.SIGUIENDO))) }
                gamificacion?.rachaActual?.takeIf { it > 0 }?.let { add(cifraRacha(it)) }
            }

            Column(
                modifier = modifier
                    .fillMaxSize()
                    .background(AgoraColors.Fondo)
                    .verticalScroll(rememberScrollState())
                    .padding(bottom = AgoraSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Sm),
            ) {
                CabeceraPortadaPerfil(
                    portadaUrl = perfil?.portadaUrl,
                    nombre = nombreCompleto,
                    fotoUrl = perfil?.fotoUrl,
                ) {
                    // Donde el perfil ajeno lleva Seguir y Mensaje; edita en Ajustes, como antes.
                    BotonBorde("Editar perfil", onClick = onAjustes)
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AgoraSpacing.Pantalla),
                    verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Sm),
                ) {
                    DatosPerfilD(
                        nombre = nombreCompleto,
                        verificado = p?.verificado == true,
                        linea = listOfNotNull(
                            miHandle?.let { "@$it" },
                            p?.carrera,
                            p?.generacion?.let { "Gen $it" },
                            perfil?.ciudadOrigen ?: p?.ciudadOrigen,
                        ),
                        lineaSecundaria = listOfNotNull(p?.escuela, p?.colegio?.let { "Colegio $it" }),
                        bio = perfil?.bio,
                        instagram = perfil?.instagram,
                        intereses = perfil?.intereses.orEmpty(),
                        busco = perfil?.busco,
                        prefijoBusco = "Busco",
                    )

                    CifrasPerfil(cifras)

                    if (miHandle != null) {
                        BotonBorde(
                            "Compartir mi perfil",
                            onClick = { compartirEnlace(context, EnlacesWeb.perfil(miHandle), "@$miHandle en Ágora") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    GamificacionProfileSection(gamificacion = gamificacion)

                    if (miHandle != null) {
                        MisPublicaciones(
                            publicaciones = misPublicaciones,
                            total = publico?.publicaciones,
                            hayMas = hayMasPublicaciones,
                            cargando = cargandoPublicaciones,
                            error = errorPublicaciones,
                            onReintentar = { intentoPublicaciones++ },
                            onPublicacion = onPublicacion,
                            onVerTodas = { onPerfilPublico(miHandle) },
                        )
                    }

                    GrupoOpciones(
                        titulo = "Tu cuenta",
                        opciones = listOfNotNull(
                            OpcionPerfil(Icons.Outlined.ChatBubbleOutline, "Mensajes", onClick = onMensajes),
                            OpcionPerfil(Icons.Outlined.Settings, "Ajustes", onClick = onAjustes),
                            onMas?.let { OpcionPerfil(Icons.Outlined.GridView, "Más opciones", onClick = it) },
                        ),
                    )
                    GrupoOpciones(
                        titulo = "Campus",
                        opciones = listOfNotNull(
                            OpcionPerfil(Icons.Outlined.Storefront, "Mercado", onClick = onMarketplace),
                            OpcionPerfil(Icons.Outlined.DirectionsCar, "Aventones", onClick = onAventones),
                            OpcionPerfil(Icons.Outlined.TheaterComedy, "Sin nombre", onClick = onAnonimo),
                            if (puedeModerar) {
                                OpcionPerfil(Icons.Outlined.AdminPanelSettings, "Moderación", onClick = onModeracion)
                            } else {
                                null
                            },
                        ),
                    )
                    GrupoOpciones(
                        titulo = "Legal",
                        opciones = listOf(
                            OpcionPerfil(Icons.Outlined.Description, "Términos de uso", onClick = onTerminos),
                            OpcionPerfil(Icons.Outlined.PrivacyTip, "Aviso de privacidad", onClick = onPrivacidad),
                            OpcionPerfil(Icons.Outlined.Gavel, "Reglas de la comunidad", onClick = onReglas),
                        ),
                    )

                    session?.email?.takeIf { it.isNotBlank() }?.let {
                        Text(
                            it,
                            style = MaterialTheme.typography.bodySmall,
                            color = AgoraColors.TextoMedio,
                            modifier = Modifier.padding(start = 4.dp, top = AgoraSpacing.Xxs),
                        )
                    }
                    GrupoOpciones(
                        titulo = null,
                        opciones = listOf(
                            OpcionPerfil(Icons.AutoMirrored.Outlined.Logout, "Cerrar sesión", peligro = true, onClick = onLogout),
                        ),
                    )
                }
            }
        }
    }
}

/** Cuántas publicaciones propias se ven en «Yo» antes de «Ver todas». */
private const val VISTA_PREVIA_PUBLICACIONES = 3

@Composable
private fun MisPublicaciones(
    publicaciones: List<PerfilPublicacionDto>,
    total: Int?,
    hayMas: Boolean,
    cargando: Boolean,
    error: String?,
    onReintentar: () -> Unit,
    onPublicacion: (String) -> Unit,
    onVerTodas: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Sm)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = AgoraSpacing.Xs),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Mis publicaciones",
                style = MaterialTheme.typography.titleLarge,
                color = AgoraColors.Texto,
                modifier = Modifier
                    .weight(1f)
                    .semantics { heading() },
            )
            if (hayMas && publicaciones.isNotEmpty()) {
                AccionTexto(
                    if (total != null && total > 0) "Ver todas ($total)" else "Ver todas",
                    onClick = onVerTodas,
                )
            }
        }
        when {
            cargando && publicaciones.isEmpty() -> {
                Box(Modifier.fillMaxWidth().padding(vertical = AgoraSpacing.Sm), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AgoraColors.Naranja, modifier = Modifier.size(28.dp))
                }
            }
            error != null && publicaciones.isEmpty() -> {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        error,
                        style = MaterialTheme.typography.bodySmall,
                        color = AgoraColors.Danger,
                        modifier = Modifier.weight(1f),
                    )
                    AccionTexto(AgoraCopy.cta.reintentar, onClick = onReintentar)
                }
            }
            publicaciones.isEmpty() -> {
                Text(
                    "Todavía no publicas nada. Lo que compartas aparecerá aquí.",
                    style = MaterialTheme.typography.bodySmall,
                    color = AgoraColors.TextoMedio,
                )
            }
            else -> {
                publicaciones.forEach { pub ->
                    PublicacionPerfilCard(pub, onClick = { onPublicacion(pub.id) }, media = pub.media)
                }
            }
        }
    }
}

/** Acción de texto en naranja-tinta («Ver todas», «Reintentar»), con área táctil de 44. */
@Composable
private fun AccionTexto(texto: String, onClick: () -> Unit) {
    Text(
        texto,
        style = MaterialTheme.typography.labelLarge,
        color = AgoraColors.NaranjaTinta,
        modifier = Modifier
            .heightIn(min = 44.dp)
            .clip(AgoraChipShape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 12.dp),
    )
}

private class OpcionPerfil(
    val icono: ImageVector,
    val texto: String,
    val peligro: Boolean = false,
    val onClick: () -> Unit,
)

/**
 * Lo que antes era una columna de botones iguales, agrupado en tarjetas con
 * filas: mismas opciones y mismos destinos.
 */
@Composable
private fun GrupoOpciones(titulo: String?, opciones: List<OpcionPerfil>) {
    if (opciones.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs)) {
        titulo?.let {
            Text(
                it,
                style = MaterialTheme.typography.labelLarge,
                color = AgoraColors.TextoMedio,
                modifier = Modifier
                    .padding(start = 4.dp, top = AgoraSpacing.Xs)
                    .semantics { heading() },
            )
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(AgoraCardShape)
                .background(AgoraColors.Superficie),
        ) {
            opciones.forEachIndexed { i, opcion ->
                if (i > 0) {
                    // Arranca donde empieza el texto, no bajo el ícono.
                    HorizontalDivider(
                        modifier = Modifier.padding(start = 52.dp),
                        thickness = 1.dp,
                        color = AgoraColors.Borde,
                    )
                }
                FilaOpcion(opcion)
            }
        }
    }
}

@Composable
private fun FilaOpcion(opcion: OpcionPerfil) {
    val tinta = if (opcion.peligro) AgoraColors.Danger else AgoraColors.Texto
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .clickable(role = Role.Button, onClick = opcion.onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(
            opcion.icono,
            contentDescription = null,
            tint = if (opcion.peligro) AgoraColors.Danger else AgoraColors.TextoMedio,
            modifier = Modifier.size(22.dp),
        )
        Text(
            opcion.texto,
            style = MaterialTheme.typography.bodyLarge,
            color = tinta,
            modifier = Modifier.weight(1f),
        )
        if (!opcion.peligro) {
            Icon(
                Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = AgoraColors.TextoMedio,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}
