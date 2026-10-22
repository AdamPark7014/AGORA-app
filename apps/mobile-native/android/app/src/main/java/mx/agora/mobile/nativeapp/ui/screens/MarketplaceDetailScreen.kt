package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ActualizarAnuncioRequest
import mx.agora.mobile.nativeapp.data.api.AnuncioDetalleDto
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MarketplaceApi
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.AbrirConversacionRequest
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.VisorImagenes
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
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
    var cambiandoEstado by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    /** Índice de la imagen abierta en el visor a pantalla completa. */
    var visor by remember { mutableStateOf<Int?>(null) }

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

    /** Cambia el estado de venta con lo que regresa la API, sin recargar todo. */
    fun cambiarEstado(nuevo: String) {
        if (cambiandoEstado) return
        scope.launch {
            cambiandoEstado = true
            error = null
            try {
                val resp = ApiClient.api<MarketplaceApi>(tokenProvider).actualizar(
                    anuncioId,
                    ActualizarAnuncioRequest(nuevo),
                )
                anuncio = anuncio?.copy(estadoVenta = resp.estadoVenta)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cambiandoEstado = false
            }
        }
    }

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
                val urls = item.imagenes.mapNotNull { ApiClient.resolveUrl(it.url) }
                urls.firstOrNull()?.let { principal ->
                    AsyncImage(
                        model = principal,
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(220.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { visor = 0 },
                        contentScale = ContentScale.Crop,
                    )
                }
                if (urls.size > 1) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        itemsIndexed(urls) { indice, url ->
                            AsyncImage(
                                model = url,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { visor = indice },
                                contentScale = ContentScale.Crop,
                            )
                        }
                    }
                }
                visor?.let { inicio ->
                    VisorImagenes(urls = urls, inicio = inicio, onCerrar = { visor = null })
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        "${formatearPrecio(item.precioMxn)} MXN",
                        style = MaterialTheme.typography.headlineMedium,
                        color = AgoraColors.Naranja,
                    )
                    EtiquetaEstadoAnuncio(item.estadoVenta)
                }
                Text(item.titulo, style = MaterialTheme.typography.headlineSmall)
                Text(
                    "${item.vendedor?.nombre ?: "Alguien"} · ${haceCuanto(item.createdAt)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AgoraColors.TextoMedio,
                )
                Text(item.descripcion, style = MaterialTheme.typography.bodyLarge)

                when (item.estadoVenta) {
                    ESTADO_APARTADO -> Text(
                        if (item.esMio) {
                            "Lo tienes apartado. Libéralo si el trato no se cierra."
                        } else {
                            "Ya está apartado. Escríbele por si se libera."
                        },
                        color = AgoraColors.TextoMedio,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    ESTADO_VENDIDO -> Text(
                        if (item.esMio) "Lo marcaste como vendido." else "Este artículo ya se vendió.",
                        color = AgoraColors.TextoMedio,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }

                when {
                    item.esMio -> {
                        // Como en la web: Apartar/Liberar y Vendido; si ya se vendió,
                        // se puede volver a poner a la venta.
                        when (item.estadoVenta) {
                            ESTADO_VENDIDO -> OutlinedButton(
                                onClick = { cambiarEstado(ESTADO_DISPONIBLE) },
                                enabled = !cambiandoEstado,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text("Volver a ponerlo a la venta")
                            }
                            else -> {
                                OutlinedButton(
                                    onClick = {
                                        cambiarEstado(
                                            if (item.estadoVenta == ESTADO_APARTADO) ESTADO_DISPONIBLE else ESTADO_APARTADO,
                                        )
                                    },
                                    enabled = !cambiandoEstado,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text(if (item.estadoVenta == ESTADO_APARTADO) "Liberar" else "Apartar")
                                }
                                Button(
                                    onClick = { cambiarEstado(ESTADO_VENDIDO) },
                                    enabled = !cambiandoEstado,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text("Marcar como vendido")
                                }
                            }
                        }
                        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    }
                    item.estadoVenta != ESTADO_VENDIDO && item.vendedor != null -> {
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
                    item.vendedor != null -> {
                        OutlinedButton(
                            onClick = { item.vendedor?.handle?.let(onPerfilClick) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Ver perfil del vendedor")
                        }
                    }
                }

                OutlinedButton(
                    onClick = { compartirEnlace(context, EnlacesWeb.anuncio(anuncioId), item.titulo) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text(AgoraCopy.compartir.accion, modifier = Modifier.padding(start = 8.dp))
                }

                if (!item.esMio) {
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            }
        }
    }
}
