package mx.agora.mobile.nativeapp.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.MediaRepository
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CrearAnuncioRequest
import mx.agora.mobile.nativeapp.data.api.MarketplaceApi
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
    var imagenId by remember { mutableStateOf<String?>(null) }
    var previewUri by remember { mutableStateOf<Uri?>(null) }
    var previewUrl by remember { mutableStateOf<String?>(null) }
    var subiendo by remember { mutableStateOf(false) }
    var enviando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val picker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        previewUri = uri
        previewUrl = null
        imagenId = null
        scope.launch {
            subiendo = true
            error = null
            try {
                val subida = mediaRepo.subir(uri, tokenProvider)
                imagenId = subida.id
                previewUrl = ApiClient.resolveUrl(subida.url)
            } catch (e: Exception) {
                error = mensajeDe(e)
                previewUri = null
            } finally {
                subiendo = false
            }
        }
    }

    val puedePublicar = titulo.trim().length >= 3 &&
        descripcion.isNotBlank() &&
        precio.toIntOrNull() != null &&
        !enviando &&
        !subiendo

    Column(
        modifier = modifier
            .fillMaxSize()
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
        )
        OutlinedTextField(
            value = descripcion,
            onValueChange = { descripcion = it },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            label = { Text("Descripción") },
        )
        OutlinedTextField(
            value = precio,
            onValueChange = { if (it.all { c -> c.isDigit() }) precio = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Precio MXN") },
            singleLine = true,
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

        val imagen = previewUrl ?: previewUri?.toString()
        if (imagen != null) {
            AsyncImage(
                model = imagen,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                contentScale = ContentScale.Crop,
            )
        }

        OutlinedButton(
            onClick = {
                picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            },
            enabled = !subiendo,
        ) {
            Text(if (subiendo) "Subiendo foto…" else "📷 Agregar foto")
        }

        Button(
            onClick = {
                scope.launch {
                    enviando = true
                    error = null
                    try {
                        val resp = ApiClient.api<MarketplaceApi>(tokenProvider).crear(
                            CrearAnuncioRequest(
                                titulo = titulo.trim(),
                                descripcion = descripcion.trim(),
                                categoria = categoria,
                                precioMxn = precio.toInt(),
                                imagenIds = imagenId?.let { listOf(it) } ?: emptyList(),
                            ),
                        )
                        onCreado(resp.id)
                    } catch (e: Exception) {
                        error = mensajeDe(e)
                    } finally {
                        enviando = false
                    }
                }
            },
            enabled = puedePublicar,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (enviando) {
                CircularProgressIndicator(modifier = Modifier.height(20.dp))
            } else {
                Text("Publicar")
            }
        }

        OutlinedButton(onClick = onCancelar, modifier = Modifier.fillMaxWidth()) {
            Text("Cancelar")
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}
