package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.DirectorioApi
import mx.agora.mobile.nativeapp.data.api.DirectorioPersonaDto
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import java.util.Calendar

@Composable
fun DirectorioScreen(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
    onPerfil: (String) -> Unit = {},
) {
    var q by remember { mutableStateOf("") }
    var generacion by remember { mutableStateOf<Int?>(null) }
    var resultados by remember { mutableStateOf<List<DirectorioPersonaDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    val ano = Calendar.getInstance().get(Calendar.YEAR)
    val generaciones = remember { (0 until 8).map { ano + 1 - it } }

    fun buscar(desde: String? = null) {
        scope.launch {
            if (desde == null) cargando = true
            try {
                val datos = ApiClient.api<DirectorioApi>(tokenProvider).buscar(
                    q = q.trim().ifBlank { null },
                    generacion = generacion,
                    cursor = desde,
                )
                resultados = if (desde != null) resultados + datos.resultados else datos.resultados
                cursor = datos.siguienteCursor
            } catch (_: Exception) {
                if (desde == null) resultados = emptyList()
            } finally {
                if (desde == null) cargando = false
            }
        }
    }

    LaunchedEffect(q, generacion) {
        delay(300)
        buscar()
    }

    Column(Modifier.fillMaxSize().then(modifier)) {
        OutlinedTextField(
            value = q,
            onValueChange = { q = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            placeholder = { Text("Nombre o @handle") },
            singleLine = true,
        )

        LazyRow(
            modifier = Modifier.padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp),
        ) {
            item {
                FilterChip(
                    selected = generacion == null,
                    onClick = { generacion = null },
                    label = { Text("Todas") },
                )
            }
            items(generaciones) { gen ->
                FilterChip(
                    selected = generacion == gen,
                    onClick = { generacion = gen },
                    label = { Text("Gen $gen") },
                )
            }
        }

        when {
            cargando -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            resultados.isEmpty() -> {
                AgoraEmptyState(
                    state = AgoraCopy.emptyDirectorio,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(resultados, key = { it.handle }) { persona ->
                        Card(
                            onClick = { onPerfil(persona.handle) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    iniciales(persona),
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .padding(horizontal = 12.dp, vertical = 10.dp),
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                                Column {
                                    Text(
                                        "${persona.nombre} ${persona.apellidos}",
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        buildString {
                                            append("@${persona.handle}")
                                            persona.carrera?.let { append(" · $it") }
                                            persona.generacion?.let { append(" · Gen $it") }
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(0.6f),
                                    )
                                }
                            }
                        }
                    }
                    if (cursor != null) {
                        item {
                            LaunchedEffect(cursor) { buscar(cursor) }
                        }
                    }
                }
            }
        }
    }
}

private fun iniciales(p: DirectorioPersonaDto): String =
    "${p.nombre} ${p.apellidos}"
        .split(' ')
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }
        .joinToString("")
