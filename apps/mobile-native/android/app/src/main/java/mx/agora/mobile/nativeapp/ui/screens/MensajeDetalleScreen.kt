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
import androidx.compose.material.icons.outlined.AccountCircle
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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EnviarMensajeRequest
import mx.agora.mobile.nativeapp.data.api.MensajeDto
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.ParticipanteConversacionDto
import mx.agora.mobile.nativeapp.data.realtime.RealtimeBus
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraPieErrorPagina
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.formatearHora
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import java.time.Instant
import java.util.UUID

/** Prefijo de los mensajes que pintamos antes de que el servidor confirme su id. */
private const val PREFIJO_LOCAL = "local-"

private fun MensajeDto.esLocal(): Boolean = id.startsWith(PREFIJO_LOCAL)

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
    /** Falló la primera carga y no hay nada que enseñar. */
    var errorCarga by remember { mutableStateOf<String?>(null) }
    /** Falló el último envío. */
    var errorEnvio by remember { mutableStateOf<String?>(null) }
    /** Falló traer mensajes anteriores: va arriba, junto a su botón, no junto al cuadro de texto. */
    var errorAntiguos by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    /** Índice del último mensaje en la lista (el botón de «anteriores» va antes). */
    fun indiceUltimo(): Int = mensajes.lastIndex + if (siguienteCursor != null) 1 else 0

    /**
     * Trae la página más reciente y la junta con lo que ya hay, sin repetir ids.
     * Suspende hasta tener respuesta: antes lanzaba otra corrutina y el «ya
     * cargó» y el scroll al final corrían antes de que llegaran los datos.
     * Devuelve false si falló.
     */
    suspend fun traerRecientes(): Boolean = try {
        val datos = ApiClient.api<MensajesApi>(tokenProvider).conversacion(conversacionId)
        con = datos.con
        if (mensajes.isEmpty()) siguienteCursor = datos.siguienteCursor
        val ids = mensajes.mapTo(HashSet()) { it.id }
        val nuevos = datos.mensajes.filter { it.id !in ids }
        mensajes = if (mensajes.isEmpty()) datos.mensajes else mensajes + nuevos
        errorCarga = null
        true
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        if (mensajes.isEmpty()) errorCarga = mensajeDe(e)
        false
    }

    suspend fun cargarInicial() {
        cargando = true
        errorCarga = null
        traerRecientes()
        if (mensajes.isNotEmpty()) {
            // Se pide antes de pintar la lista: abre ya en el último mensaje.
            listState.requestScrollToItem(indiceUltimo())
        }
        cargando = false
    }

    LaunchedEffect(conversacionId) { cargarInicial() }

    DisposableEffect(conversacionId) {
        RealtimeBus.watchConversacion(conversacionId)
        onDispose { RealtimeBus.unwatchConversacion(conversacionId) }
    }

    LaunchedEffect(conversacionId) {
        RealtimeBus.mensajes.collect { evento ->
            if (evento.conversacionId != conversacionId) return@collect
            val real = evento.mensaje
            if (mensajes.any { it.id == real.id }) return@collect
            // Si es el eco de lo que acabo de mandar, reemplaza la burbuja local.
            val local = if (real.mio) mensajes.firstOrNull { it.esLocal() && it.texto == real.texto } else null
            if (local != null) {
                mensajes = mensajes.map { if (it.id == local.id) real else it }
            } else {
                mensajes = mensajes + real
                listState.animateScrollToItem(indiceUltimo())
            }
        }
    }

    fun cargarAntiguos() {
        val cursor = siguienteCursor ?: return
        scope.launch {
            cargandoAntiguos = true
            errorAntiguos = null
            try {
                val datos = ApiClient.api<MensajesApi>(tokenProvider).conversacion(conversacionId, cursor = cursor)
                siguienteCursor = datos.siguienteCursor
                val ids = mensajes.mapTo(HashSet()) { it.id }
                mensajes = datos.mensajes.filter { it.id !in ids } + mensajes
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorAntiguos = mensajeDe(e)
            } finally {
                cargandoAntiguos = false
            }
        }
    }

    fun enviar() {
        val limpio = texto.trim()
        if (limpio.isBlank() || enviando) return
        // Se pinta de inmediato; el id real llega en la respuesta o por el SSE.
        val local = MensajeDto(
            id = PREFIJO_LOCAL + UUID.randomUUID(),
            texto = limpio,
            createdAt = Instant.now().toString(),
            mio = true,
        )
        scope.launch {
            enviando = true
            errorEnvio = null
            texto = ""
            mensajes = mensajes + local
            listState.animateScrollToItem(indiceUltimo())
            try {
                // Un 4xx/5xx lanza HttpException y cae en el catch de abajo.
                val real = ApiClient.api<MensajesApi>(tokenProvider).enviar(
                    conversacionId,
                    EnviarMensajeRequest(limpio),
                )
                AgoraAnalytics.dmEnviado(tokenProvider, mapOf("conversacionId" to conversacionId))
                // La burbuja local toma el id y la hora del servidor; así el eco
                // del SSE se descarta por id. Si el SSE ganó la carrera, ya la
                // cambió por el mensaje real y solo queda quitar la local.
                mensajes = if (mensajes.any { it.id == real.id }) {
                    mensajes.filter { it.id != local.id }
                } else {
                    mensajes.map {
                        if (it.id == local.id) it.copy(id = real.id, createdAt = real.createdAt) else it
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                mensajes = mensajes.filter { it.id != local.id }
                if (texto.isBlank()) texto = limpio
                errorEnvio = mensajeDe(e)
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
                    con?.let { persona ->
                        IconButton(onClick = { onPerfilClick(persona.handle) }) {
                            Icon(
                                Icons.Outlined.AccountCircle,
                                contentDescription = "Ver perfil de ${persona.nombre}",
                            )
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

        val fallo = errorCarga
        if (fallo != null && mensajes.isEmpty()) {
            AgoraErrorState(
                message = fallo,
                modifier = Modifier.fillMaxSize().padding(padding),
                onRetry = { scope.launch { cargarInicial() } },
            )
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
                    item(key = "anteriores") {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            val falloAntiguos = errorAntiguos
                            if (falloAntiguos != null && !cargandoAntiguos) {
                                AgoraPieErrorPagina(
                                    mensaje = falloAntiguos,
                                    onReintentar = { cargarAntiguos() },
                                )
                            } else {
                                Button(
                                    onClick = { cargarAntiguos() },
                                    enabled = !cargandoAntiguos,
                                ) {
                                    Text(if (cargandoAntiguos) "Cargando…" else "Cargar mensajes anteriores")
                                }
                            }
                        }
                    }
                }

                if (mensajes.isEmpty()) {
                    item(key = "vacio") {
                        AgoraEmptyState(
                            state = AgoraCopy.emptyMensajeDetalle,
                            modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                        )
                    }
                }

                items(mensajes, key = { it.id }) { mensaje ->
                    BurbujaMensaje(
                        mensaje,
                        enviando = mensaje.esLocal(),
                        nombre = con?.nombre ?: "Contacto",
                    )
                }
            }

            errorEnvio?.let {
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
                    // La burbuja ya dice «Enviando…»; el botón solo se deshabilita.
                    Text("Enviar")
                }
            }
        }
    }
}

/**
 * Burbuja que se ajusta al texto, con tope del 82 % del ancho, y la hora corta
 * (hora de México) abajo. Mientras el servidor no confirma dice «Enviando…».
 */
@Composable
private fun BurbujaMensaje(mensaje: MensajeDto, enviando: Boolean, nombre: String) {
    val mio = mensaje.mio
    val alineacion = if (mio) Alignment.CenterEnd else Alignment.CenterStart
    val colorTexto = if (mio) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    val pie = if (enviando) "Enviando…" else formatearHora(mensaje.createdAt)
    // El lector dice quién lo escribió, el texto y la hora en una sola lectura.
    val lectura = buildString {
        append(if (mio) "Tú" else nombre)
        append(": ")
        append(mensaje.texto)
        if (pie.isNotEmpty()) append(", ").append(pie)
    }
    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = alineacion,
    ) {
        // Este marco solo pone el tope; la burbuja de adentro mide lo que el texto.
        Box(
            modifier = Modifier.fillMaxWidth(0.82f),
            contentAlignment = alineacion,
        ) {
            Column(
                modifier = Modifier
                    .semantics(mergeDescendants = true) { contentDescription = lectura }
                    .background(
                        color = if (mio) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(16.dp),
                    )
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                horizontalAlignment = Alignment.End,
            ) {
                Text(mensaje.texto, color = colorTexto)
                if (pie.isNotEmpty()) {
                    Text(
                        pie,
                        // 0.9: con 0.7 la hora no se leía sobre la burbuja naranja.
                        color = colorTexto.copy(alpha = 0.9f),
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
        }
    }
}
