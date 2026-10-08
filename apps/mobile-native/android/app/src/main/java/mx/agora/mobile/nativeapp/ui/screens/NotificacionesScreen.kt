package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.NotificacionDto
import mx.agora.mobile.nativeapp.data.api.NotificacionesApi
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificacionesScreen(
    tokenProvider: () -> String?,
    onNavigateUrl: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var notificaciones by remember { mutableStateOf<List<NotificacionDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Cursor de la siguiente página (la API pagina de 30 en 30). */
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargandoMas by remember { mutableStateOf(false) }
    var errorMas by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun cargarMas() {
        val desde = cursor ?: return
        if (cargandoMas) return
        scope.launch {
            cargandoMas = true
            errorMas = false
            try {
                val resp = ApiClient.api<NotificacionesApi>(tokenProvider).listar(cursor = desde)
                val vistos = notificaciones.mapTo(HashSet()) { it.id }
                notificaciones = notificaciones + resp.notificaciones.filter { it.id !in vistos }
                cursor = resp.siguienteCursor
            } catch (_: Exception) {
                errorMas = true
            } finally {
                cargandoMas = false
            }
        }
    }

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            error = null
            try {
                val api = ApiClient.api<NotificacionesApi>(tokenProvider)
                val resp = api.listar()
                notificaciones = resp.notificaciones
                cursor = resp.siguienteCursor
                errorMas = false
                runCatching { api.marcarLeidas() }
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    LaunchedEffect(Unit) { cargar() }

    AgoraPullToRefreshBox(
        isRefreshing = refrescando,
        onRefresh = { cargar(refresh = true) },
        modifier = modifier.fillMaxSize(),
    ) {
        when {
            cargando && notificaciones.isEmpty() -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            error != null && notificaciones.isEmpty() -> {
                AgoraErrorState(
                    message = error!!,
                    modifier = Modifier.align(Alignment.Center),
                    onRetry = { cargar() },
                )
            }
            notificaciones.isEmpty() -> {
                AgoraEmptyState(
                    state = AgoraCopy.emptyNotificaciones,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(notificaciones, key = { it.id }) { n ->
                        NotificacionCard(n, onNavigateUrl)
                    }
                    if (cursor != null) {
                        item(key = "mas") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                when {
                                    cargandoMas -> CircularProgressIndicator()
                                    errorMas -> TextButton(onClick = { cargarMas() }) {
                                        Text("Reintentar")
                                    }
                                    // Llegar al final pide la siguiente página.
                                    else -> LaunchedEffect(cursor) { cargarMas() }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificacionCard(n: NotificacionDto, onNavigateUrl: (String) -> Unit) {
    val tieneUrl = !n.url.isNullOrBlank()
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (tieneUrl) {
                    Modifier.clickable { onNavigateUrl(n.url!!) }
                } else {
                    Modifier
                },
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (n.leida) {
                MaterialTheme.colorScheme.surface
            } else {
                MaterialTheme.colorScheme.primaryContainer
            },
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                n.texto,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (n.leida) FontWeight.Normal else FontWeight.SemiBold,
            )
            Text(
                formatearFecha(n.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
        }
    }
}
