package mx.agora.mobile.nativeapp.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.AnuncioDto
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MarketplaceApi
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.components.AgoraPieErrorPagina
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.formatearPrecio
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

// Mismas categorías (y valores de API) que CreateAnuncioScreen.
private val categorias = listOf(
    "" to "Todas",
    "LIBROS" to "Libros",
    "ELECTRONICA" to "Electrónica",
    "MUEBLES" to "Muebles",
    "ROPA" to "Ropa",
    "CUARTO" to "Cuarto",
    "SERVICIOS" to "Servicios",
    "OTRO" to "Otro",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarketplaceListScreen(
    tokenProvider: () -> String?,
    onAnuncioClick: (String) -> Unit,
    onCrearClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var anuncios by remember { mutableStateOf<List<AnuncioDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var categoria by remember { mutableStateOf("") }
    var busqueda by remember { mutableStateOf("") }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var cargandoMas by remember { mutableStateOf(false) }
    var errorMas by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            error = null
            try {
                val datos = ApiClient.api<MarketplaceApi>(tokenProvider).listar(
                    categoria = categoria.takeIf { it.isNotBlank() },
                    q = busqueda.trim().takeIf { it.isNotBlank() },
                    cursor = null,
                )
                anuncios = datos.anuncios
                cursor = datos.siguienteCursor
                errorMas = null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val mensaje = mensajeDe(e)
                if (refresh && anuncios.isNotEmpty()) {
                    // Con lista en pantalla no se vacía: se avisa.
                    Toast.makeText(context, mensaje, Toast.LENGTH_SHORT).show()
                } else {
                    error = mensaje
                    anuncios = emptyList()
                }
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    // Con bandera y sin repetir ids: dos toques seguidos duplicaban claves y
    // la LazyColumn tronaba.
    fun cargarMas() {
        val desde = cursor ?: return
        // Mientras recarga la primera página el cursor viejo ya no sirve.
        if (cargandoMas || cargando) return
        val cat = categoria
        val q = busqueda
        scope.launch {
            cargandoMas = true
            errorMas = null
            try {
                val datos = ApiClient.api<MarketplaceApi>(tokenProvider).listar(
                    categoria = cat.takeIf { it.isNotBlank() },
                    q = q.trim().takeIf { it.isNotBlank() },
                    cursor = desde,
                )
                // Si cambió el filtro mientras tanto, esta página ya no va.
                if (cat == categoria && q == busqueda) {
                    val vistos = anuncios.mapTo(HashSet()) { it.id }
                    anuncios = anuncios + datos.anuncios.filter { it.id !in vistos }
                    cursor = datos.siguienteCursor
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMas = mensajeDe(e)
            } finally {
                cargandoMas = false
            }
        }
    }

    LaunchedEffect(categoria, busqueda) {
        kotlinx.coroutines.delay(250)
        cargar()
    }

    Column(modifier = modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = busqueda,
                onValueChange = { busqueda = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Buscar anuncios…") },
                singleLine = true,
            )
            Button(
                onClick = onCrearClick,
                modifier = Modifier.semantics { contentDescription = "Vender algo" },
            ) {
                Text("+ Vender")
            }
        }

        Row(
            modifier = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            categorias.forEach { (valor, etiqueta) ->
                FilterChip(
                    selected = categoria == valor,
                    onClick = { categoria = valor },
                    label = { Text(etiqueta) },
                )
            }
        }

        AgoraPullToRefreshBox(
            isRefreshing = refrescando,
            onRefresh = { cargar(refresh = true) },
            modifier = Modifier.fillMaxSize(),
        ) {
            when {
                cargando && anuncios.isEmpty() -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                error != null && anuncios.isEmpty() -> {
                    AgoraEstadoDesplazable {
                        AgoraErrorState(
                            message = error!!,
                            onRetry = { cargar() },
                        )
                    }
                }
                anuncios.isEmpty() -> {
                    AgoraEstadoDesplazable {
                        AgoraEmptyState(
                            state = AgoraCopy.emptyMarketplace,
                            ctaLabel = "Publicar un anuncio",
                            onCta = onCrearClick,
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(anuncios, key = { it.id }) { anuncio ->
                            AnuncioCard(anuncio = anuncio, onClick = { onAnuncioClick(anuncio.id) })
                        }
                        if (cursor != null) {
                            item(key = "mas") {
                                if (errorMas != null) {
                                    AgoraPieErrorPagina(
                                        mensaje = errorMas!!,
                                        onReintentar = { cargarMas() },
                                    )
                                } else {
                                    Button(
                                        onClick = { cargarMas() },
                                        enabled = !cargandoMas && !cargando,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        if (cargandoMas) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(18.dp),
                                                strokeWidth = 2.dp,
                                            )
                                            Spacer(Modifier.width(8.dp))
                                            Text("Cargando…")
                                        } else {
                                            Text("Cargar más")
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Al cambiar categoría o búsqueda la lista vieja sigue: que se note que carga.
                    if (cargando) {
                        LinearProgressIndicator(
                            modifier = Modifier
                                .fillMaxWidth()
                                .align(Alignment.TopCenter),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AnuncioCard(anuncio: AnuncioDto, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = "Ver anuncio", role = Role.Button, onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = AgoraColors.Superficie),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            val imagen = anuncio.imagenes.firstOrNull()?.let { ApiClient.resolveUrl(it) }
            if (imagen != null) {
                AsyncImage(
                    model = imagen,
                    contentDescription = null,
                    modifier = Modifier
                        .height(72.dp)
                        .fillMaxWidth(0.25f),
                    contentScale = ContentScale.Crop,
                )
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    formatearPrecio(anuncio.precioMxn),
                    style = MaterialTheme.typography.titleMedium,
                    color = AgoraColors.Naranja,
                )
                Text(anuncio.titulo, style = MaterialTheme.typography.titleSmall)
                Text(
                    "${anuncio.vendedor?.nombre ?: "Alguien"} · ${haceCuanto(anuncio.createdAt)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = AgoraColors.TextoMedio,
                )
                // Antes todo lo que no era DISPONIBLE decía «Vendido», también lo apartado.
                EtiquetaEstadoAnuncio(anuncio.estadoVenta)
            }
        }
    }
}

/** Estados de venta de un anuncio (`ESTADOS_ANUNCIO` en packages/contracts). */
internal const val ESTADO_DISPONIBLE = "DISPONIBLE"
internal const val ESTADO_APARTADO = "APARTADO"
internal const val ESTADO_VENDIDO = "VENDIDO"

/** Etiqueta de color según el estado: Disponible, Apartado o Vendido. */
@Composable
internal fun EtiquetaEstadoAnuncio(estadoVenta: String, modifier: Modifier = Modifier) {
    val (texto, color, fondo) = when (estadoVenta) {
        ESTADO_DISPONIBLE -> Triple("Disponible", AgoraColors.Success, AgoraColors.SuccessSuave)
        // WarningTexto: el ámbar de marca no se lee como texto.
        ESTADO_APARTADO -> Triple("Apartado", AgoraColors.WarningTexto, AgoraColors.WarningSuave)
        ESTADO_VENDIDO -> Triple("Vendido", AgoraColors.Danger, AgoraColors.DangerSuave)
        else -> return
    }
    Text(
        texto,
        color = color,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier
            .background(fondo, RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 2.dp),
    )
}
