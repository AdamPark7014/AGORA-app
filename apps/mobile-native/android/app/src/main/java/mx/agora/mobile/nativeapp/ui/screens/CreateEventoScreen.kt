package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.CrearEventoRequest
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.ui.components.SelectorFechaHora
import mx.agora.mobile.nativeapp.ui.components.fechaHoraCampus
import mx.agora.mobile.nativeapp.ui.components.isoUtc
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

private val tiposEvento = listOf(
    "FIESTA" to "Fiesta",
    "ACADEMICO" to "Académico",
    "DEPORTIVO" to "Deportivo",
    "CULTURAL" to "Cultural",
    "ORGANIZACION" to "Organización",
    "OTRO" to "Otro",
)

/** Tope de costo y cupo en `crearEventoSchema` (packages/contracts). */
private const val MAXIMO_COSTO_CUPO = 100_000
private const val DOS_HORAS_MS = 2 * 60 * 60 * 1000L

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
    /** Inicio y fin como instantes (epoch ms) elegidos en hora del campus; al API van en ISO UTC. */
    var inicioAt by remember { mutableStateOf(fechaHoraCampus(dias = 1, hora = 19)) }
    var finAt by remember { mutableStateOf<Long?>(null) }
    var costo by remember { mutableStateOf("") }
    var cupo by remember { mutableStateOf("") }
    var comunidadSlug by remember { mutableStateOf<String?>(null) }
    var comunidades by remember { mutableStateOf<List<ComunidadDto>>(emptyList()) }
    var menuComunidad by remember { mutableStateOf(false) }
    var enviando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var errorComunidades by remember { mutableStateOf(false) }

    // Si falla se avisa con «Reintentar»: antes el selector simplemente no salía.
    fun cargarComunidades() {
        scope.launch {
            errorComunidades = false
            try {
                comunidades = ApiClient.api<PerfilApi>(tokenProvider).misComunidades()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                comunidades = emptyList()
                errorComunidades = true
            }
        }
    }

    LaunchedEffect(Unit) { cargarComunidades() }

    val errorInicio = if (inicioAt < System.currentTimeMillis()) "Esa hora ya pasó. Elige otra." else null
    val errorFin = finAt?.let { fin ->
        if (fin <= inicioAt) "El evento no puede terminar antes de empezar." else null
    }
    val costoNumero = costo.toIntOrNull()
    val cupoNumero = cupo.toIntOrNull()
    val errorCosto = if (costoNumero != null && costoNumero > MAXIMO_COSTO_CUPO) "El costo máximo es de $100,000." else null
    val errorCupo = when {
        cupoNumero == null -> null
        cupoNumero < 1 -> "El cupo mínimo es 1 (déjalo vacío si no hay límite)."
        cupoNumero > MAXIMO_COSTO_CUPO -> "El cupo máximo es de 100,000."
        else -> null
    }

    val puedePublicar = titulo.trim().length >= 3 &&
        descripcion.trim().isNotBlank() &&
        lugar.trim().length >= 2 &&
        errorInicio == null &&
        errorFin == null &&
        errorCosto == null &&
        errorCupo == null &&
        !enviando

    Column(
        modifier = modifier
            .fillMaxSize()
            .imePadding()
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
            // Lo mismo que pide puedePublicar (y crearEventoSchema).
            supportingText = { Text("Mínimo 3 caracteres") },
        )
        OutlinedTextField(
            value = lugar,
            onValueChange = { lugar = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Lugar") },
            singleLine = true,
            supportingText = { Text("Mínimo 2 caracteres") },
        )
        OutlinedTextField(
            value = descripcion,
            onValueChange = { descripcion = it },
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp),
            label = { Text("Descripción") },
            supportingText = { Text("Obligatoria") },
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

        SelectorFechaHora(
            etiqueta = "Empieza",
            valor = inicioAt,
            onCambio = { inicioAt = it },
            error = errorInicio,
            modifier = Modifier.fillMaxWidth(),
        )
        SelectorFechaHora(
            etiqueta = "Termina (opcional)",
            valor = finAt,
            onCambio = { finAt = it },
            onQuitar = { finAt = null },
            minimo = inicioAt,
            sugerencia = inicioAt + DOS_HORAS_MS,
            placeholder = "Toca si quieres poner hora de fin",
            error = errorFin,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = costo,
            onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) costo = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Costo MXN (opcional, 0 = gratis)") },
            singleLine = true,
            isError = errorCosto != null,
            supportingText = if (errorCosto != null) {
                { Text(errorCosto) }
            } else {
                null
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
        )
        OutlinedTextField(
            value = cupo,
            onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) cupo = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Cupo (opcional)") },
            singleLine = true,
            isError = errorCupo != null,
            supportingText = if (errorCupo != null) {
                { Text(errorCupo) }
            } else {
                null
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
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
        } else if (errorComunidades) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "No pudimos traer tus comunidades.",
                    style = MaterialTheme.typography.bodySmall,
                    color = AgoraColors.TextoMedio,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = { cargarComunidades() }) {
                    Text(AgoraCopy.cta.reintentar)
                }
            }
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Button(
            onClick = {
                // El formulario pudo quedarse abierto un rato: se revisa otra vez al publicar.
                if (inicioAt < System.currentTimeMillis()) {
                    error = "La hora de inicio ya pasó. Elige otra."
                    return@Button
                }
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
                                inicioAt = isoUtc(inicioAt),
                                finAt = finAt?.let(::isoUtc),
                                costoMxn = costoNumero,
                                cupo = cupoNumero,
                                comunidadSlug = comunidadSlug,
                            ),
                        )
                        onCreado(resp.id)
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
                Text("Publicar evento")
            }
        }

        OutlinedButton(onClick = onCancelar, modifier = Modifier.fillMaxWidth()) {
            Text("Cancelar")
        }
    }
}
