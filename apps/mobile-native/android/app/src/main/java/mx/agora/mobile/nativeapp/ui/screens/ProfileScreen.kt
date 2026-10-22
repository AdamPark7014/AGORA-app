package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
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
import mx.agora.mobile.nativeapp.ui.components.GamificacionProfileSection
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.navigation.AgoraRoutes
import mx.agora.mobile.nativeapp.ui.navigation.DeepLinkBus
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
            val yo = ApiClient.api<AuthApi> { auth.token() }.yo()
            puedeModerar = yo.puedeModerar
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
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        error != null -> {
            // Sin red ni caché: lo primero es reintentar, no cerrar sesión.
            Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
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
            Column(
                modifier = modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val foto = ApiClient.resolveUrl(perfil?.fotoUrl)
                if (foto != null) {
                    AsyncImage(
                        model = foto,
                        contentDescription = null,
                        modifier = Modifier
                            .size(88.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(88.dp)
                            .clip(CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            (perfil?.nombre?.firstOrNull() ?: '?').toString(),
                            style = MaterialTheme.typography.headlineMedium,
                        )
                    }
                }

                Text(
                    "@${perfil?.handle ?: session?.handle ?: "tu"}",
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    "${perfil?.nombre ?: ""} ${perfil?.apellidos ?: ""}".trim(),
                    style = MaterialTheme.typography.titleMedium,
                )
                perfil?.bio?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium)
                }

                val miHandle = perfil?.handle ?: session?.handle
                if (miHandle != null) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        publico?.let { p ->
                            Text("${p.publicaciones ?: 0} posts", style = MaterialTheme.typography.bodySmall)
                            ContadorConexion(
                                texto = "${p.seguidores ?: 0} seguidores",
                                habilitado = true,
                                onClick = { onConexiones(miHandle, TipoConexion.SEGUIDORES) },
                            )
                            ContadorConexion(
                                texto = "${p.siguiendo ?: 0} siguiendo",
                                habilitado = true,
                                onClick = { onConexiones(miHandle, TipoConexion.SIGUIENDO) },
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = { compartirEnlace(context, EnlacesWeb.perfil(miHandle), "@$miHandle en Ágora") },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Compartir mi perfil")
                    }
                }

                GamificacionProfileSection(
                    gamificacion = gamificacion,
                    modifier = Modifier.padding(vertical = 4.dp),
                )

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

                Text(
                    session?.email ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                )

                Button(onClick = onMensajes, modifier = Modifier.fillMaxWidth()) {
                    Text("Mensajes")
                }
                Button(onClick = onAjustes, modifier = Modifier.fillMaxWidth()) {
                    Text("Ajustes")
                }
                if (onMas != null) {
                    OutlinedButton(onClick = onMas, modifier = Modifier.fillMaxWidth()) {
                        Text("Más opciones")
                    }
                }
                OutlinedButton(onClick = onMarketplace, modifier = Modifier.fillMaxWidth()) {
                    Text("Marketplace")
                }
                OutlinedButton(onClick = onAventones, modifier = Modifier.fillMaxWidth()) {
                    Text("Aventones")
                }
                OutlinedButton(onClick = onAnonimo, modifier = Modifier.fillMaxWidth()) {
                    Text("Sin nombre")
                }
                if (puedeModerar) {
                    OutlinedButton(onClick = onModeracion, modifier = Modifier.fillMaxWidth()) {
                        Text("Moderación")
                    }
                }
                OutlinedButton(onClick = onTerminos, modifier = Modifier.fillMaxWidth()) {
                    Text("Términos de uso")
                }
                OutlinedButton(onClick = onPrivacidad, modifier = Modifier.fillMaxWidth()) {
                    Text("Política de privacidad")
                }
                OutlinedButton(onClick = onReglas, modifier = Modifier.fillMaxWidth()) {
                    Text("Reglas de la comunidad")
                }
                OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
                    Text("Cerrar sesión")
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
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            "Mis publicaciones",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
        )
        when {
            cargando && publicaciones.isEmpty() -> {
                Box(Modifier.fillMaxWidth().padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(modifier = Modifier.size(28.dp))
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
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = onReintentar) { Text(AgoraCopy.cta.reintentar) }
                }
            }
            publicaciones.isEmpty() -> {
                Text(
                    "Todavía no publicas nada. Lo que compartas aparecerá aquí.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                )
            }
            else -> {
                publicaciones.forEach { pub ->
                    PublicacionPerfilCard(pub, onClick = { onPublicacion(pub.id) }, media = pub.media)
                }
                if (hayMas) {
                    TextButton(onClick = onVerTodas, modifier = Modifier.fillMaxWidth()) {
                        Text(if (total != null && total > 0) "Ver todas ($total)" else "Ver todas")
                    }
                }
            }
        }
    }
}
