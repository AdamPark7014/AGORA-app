package mx.agora.mobile.nativeapp.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.MediaRepository
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CrearAnuncioRequest
import mx.agora.mobile.nativeapp.data.api.MarketplaceApi
import mx.agora.mobile.nativeapp.ui.components.MiniaturaAdjunto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

private val categorias = listOf(
    "LIBROS" to "Libros",
    "ELECTRONICA" to "Electrónica",
    "MUEBLES" to "Muebles",
    "ROPA" to "Ropa",
    "CUARTO" to "Cuarto",
    "SERVICIOS" to "Servicios",
    "OTRO" to "Otro",
)

/** Igual que `crearAnuncioSchema` en packages/contracts: `imagenIds.max(6)` y `precioMxn` 0–1,000,000. */
private const val MAX_FOTOS_ANUNCIO = 6
private const val PRECIO_MAXIMO = 1_000_000

private data class FotoAnuncio(
    val uri: Uri,
    val mediaId: String? = null,
    val previewUrl: String? = null,
    val subiendo: Boolean = true,
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CreateAnuncioScreen(
    tokenProvider: () -> String?,
    onCreado: (String) -> Unit,
    onCancelar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val mediaRepo = remember { MediaRepository(context) }
    val scope = rememberCoroutineScope()

    var titulo by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }
    var categoria by remember { mutableStateOf("LIBROS") }
    var precio by remember { mutableStateOf("") }
    val fotos = remember { mutableStateListOf<FotoAnuncio>() }
    var enviando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // Cada foto se ubica por su uri al terminar de subir: quitar otra mientras
    // tanto no desfasa nada.
    fun agregarFotos(uris: List<Uri>) {
        val nuevas = uris.distinct().filter { uri -> fotos.none { it.uri == uri } }
        if (nuevas.isEmpty()) return
        val aceptadas = nuevas.take((MAX_FOTOS_ANUNCIO - fotos.size).coerceAtLeast(0))
        error = if (aceptadas.size < nuevas.size) {
            "Solo caben $MAX_FOTOS_ANUNCIO fotos por anuncio."
        } else {
            null
        }
        aceptadas.forEach { uri ->
            fotos.add(FotoAnuncio(uri = uri))
            scope.launch {
                try {
                    val subida = mediaRepo.subir(uri, tokenProvider)
                    val i = fotos.indexOfFirst { it.uri == uri }
                    if (i >= 0) {
                        fotos[i] = fotos[i].copy(
                            mediaId = subida.id,
                            previewUrl = ApiClient.resolveUrl(subida.url),
                            subiendo = false,
                        )
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    fotos.removeAll { it.uri == uri }
                    error = mensajeDe(e)
                }
            }
        }
    }

    val cupoFotos = (MAX_FOTOS_ANUNCIO - fotos.size).coerceAtLeast(0)
    // PickMultipleVisualMedia exige maxItems > 1; con un solo lugar libre se usa el selector simple.
    val pickerVarias = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = cupoFotos.coerceAtLeast(2)),
    ) { uris -> agregarFotos(uris) }
    val pickerUna = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri -> if (uri != null) agregarFotos(listOf(uri)) }

    val subiendo = fotos.any { it.subiendo }
    // toIntOrNull: un campo vacío o un número enorme no truena, solo deshabilita Publicar.
    val precioMxn = precio.toIntOrNull()?.takeIf { it in 0..PRECIO_MAXIMO }
    val precioFueraDeRango = precio.isNotEmpty() && precioMxn == null

    val puedePublicar = titulo.trim().length >= 3 &&
        descripcion.isNotBlank() &&
        precioMxn != null &&
        !enviando &&
        !subiendo

    Column(
        // Con edge-to-edge (targetSdk 36) adjustResize ya no encoge la ventana:
        // imePadding va antes del scroll para que el teclado no tape los campos.
        modifier = modifier
            .fillMaxSize()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Nuevo anuncio", style = MaterialTheme.typography.headlineSmall)

        OutlinedTextField(
            value = titulo,
            onValueChange = { titulo = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Título") },
            singleLine = true,
            // Lo mismo que pide puedePublicar (y crearAnuncioSchema).
            supportingText = { Text("Mínimo 3 caracteres") },
        )
        OutlinedTextField(
            value = descripcion,
            onValueChange = { descripcion = it },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            label = { Text("Descripción") },
            supportingText = { Text("Obligatoria") },
        )
        OutlinedTextField(
            value = precio,
            onValueChange = { nuevo -> if (nuevo.length <= 7 && nuevo.all { it.isDigit() }) precio = nuevo },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Precio MXN") },
            singleLine = true,
            isError = precioFueraDeRango,
            supportingText = if (precioFueraDeRango) {
                { Text("El precio máximo es de \$1,000,000.") }
            } else {
                null
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Number,
                imeAction = ImeAction.Done,
            ),
        )

        Text("Categoría", style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            categorias.forEach { (valor, etiqueta) ->
                FilterChip(
                    selected = categoria == valor,
                    onClick = { categoria = valor },
                    label = { Text(etiqueta) },
                )
            }
        }

        if (fotos.isNotEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                items(fotos, key = { it.uri.toString() }) { foto ->
                    MiniaturaAdjunto(
                        model = foto.previewUrl ?: foto.uri,
                        esVideo = false,
                        subiendo = foto.subiendo,
                        onQuitar = { fotos.removeAll { it.uri == foto.uri } },
                    )
                }
            }
        }

        OutlinedButton(
            onClick = {
                val request = PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                if (cupoFotos >= 2) pickerVarias.launch(request) else pickerUna.launch(request)
            },
            enabled = !subiendo && cupoFotos > 0,
        ) {
            // El lector no lee el emoji: la descripción va sin él.
            val (textoFotos, lecturaFotos) = when {
                subiendo -> "Subiendo fotos…" to "Subiendo fotos…"
                cupoFotos == 0 -> "Máx. $MAX_FOTOS_ANUNCIO fotos" to "Máximo $MAX_FOTOS_ANUNCIO fotos"
                fotos.isEmpty() -> "📷 Agregar fotos" to "Agregar fotos"
                else -> Pair(
                    "📷 Agregar más (${fotos.size}/$MAX_FOTOS_ANUNCIO)",
                    "Agregar más fotos, ${fotos.size} de $MAX_FOTOS_ANUNCIO",
                )
            }
            Text(textoFotos, modifier = Modifier.semantics { contentDescription = lecturaFotos })
        }

        // Arriba de Publicar: abajo de Cancelar quedaba fuera de vista.
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Button(
            onClick = {
                val precioFinal = precioMxn ?: return@Button
                scope.launch {
                    enviando = true
                    error = null
                    try {
                        val resp = ApiClient.api<MarketplaceApi>(tokenProvider).crear(
                            CrearAnuncioRequest(
                                titulo = titulo.trim(),
                                descripcion = descripcion.trim(),
                                categoria = categoria,
                                precioMxn = precioFinal,
                                imagenIds = fotos.mapNotNull { it.mediaId },
                            ),
                        )
                        onCreado(resp.id)
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        error = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
                    } finally {
                        enviando = false
                    }
                }
            },
            enabled = puedePublicar,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (enviando) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text("Publicando…")
            } else {
                Text("Publicar")
            }
        }

        OutlinedButton(onClick = onCancelar, modifier = Modifier.fillMaxWidth()) {
            Text("Cancelar")
        }
    }
}
