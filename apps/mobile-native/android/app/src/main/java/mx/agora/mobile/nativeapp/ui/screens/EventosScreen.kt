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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EventoDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.ResponderEventoRequest
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
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

/** "cupo 40 · quedan 12" / "cupo 40 · lleno"; null si el evento no tiene cupo. */
internal fun textoCupo(cupo: Int?, vanAIr: Int): String? {
    if (cupo == null) return null
    val quedan = (cupo - vanAIr).coerceAtLeast(0)
    return if (quedan == 0) "cupo $cupo · lleno" else "cupo $cupo · quedan $quedan"
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
    val scope = rememberCoroutineScope()

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            error = null
            try {
                eventos = ApiClient.api<EventosApi>(tokenProvider).proximos(tipo = tipo).eventos
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    LaunchedEffect(tipo) { cargar() }

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
                Button(onClick = onCrearClick) {
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
                    error != null && eventos.isEmpty() -> {
                        AgoraErrorState(
                            message = error!!,
                            modifier = Modifier.align(Alignment.Center),
                            onRetry = { cargar() },
                        )
                    }
                    eventos.isEmpty() -> {
                        AgoraEmptyState(
                            state = AgoraCopy.emptyEventos,
                            modifier = Modifier.align(Alignment.Center),
                            ctaLabel = AgoraCopy.cta.publicarAlgo,
                            onCta = onCrearClick,
                        )
                    }
                    else -> {
                        LazyColumn(
                            contentPadding = PaddingValues(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(eventos, key = { it.id }) { evento ->
                                EventoCard(
                                    evento = evento,
                                    onClick = { onEventoClick(evento.id) },
                                    onAsistencia = { voy ->
                                        scope.launch {
                                            try {
                                                ApiClient.api<EventosApi>(tokenProvider).responder(
                                                    evento.id,
                                                    ResponderEventoRequest(if (voy) "VOY" else "ME_INTERESA"),
                                                )
                                                AgoraAnalytics.eventoAsistencia(
                                                    tokenProvider,
                                                    mapOf(
                                                        "eventoId" to evento.id,
                                                        "respuesta" to if (voy) "VOY" else "ME_INTERESA",
                                                    ),
                                                )
                                                cargar(refresh = true)
                                            } catch (e: Exception) {
                                                error = mensajeDe(e)
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
    }
}

@Composable
private fun EventoCard(
    evento: EventoDto,
    onClick: () -> Unit,
    onAsistencia: (voy: Boolean) -> Unit,
) {
    val icono = iconoTipo[evento.tipo] ?: "📌"
    val yaVoy = evento.miRespuesta == "VOY"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("$icono ${evento.titulo}", style = MaterialTheme.typography.titleMedium)
            Text(formatearFecha(evento.inicioAt), style = MaterialTheme.typography.labelMedium)
            evento.lugar?.let {
                Text(it, style = MaterialTheme.typography.bodySmall)
            }
            evento.descripcion?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium)
            }
            Text(
                listOfNotNull(
                    "${evento.vanAIr} van",
                    textoCupo(evento.cupo, evento.vanAIr),
                    evento.costoMxn?.let { "$$it MXN" } ?: "Gratis",
                ).joinToString(" · "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
            )
            if (yaVoy) {
                OutlinedButton(onClick = { onAsistencia(true) }, modifier = Modifier.fillMaxWidth()) {
                    Text("✓ Voy (tocar para quitar)")
                }
            } else {
                val lleno = evento.cupo != null && evento.vanAIr >= evento.cupo
                Button(
                    onClick = { onAsistencia(true) },
                    enabled = !lleno,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (lleno) "Sin lugares" else "Voy")
                }
            }
        }
    }
}
