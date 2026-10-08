package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import java.time.LocalDateTime
import java.time.ZoneId

private val filtrosSentido = listOf(
    "" to "Todos",
    "A_CAMPUS" to "→ Campus",
    "DESDE_CAMPUS" to "← Desde campus",
)

private fun mananaTempranoIso(): String {
    val manana = LocalDateTime.now(ZoneId.of("America/Mexico_City"))
        .plusDays(1)
        .withHour(7)
        .withMinute(30)
        .withSecond(0)
        .withNano(0)
    return manana.atZone(ZoneId.of("America/Mexico_City")).toInstant().toString()
}

@OptIn(ExperimentalMaterial3Api::class)
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
    var error by remember { mutableStateOf<String?>(null) }
    var modal by remember { mutableStateOf(false) }
    var enviando by remember { mutableStateOf(false) }
    var nuevo by remember {
        mutableStateOf(
            NuevoAventon(
                sentido = "A_CAMPUS",
                origen = "",
                destino = "Campus UDLAP",
                salidaAt = mananaTempranoIso(),
                lugares = "3",
                cuotaMxn = "25",
                nota = "",
            ),
        )
    }
    val scope = rememberCoroutineScope()

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

    LaunchedEffect(sentido) { cargar() }

    Column(modifier = modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            filtrosSentido.forEach { (valor, etiqueta) ->
                FilterChip(
                    selected = sentido == valor,
                    onClick = { sentido = valor },
                    label = { Text(etiqueta) },
                )
            }
            Button(onClick = { modal = true }, modifier = Modifier.padding(start = 4.dp)) {
                Text("+ Ofrecer")
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
                            onCta = { modal = true },
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
                                onApartar = {
                                    scope.launch {
                                        try {
                                            ApiClient.api<AventonesApi>(tokenProvider).apartar(aventon.id)
                                            cargar(refresh = true)
                                        } catch (e: Exception) {
                                            error = mensajeDe(e)
                                        }
                                    }
                                },
                                onCancelar = {
                                    scope.launch {
                                        try {
                                            ApiClient.api<AventonesApi>(tokenProvider).cancelar(aventon.id)
                                            cargar(refresh = true)
                                        } catch (e: Exception) {
                                            error = mensajeDe(e)
                                        }
                                    }
                                },
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
                                            error = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
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

    if (modal) {
        AlertDialog(
            onDismissRequest = { modal = false },
            title = { Text("Nuevo aventón") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedTextField(
                        value = nuevo.origen,
                        onValueChange = { nuevo = nuevo.copy(origen = it) },
                        label = { Text("Origen") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = nuevo.destino,
                        onValueChange = { nuevo = nuevo.copy(destino = it) },
                        label = { Text("Destino") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = nuevo.lugares,
                        onValueChange = { if (it.all { c -> c.isDigit() }) nuevo = nuevo.copy(lugares = it) },
                        label = { Text("Lugares") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = nuevo.cuotaMxn,
                        onValueChange = { if (it.all { c -> c.isDigit() }) nuevo = nuevo.copy(cuotaMxn = it) },
                        label = { Text("Cuota MXN") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = nuevo.nota,
                        onValueChange = { nuevo = nuevo.copy(nota = it) },
                        label = { Text("Nota (opcional)") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            enviando = true
                            error = null
                            try {
                                val resp = ApiClient.api<AventonesApi>(tokenProvider).crear(
                                    CrearAventonRequest(
                                        sentido = nuevo.sentido,
                                        origen = nuevo.origen.trim(),
                                        destino = nuevo.destino.trim(),
                                        salidaAt = nuevo.salidaAt,
                                        lugares = nuevo.lugares.toInt(),
                                        cuotaMxn = nuevo.cuotaMxn.toInt(),
                                        nota = nuevo.nota.trim().takeIf { it.isNotBlank() },
                                    ),
                                )
                                GamificacionEvents.notifyPingResult(resp.nuevasInsignias ?: emptyList())
                                modal = false
                                cargar(refresh = true)
                            } catch (e: Exception) {
                                error = mensajeDe(e)
                            } finally {
                                enviando = false
                            }
                        }
                    },
                    enabled = !enviando && nuevo.origen.trim().length >= 2 && nuevo.destino.trim().length >= 2,
                ) {
                    Text(if (enviando) "…" else "Publicar")
                }
            },
            dismissButton = {
                TextButton(onClick = { modal = false }) { Text("Cancelar") }
            },
        )
    }
}

private data class NuevoAventon(
    val sentido: String,
    val origen: String,
    val destino: String,
    val salidaAt: String,
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
    contactando: Boolean = false,
    onContactar: (handle: String) -> Unit = {},
) {
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
            if (!aventon.esMio && aventon.ocupados < aventon.lugares) {
                if (aventon.voyYo) {
                    OutlinedButton(onClick = onApartar, modifier = Modifier.fillMaxWidth()) {
                        Text("✓ Voy en este (tocar para quitar)")
                    }
                } else {
                    Button(onClick = onApartar, modifier = Modifier.fillMaxWidth()) {
                        Text("Apartar lugar")
                    }
                }
            }
            if (aventon.esMio) {
                OutlinedButton(
                    onClick = onCancelar,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) {
                    Text("Cancelar aventón")
                }
            }
        }
    }
}
