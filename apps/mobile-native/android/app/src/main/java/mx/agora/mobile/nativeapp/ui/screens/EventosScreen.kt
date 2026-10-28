package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EventoDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.PersonaResumenDto
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AvataresApilados
import mx.agora.mobile.nativeapp.ui.components.PildoraFiltro
import mx.agora.mobile.nativeapp.ui.components.Talavera
import mx.agora.mobile.nativeapp.ui.components.Terrazas
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.formatearHora
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

/** Fondo y tinta de un cartel por tipo (docs/diseno-cholula.md §4). */
private data class ColoresCartel(val fondo: Color, val tinta: Color)

private fun coloresCartel(tipo: String?): ColoresCartel = when (tipo) {
    "FIESTA" -> ColoresCartel(AgoraColors.Adobe, Color.White)
    "DEPORTIVO" -> ColoresCartel(AgoraColors.Talavera, Color.White)
    "CULTURAL" -> ColoresCartel(AgoraColors.Jade, Color.White)
    "ACADEMICO" -> ColoresCartel(AgoraColors.Maiz, AgoraColors.SobreMaiz)
    else -> ColoresCartel(AgoraColors.Superficie2, AgoraColors.Texto)
}

private val zonaMx = ZoneId.of("America/Mexico_City")
private val esMx = Locale("es", "MX")

/** «Octubre»: el mes en curso (sin «semana N» hasta que exista la API del semestre). */
private fun mesActual(): String =
    DateTimeFormatter.ofPattern("LLLL", esMx).format(ZonedDateTime.now(zonaMx))
        .replaceFirstChar { it.titlecase(esMx) }

/**
 * Pestaña Eventos de B «Cholula»: «Cartelera». El próximo evento es un cartel grande (con
 * cuenta regresiva si es hoy) y los demás van en rejilla de dos, cada uno del color de su
 * tipo. El «Voy» se da en el detalle del evento.
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
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            error = null
            try {
                eventos = ApiClient.api<EventosApi>(tokenProvider).proximos(tipo = tipo).eventos
            } catch (e: Exception) {
                val mensaje = mensajeDe(e)
                error = mensaje
                // Con la cartelera ya en pantalla el estado de error no se ve: se avisa aparte.
                if (eventos.isNotEmpty()) scope.launch { snackbar.showSnackbar(mensaje) }
            } finally {
                cargando = false
                refrescando = false
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
            // Vacío y error también van en la lista para que el jalón de refrescar funcione.
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = AgoraSpacing.Lg),
            ) {
                item(key = "encabezado") { EncabezadoCartelera(onCrearClick) }
                item(key = "filtros") {
                    LazyRow(
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(filtrosTipo, key = { it.first ?: "todos" }) { (valor, etiqueta) ->
                            PildoraFiltro(
                                texto = etiqueta,
                                activa = tipo == valor,
                                color = valor?.let { coloresCartel(it).fondo },
                                bordeCuadro = valor == "ORGANIZACION" || valor == "OTRO",
                                onClick = { tipo = valor },
                            )
                        }
                    }
                }
                when {
                    cargando && eventos.isEmpty() -> item(key = "cargando") {
                        Box(Modifier.fillMaxWidth().padding(vertical = 60.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = AgoraColors.Naranja)
                        }
                    }
                    error != null && eventos.isEmpty() -> item(key = "error") {
                        AgoraErrorState(message = error!!, onRetry = { cargar() })
                    }
                    eventos.isEmpty() -> item(key = "vacio") {
                        AgoraEmptyState(
                            state = AgoraCopy.emptyEventos,
                            ctaLabel = "Crea el primero",
                            onCta = onCrearClick,
                            secondaryCtaLabel = AgoraCopy.cta.reintentar,
                            onSecondaryCta = { cargar() },
                        )
                    }
                    else -> {
                        if (cargando) {
                            // Al cambiar de filtro la cartelera anterior sigue: que se note que carga.
                            item(key = "barra") {
                                LinearProgressIndicator(
                                    color = AgoraColors.Naranja,
                                    trackColor = AgoraColors.Superficie2,
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 2.dp),
                                )
                            }
                        }
                        val primero = eventos.first()
                        item(key = primero.id) {
                            Cartel(
                                evento = primero,
                                grande = true,
                                onClick = { onEventoClick(primero.id) },
                                modifier = Modifier.padding(horizontal = 12.dp),
                            )
                        }
                        items(eventos.drop(1).chunked(2), key = { fila -> fila.first().id }) { fila ->
                            Row(
                                modifier = Modifier
                                    .padding(start = 12.dp, end = 12.dp, top = 10.dp)
                                    .height(IntrinsicSize.Min),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                fila.forEach { evento ->
                                    Cartel(
                                        evento = evento,
                                        grande = false,
                                        onClick = { onEventoClick(evento.id) },
                                        modifier = Modifier.weight(1f).fillMaxHeight(),
                                    )
                                }
                                if (fila.size == 1) Spacer(Modifier.weight(1f))
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

/** «Cartelera» con el mes y el «+» relleno para crear evento (artboard WowB-Eventos). */
@Composable
private fun EncabezadoCartelera(onCrear: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 10.dp, top = 16.dp, bottom = 12.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                "Cartelera",
                fontFamily = AgoraFonts.titulo,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 32.sp,
                lineHeight = 34.sp,
                letterSpacing = (-0.6).sp,
                color = AgoraColors.Texto,
                modifier = Modifier.semantics { heading() },
            )
            Text(mesActual(), style = MaterialTheme.typography.bodyMedium, color = AgoraColors.TextoMedio)
        }
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(AgoraColors.Boton)
                .semantics { contentDescription = "Crear evento" }
                .clickable(role = Role.Button, onClick = onCrear),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Add, contentDescription = null, tint = AgoraColors.SobreBoton, modifier = Modifier.size(22.dp))
        }
    }
}

/**
 * Un cartel: número del día gigante, día (y hora en el grande), título y lugar. El grande es
 * el próximo evento; si es hoy y aún no empieza lleva la cuenta regresiva, y dice cuántos van.
 */
@Composable
private fun Cartel(evento: EventoDto, grande: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colores = coloresCartel(evento.tipo)
    val inicio = runCatching { Instant.parse(evento.inicioAt).atZone(zonaMx) }.getOrNull()
    val ahora = ZonedDateTime.now(zonaMx)
    val dia = inicio?.let { DateTimeFormatter.ofPattern("EEE", esMx).format(it).trimEnd('.').uppercase(esMx) }.orEmpty()
    val hora = formatearHora(evento.inicioAt)
    val etiquetaDia = when {
        inicio == null -> ""
        grande -> "$dia · $hora"
        inicio.year == ahora.year && inicio.month == ahora.month -> dia
        else -> "$dia · " + DateTimeFormatter.ofPattern("MMM", esMx).format(inicio).trimEnd('.').uppercase(esMx)
    }
    val detalle = listOfNotNull(
        evento.lugar?.takeIf { it.isNotBlank() },
        if (grande) textoCosto(evento.costoMxn) else hora,
    ).joinToString(" · ")
    val esHoyPorEmpezar = inicio != null && inicio.toLocalDate() == ahora.toLocalDate() && inicio.isAfter(ahora)
    val forma = RoundedCornerShape(20.dp)
    val numeroTam = if (grande) 110 else 70

    // Alto mínimo del artboard; un título largo lo hace crecer en vez de cortarse.
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = if (grande) 250.dp else 200.dp)
            .clip(forma)
            .background(colores.fondo)
            .clickable(onClickLabel = "Ver evento", role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) {
                contentDescription = listOfNotNull(
                    evento.titulo,
                    formatearFecha(evento.inicioAt),
                    evento.lugar?.takeIf { it.isNotBlank() },
                    evento.vanAIr.takeIf { it > 0 }?.let { if (it == 1) "1 va" else "$it van" },
                ).joinToString(", ")
            },
    ) {
        MotivoCartel(evento.tipo, grande)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = if (grande) 250.dp else 200.dp)
                .padding(16.dp)
                .clearAndSetSemantics {},
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    inicio?.dayOfMonth?.toString().orEmpty(),
                    color = colores.tinta,
                    style = TextStyle(
                        fontFamily = AgoraFonts.titulo,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = numeroTam.sp,
                        lineHeight = (numeroTam * 0.82).sp,
                        letterSpacing = (-3).sp,
                        platformStyle = PlatformTextStyle(includeFontPadding = false),
                        lineHeightStyle = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.Both),
                    ),
                    maxLines = 1,
                    modifier = Modifier.alignByBaseline(),
                )
                Text(
                    etiquetaDia,
                    color = colores.tinta,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.4.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.alignByBaseline(),
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (grande && esHoyPorEmpezar && inicio != null) CuentaRegresiva(inicio.toInstant(), colores.tinta)
                Text(
                    evento.titulo,
                    color = colores.tinta,
                    fontFamily = AgoraFonts.titulo,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = if (grande) 24.sp else 17.sp,
                    lineHeight = if (grande) 26.sp else 18.sp,
                    maxLines = if (grande) 2 else 3,
                    overflow = TextOverflow.Ellipsis,
                )
                if (detalle.isNotEmpty()) {
                    Text(
                        detalle,
                        color = colores.tinta.copy(alpha = 0.92f),
                        fontSize = 12.sp,
                        lineHeight = 15.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (grande && evento.vanAIr > 0) {
                    Row(
                        modifier = Modifier.padding(top = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        if (evento.asistentes.isNotEmpty()) {
                            AvataresApilados(
                                evento.asistentes.map { it.nombre to it.fotoUrl },
                                tamano = 24.dp,
                                borde = colores.fondo,
                            )
                        }
                        Text(
                            if (evento.vanAIr == 1) "1 va" else "${evento.vanAIr} van",
                            color = colores.tinta,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
    }
}

/** Motivo de cada tipo: terrazas en fiesta y cultural, franja de azulejo en deportivo, nada en académico. */
@Composable
private fun BoxScope.MotivoCartel(tipo: String?, grande: Boolean) {
    when (tipo) {
        "FIESTA" -> Terrazas(
            Color.White.copy(alpha = 0.25f),
            Modifier
                .align(Alignment.BottomEnd)
                .offset(x = 14.dp, y = 6.dp)
                .size(if (grande) 210.dp else 120.dp, if (grande) 120.dp else 68.dp),
            niveles = 4,
        )
        "DEPORTIVO" -> Talavera(
            Modifier
                .align(Alignment.TopStart)
                .fillMaxWidth()
                .height(18.dp),
            lado = 18.dp,
        )
        "CULTURAL" -> Terrazas(
            Color.White.copy(alpha = 0.25f),
            Modifier
                .align(Alignment.TopEnd)
                .offset(x = 8.dp, y = 10.dp)
                .size(90.dp, 50.dp),
        )
        "ACADEMICO" -> Unit
        else -> Terrazas(
            AgoraColors.Naranja,
            Modifier
                .align(Alignment.TopEnd)
                .padding(top = 12.dp, end = 10.dp)
                .size(40.dp, 22.dp),
        )
    }
}

/** «EMPIEZA EN 2:14:08» con el punto, solo para el evento de hoy que aún no empieza. */
@Composable
private fun CuentaRegresiva(inicio: Instant, tinta: Color) {
    val falta by produceState(initialValue = segundosHasta(inicio), inicio) {
        while (value > 0) {
            delay(1_000)
            value = segundosHasta(inicio)
        }
    }
    Row(
        modifier = Modifier
            .padding(bottom = 4.dp)
            .height(26.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(tinta.copy(alpha = 0.18f))
            .padding(horizontal = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(7.dp).clip(CircleShape).background(tinta))
        Text(
            "EMPIEZA EN %d:%02d:%02d".format(falta / 3600, (falta % 3600) / 60, falta % 60),
            color = tinta,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            style = TextStyle(letterSpacing = 1.sp, fontFeatureSettings = "tnum"),
        )
    }
}

private fun segundosHasta(inicio: Instant): Long =
    (Duration.between(Instant.now(), inicio).seconds).coerceAtLeast(0)
