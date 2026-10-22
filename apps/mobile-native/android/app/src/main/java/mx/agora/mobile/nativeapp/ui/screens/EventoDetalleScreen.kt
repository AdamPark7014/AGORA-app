package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EventoDetalleDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.ResponderEventoRequest
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.DialogoConfirmacion
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.formatearPrecio
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

private val tiposEvento = mapOf(
    "FIESTA" to "Fiesta",
    "ACADEMICO" to "Académico",
    "DEPORTIVO" to "Deportivo",
    "CULTURAL" to "Cultural",
    "ORGANIZACION" to "Organización",
    "OTRO" to "Otro",
)

/**
 * `RESPUESTAS_ASISTENCIA` de packages/contracts: solo VOY y ME_INTERESA. No hay «No voy»:
 * mandar la misma respuesta otra vez la quita (el API la alterna).
 */
private val respuestas = listOf(
    "VOY" to "Voy",
    "ME_INTERESA" to "Me interesa",
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EventoDetalleScreen(
    eventoId: String,
    tokenProvider: () -> String?,
    onPerfilClick: (String) -> Unit,
    onBorrado: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var evento by remember { mutableStateOf<EventoDetalleDto?>(null) }
    var cargando by remember { mutableStateOf(true) }
    /** Error al cargar el detalle (pantalla de error con «Reintentar»). */
    var error by remember { mutableStateOf<String?>(null) }
    var respondiendo by remember { mutableStateOf(false) }
    var confirmarBorrado by remember { mutableStateOf(false) }
    var borrando by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun avisar(mensaje: String) {
        scope.launch { snackbar.showSnackbar(mensaje) }
    }

    fun cargar() {
        scope.launch {
            cargando = true
            error = null
            try {
                evento = ApiClient.api<EventosApi>(tokenProvider).detalle(eventoId)
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
            }
        }
    }

    fun responder(valor: String) {
        val actual = evento ?: return
        if (respondiendo) return
        scope.launch {
            respondiendo = true
            try {
                val resp = ApiClient.api<EventosApi>(tokenProvider).responder(
                    eventoId,
                    ResponderEventoRequest(valor),
                )
                // El API alterna: la misma respuesta otra vez la retira. Se refleja de
                // inmediato con lo que contestó y luego se recarga para el conteo real.
                val antesIba = actual.miRespuesta == "VOY"
                val ahoraVa = resp.miRespuesta == "VOY"
                evento = actual.copy(
                    miRespuesta = resp.miRespuesta,
                    vanAIr = (actual.vanAIr + (if (ahoraVa) 1 else 0) - (if (antesIba) 1 else 0)).coerceAtLeast(0),
                )
                AgoraAnalytics.eventoAsistencia(
                    tokenProvider,
                    mapOf("eventoId" to eventoId, "respuesta" to valor),
                )
                cargar()
            } catch (e: Exception) {
                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            } finally {
                respondiendo = false
            }
        }
    }

    fun borrar() {
        scope.launch {
            borrando = true
            try {
                val resp = ApiClient.api<EventosApi>(tokenProvider).borrar(eventoId)
                if (!resp.isSuccessful) throw retrofit2.HttpException(resp)
                confirmarBorrado = false
                onBorrado()
            } catch (e: Exception) {
                confirmarBorrado = false
                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            } finally {
                borrando = false
            }
        }
    }

    LaunchedEffect(eventoId) { cargar() }

    Box(modifier = modifier.fillMaxSize()) {
        when {
            cargando && evento == null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            error != null && evento == null -> {
                AgoraErrorState(
                    message = error!!,
                    modifier = Modifier.fillMaxSize(),
                    onRetry = { cargar() },
                )
            }
            evento != null -> {
                val item = evento!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        tiposEvento[item.tipo] ?: item.tipo,
                        style = MaterialTheme.typography.labelLarge,
                        color = AgoraColors.Naranja,
                    )
                    Text(item.titulo, style = MaterialTheme.typography.headlineMedium)
                    Text(formatearFecha(item.inicioAt), style = MaterialTheme.typography.bodyMedium, color = AgoraColors.TextoMedio)
                    item.lugar?.let {
                        Text("📍 $it", style = MaterialTheme.typography.bodyMedium, color = AgoraColors.TextoMedio)
                    }
                    item.comunidad?.let {
                        Text(it.nombre, style = MaterialTheme.typography.bodyMedium, color = AgoraColors.TextoMedio)
                    }
                    item.costoMxn?.let {
                        Text(
                            if (it == 0) "Gratis" else "${formatearPrecio(it)} MXN",
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                    item.descripcion?.takeIf { it.isNotBlank() }?.let {
                        Text(it, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(top = 8.dp))
                    }
                    Text(
                        listOfNotNull("${item.vanAIr} personas van", textoCupo(item.cupo, item.vanAIr)).joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall,
                        color = AgoraColors.TextoMedio,
                    )

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        respuestas.forEach { (valor, etiqueta) ->
                            val elegida = item.miRespuesta == valor
                            FilterChip(
                                selected = elegida,
                                onClick = { responder(valor) },
                                enabled = !respondiendo,
                                label = { Text(if (elegida) "✓ $etiqueta" else etiqueta) },
                            )
                        }
                    }
                    if (item.miRespuesta != null) {
                        Text(
                            "Toca otra vez tu respuesta para quitarla.",
                            style = MaterialTheme.typography.bodySmall,
                            color = AgoraColors.TextoMedio,
                        )
                    }

                    item.autor?.let { autor ->
                        TextButton(onClick = { autor.handle?.let(onPerfilClick) }) {
                            Text("Organiza ${autor.nombre ?: autor.handle}")
                        }
                    }

                    OutlinedButton(
                        onClick = { compartirEnlace(context, EnlacesWeb.evento(eventoId), item.titulo) },
                    ) {
                        Icon(
                            Icons.Outlined.Share,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                        Text(AgoraCopy.compartir.accion, modifier = Modifier.padding(start = 8.dp))
                    }

                    if (item.esMio) {
                        TextButton(onClick = { confirmarBorrado = true }) {
                            Text("Eliminar evento", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }

        SnackbarHost(
            hostState = snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(12.dp),
        )
    }

    if (confirmarBorrado) {
        DialogoConfirmacion(
            titulo = "¿Eliminar este evento?",
            mensaje = "Desaparece del calendario y ya nadie podrá verlo ni apuntarse. No se puede deshacer.",
            textoConfirmar = "Sí, eliminar",
            onConfirmar = { borrar() },
            onCerrar = { confirmarBorrado = false },
            enProceso = borrando,
        )
    }
}
