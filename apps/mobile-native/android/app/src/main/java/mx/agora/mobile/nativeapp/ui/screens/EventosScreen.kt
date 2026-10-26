package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EventoDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.ResponderEventoRequest
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.formatearPrecio
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

/** Mismo orden y etiquetas que el filtro de la web (`apps/web/app/eventos`). */
private val filtrosTipo = listOf(
    null to "Todos",
    "FIESTA" to "Fiesta",
    "ACADEMICO" to "Académico",
    "DEPORTIVO" to "Deportivo",
    "CULTURAL" to "Cultural",
    "ORGANIZACION" to "Organización",
    "OTRO" to "Otro",
)

/** "cupo 40 · quedan 12" / "cupo 40 · queda 1" / "cupo 40 · lleno"; null si el evento no tiene cupo. */
internal fun textoCupo(cupo: Int?, vanAIr: Int): String? {
    if (cupo == null) return null
    val quedan = (cupo - vanAIr).coerceAtLeast(0)
    return when (quedan) {
        0 -> "cupo $cupo · lleno"
        1 -> "cupo $cupo · queda 1"
        else -> "cupo $cupo · quedan $quedan"
    }
}

/**
 * Costo como lo define el contrato: 0 es gratis; null es «no especificado» y no se
 * muestra (no hay que prometer «Gratis» si el organizador no lo dijo).
 */
private fun textoCosto(costoMxn: Int?): String? = when (costoMxn) {
    null -> null
    0 -> "Gratis"
    else -> "${formatearPrecio(costoMxn)} MXN"
}

private val iconoTipo = mapOf(
    "FIESTA" to "🎉",
    "ACADEMICO" to "📚",
    "DEPORTIVO" to "⚽",
    "CULTURAL" to "🎭",
    "ORGANIZACION" to "🏛️",
    "OTRO" to "📌",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventosScreen(
    tokenProvider: () -> String?,
    onEventoClick: (String) -> Unit = {},
    onCrearClick: () -> Unit = {},
) {
    var eventos by remember { mutableStateOf<List<EventoDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var tipo by remember { mutableStateOf<String?>(null) }
    /** Evento con un «Voy» en camino: evita el doble toque. */
    var respondiendo by remember { mutableStateOf<String?>(null) }
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
                eventos = ApiClient.api<EventosApi>(tokenProvider).proximos(tipo = tipo).eventos
            } catch (e: Exception) {
                val mensaje = mensajeDe(e)
                error = mensaje
                // Con la lista ya en pantalla el estado de error no se ve: se avisa aparte.
                if (eventos.isNotEmpty()) avisar(mensaje)
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    fun responderVoy(evento: EventoDto) {
        if (respondiendo != null) return
        scope.launch {
            respondiendo = evento.id
            try {
                val resp = ApiClient.api<EventosApi>(tokenProvider).responder(
                    evento.id,
                    ResponderEventoRequest("VOY"),
                )
                AgoraAnalytics.eventoAsistencia(
                    tokenProvider,
                    mapOf("eventoId" to evento.id, "respuesta" to "VOY"),
                )
                avisar(if (resp.miRespuesta == "VOY") "¡Te apuntaste! Nos vemos ahí." else "Listo, ya no vas a ir.")
                cargar(refresh = true)
            } catch (e: Exception) {
                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            } finally {
                respondiendo = null
            }
        }
    }

    LaunchedEffect(tipo) { cargar() }

    Box(modifier = Modifier.fillMaxSize()) {
        AgoraPullToRefreshBox(
            isRefreshing = refrescando,
            onRefresh = { cargar(refresh = true) },
            modifier = Modifier.fillMaxSize(),
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.End,
                ) {
                    Button(
                        onClick = onCrearClick,
                        // Sin el «+» en la lectura.
                        modifier = Modifier.semantics { contentDescription = "Crear evento" },
                    ) {
                        Text("+ Crear evento")
                    }
                }

                LazyRow(
                    modifier = Modifier.padding(bottom = 4.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(filtrosTipo, key = { it.first ?: "todos" }) { (valor, etiqueta) ->
                        FilterChip(
                            selected = tipo == valor,
                            onClick = { tipo = valor },
                            label = { Text(etiqueta) },
                        )
                    }
                }

                Box(modifier = Modifier.weight(1f)) {
                    when {
                        cargando && eventos.isEmpty() -> {
                            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                        }
                        // Vacío y error van en algo desplazable para que el jalón de refrescar funcione.
                        error != null && eventos.isEmpty() -> {
                            AgoraEstadoDesplazable {
                                AgoraErrorState(
                                    message = error!!,
                                    onRetry = { cargar() },
                                )
                            }
                        }
                        eventos.isEmpty() -> {
                            AgoraEstadoDesplazable {
                                AgoraEmptyState(
                                    state = AgoraCopy.emptyEventos,
                                    ctaLabel = "Crear evento",
                                    onCta = onCrearClick,
                                    secondaryCtaLabel = AgoraCopy.cta.reintentar,
                                    onSecondaryCta = { cargar() },
                                )
                            }
                        }
                        else -> {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                items(eventos, key = { it.id }) { evento ->
                                    EventoCard(
                                        evento = evento,
                                        ocupado = respondiendo == evento.id,
                                        onClick = { onEventoClick(evento.id) },
                                        onVoy = { responderVoy(evento) },
                                    )
                                }
                            }
                            // Al cambiar de filtro la lista anterior sigue: que se note que carga.
                            if (cargando) {
                                LinearProgressIndicator(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .align(Alignment.TopCenter),
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
}

@Composable
private fun EventoCard(
    evento: EventoDto,
    onClick: () -> Unit,
    onVoy: () -> Unit,
    ocupado: Boolean = false,
) {
    val icono = iconoTipo[evento.tipo] ?: "📌"
    val yaVoy = evento.miRespuesta == "VOY"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = "Ver evento", role = Role.Button, onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            // El lector dice el tipo con palabras en vez de leer el emoji.
            val tipoLeido = filtrosTipo.firstOrNull { it.first == evento.tipo }?.second
            Text(
                "$icono ${evento.titulo}",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.semantics {
                    contentDescription = listOfNotNull(tipoLeido, evento.titulo).joinToString(": ")
                },
            )
            Text(formatearFecha(evento.inicioAt), style = MaterialTheme.typography.labelMedium)
            evento.lugar?.let {
                Text(it, style = MaterialTheme.typography.bodySmall)
            }
            evento.descripcion?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium)
            }
            Text(
                listOfNotNull(
                    if (evento.vanAIr == 1) "1 persona va" else "${evento.vanAIr} van",
                    textoCupo(evento.cupo, evento.vanAIr),
                    textoCosto(evento.costoMxn),
                ).joinToString(" · "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
            )
            if (yaVoy) {
                // El texto corto se lee mejor en la lista; TalkBack sí dice que tocar quita la respuesta.
                OutlinedButton(
                    onClick = onVoy,
                    enabled = !ocupado,
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics { contentDescription = "Vas a ir. Toca para quitar tu respuesta." },
                ) {
                    Text(if (ocupado) "Un momento…" else "✓ Vas a ir")
                }
            } else {
                val lleno = evento.cupo != null && evento.vanAIr >= evento.cupo
                Button(
                    onClick = onVoy,
                    enabled = !lleno && !ocupado,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        when {
                            lleno -> "Sin lugares"
                            ocupado -> "Apuntándote…"
                            else -> "Voy"
                        },
                    )
                }
            }
        }
    }
}
