package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EnviarMensajeRequest
import mx.agora.mobile.nativeapp.data.api.MensajeDto
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.ParticipanteConversacionDto
import mx.agora.mobile.nativeapp.data.realtime.RealtimeBus
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MensajeDetalleScreen(
    conversacionId: String,
    tokenProvider: () -> String?,
    onBack: () -> Unit,
    onPerfilClick: (String) -> Unit,
) {
    var mensajes by remember { mutableStateOf<List<MensajeDto>>(emptyList()) }
    var con by remember { mutableStateOf<ParticipanteConversacionDto?>(null) }
    var siguienteCursor by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(true) }
    var cargandoAntiguos by remember { mutableStateOf(false) }
    var enviando by remember { mutableStateOf(false) }
    var texto by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    fun traerRecientes() {
        scope.launch {
            try {
                val datos = ApiClient.api<MensajesApi>(tokenProvider).conversacion(conversacionId)
                con = datos.con
                siguienteCursor = datos.siguienteCursor
                val ids = mensajes.map { it.id }.toSet()
                val nuevos = datos.mensajes.filter { it.id !in ids }
                mensajes = if (mensajes.isEmpty()) datos.mensajes else if (nuevos.isNotEmpty()) mensajes + nuevos else mensajes
                error = null
            } catch (e: Exception) {
                if (mensajes.isEmpty()) error = mensajeDe(e)
            }
        }
    }

    LaunchedEffect(conversacionId) {
        cargando = true
        traerRecientes()
        cargando = false
        if (mensajes.isNotEmpty()) {
            listState.scrollToItem(mensajes.lastIndex)
        }
    }

    DisposableEffect(conversacionId) {
        RealtimeBus.watchConversacion(conversacionId)
        onDispose { RealtimeBus.unwatchConversacion(conversacionId) }
    }

    LaunchedEffect(conversacionId) {
        RealtimeBus.mensajes.collect { evento ->
            if (evento.conversacionId != conversacionId) return@collect
            if (mensajes.any { it.id == evento.mensaje.id }) return@collect
            mensajes = mensajes + evento.mensaje
            listState.animateScrollToItem(mensajes.lastIndex)
        }
    }

    fun cargarAntiguos() {
        val cursor = siguienteCursor ?: return
        scope.launch {
            cargandoAntiguos = true
            try {
                val datos = ApiClient.api<MensajesApi>(tokenProvider).conversacion(conversacionId, cursor = cursor)
                siguienteCursor = datos.siguienteCursor
                mensajes = datos.mensajes + mensajes
            } catch (_: Exception) {
                // Silencioso.
            } finally {
                cargandoAntiguos = false
            }
        }
    }

    fun enviar() {
        val limpio = texto.trim()
        if (limpio.isBlank() || enviando) return
        scope.launch {
            enviando = true
            error = null
            try {
                ApiClient.api<MensajesApi>(tokenProvider).enviar(
                    conversacionId,
                    EnviarMensajeRequest(limpio),
                )
                AgoraAnalytics.dmEnviado(tokenProvider, mapOf("conversacionId" to conversacionId))
                texto = ""
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                enviando = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(con?.nombre ?: "Chat")
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    con?.handle?.let { handle ->
                        IconButton(onClick = { onPerfilClick(handle) }) {
                            Text("@", style = MaterialTheme.typography.titleMedium)
                        }
                    }
                },
            )
        },
    ) { padding ->
        if (cargando && mensajes.isEmpty()) {
            Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding(),
        ) {
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (siguienteCursor != null) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Button(
                                onClick = { cargarAntiguos() },
                                enabled = !cargandoAntiguos,
                            ) {
                                Text(if (cargandoAntiguos) "Cargando…" else "Cargar mensajes anteriores")
                            }
                        }
                    }
                }

                if (mensajes.isEmpty()) {
                    item {
                        AgoraEmptyState(
                            state = AgoraCopy.emptyMensajeDetalle,
                            modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                        )
                    }
                }

                items(mensajes, key = { it.id }) { mensaje ->
                    BurbujaMensaje(mensaje)
                }
            }

            error?.let {
                Text(
                    it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(12.dp),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = texto,
                    onValueChange = { if (it.length <= 4000) texto = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Escribe a ${con?.nombre ?: "…"}") },
                    maxLines = 5,
                )
                Button(
                    onClick = { enviar() },
                    enabled = texto.trim().isNotBlank() && !enviando,
                ) {
                    Text(if (enviando) "…" else "Enviar")
                }
            }
        }
    }
}

@Composable
private fun BurbujaMensaje(mensaje: MensajeDto) {
    val mio = mensaje.mio
    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = if (mio) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.82f)
                .background(
                    color = if (mio) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(16.dp),
                )
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Text(
                mensaje.texto,
                color = if (mio) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}
