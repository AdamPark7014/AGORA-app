package mx.agora.mobile.nativeapp.ui.screens

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
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.CrearEventoRequest
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import java.time.LocalDateTime
import java.time.ZoneId

private val tiposEvento = listOf(
    "FIESTA" to "Fiesta",
    "ACADEMICO" to "Académico",
    "DEPORTIVO" to "Deportivo",
    "CULTURAL" to "Cultural",
    "ORGANIZACION" to "Organización",
    "OTRO" to "Otro",
)

private fun mananaNocheIso(): String {
    val manana = LocalDateTime.now(ZoneId.of("America/Mexico_City"))
        .plusDays(1)
        .withHour(19)
        .withMinute(0)
        .withSecond(0)
        .withNano(0)
    return manana.atZone(ZoneId.of("America/Mexico_City")).toInstant().toString()
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CreateEventoScreen(
    tokenProvider: () -> String?,
    onCreado: (String) -> Unit,
    onCancelar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()

    var titulo by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }
    var tipo by remember { mutableStateOf("FIESTA") }
    var lugar by remember { mutableStateOf("") }
    var inicioAt by remember { mutableStateOf(mananaNocheIso()) }
    var costo by remember { mutableStateOf("") }
    var cupo by remember { mutableStateOf("") }
    var comunidadSlug by remember { mutableStateOf<String?>(null) }
    var comunidades by remember { mutableStateOf<List<ComunidadDto>>(emptyList()) }
    var menuComunidad by remember { mutableStateOf(false) }
    var enviando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            comunidades = ApiClient.api<PerfilApi>(tokenProvider).misComunidades()
        } catch (_: Exception) {
            comunidades = emptyList()
        }
    }

    val puedePublicar = titulo.trim().length >= 3 &&
        descripcion.trim().isNotBlank() &&
        lugar.trim().length >= 2 &&
        inicioAt.isNotBlank() &&
        !enviando

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Nuevo evento", style = MaterialTheme.typography.headlineSmall)

        OutlinedTextField(
            value = titulo,
            onValueChange = { titulo = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Título") },
            singleLine = true,
        )
        OutlinedTextField(
            value = lugar,
            onValueChange = { lugar = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Lugar") },
            singleLine = true,
        )
        OutlinedTextField(
            value = descripcion,
            onValueChange = { descripcion = it },
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp),
            label = { Text("Descripción") },
        )

        Text("Tipo", style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            tiposEvento.forEach { (valor, etiqueta) ->
                FilterChip(
                    selected = tipo == valor,
                    onClick = { tipo = valor },
                    label = { Text(etiqueta) },
                )
            }
        }

        OutlinedTextField(
            value = inicioAt,
            onValueChange = { inicioAt = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Inicio (ISO, ej. 2026-08-25T19:00:00Z)") },
            singleLine = true,
        )

        OutlinedTextField(
            value = costo,
            onValueChange = { if (it.all { c -> c.isDigit() }) costo = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Costo MXN (opcional, 0 = gratis)") },
            singleLine = true,
        )
        OutlinedTextField(
            value = cupo,
            onValueChange = { if (it.all { c -> c.isDigit() }) cupo = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Cupo (opcional)") },
            singleLine = true,
        )

        if (comunidades.isNotEmpty()) {
            val etiquetaComunidad = comunidadSlug?.let { slug ->
                comunidades.find { it.slug == slug }?.nombre
            } ?: "Toda la universidad"

            ExposedDropdownMenuBox(
                expanded = menuComunidad,
                onExpandedChange = { menuComunidad = it },
            ) {
                OutlinedTextField(
                    value = etiquetaComunidad,
                    onValueChange = {},
                    readOnly = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                    label = { Text("Comunidad (opcional)") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = menuComunidad) },
                )
                ExposedDropdownMenu(
                    expanded = menuComunidad,
                    onDismissRequest = { menuComunidad = false },
                ) {
                    DropdownMenuItem(
                        text = { Text("Toda la universidad") },
                        onClick = {
                            comunidadSlug = null
                            menuComunidad = false
                        },
                    )
                    comunidades.forEach { comunidad ->
                        DropdownMenuItem(
                            text = { Text(comunidad.nombre) },
                            onClick = {
                                comunidadSlug = comunidad.slug
                                menuComunidad = false
                            },
                        )
                    }
                }
            }
        }

        Button(
            onClick = {
                scope.launch {
                    enviando = true
                    error = null
                    try {
                        val resp = ApiClient.api<EventosApi>(tokenProvider).crear(
                            CrearEventoRequest(
                                titulo = titulo.trim(),
                                descripcion = descripcion.trim(),
                                tipo = tipo,
                                lugar = lugar.trim(),
                                inicioAt = inicioAt.trim(),
                                costoMxn = costo.toIntOrNull(),
                                cupo = cupo.toIntOrNull(),
                                comunidadSlug = comunidadSlug,
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
                Text("Publicar evento")
            }
        }

        OutlinedButton(onClick = onCancelar, modifier = Modifier.fillMaxWidth()) {
            Text("Cancelar")
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}
