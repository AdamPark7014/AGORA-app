package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.util.Calendar
import java.util.TimeZone
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EventoDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.PersonaResumenDto
import mx.agora.mobile.nativeapp.data.api.ResponderEventoRequest
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.components.AvataresApilados
import mx.agora.mobile.nativeapp.ui.components.BloqueFecha
import mx.agora.mobile.nativeapp.ui.components.BotonTinta
import mx.agora.mobile.nativeapp.ui.components.ChipD
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.formatearHora
import mx.agora.mobile.nativeapp.ui.util.formatearPrecio
import mx.agora.mobile.nativeapp.ui.util.isoAMilis
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
internal fun textoCosto(costoMxn: Int?): String? = when (costoMxn) {
    null -> null
    0 -> "Gratis"
    else -> "${formatearPrecio(costoMxn)} MXN"
}

/**
 * «Van Diego y 21 más», «Vas tú y Diego», «Van 3 personas». La API no se incluye
 * a sí misma en [asistentes] (te saca a ti), pero sí te cuenta en [vanAIr]: por eso
 * se descuenta uno cuando [yoVoy]. Sin nadie, una invitación en vez de un cero.
 */
internal fun textoQuienVa(vanAIr: Int, asistentes: List<PersonaResumenDto>, yoVoy: Boolean): String {
    if (vanAIr <= 0 && !yoVoy) return "Sé el primero en decir que vas"
    val otros = (vanAIr - if (yoVoy) 1 else 0).coerceAtLeast(0)
    val primero = asistentes.firstOrNull()?.nombre?.trim()?.substringBefore(' ')?.takeIf { it.isNotBlank() }
    return when {
        otros == 0 -> "Por ahora solo vas tú"
        primero == null && yoVoy -> "Vas tú y ${cuenta(otros, "persona más", "personas más")}"
        primero == null -> (if (otros == 1) "Va " else "Van ") + cuenta(otros, "persona", "personas")
        otros == 1 && yoVoy -> "Vas tú y $primero"
        otros == 1 -> "Va $primero"
        yoVoy -> "Vas tú, $primero y ${otros - 1} más"
        else -> "Van $primero y ${otros - 1} más"
    }
}

/**
 * El bloque de fecha no lleva mes: si el evento cae en otro mes se escribe la
 * fecha completa en la línea de la hora para que «SÁB 22» no engañe. Con
 * java.util, como Calendario.kt: minSdk 24 sin desugaring.
 */
private fun cuandoCorto(iso: String): String {
    val inicio = isoAMilis(iso) ?: return formatearFecha(iso)
    val zona = TimeZone.getTimeZone("America/Mexico_City")
    val evento = Calendar.getInstance(zona).apply { timeInMillis = inicio }
    val hoy = Calendar.getInstance(zona)
    val mismoMes = evento.get(Calendar.YEAR) == hoy.get(Calendar.YEAR) &&
        evento.get(Calendar.MONTH) == hoy.get(Calendar.MONTH)
    return if (mismoMes) formatearHora(iso) else formatearFecha(iso)
}

/**
 * Pestaña Eventos. Vive dentro de MainShell, que ya pinta «Eventos» arriba y la
 * barra flotante abajo: aquí no hay título propio ni botón flotante.
 */
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
                LazyRow(
                    contentPadding = PaddingValues(horizontal = AgoraSpacing.Pantalla),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(filtrosTipo, key = { it.first ?: "todos" }) { (valor, etiqueta) ->
                        ChipD(
                            texto = etiqueta,
                            activo = tipo == valor,
                            onClick = { tipo = valor },
                        )
                    }
                }

                Box(modifier = Modifier.weight(1f)) {
                    when {
                        cargando && eventos.isEmpty() -> {
                            CircularProgressIndicator(
                                color = AgoraColors.Naranja,
                                modifier = Modifier.align(Alignment.Center),
                            )
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
                                    ctaLabel = "Crea el primero",
                                    onCta = onCrearClick,
                                    secondaryCtaLabel = AgoraCopy.cta.reintentar,
                                    onSecondaryCta = { cargar() },
                                )
                            }
                        }
                        else -> {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(
                                    start = AgoraSpacing.Tarjeta,
                                    end = AgoraSpacing.Tarjeta,
                                    top = 6.dp,
                                    bottom = AgoraSpacing.Lg,
                                ),
                                verticalArrangement = Arrangement.spacedBy(AgoraSpacing.EntreTarjetas),
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
                                    color = AgoraColors.Naranja,
                                    trackColor = AgoraColors.Superficie2,
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

/**
 * Tarjeta de evento de la D: bloque de fecha naranja a la izquierda, título,
 * «hora · lugar», quién va y mi respuesta con el «Voy» rápido.
 */
@Composable
private fun EventoCard(
    evento: EventoDto,
    onClick: () -> Unit,
    onVoy: () -> Unit,
    ocupado: Boolean = false,
) {
    val yaVoy = evento.miRespuesta == "VOY"
    val meInteresa = evento.miRespuesta == "ME_INTERESA"
    val lleno = evento.cupo != null && evento.vanAIr >= evento.cupo
    val tipoTexto = filtrosTipo.firstOrNull { it.first == evento.tipo }?.second ?: evento.tipo

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(AgoraCardShape)
            .background(AgoraColors.Superficie)
            .clickable(onClickLabel = "Ver evento", role = Role.Button, onClick = onClick)
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        BloqueFecha(inicioIso = evento.inicioAt, ancho = 56.dp, alto = 64.dp)

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                listOfNotNull(tipoTexto, evento.comunidad?.nombre).joinToString(" · "),
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = AgoraColors.NaranjaTinta,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                evento.titulo,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = AgoraColors.Texto,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                listOfNotNull(cuandoCorto(evento.inicioAt), evento.lugar?.takeIf { it.isNotBlank() }).joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextoMedio,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            // Cupo y costo siguen a la vista: deciden si vale la pena abrir el evento.
            listOfNotNull(textoCupo(evento.cupo, evento.vanAIr), textoCosto(evento.costoMxn))
                .takeIf { it.isNotEmpty() }
                ?.let {
                    Text(
                        it.joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall,
                        color = AgoraColors.TextoMedio,
                    )
                }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (evento.asistentes.isNotEmpty()) {
                    AvataresApilados(evento.asistentes.map { it.nombre to it.fotoUrl }, tamano = 26.dp)
                }
                Text(
                    if (meInteresa) {
                        "Te interesa · " + textoQuienVa(evento.vanAIr, evento.asistentes, yoVoy = false)
                    } else {
                        textoQuienVa(evento.vanAIr, evento.asistentes, yoVoy = yaVoy)
                    },
                    style = MaterialTheme.typography.labelMedium,
                    color = AgoraColors.TextoMedio,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                if (yaVoy) {
                    // Tocar quita la respuesta (el API la alterna); el lector lo dice.
                    Row(
                        modifier = Modifier
                            .heightIn(min = 44.dp)
                            .clip(AgoraButtonShape)
                            .background(AgoraColors.NaranjaSuave)
                            .clickable(enabled = !ocupado, role = Role.Button, onClick = onVoy)
                            .semantics { contentDescription = "Vas a ir. Toca para quitar tu respuesta." }
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            Icons.Outlined.Check,
                            contentDescription = null,
                            tint = AgoraColors.NaranjaTinta,
                            modifier = Modifier.size(16.dp),
                        )
                        Text(
                            if (ocupado) "Un momento…" else "Vas",
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                            color = AgoraColors.NaranjaTinta,
                        )
                    }
                } else {
                    BotonTinta(
                        texto = when {
                            lleno -> "Sin lugares"
                            ocupado -> "Apuntándote…"
                            else -> "Voy"
                        },
                        onClick = onVoy,
                        enabled = !lleno && !ocupado,
                    )
                }
            }
        }
    }
}
