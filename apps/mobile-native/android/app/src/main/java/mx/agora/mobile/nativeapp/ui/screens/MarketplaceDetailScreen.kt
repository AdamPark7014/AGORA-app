package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ActualizarAnuncioRequest
import mx.agora.mobile.nativeapp.data.api.AnuncioDetalleDto
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MarketplaceApi
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.AbrirConversacionRequest
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.formatearPrecio
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@Composable
fun MarketplaceDetailScreen(
    anuncioId: String,
    tokenProvider: () -> String?,
    onPerfilClick: (String) -> Unit,
    onMensajeClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var anuncio by remember { mutableStateOf<AnuncioDetalleDto?>(null) }
    var cargando by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun cargar() {
        scope.launch {
            cargando = true
            error = null
            try {
                anuncio = ApiClient.api<MarketplaceApi>(tokenProvider).detalle(anuncioId)
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
            }
        }
    }

    LaunchedEffect(anuncioId) { cargar() }

    when {
        cargando && anuncio == null -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        error != null && anuncio == null -> {
            AgoraErrorState(
                message = error!!,
                modifier = Modifier.fillMaxSize(),
                onRetry = { cargar() },
            )
        }
        anuncio != null -> {
            val item = anuncio!!
            Column(
                modifier = modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item.imagenes.firstOrNull()?.let { media ->
                    AsyncImage(
                        model = ApiClient.resolveUrl(media.url),
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(220.dp),
                        contentScale = ContentScale.Crop,
                    )
                }

                Text(
                    "${formatearPrecio(item.precioMxn)} MXN",
                    style = MaterialTheme.typography.headlineMedium,
                    color = AgoraColors.Naranja,
                )
                Text(item.titulo, style = MaterialTheme.typography.headlineSmall)
                Text(
                    "${item.vendedor?.nombre ?: "Alguien"} · ${haceCuanto(item.createdAt)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AgoraColors.TextoMedio,
                )
                Text(item.descripcion, style = MaterialTheme.typography.bodyLarge)

                if (item.estadoVenta != "DISPONIBLE") {
                    Text(
                        "Este artículo ya no está disponible.",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }

                when {
                    item.esMio -> {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    try {
                                        ApiClient.api<MarketplaceApi>(tokenProvider).actualizar(
                                            anuncioId,
                                            ActualizarAnuncioRequest("VENDIDO"),
                                        )
                                        cargar()
                                    } catch (e: Exception) {
                                        error = mensajeDe(e)
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Marcar como vendido")
                        }
                    }
                    item.estadoVenta == "DISPONIBLE" && item.vendedor != null -> {
                        Button(
                            onClick = {
                                scope.launch {
                                    try {
                                        val chat = ApiClient.api<MensajesApi>(tokenProvider).abrir(
                                            AbrirConversacionRequest(item.vendedor!!.handle!!),
                                        )
                                        onMensajeClick(chat.id)
                                    } catch (e: Exception) {
                                        error = mensajeDe(e)
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Escribir al vendedor")
                        }
                        OutlinedButton(
                            onClick = { item.vendedor?.handle?.let(onPerfilClick) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Ver perfil del vendedor")
                        }
                    }
                }

                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}
