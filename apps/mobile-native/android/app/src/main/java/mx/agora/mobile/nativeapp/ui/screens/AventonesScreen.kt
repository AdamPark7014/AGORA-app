package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.AbrirConversacionRequest
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AventonDto
import mx.agora.mobile.nativeapp.data.api.AventonesApi
import mx.agora.mobile.nativeapp.data.api.CrearAventonRequest
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.DialogoConfirmacion
import mx.agora.mobile.nativeapp.ui.components.SelectorFechaHora
import mx.agora.mobile.nativeapp.ui.components.fechaHoraCampus
import mx.agora.mobile.nativeapp.ui.components.isoUtc
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

private val filtrosSentido = listOf(
    "" to "Todos",
    "A_CAMPUS" to "→ Campus",
    "DESDE_CAMPUS" to "← Desde campus",
)

/** `SENTIDOS_AVENTON` de packages/contracts, con las etiquetas de la web. */
private val sentidosAventon = listOf(
    "A_CAMPUS" to "Hacia el campus",
    "DESDE_CAMPUS" to "Desde el campus",
)

/** Límites de `crearAventonSchema` (packages/contracts). */
private val RANGO_LUGARES = 1..7
private const val CUOTA_MAXIMA = 2000

/** Formulario recién abierto: hacia el campus, mañana 7:30 (hora del campus). */
private fun nuevoAventonPorDefecto() = NuevoAventon(
    sentido = "A_CAMPUS",
    origen = "",
    destino = "Campus UDLAP",
    salidaAt = fechaHoraCampus(dias = 1, hora = 7, minuto = 30),
    lugares = "3",
    cuotaMxn = "25",
    nota = "",
)

/** Null si el aventón se puede publicar; si no, qué corregir (en el tono de la app). */
private fun validarNuevoAventon(nuevo: NuevoAventon): String? {
    if (nuevo.origen.trim().length < 2) return "Di de dónde sales."
    if (nuevo.destino.trim().length < 2) return "Di a dónde llegas."
    val lugares = nuevo.lugares.toIntOrNull()
        ?: return "¿Cuántos lugares tienes? Pon un número del 1 al 7."
    if (lugares !in RANGO_LUGARES) return "Puedes ofrecer de 1 a 7 lugares."
    val cuota = if (nuevo.cuotaMxn.isBlank()) 0 else nuevo.cuotaMxn.toIntOrNull()
        ?: return "La cuota tiene que ser un número (0 si es gratis)."
    if (cuota > CUOTA_MAXIMA) return "La cuota máxima es de $2,000."
    if (nuevo.salidaAt < System.currentTimeMillis()) return "Esa hora ya pasó. Elige una salida más adelante."
    return null
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AventonesScreen(
    tokenProvider: () -> String?,
    onPerfilClick: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    /** Abre la conversación con el conductor (id de conversación). */
    onMensajeClick: (String) -> Unit = {},
) {
    var contactando by remember { mutableStateOf<String?>(null) }
    var aventones by remember { mutableStateOf<List<AventonDto>>(emptyList()) }
    var sentido by remember { mutableStateOf("") }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    /** Error al cargar la lista (se muestra como estado de error con «Reintentar»). */
    var error by remember { mutableStateOf<String?>(null) }
    var modal by remember { mutableStateOf(false) }
    var enviando by remember { mutableStateOf(false) }
    /** Error del formulario de nuevo aventón: solo vive dentro del diálogo. */
    var errorFormulario by remember { mutableStateOf<String?>(null) }
    var nuevo by remember { mutableStateOf(nuevoAventonPorDefecto()) }
    /** Aventón con una petición en curso (apartar / soltar / cancelar): bloquea doble toque. */
    var accionando by remember { mutableStateOf<String?>(null) }
    /** Aventón propio que el conductor pidió cancelar y falta confirmar. */
    var porCancelar by remember { mutableStateOf<AventonDto?>(null) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun avisar(mensaje: String) {
        scope.launch { snackbar.showSnackbar(mensaje) }
    }

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            error = null
            try {
                aventones = ApiClient.api<AventonesApi>(tokenProvider)
                    .proximos(sentido.takeIf { it.isNotBlank() })
                    .aventones
            } catch (e: Exception) {
                error = mensajeDe(e)
                aventones = emptyList()
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    fun abrirNuevo() {
        // La salida por defecto se recalcula cada vez: si la pantalla lleva horas
        // abierta, «mañana 7:30» ya no es la misma fecha.
        nuevo = nuevoAventonPorDefecto()
        errorFormulario = null
        modal = true
    }

    fun apartarOSoltar(aventon: AventonDto) {
        if (accionando != null) return
        scope.launch {
            accionando = aventon.id
            try {
                val resp = ApiClient.api<AventonesApi>(tokenProvider).apartar(aventon.id)
                avisar(if (resp.voyYo) "¡Listo! Apartaste tu lugar." else "Soltaste tu lugar.")
                cargar(refresh = true)
            } catch (e: Exception) {
                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            } finally {
                accionando = null
            }
        }
    }

    fun cancelarAventon(aventon: AventonDto) {
        scope.launch {
            accionando = aventon.id
            try {
                val resp = ApiClient.api<AventonesApi>(tokenProvider).cancelar(aventon.id)
                if (!resp.isSuccessful) throw retrofit2.HttpException(resp)
                porCancelar = null
                avisar("Cancelaste tu aventón.")
                cargar(refresh = true)
            } catch (e: Exception) {
                porCancelar = null
                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            } finally {
                accionando = null
            }
        }
    }

    LaunchedEffect(sentido) { cargar() }

    Box(modifier = modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Los filtros se desplazan y el botón conserva su ancho: en teléfonos de 360dp
            // los tres chips no caben y el botón se aplastaba en una barra vertical.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    filtrosSentido.forEach { (valor, etiqueta) ->
                        FilterChip(
                            selected = sentido == valor,
                            onClick = { sentido = valor },
                            label = { Text(etiqueta, maxLines = 1) },
                        )
                    }
                }
                Button(onClick = { abrirNuevo() }, modifier = Modifier.padding(start = 8.dp)) {
                    Text("+ Ofrecer", maxLines = 1, softWrap = false)
                }
            }

            AgoraPullToRefreshBox(
                isRefreshing = refrescando,
                onRefresh = { cargar(refresh = true) },
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    cargando && aventones.isEmpty() -> {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    }
                    aventones.isEmpty() -> {
                        if (error != null) {
                            AgoraErrorState(
                                message = error!!,
                                modifier = Modifier.align(Alignment.Center),
                                onRetry = { cargar() },
                            )
                        } else {
                            AgoraEmptyState(
                                state = AgoraCopy.emptyAventones,
                                modifier = Modifier.align(Alignment.Center),
                                ctaLabel = AgoraCopy.cta.publicarAlgo,
                                onCta = { abrirNuevo() },
                            )
                        }
                    }
                    else -> {
                        LazyColumn(
                            contentPadding = PaddingValues(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(aventones, key = { it.id }) { aventon ->
                                AventonCard(
                                    aventon = aventon,
                                    ocupado = accionando == aventon.id,
                                    onApartar = { apartarOSoltar(aventon) },
                                    onCancelar = { porCancelar = aventon },
                                    onPerfilClick = onPerfilClick,
                                    contactando = contactando == aventon.id,
                                    onContactar = { handle ->
                                        scope.launch {
                                            contactando = aventon.id
                                            try {
                                                val chat = ApiClient.api<MensajesApi>(tokenProvider)
                                                    .abrir(AbrirConversacionRequest(handle))
                                                onMensajeClick(chat.id)
                                            } catch (e: Exception) {
                                                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
                                            } finally {
                                                contactando = null
                                            }
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }

        SnackbarHost(
            hostState = snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(12.dp),
        )
    }

    porCancelar?.let { aventon ->
        val pasajeros = aventon.ocupados
        DialogoConfirmacion(
            titulo = "¿Cancelar tu aventón?",
            mensaje = when (pasajeros) {
                0 -> "Se quita de la lista y nadie más podrá apartar lugar. No se puede deshacer."
                1 -> "Ya hay 1 persona que apartó lugar; le vamos a avisar que se canceló. No se puede deshacer."
                else -> "Ya hay $pasajeros personas que apartaron lugar; les vamos a avisar que se canceló. No se puede deshacer."
            },
            textoConfirmar = "Sí, cancelar",
            onConfirmar = { cancelarAventon(aventon) },
            onCerrar = { porCancelar = null },
            enProceso = accionando == aventon.id,
        )
    }

    if (modal) {
        AlertDialog(
            onDismissRequest = { if (!enviando) modal = false },
            title = { Text("Nuevo aventón") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        sentidosAventon.forEach { (valor, etiqueta) ->
                            FilterChip(
                                selected = nuevo.sentido == valor,
                                onClick = {
                                    // Al invertir el sentido se intercambian origen y destino,
                                    // igual que en la web: «Campus UDLAP» pasa al otro lado.
                                    if (nuevo.sentido != valor) {
                                        nuevo = nuevo.copy(
                                            sentido = valor,
                                            origen = nuevo.destino,
                                            destino = nuevo.origen,
                                        )
                                    }
                                },
                                label = { Text(etiqueta) },
                            )
                        }
                    }
                    OutlinedTextField(
                        value = nuevo.origen,
                        onValueChange = { nuevo = nuevo.copy(origen = it) },
                        label = { Text("Origen") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = nuevo.destino,
                        onValueChange = { nuevo = nuevo.copy(destino = it) },
                        label = { Text("Destino") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    SelectorFechaHora(
                        etiqueta = "Salida",
                        valor = nuevo.salidaAt,
                        onCambio = { nuevo = nuevo.copy(salidaAt = it) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = nuevo.lugares,
                        onValueChange = {
                            if (it.length <= 1 && it.all { c -> c.isDigit() }) nuevo = nuevo.copy(lugares = it)
                        },
                        label = { Text("Lugares (1 a 7)") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Next,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = nuevo.cuotaMxn,
                        onValueChange = {
                            if (it.length <= 4 && it.all { c -> c.isDigit() }) nuevo = nuevo.copy(cuotaMxn = it)
                        },
                        label = { Text("Cuota MXN (0 = gratis)") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Next,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = nuevo.nota,
                        onValueChange = { if (it.length <= 500) nuevo = nuevo.copy(nota = it) },
                        label = { Text("Nota (opcional)") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    errorFormulario?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val problema = validarNuevoAventon(nuevo)
                        if (problema != null) {
                            errorFormulario = problema
                            return@TextButton
                        }
                        scope.launch {
                            enviando = true
                            errorFormulario = null
                            try {
                                val resp = ApiClient.api<AventonesApi>(tokenProvider).crear(
                                    CrearAventonRequest(
                                        sentido = nuevo.sentido,
                                        origen = nuevo.origen.trim(),
                                        destino = nuevo.destino.trim(),
                                        salidaAt = isoUtc(nuevo.salidaAt),
                                        lugares = nuevo.lugares.toInt(),
                                        cuotaMxn = nuevo.cuotaMxn.toIntOrNull() ?: 0,
                                        nota = nuevo.nota.trim().takeIf { it.isNotBlank() },
                                    ),
                                )
                                GamificacionEvents.notifyPingResult(resp.nuevasInsignias ?: emptyList())
                                modal = false
                                avisar("¡Publicado! Ya aparece en la lista.")
                                cargar(refresh = true)
                            } catch (e: Exception) {
                                errorFormulario = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
                            } finally {
                                enviando = false
                            }
                        }
                    },
                    enabled = !enviando,
                ) {
                    Text(if (enviando) "Publicando…" else "Publicar")
                }
            },
            dismissButton = {
                TextButton(onClick = { modal = false }, enabled = !enviando) { Text("Cancelar") }
            },
        )
    }
}

private data class NuevoAventon(
    val sentido: String,
    val origen: String,
    val destino: String,
    /** Instante de salida (epoch ms); se manda al API como ISO UTC. */
    val salidaAt: Long,
    val lugares: String,
    val cuotaMxn: String,
    val nota: String,
)

@Composable
private fun AventonCard(
    aventon: AventonDto,
    onApartar: () -> Unit,
    onCancelar: () -> Unit,
    onPerfilClick: (String) -> Unit,
    ocupado: Boolean = false,
    contactando: Boolean = false,
    onContactar: (handle: String) -> Unit = {},
) {
    val lleno = aventon.ocupados >= aventon.lugares

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = AgoraColors.Superficie),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("${aventon.origen} → ${aventon.destino}", style = MaterialTheme.typography.titleMedium)
            Text(
                "${formatearFecha(aventon.salidaAt)} · $${aventon.cuotaMxn} · ${aventon.ocupados}/${aventon.lugares} lugares",
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextoMedio,
            )
            aventon.nota?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium)
            }
            aventon.conductor?.let { conductor ->
                TextButton(onClick = { conductor.handle?.let(onPerfilClick) }) {
                    Text(conductor.nombre ?: conductor.handle ?: "Conductor")
                }
            }
            val handleConductor = aventon.conductor?.handle
            if (!aventon.esMio && handleConductor != null) {
                OutlinedButton(
                    onClick = { onContactar(handleConductor) },
                    enabled = !contactando,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (contactando) "Abriendo chat…" else "Contactar")
                }
            }
            if (!aventon.esMio) {
                when {
                    // Quien ya apartó siempre puede soltar su lugar, aunque el aventón se haya llenado.
                    aventon.voyYo -> OutlinedButton(
                        onClick = onApartar,
                        enabled = !ocupado,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(if (ocupado) "Un momento…" else "✓ Vas en este · Soltar mi lugar")
                    }
                    lleno -> Button(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth()) {
                        Text("Lleno")
                    }
                    else -> Button(onClick = onApartar, enabled = !ocupado, modifier = Modifier.fillMaxWidth()) {
                        Text(if (ocupado) "Apartando…" else "Apartar lugar")
                    }
                }
            }
            if (aventon.esMio) {
                OutlinedButton(
                    onClick = onCancelar,
                    enabled = !ocupado,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) {
                    Text("Cancelar aventón")
                }
            }
        }
    }
}
