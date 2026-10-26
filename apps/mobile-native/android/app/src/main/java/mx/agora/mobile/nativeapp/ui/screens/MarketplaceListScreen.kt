package mx.agora.mobile.nativeapp.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Bed
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Chair
import androidx.compose.material.icons.outlined.Checkroom
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.Handyman
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import mx.agora.mobile.nativeapp.ui.components.ChipD
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraChipShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.theme.AgoraFotoShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.formatearCuota
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

// Mismas categorías (y valores de API) que CreateAnuncioScreen.
private val categorias = listOf(
    "" to "Todo",
    "LIBROS" to "Libros",
    "ELECTRONICA" to "Electrónica",
    "MUEBLES" to "Muebles",
    "ROPA" to "Ropa",
    "CUARTO" to "Cuarto",
    "SERVICIOS" to "Servicios",
    "OTRO" to "Otro",
)

/** Ícono de la categoría: lo que se ve cuando el anuncio no trae foto (no un gris vacío). */
private fun iconoCategoria(categoria: String): ImageVector = when (categoria) {
    "LIBROS" -> Icons.AutoMirrored.Outlined.MenuBook
    "ELECTRONICA" -> Icons.Outlined.Devices
    "MUEBLES" -> Icons.Outlined.Chair
    "ROPA" -> Icons.Outlined.Checkroom
    "CUARTO" -> Icons.Outlined.Bed
    "SERVICIOS" -> Icons.Outlined.Handyman
    else -> Icons.Outlined.Category
}

/**
 * Mercado en diseño D (docs/diseno-d.md §4): buscador, chips de categoría y
 * cuadrícula de dos columnas con el precio sobre la foto. El título «Mercado» lo
 * pone la barra superior de la ruta; aquí no se repite.
 *
 * [onConsejosClick] abre las reglas de la comunidad desde el aviso de seguridad
 * del pie; sin él, el aviso sale sin enlace.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarketplaceListScreen(
    tokenProvider: () -> String?,
    onAnuncioClick: (String) -> Unit,
    onCrearClick: () -> Unit,
    modifier: Modifier = Modifier,
    onConsejosClick: (() -> Unit)? = null,
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
    // la lista tronaba.
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
        // Buscador y «Vender» en una fila: la barra superior ya dice «Mercado» y un
        // título grande aparte empujaba la primera fila de fotos fuera de la vista.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = 8.dp, bottom = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CampoBusqueda(
                valor = busqueda,
                onValor = { busqueda = it },
                modifier = Modifier.weight(1f),
            )
            BotonVender(onClick = onCrearClick)
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = AgoraSpacing.Pantalla),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            categorias.forEach { (valor, etiqueta) ->
                ChipD(
                    texto = etiqueta,
                    activo = categoria == valor,
                    onClick = { categoria = valor },
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
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = AgoraColors.Naranja,
                    )
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
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(
                            start = AgoraSpacing.Tarjeta,
                            end = AgoraSpacing.Tarjeta,
                            top = 6.dp,
                            bottom = AgoraSpacing.Lg,
                        ),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(anuncios, key = { it.id }) { anuncio ->
                            AnuncioCard(anuncio = anuncio, onClick = { onAnuncioClick(anuncio.id) })
                        }
                        if (cursor != null) {
                            item(key = "mas", span = { GridItemSpan(maxLineSpan) }) {
                                if (errorMas != null) {
                                    AgoraPieErrorPagina(
                                        mensaje = errorMas!!,
                                        onReintentar = { cargarMas() },
                                    )
                                } else {
                                    BotonCargarMas(
                                        cargandoMas = cargandoMas,
                                        enabled = !cargandoMas && !cargando,
                                        onClick = { cargarMas() },
                                    )
                                }
                            }
                        }
                        item(key = "aviso", span = { GridItemSpan(maxLineSpan) }) {
                            AvisoSeguridad(onConsejosClick = onConsejosClick)
                        }
                    }
                    // Al cambiar categoría o búsqueda la lista vieja sigue: que se note que carga.
                    if (cargando) {
                        LinearProgressIndicator(
                            modifier = Modifier
                                .fillMaxWidth()
                                .align(Alignment.TopCenter),
                            color = AgoraColors.Naranja,
                            trackColor = AgoraColors.Superficie2,
                        )
                    }
                }
            }
        }
    }
}

/** Buscador de la D: `superficie`, radio 14, borde de 1 dp y lupa en `tinta-media`. */
@Composable
private fun CampoBusqueda(
    valor: String,
    onValor: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val foco = LocalFocusManager.current
    Row(
        modifier = modifier
            .height(46.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, AgoraButtonShape)
            .padding(start = 14.dp, end = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Outlined.Search,
            contentDescription = null,
            tint = AgoraColors.TextoMedio,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(8.dp))
        BasicTextField(
            value = valor,
            onValueChange = onValor,
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = AgoraColors.Texto),
            cursorBrush = SolidColor(AgoraColors.Naranja),
            // La búsqueda ya corre sola al escribir; el botón del teclado solo lo cierra.
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { foco.clearFocus() }),
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .semantics { contentDescription = "Buscar en el mercado" },
            decorationBox = { campo ->
                Box(
                    modifier = Modifier.fillMaxHeight(),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    if (valor.isEmpty()) {
                        Text(
                            "Libros, monitor, bici…",
                            style = MaterialTheme.typography.bodyMedium,
                            color = AgoraColors.TextoMedio,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    campo()
                }
            },
        )
        if (valor.isNotEmpty()) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(AgoraChipShape)
                    .clickable(role = Role.Button) { onValor("") },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.Close,
                    contentDescription = "Borrar búsqueda",
                    tint = AgoraColors.TextoMedio,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

/** «Vender» en naranja, como Publicar: es la acción principal del mercado. */
@Composable
private fun BotonVender(onClick: () -> Unit) {
    val tinta = MaterialTheme.colorScheme.onPrimary
    Row(
        modifier = Modifier
            .height(46.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.Naranja)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = "Vender algo" }
            .padding(start = 12.dp, end = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(Icons.Outlined.Add, contentDescription = null, tint = tinta, modifier = Modifier.size(18.dp))
        Text(
            "Vender",
            color = tinta,
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
        )
    }
}

@Composable
private fun AnuncioCard(anuncio: AnuncioDto, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(AgoraFotoShape)
            .background(AgoraColors.Superficie)
            .clickable(onClickLabel = "Ver anuncio", role = Role.Button, onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .background(AgoraColors.Superficie2),
        ) {
            // El ícono va debajo de la foto: si no hay foto o no carga, queda él y no un hueco gris.
            Icon(
                iconoCategoria(anuncio.categoria),
                contentDescription = null,
                tint = AgoraColors.TextoMedio,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(40.dp),
            )
            val imagen = anuncio.imagenes.firstOrNull()?.let { ApiClient.resolveUrl(it) }
            if (imagen != null) {
                AsyncImage(
                    model = imagen,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            }
            // Pastilla oscura translúcida: se lee igual sobre cualquier foto y en los dos temas.
            Text(
                formatearCuota(anuncio.precioMxn),
                color = Color.White,
                fontFamily = AgoraFonts.titulo,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 14.sp,
                maxLines = 1,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(8.dp)
                    .background(Color.Black.copy(alpha = 0.72f), RoundedCornerShape(10.dp))
                    .padding(horizontal = 9.dp, vertical = 4.dp),
            )
            // «Disponible» es lo normal en el mercado: solo se marca lo que no lo está.
            if (anuncio.estadoVenta != ESTADO_DISPONIBLE) {
                EtiquetaEstadoAnuncio(
                    anuncio.estadoVenta,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp),
                )
            }
        }
        Column(
            modifier = Modifier.padding(start = 12.dp, end = 12.dp, top = 10.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            // Dos líneas fijas: así las tarjetas de una misma fila quedan parejas.
            Text(
                anuncio.titulo,
                style = MaterialTheme.typography.titleSmall,
                color = AgoraColors.Texto,
                maxLines = 2,
                minLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                "${anuncio.vendedor?.nombre ?: "Alguien"} · ${haceCuanto(anuncio.createdAt)}",
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextoMedio,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun BotonCargarMas(cargandoMas: Boolean, enabled: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp)
            .heightIn(min = 44.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, AgoraButtonShape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (cargandoMas) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                strokeWidth = 2.dp,
                color = AgoraColors.Naranja,
            )
            Spacer(Modifier.width(8.dp))
            Text("Cargando…", color = AgoraColors.Texto, style = MaterialTheme.typography.labelLarge)
        } else {
            Text("Cargar más", color = AgoraColors.Texto, style = MaterialTheme.typography.labelLarge)
        }
    }
}

/** Pie del mockup: el trato es en persona. Mismo texto que la web. */
@Composable
private fun AvisoSeguridad(onConsejosClick: (() -> Unit)?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 4.dp, end = 4.dp, top = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            Icons.Outlined.Shield,
            contentDescription = null,
            tint = AgoraColors.TextoMedio,
            modifier = Modifier
                .padding(top = 1.dp)
                .size(16.dp),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                "Entrega y paga en persona dentro del campus; no adelantes dinero.",
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextoMedio,
            )
            if (onConsejosClick != null) {
                Box(
                    modifier = Modifier
                        .heightIn(min = 44.dp)
                        .clip(AgoraChipShape)
                        .clickable(role = Role.Button, onClick = onConsejosClick)
                        .padding(end = 6.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    Text(
                        "Consejos de seguridad",
                        style = MaterialTheme.typography.labelLarge,
                        color = AgoraColors.NaranjaTinta,
                    )
                }
            }
        }
    }
}

/** Estados de venta de un anuncio (`ESTADOS_ANUNCIO` en packages/contracts). */
internal const val ESTADO_DISPONIBLE = "DISPONIBLE"
internal const val ESTADO_APARTADO = "APARTADO"
internal const val ESTADO_VENDIDO = "VENDIDO"

/** Etiqueta según el estado: Disponible, Apartado o Vendido. */
@Composable
internal fun EtiquetaEstadoAnuncio(estadoVenta: String, modifier: Modifier = Modifier) {
    val (texto, color, fondo) = when (estadoVenta) {
        ESTADO_DISPONIBLE -> Triple("Disponible", AgoraColors.Success, AgoraColors.SuccessSuave)
        // Apartado en naranja suave, como en el mockup; va sobre la foto y debe leerse en ambos temas.
        ESTADO_APARTADO -> Triple("Apartado", AgoraColors.NaranjaTinta, AgoraColors.NaranjaSuave)
        ESTADO_VENDIDO -> Triple("Vendido", AgoraColors.Danger, AgoraColors.DangerSuave)
        else -> return
    }
    Text(
        texto,
        color = color,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        maxLines = 1,
        modifier = modifier
            .background(fondo, RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}
