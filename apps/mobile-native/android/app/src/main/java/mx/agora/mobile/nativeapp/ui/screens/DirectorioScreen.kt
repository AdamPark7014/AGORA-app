package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
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
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CatalogoDto
import mx.agora.mobile.nativeapp.data.api.DirectorioApi
import mx.agora.mobile.nativeapp.data.api.DirectorioPersonaDto
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import java.util.Calendar

@Composable
fun DirectorioScreen(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
    onPerfil: (String) -> Unit = {},
) {
    var q by remember { mutableStateOf("") }
    var generacion by remember { mutableStateOf<Int?>(null) }
    var catalogo by remember { mutableStateOf<CatalogoDto?>(null) }
    var escuela by remember { mutableStateOf<String?>(null) }
    var carrera by remember { mutableStateOf<String?>(null) }
    var colegio by remember { mutableStateOf<String?>(null) }
    var resultados by remember { mutableStateOf<List<DirectorioPersonaDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(true) }
    /** Falló la primera página; no es lo mismo que «no hay nadie». */
    var error by remember { mutableStateOf<String?>(null) }
    /** Pidiendo la página siguiente (indicador al pie). */
    var cargandoMas by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val ano = Calendar.getInstance().get(Calendar.YEAR)
    val generaciones = remember { (0 until 8).map { ano + 1 - it } }

    fun buscar(desde: String? = null) {
        scope.launch {
            if (desde == null) {
                cargando = true
                error = null
            } else {
                cargandoMas = true
            }
            try {
                val datos = ApiClient.api<DirectorioApi>(tokenProvider).buscar(
                    q = q.trim().ifBlank { null },
                    generacion = generacion,
                    cursor = desde,
                    escuela = escuela,
                    carrera = carrera,
                    colegio = colegio,
                )
                resultados = if (desde != null) resultados + datos.resultados else datos.resultados
                cursor = datos.siguienteCursor
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (desde == null) {
                    resultados = emptyList()
                    error = mensajeDe(e)
                }
            } finally {
                if (desde == null) cargando = false else cargandoMas = false
            }
        }
    }

    LaunchedEffect(Unit) {
        catalogo = runCatching { ApiClient.catalogo.todo() }.getOrNull()
    }

    LaunchedEffect(q, generacion, escuela, carrera, colegio) {
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

        catalogo?.let { cat ->
            val escuelaElegida = cat.escuelas.firstOrNull { it.slug == escuela }
            Row(
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp)
                    .padding(bottom = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FiltroDesplegable(
                    etiqueta = "Escuela",
                    todas = "Todas las escuelas",
                    seleccion = escuela,
                    opciones = cat.escuelas.map { it.slug to it.nombre },
                    onElegir = {
                        escuela = it
                        carrera = null
                    },
                )
                FiltroDesplegable(
                    etiqueta = "Carrera",
                    todas = "Todas las carreras",
                    seleccion = carrera,
                    opciones = escuelaElegida?.carreras.orEmpty().map { it.slug to it.nombre },
                    onElegir = { carrera = it },
                    habilitado = escuelaElegida != null,
                )
                if (cat.colegios.isNotEmpty()) {
                    FiltroDesplegable(
                        etiqueta = "Colegio",
                        todas = "Todos los colegios",
                        seleccion = colegio,
                        opciones = cat.colegios.map { it.slug to it.nombre },
                        onElegir = { colegio = it },
                    )
                }
            }
        }

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
            error != null -> {
                AgoraErrorState(
                    message = error ?: AgoraCopy.errors.generic,
                    title = "No pudimos cargar el directorio",
                    onRetry = { buscar() },
                    modifier = Modifier.fillMaxWidth(),
                )
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
                                // Decorativas: el nombre ya se lee al lado.
                                Text(
                                    iniciales(persona),
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .padding(horizontal = 12.dp, vertical = 10.dp)
                                        .clearAndSetSemantics {},
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
                            if (cargandoMas) {
                                Box(
                                    Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(modifier = Modifier.size(28.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Chip con menú: null = sin filtro. Muestra el nombre elegido en lugar de la etiqueta. */
@Composable
private fun FiltroDesplegable(
    etiqueta: String,
    todas: String,
    seleccion: String?,
    opciones: List<Pair<String, String>>,
    onElegir: (String?) -> Unit,
    habilitado: Boolean = true,
) {
    var abierto by remember { mutableStateOf(false) }
    val nombre = opciones.firstOrNull { it.first == seleccion }?.second
    Box {
        FilterChip(
            selected = seleccion != null,
            onClick = { abierto = true },
            enabled = habilitado,
            // TalkBack: «Filtrar por escuela: Ingeniería» en vez de leer la flecha.
            modifier = Modifier.semantics {
                contentDescription = "Filtrar por ${etiqueta.lowercase()}" + (nombre?.let { ": $it" } ?: "")
            },
            label = { Text(nombre ?: etiqueta, maxLines = 1, modifier = Modifier.clearAndSetSemantics {}) },
            trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
        )
        DropdownMenu(expanded = abierto, onDismissRequest = { abierto = false }) {
            DropdownMenuItem(
                text = { Text(todas) },
                onClick = {
                    abierto = false
                    onElegir(null)
                },
            )
            opciones.forEach { (slug, texto) ->
                DropdownMenuItem(
                    text = { Text(texto) },
                    onClick = {
                        abierto = false
                        onElegir(slug)
                    },
                )
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
