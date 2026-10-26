package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.SubcomposeAsyncImage

private const val ZOOM_MAXIMO = 5f
private const val ZOOM_DOBLE_TOQUE = 2.5f

/**
 * Visor a pantalla completa: deslizar entre imágenes, pellizcar para hacer
 * zoom y doble toque para acercar/alejar. Con zoom, arrastrar mueve la imagen;
 * sin zoom, arrastrar pasa a la siguiente.
 *
 * [urls] ya deben venir absolutas (`ApiClient.resolveUrl`).
 */
@Composable
fun VisorImagenes(
    urls: List<String>,
    inicio: Int,
    onCerrar: () -> Unit,
) {
    if (urls.isEmpty()) return
    Dialog(
        onDismissRequest = onCerrar,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
        ),
    ) {
        val pager = rememberPagerState(
            initialPage = inicio.coerceIn(0, urls.lastIndex),
            pageCount = { urls.size },
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
        ) {
            HorizontalPager(
                state = pager,
                modifier = Modifier.fillMaxSize(),
                beyondViewportPageCount = 1,
            ) { pagina ->
                ImagenZoomable(
                    url = urls[pagina],
                    activa = pager.currentPage == pagina,
                    descripcion = "Foto ${pagina + 1} de ${urls.size}",
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .safeDrawingPadding(),
            ) {
                IconButton(
                    onClick = onCerrar,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp),
                ) {
                    Icon(Icons.Filled.Close, contentDescription = "Cerrar", tint = Color.White)
                }
                if (urls.size > 1) {
                    Text(
                        "${pager.currentPage + 1} / ${urls.size}",
                        color = Color.White,
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 20.dp),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ImagenZoomable(url: String, activa: Boolean, descripcion: String) {
    var escala by remember { mutableFloatStateOf(1f) }
    // Sube con «Reintentar»: recrea la imagen y Coil vuelve a pedirla.
    var intento by remember { mutableIntStateOf(0) }
    var desplazamiento by remember { mutableStateOf(Offset.Zero) }
    var tamano by remember { mutableStateOf(IntSize.Zero) }

    // Al pasar a otra imagen, la que se deja vuelve a su tamaño.
    LaunchedEffect(activa) {
        if (!activa) {
            escala = 1f
            desplazamiento = Offset.Zero
        }
    }

    fun limitar(o: Offset, s: Float): Offset {
        val maxX = tamano.width * (s - 1f) / 2f
        val maxY = tamano.height * (s - 1f) / 2f
        return Offset(o.x.coerceIn(-maxX, maxX), o.y.coerceIn(-maxY, maxY))
    }

    val estado = rememberTransformableState { zoom, pan, _ ->
        val nueva = (escala * zoom).coerceIn(1f, ZOOM_MAXIMO)
        escala = nueva
        desplazamiento = if (nueva <= 1f) Offset.Zero else limitar(desplazamiento + pan, nueva)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .onSizeChanged { tamano = it }
            .pointerInput(url) {
                detectTapGestures(
                    onDoubleTap = { punto ->
                        if (escala > 1f) {
                            escala = 1f
                            desplazamiento = Offset.Zero
                        } else {
                            val centro = Offset(tamano.width / 2f, tamano.height / 2f)
                            escala = ZOOM_DOBLE_TOQUE
                            desplazamiento = limitar((centro - punto) * (ZOOM_DOBLE_TOQUE - 1f), ZOOM_DOBLE_TOQUE)
                        }
                    },
                )
            }
            .transformable(state = estado, canPan = { escala > 1f }),
        contentAlignment = Alignment.Center,
    ) {
        key(intento) {
            // Con spinner mientras carga y aviso si falla (antes quedaba en negro).
            SubcomposeAsyncImage(
                model = url,
                contentDescription = descripcion,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = escala
                        scaleY = escala
                        translationX = desplazamiento.x
                        translationY = desplazamiento.y
                    },
                loading = {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color.White)
                    }
                },
                error = {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                "No se pudo cargar la foto",
                                color = Color.White,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            TextButton(onClick = { intento++ }) {
                                Text("Reintentar", color = Color.White)
                            }
                        }
                    }
                },
            )
        }
    }
}
