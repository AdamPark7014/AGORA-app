package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ConversacionDto
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MensajesListScreen(
    tokenProvider: () -> String?,
    onConversacionClick: (String) -> Unit,
    onBuscar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var conversaciones by remember { mutableStateOf<List<ConversacionDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    /** Hay una carga en curso: el refresco automático no encima otra. */
    var ocupado by remember { mutableStateOf(false) }

    /**
     * [jalon]: la pidió el usuario jalando la lista (enseña la ruedita).
     * [silencioso]: el refresco automático; no enseña nada y, si falla, deja
     * la lista como estaba sin pintar error encima.
     */
    fun cargar(jalon: Boolean = false, silencioso: Boolean = false) {
        if (silencioso && ocupado) return
        scope.launch {
            ocupado = true
            when {
                jalon -> refrescando = true
                !silencioso && conversaciones.isEmpty() -> cargando = true
            }
            if (!silencioso) error = null
            try {
                conversaciones = ApiClient.api<MensajesApi>(tokenProvider).bandeja().conversaciones
                error = null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (!silencioso || conversaciones.isEmpty()) error = mensajeDe(e)
            } finally {
                ocupado = false
                cargando = false
                refrescando = false
            }
        }
    }

    LaunchedEffect(Unit) {
        cargar()
        while (isActive) {
            delay(15_000)
            cargar(silencioso = true)
        }
    }

    AgoraPullToRefreshBox(
        isRefreshing = refrescando,
        onRefresh = { cargar(jalon = true) },
        modifier = modifier.fillMaxSize(),
    ) {
        when {
            cargando && conversaciones.isEmpty() -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            error != null && conversaciones.isEmpty() -> {
                AgoraEstadoDesplazable {
                    AgoraErrorState(
                        message = error!!,
                        onRetry = { cargar() },
                    )
                }
            }
            conversaciones.isEmpty() -> {
                AgoraEstadoDesplazable {
                    AgoraEmptyState(
                        state = AgoraCopy.emptyMensajes,
                        ctaLabel = AgoraCopy.cta.explorarDirectorio,
                        onCta = onBuscar,
                    )
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(conversaciones, key = { it.id }) { conv ->
                        ConversacionRow(conv, onClick = { onConversacionClick(conv.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun ConversacionRow(conv: ConversacionDto, onClick: () -> Unit) {
    val nueva = conv.noLeidos > 0
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (nueva) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val foto = ApiClient.resolveUrl(conv.con?.fotoUrl)
            if (foto != null) {
                AsyncImage(
                    model = foto,
                    contentDescription = null,
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        iniciales(conv.con?.nombre),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    conv.con?.nombre ?: "Alguien",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = if (nueva) FontWeight.Bold else FontWeight.SemiBold,
                )
                Text(
                    buildString {
                        if (conv.mioElUltimo) append("Tú: ")
                        append(conv.ultimoTexto ?: "Sin mensajes")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 1,
                    fontWeight = if (nueva) FontWeight.SemiBold else FontWeight.Normal,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = if (nueva) 0.9f else 0.65f),
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    haceCuanto(conv.ultimoAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                )
                if (conv.noLeidos > 0) {
                    Box(
                        modifier = Modifier
                            .padding(top = 6.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(
                            if (conv.noLeidos > 9) "9+" else conv.noLeidos.toString(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}

private fun iniciales(nombre: String?): String =
    nombre
        ?.split(' ')
        ?.filter { it.isNotBlank() }
        ?.take(2)
        ?.mapNotNull { it.firstOrNull()?.uppercaseChar() }
        ?.joinToString("")
        ?: "?"
