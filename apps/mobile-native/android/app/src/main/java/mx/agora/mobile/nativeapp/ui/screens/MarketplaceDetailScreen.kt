package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
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
import mx.agora.mobile.nativeapp.ui.components.BotonBorde
import mx.agora.mobile.nativeapp.ui.components.BotonTinta
import mx.agora.mobile.nativeapp.ui.components.VisorImagenes
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraChipShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.theme.AgoraFotoShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
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
    // Evita abrir dos chats con dos toques.
    var abriendo by remember { mutableStateOf(false) }
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
            // Con el modifier de la ruta: si no, el indicador ignoraba la barra superior.
            Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AgoraColors.Naranja)
            }
        }
        error != null && anuncio == null -> {
            AgoraErrorState(
                message = error!!,
                modifier = modifier.fillMaxSize(),
                onRetry = { cargar() },
            )
        }
        anuncio != null -> {
            val item = anuncio!!
            Column(
                modifier = modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = AgoraSpacing.Pantalla, vertical = AgoraSpacing.Md),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val urls = item.imagenes.mapNotNull { ApiClient.resolveUrl(it.url) }
                urls.firstOrNull()?.let { principal ->
                    AsyncImage(
                        model = principal,
                        contentDescription = "Foto 1 de ${urls.size}",
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(4f / 3f)
                            .clip(AgoraFotoShape)
                            .background(AgoraColors.Superficie2)
                            .clickable(onClickLabel = "Ampliar", role = Role.Button) { visor = 0 },
                        contentScale = ContentScale.Crop,
                    )
                }
                if (urls.size > 1) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        itemsIndexed(urls) { indice, url ->
                            AsyncImage(
                                model = url,
                                contentDescription = "Foto ${indice + 1} de ${urls.size}",
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(AgoraChipShape)
                                    .background(AgoraColors.Superficie2)
                                    .clickable(onClickLabel = "Ampliar", role = Role.Button) { visor = indice },
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
                    // Cifra en la tipografía de títulos y en tinta: el naranja queda para las acciones.
                    Text(
                        if (item.precioMxn <= 0) "Gratis" else "${formatearPrecio(item.precioMxn)} MXN",
                        style = MaterialTheme.typography.headlineMedium.copy(fontFamily = AgoraFonts.titulo),
                        color = AgoraColors.Texto,
                    )
                    EtiquetaEstadoAnuncio(item.estadoVenta)
                }
                Text(
                    item.titulo,
                    style = MaterialTheme.typography.headlineSmall,
                    color = AgoraColors.Texto,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    "${item.vendedor?.nombre ?: "Alguien"} · ${haceCuanto(item.createdAt)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AgoraColors.TextoMedio,
                )
                Text(item.descripcion, style = MaterialTheme.typography.bodyLarge, color = AgoraColors.Texto)

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
                            ESTADO_VENDIDO -> BotonBorde(
                                texto = "Volver a ponerlo a la venta",
                                onClick = { cambiarEstado(ESTADO_DISPONIBLE) },
                                enabled = !cambiandoEstado,
                                modifier = Modifier.fillMaxWidth(),
                            )
                            else -> {
                                BotonBorde(
                                    texto = if (item.estadoVenta == ESTADO_APARTADO) "Liberar" else "Apartar",
                                    onClick = {
                                        cambiarEstado(
                                            if (item.estadoVenta == ESTADO_APARTADO) ESTADO_DISPONIBLE else ESTADO_APARTADO,
                                        )
                                    },
                                    enabled = !cambiandoEstado,
                                    modifier = Modifier.fillMaxWidth(),
                                )
                                BotonTinta(
                                    texto = "Marcar como vendido",
                                    onClick = { cambiarEstado(ESTADO_VENDIDO) },
                                    enabled = !cambiandoEstado,
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                        }
                        error?.let { Text(it, color = AgoraColors.Danger, style = MaterialTheme.typography.bodyMedium) }
                    }
                    item.estadoVenta != ESTADO_VENDIDO && item.vendedor != null -> {
                        BotonTinta(
                            texto = if (abriendo) "Abriendo chat…" else "Escribir al vendedor",
                            onClick = {
                                scope.launch {
                                    // Sin handle no hay con quién abrir el chat (antes tronaba con !!).
                                    val handle = item.vendedor?.handle ?: return@launch
                                    abriendo = true
                                    error = null
                                    try {
                                        val chat = ApiClient.api<MensajesApi>(tokenProvider).abrir(
                                            AbrirConversacionRequest(handle),
                                        )
                                        onMensajeClick(chat.id)
                                    } catch (e: CancellationException) {
                                        throw e
                                    } catch (e: Exception) {
                                        error = mensajeDe(e)
                                    } finally {
                                        abriendo = false
                                    }
                                }
                            },
                            enabled = !abriendo,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        BotonBorde(
                            texto = "Ver perfil del vendedor",
                            onClick = { item.vendedor?.handle?.let(onPerfilClick) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    item.vendedor != null -> {
                        BotonBorde(
                            texto = "Ver perfil del vendedor",
                            onClick = { item.vendedor?.handle?.let(onPerfilClick) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }

                BotonCompartir(
                    onClick = { compartirEnlace(context, EnlacesWeb.anuncio(anuncioId), item.titulo) },
                )

                if (!item.esMio) {
                    error?.let { Text(it, color = AgoraColors.Danger, style = MaterialTheme.typography.bodyMedium) }
                }
            }
        }
    }
}

/** Como `BotonBorde`, con el ícono de compartir delante. */
@Composable
private fun BotonCompartir(onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 44.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, AgoraButtonShape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Share, contentDescription = null, tint = AgoraColors.Texto, modifier = Modifier.size(18.dp))
        Text(
            AgoraCopy.compartir.accion,
            color = AgoraColors.Texto,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(start = 8.dp),
        )
    }
}
