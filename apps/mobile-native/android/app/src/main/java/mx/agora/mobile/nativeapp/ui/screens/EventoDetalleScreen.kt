package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EventoDetalleDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.ResponderEventoRequest
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
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

private val respuestas = listOf(
    "VOY" to "Voy",
    "ME_INTERESA" to "Me interesa",
    "NO_VOY" to "No voy",
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
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

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

    LaunchedEffect(eventoId) { cargar() }

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
                modifier = modifier
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
                    Text("${formatearPrecio(it)} MXN", style = MaterialTheme.typography.titleMedium)
                }
                item.descripcion?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(top = 8.dp))
                }
                Text("${item.vanAIr} personas van", style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)

                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    respuestas.forEach { (valor, etiqueta) ->
                        FilterChip(
                            selected = item.miRespuesta == valor,
                            onClick = {
                                scope.launch {
                                    try {
                                        ApiClient.api<EventosApi>(tokenProvider).responder(
                                            eventoId,
                                            ResponderEventoRequest(valor),
                                        )
                                        AgoraAnalytics.eventoAsistencia(
                                            tokenProvider,
                                            mapOf("eventoId" to eventoId, "respuesta" to valor),
                                        )
                                        cargar()
                                    } catch (e: Exception) {
                                        error = mensajeDe(e)
                                    }
                                }
                            },
                            label = { Text(etiqueta) },
                        )
                    }
                }

                item.autor?.let { autor ->
                    TextButton(onClick = { autor.handle?.let(onPerfilClick) }) {
                        Text("Organiza ${autor.nombre ?: autor.handle}")
                    }
                }

                if (item.esMio) {
                    TextButton(
                        onClick = {
                            scope.launch {
                                try {
                                    ApiClient.api<EventosApi>(tokenProvider).borrar(eventoId)
                                    onBorrado()
                                } catch (e: Exception) {
                                    error = mensajeDe(e)
                                }
                            }
                        },
                    ) {
                        Text("Eliminar evento", color = MaterialTheme.colorScheme.error)
                    }
                }

                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}
