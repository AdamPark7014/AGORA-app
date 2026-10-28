package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.ui.semantics.Role
import mx.agora.mobile.nativeapp.ui.util.formatearHora
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.components.PildoraFiltro
import mx.agora.mobile.nativeapp.ui.components.BotonCabeza
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.IntrinsicSize
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
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
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
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.components.DialogoConfirmacion
import mx.agora.mobile.nativeapp.ui.components.SelectorFechaHora
import mx.agora.mobile.nativeapp.ui.components.fechaHoraCampus
import mx.agora.mobile.nativeapp.ui.components.isoUtc
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.formatearCuota
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

/** Lo que dice el lector en los chips de filtro, sin las flechas. */
private val lecturaSentido = sentidosAventon.toMap()

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
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val mensaje = mensajeDe(e)
                if (refresh && aventones.isNotEmpty()) {
                    // Con la lista en pantalla no se vacía: se avisa aparte.
                    avisar(mensaje)
                } else {
                    error = mensaje
                    aventones = emptyList()
                }
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
                        val lectura = lecturaSentido[valor]
                        Box(if (lectura != null) Modifier.semantics { contentDescription = lectura } else Modifier) {
                            PildoraFiltro(texto = etiqueta, activa = sentido == valor, onClick = { sentido = valor })
                        }
                    }
                }
                BotonCabeza(
                    "Ofrecer",
                    onClick = { abrirNuevo() },
                    modifier = Modifier.padding(start = 8.dp),
                    descripcion = "Ofrecer un aventón",
                )
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
                    // Desplazables para que el jalón de refrescar funcione aunque no haya lista.
                    aventones.isEmpty() -> {
                        AgoraEstadoDesplazable {
                            if (error != null) {
                                AgoraErrorState(
                                    message = error!!,
                                    onRetry = { cargar() },
                                )
                            } else {
                                AgoraEmptyState(
                                    state = AgoraCopy.emptyAventones,
                                    ctaLabel = "Ofrecer aventón",
                                    onCta = { abrirNuevo() },
                                )
                            }
                        }
                    }
                    else -> {
                        LazyColumn(
                            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 6.dp, bottom = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
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
        val scrollFormulario = rememberScrollState()

        // El error se pinta al final del formulario: se baja hasta él para que se vea.
        fun mostrarErrorFormulario(mensaje: String) {
            errorFormulario = mensaje
            scope.launch {
                // Dos cuadros: en el primero apenas se recompone y mide el texto.
                withFrameNanos { }
                withFrameNanos { }
                scrollFormulario.animateScrollTo(scrollFormulario.maxValue)
            }
        }

        AlertDialog(
            onDismissRequest = { if (!enviando) modal = false },
            title = { Text("Nuevo aventón") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(scrollFormulario),
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
                    errorFormulario?.let {
                        Text(
                            it,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val problema = validarNuevoAventon(nuevo)
                        if (problema != null) {
                            mostrarErrorFormulario(problema)
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
                            } catch (e: CancellationException) {
                                throw e
                            } catch (e: Exception) {
                                mostrarErrorFormulario(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
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

/** Talón por sentido: al campus Talavera, desde el campus adobe, otro maíz (como iOS). */
private fun colorTalon(sentido: String): Pair<Color, Color> = when (sentido) {
    "A_CAMPUS" -> AgoraColors.Talavera to Color.White
    "DESDE_CAMPUS" -> AgoraColors.Adobe to Color.White
    else -> AgoraColors.Maiz to AgoraColors.SobreMaiz
}

/** «MAR 27 OCT · 7:00» con la hora del campus. */
private fun fechaBoleto(iso: String): String = runCatching {
    val zona = java.time.ZoneId.of("America/Mexico_City")
    val f = java.time.Instant.parse(iso).atZone(zona)
    val es = java.util.Locale("es", "MX")
    val dia = java.time.format.DateTimeFormatter.ofPattern("EEE d MMM", es).format(f).replace(".", "").uppercase(es)
    "$dia · ${formatearHora(iso)}"
}.getOrDefault(formatearFecha(iso))

/**
 * Aventón como boleto (WowB-Aventones): fecha, «origen → destino» en Bricolage, quién maneja, barras
 * de lugares y el talón de color con el precio y lo que toca (apartar, soltar, lleno o tuyo).
 */
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
    val libres = (aventon.lugares - aventon.ocupados).coerceAtLeast(0)
    val (fondoTalon, tintaTalon) = colorTalon(aventon.sentido)
    val forma = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .shadow(6.dp, forma)
            .clip(forma)
            .background(AgoraColors.Superficie),
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                fechaBoleto(aventon.salidaAt),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.1.sp,
                color = AgoraColors.TextoMedio,
            )
            Text(
                buildAnnotatedString {
                    append(aventon.origen)
                    append("\n")
                    withStyle(SpanStyle(color = AgoraColors.NaranjaTinta)) { append("→ ") }
                    append(aventon.destino)
                },
                fontFamily = AgoraFonts.titulo,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 20.sp,
                lineHeight = 22.sp,
                color = AgoraColors.Texto,
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                aventon.conductor?.let { conductor ->
                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(enabled = conductor.handle != null, role = Role.Button) {
                                conductor.handle?.let(onPerfilClick)
                            },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        AgoraAvatar(nombre = conductor.nombre ?: conductor.handle ?: "?", fotoUrl = conductor.fotoUrl, size = 26.dp)
                        Text(
                            conductor.handle ?: conductor.nombre ?: "Conductor",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = AgoraColors.TextoMedio,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                } ?: Spacer(Modifier.weight(1f))
                BarrasLugares(aventon.lugares, aventon.ocupados, fondoTalon)
            }
            aventon.nota?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontSize = 13.sp, color = AgoraColors.Texto, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }
            val handleConductor = aventon.conductor?.handle
            if (!aventon.esMio && handleConductor != null) {
                Text(
                    if (contactando) "Abriendo chat…" else "Contactar",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = AgoraColors.Texto,
                    modifier = Modifier
                        .heightIn(min = 36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(AgoraColors.Superficie2)
                        .clickable(enabled = !contactando, role = Role.Button) { onContactar(handleConductor) }
                        .padding(horizontal = 12.dp, vertical = 9.dp),
                )
            }
            if (aventon.esMio) {
                Text(
                    "Cancelar aventón",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier
                        .heightIn(min = 36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable(enabled = !ocupado, role = Role.Button, onClick = onCancelar)
                        .padding(vertical = 9.dp),
                )
            }
        }
        TalonAventon(aventon, libres, ocupado, fondoTalon, tintaTalon, onApartar)
    }
}

/** Barras de lugar, cada vez más altas; las libres en el color del talón. */
@Composable
private fun BarrasLugares(lugares: Int, ocupados: Int, color: Color) {
    val total = lugares.coerceIn(1, 6)
    Row(
        modifier = Modifier.clearAndSetSemantics {
            contentDescription = cuenta((lugares - ocupados).coerceAtLeast(0), "lugar libre", "lugares libres")
        },
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        repeat(total) { i ->
            Box(
                Modifier
                    .width(12.dp)
                    .height((6 + i * 3).dp)
                    .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                    .background(if (i >= ocupados) color else AgoraColors.Borde),
            )
        }
    }
}

/** Talón de 84 con el precio y lo que toca: apartar, soltar tu lugar, lleno o tuyo. */
@Composable
private fun TalonAventon(
    aventon: AventonDto,
    libres: Int,
    ocupado: Boolean,
    fondo: Color,
    tinta: Color,
    onApartar: () -> Unit,
) {
    val accion = when {
        aventon.esMio -> "Tuyo"
        ocupado -> "Un momento…"
        aventon.voyYo -> "Vas ✓"
        libres > 0 -> "Apartar"
        else -> "Lleno"
    }
    val tocable = !aventon.esMio && !ocupado && (aventon.voyYo || libres > 0)
    Column(
        modifier = Modifier
            .width(84.dp)
            .fillMaxHeight()
            .background(fondo)
            .drawBehind {
                val muesca = 8.dp.toPx()
                drawLine(
                    color = Color.White.copy(alpha = 0.55f),
                    start = Offset(1.dp.toPx(), muesca + 4.dp.toPx()),
                    end = Offset(1.dp.toPx(), size.height - muesca - 4.dp.toPx()),
                    strokeWidth = 2.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(5.dp.toPx(), 4.dp.toPx())),
                )
            }
            .clickable(enabled = tocable, role = Role.Button, onClick = onApartar)
            .semantics {
                contentDescription = when {
                    aventon.voyYo -> "Vas en este aventón. Toca para soltar tu lugar."
                    aventon.esMio -> "Tu aventón"
                    libres > 0 -> "Apartar un lugar por ${formatearCuota(aventon.cuotaMxn)}"
                    else -> "Sin lugares"
                }
            }
            .padding(horizontal = 6.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
    ) {
        Text(
            formatearCuota(aventon.cuotaMxn),
            fontFamily = AgoraFonts.titulo,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 20.sp,
            color = tinta,
            maxLines = 1,
        )
        Text(accion, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = tinta, maxLines = 1)
    }
}
