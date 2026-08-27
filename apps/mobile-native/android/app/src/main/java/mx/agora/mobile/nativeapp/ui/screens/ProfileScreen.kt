package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.api.GamificacionDto
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PerfilMioDto
import mx.agora.mobile.nativeapp.data.local.OfflineCache
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.GamificacionProfileSection
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

private sealed class ProfileRoute {
    data object Home : ProfileRoute()
    data object Moderacion : ProfileRoute()
    data object Terminos : ProfileRoute()
    data object Privacidad : ProfileRoute()
}

@Composable
fun ProfileScreen(
    auth: AuthRepository,
    onLogout: () -> Unit,
    onMensajes: () -> Unit = {},
    onAjustes: () -> Unit = {},
    onMas: () -> Unit = {},
    onMarketplace: () -> Unit = {},
    onAventones: () -> Unit = {},
    onAnonimo: () -> Unit = {},
) {
    var ruta by remember { mutableStateOf<ProfileRoute>(ProfileRoute.Home) }
    val tokenProvider = { auth.token() }

    when (val destino = ruta) {
        ProfileRoute.Moderacion -> ModeracionScreen(tokenProvider = tokenProvider, onBack = { ruta = ProfileRoute.Home })
        ProfileRoute.Terminos -> TerminosScreen(onBack = { ruta = ProfileRoute.Home })
        ProfileRoute.Privacidad -> PrivacidadScreen(onBack = { ruta = ProfileRoute.Home })
        ProfileRoute.Home -> ProfileHome(
            auth = auth,
            onLogout = onLogout,
            onMensajes = onMensajes,
            onAjustes = onAjustes,
            onMas = onMas,
            onMarketplace = onMarketplace,
            onAventones = onAventones,
            onAnonimo = onAnonimo,
            onModeracion = { ruta = ProfileRoute.Moderacion },
            onTerminos = { ruta = ProfileRoute.Terminos },
            onPrivacidad = { ruta = ProfileRoute.Privacidad },
        )
    }
}

@Composable
private fun ProfileHome(
    auth: AuthRepository,
    onLogout: () -> Unit,
    onMensajes: () -> Unit,
    onAjustes: () -> Unit,
    onMas: () -> Unit,
    onMarketplace: () -> Unit,
    onAventones: () -> Unit,
    onAnonimo: () -> Unit,
    onModeracion: () -> Unit,
    onTerminos: () -> Unit,
    onPrivacidad: () -> Unit,
) {
    var perfil by remember { mutableStateOf<PerfilMioDto?>(null) }
    var gamificacion by remember { mutableStateOf<GamificacionDto?>(null) }
    var puedeModerar by remember { mutableStateOf(false) }
    var cargando by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val session = auth.loadSession()
    val context = LocalContext.current
    val offlineCache = remember { OfflineCache.get(context) }

    LaunchedEffect(Unit) {
        cargando = true
        try {
            val api = ApiClient.api<PerfilApi> { auth.token() }
            perfil = api.mio().also { offlineCache.savePerfil(it) }
            runCatching {
                gamificacion = ApiClient.api<GamificacionApi> { auth.token() }.mio()
            }
            val yo = ApiClient.api<AuthApi> { auth.token() }.yo()
            puedeModerar = yo.puedeModerar
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

    when {
        cargando -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        error != null -> {
            AgoraErrorState(
                message = error!!,
                modifier = Modifier.fillMaxSize(),
                onRetry = onLogout,
                retryLabel = "Cerrar sesión",
            )
        }
        else -> {
            Column(
                modifier = Modifier
                    .fillMaxSize()
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

                GamificacionProfileSection(
                    gamificacion = gamificacion,
                    modifier = Modifier.padding(vertical = 4.dp),
                )

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
                OutlinedButton(onClick = onMas, modifier = Modifier.fillMaxWidth()) {
                    Text("Más opciones")
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
                OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
                    Text("Cerrar sesión")
                }
            }
        }
    }
}
