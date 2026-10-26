package mx.agora.mobile.nativeapp.ui.screens

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.util.Locale
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.AbrirConversacionRequest
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EventoDetalleDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.ResponderEventoRequest
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AvataresApilados
import mx.agora.mobile.nativeapp.ui.components.BloqueFecha
import mx.agora.mobile.nativeapp.ui.components.BotonBorde
import mx.agora.mobile.nativeapp.ui.components.DialogoConfirmacion
import mx.agora.mobile.nativeapp.ui.components.iconoComunidad
import mx.agora.mobile.nativeapp.ui.components.tipoComunidad
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFotoShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.agregarACalendario
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.formatearHora
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
private const val VOY = "VOY"
private const val ME_INTERESA = "ME_INTERESA"

/** «quedan 17 lugares» / «queda 1 lugar» / «Sin lugares»; null si el evento no tiene cupo. */
private fun textoLugares(cupo: Int?, vanAIr: Int): String? {
    if (cupo == null) return null
    val quedan = (cupo - vanAIr).coerceAtLeast(0)
    return when (quedan) {
        0 -> "Sin lugares"
        1 -> "queda 1 lugar"
        else -> "quedan ${cuenta(quedan, "lugar", "lugares")}"
    }
}

/**
 * «Cómo llegar»: la app de mapas con el lugar tal como lo escribió quien organiza.
 * Sin app de mapas se intenta Google Maps en el navegador; sin navegador, un aviso.
 */
private fun abrirMapa(context: Context, lugar: String) {
    val geo = Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=${Uri.encode(lugar)}"))
    try {
        context.startActivity(geo)
    } catch (_: ActivityNotFoundException) {
        val web = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(lugar)}"),
        )
        try {
            context.startActivity(web)
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(context, "No encontramos una app de mapas en tu teléfono.", Toast.LENGTH_SHORT).show()
        }
    }
}

/**
 * Detalle de evento del diseño D (docs/diseno-d.md §4): portada con el bloque de
 * fecha, quién va, Cómo llegar / Aventones, organizador y la barra fija `oscuro`
 * con Calendario, Me interesa y Voy.
 *
 * @param onVolver si llega, la ruta va sin SecondaryScaffold: la pantalla pinta su
 *   propio «Volver» sobre la portada y descuenta las barras del sistema. Si es null,
 *   el Scaffold de afuera ya pone la barra superior y los insets.
 * @param onAventones abre Aventones; null oculta la tarjeta.
 * @param onMensaje recibe el id de la conversación con quien organiza; null oculta «Mensaje».
 */
@Composable
fun EventoDetalleScreen(
    eventoId: String,
    tokenProvider: () -> String?,
    onPerfilClick: (String) -> Unit,
    onBorrado: () -> Unit,
    modifier: Modifier = Modifier,
    onVolver: (() -> Unit)? = null,
    onAventones: (() -> Unit)? = null,
    onMensaje: ((String) -> Unit)? = null,
) {
    var evento by remember { mutableStateOf<EventoDetalleDto?>(null) }
    var cargando by remember { mutableStateOf(true) }
    /** Error al cargar el detalle (pantalla de error con «Reintentar»). */
    var error by remember { mutableStateOf<String?>(null) }
    var respondiendo by remember { mutableStateOf(false) }
    var confirmarBorrado by remember { mutableStateOf(false) }
    var borrando by remember { mutableStateOf(false) }
    var menuAbierto by remember { mutableStateOf(false) }
    var abriendoChat by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val propia = onVolver != null

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
                val antesIba = actual.miRespuesta == VOY
                val ahoraVa = resp.miRespuesta == VOY
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

    fun escribir(handle: String) {
        val abrir = onMensaje ?: return
        if (abriendoChat) return
        scope.launch {
            abriendoChat = true
            try {
                val chat = ApiClient.api<MensajesApi>(tokenProvider).abrir(AbrirConversacionRequest(handle))
                abrir(chat.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                avisar(mensajeDe(e))
            } finally {
                abriendoChat = false
            }
        }
    }

    LaunchedEffect(eventoId) { cargar() }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(AgoraColors.Fondo)
            .then(if (propia) Modifier.statusBarsPadding() else Modifier),
    ) {
        when {
            cargando && evento == null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AgoraColors.Naranja)
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
                Column(Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .verticalScroll(rememberScrollState()),
                        ) {
                            Portada(
                                item = item,
                                onVolver = onVolver,
                                onCompartir = { compartirEnlace(context, EnlacesWeb.evento(eventoId), item.titulo) },
                                menuAbierto = menuAbierto,
                                onMenu = { menuAbierto = it },
                                onEliminar = {
                                    menuAbierto = false
                                    confirmarBorrado = true
                                },
                            )
                            Contenido(
                                item = item,
                                onPerfilClick = onPerfilClick,
                                onComoLlegar = { lugar -> abrirMapa(context, lugar) },
                                onAventones = onAventones,
                                // Solo si hay a dónde llevar el chat y no soy yo quien organiza.
                                onMensaje = if (onMensaje != null && !item.esMio) {
                                    { handle: String -> escribir(handle) }
                                } else {
                                    null
                                },
                                abriendoChat = abriendoChat,
                            )
                        }
                        SnackbarHost(
                            hostState = snackbar,
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                                .padding(12.dp),
                        )
                    }
                    BarraEvento(
                        miRespuesta = item.miRespuesta,
                        lleno = item.cupo != null && item.vanAIr >= item.cupo,
                        ocupado = respondiendo,
                        onCalendario = {
                            agregarACalendario(
                                context,
                                titulo = item.titulo,
                                descripcion = item.descripcion,
                                lugar = item.lugar,
                                inicioIso = item.inicioAt,
                                finIso = item.finAt,
                                enlace = EnlacesWeb.evento(eventoId),
                            )
                        },
                        onResponder = { responder(it) },
                        modifier = if (propia) Modifier.navigationBarsPadding() else Modifier,
                    )
                }
            }
        }

        // Cargando o con error no hay portada: el «Volver» propio va suelto arriba.
        if (evento == null && onVolver != null) {
            BotonPortada(
                icono = Icons.AutoMirrored.Outlined.ArrowBack,
                descripcion = "Volver",
                onClick = onVolver,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(12.dp),
            )
        }
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

/**
 * Portada con esquinas (radio 24) y el bloque de fecha encima. La API todavía no
 * manda foto de evento: va `superficie-2` con un ícono de calendario.
 */
@Composable
private fun Portada(
    item: EventoDetalleDto,
    onVolver: (() -> Unit)?,
    onCompartir: () -> Unit,
    menuAbierto: Boolean,
    onMenu: (Boolean) -> Unit,
    onEliminar: () -> Unit,
) {
    Box(
        modifier = Modifier
            .padding(start = AgoraSpacing.Tarjeta, end = AgoraSpacing.Tarjeta, top = 12.dp)
            .fillMaxWidth()
            .height(220.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(AgoraColors.Superficie2),
    ) {
        Icon(
            Icons.Outlined.CalendarMonth,
            contentDescription = null,
            tint = AgoraColors.TextoMedio,
            modifier = Modifier
                .align(Alignment.Center)
                .size(48.dp),
        )
        if (onVolver != null) {
            BotonPortada(
                icono = Icons.AutoMirrored.Outlined.ArrowBack,
                descripcion = "Volver",
                onClick = onVolver,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(12.dp),
            )
        }
        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            BotonPortada(
                icono = Icons.Outlined.Share,
                descripcion = AgoraCopy.compartir.accion,
                onClick = onCompartir,
            )
            // Lo secundario va en «…»; hoy solo quien organiza tiene algo ahí.
            if (item.esMio) {
                Box {
                    BotonPortada(
                        icono = Icons.Outlined.MoreHoriz,
                        descripcion = "Más opciones",
                        onClick = { onMenu(true) },
                    )
                    DropdownMenu(expanded = menuAbierto, onDismissRequest = { onMenu(false) }) {
                        DropdownMenuItem(
                            text = { Text("Eliminar evento", color = AgoraColors.Danger) },
                            leadingIcon = {
                                Icon(Icons.Outlined.Delete, contentDescription = null, tint = AgoraColors.Danger)
                            },
                            onClick = onEliminar,
                        )
                    }
                }
            }
        }
        BloqueFecha(
            inicioIso = item.inicioAt,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(12.dp),
            relleno = false,
            ancho = 60.dp,
            alto = 66.dp,
            conMes = true,
        )
    }
}

/** Botón cuadrado de 44 sobre la portada (volver, compartir, «…»). */
@Composable
private fun BotonPortada(
    icono: ImageVector,
    descripcion: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(44.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.Superficie)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icono, contentDescription = descripcion, tint = AgoraColors.Texto, modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun Contenido(
    item: EventoDetalleDto,
    onPerfilClick: (String) -> Unit,
    onComoLlegar: (String) -> Unit,
    onAventones: (() -> Unit)?,
    onMensaje: ((String) -> Unit)?,
    abriendoChat: Boolean,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = AgoraSpacing.Pantalla)
            .padding(top = 16.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            EtiquetaEvento(item)
            Text(
                item.titulo,
                style = MaterialTheme.typography.headlineMedium,
                color = AgoraColors.Texto,
                modifier = Modifier.semantics { heading() },
            )
            // Fecha y hora completas aquí: el bloque de la portada no dice la hora.
            val fin = item.finAt?.let(::formatearHora)?.takeIf { it.isNotEmpty() }
            val horario = formatearFecha(item.inicioAt) + (fin?.let { " a $it" } ?: "")
            Text(
                listOfNotNull(horario, textoCosto(item.costoMxn), item.cupo?.let { "cupo $it" }).joinToString(" · "),
                style = MaterialTheme.typography.bodyMedium,
                color = AgoraColors.TextoMedio,
            )
        }

        QuienVa(item)

        val lugar = item.lugar?.takeIf { it.isNotBlank() }
        if (lugar != null || onAventones != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(IntrinsicSize.Min),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (lugar != null) {
                    TarjetaAccion(
                        icono = Icons.Outlined.Place,
                        titulo = lugar,
                        accion = "Cómo llegar",
                        onClick = { onComoLlegar(lugar) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                    )
                }
                if (onAventones != null) {
                    // Sin número: la API del evento no dice cuántos aventones hay.
                    TarjetaAccion(
                        icono = Icons.Outlined.DirectionsCar,
                        titulo = "Aventones",
                        accion = "Busca o comparte uno",
                        onClick = onAventones,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                    )
                }
            }
        }

        item.descripcion?.takeIf { it.isNotBlank() }?.let {
            Text(it, style = MaterialTheme.typography.bodyLarge, color = AgoraColors.Texto)
        }

        item.autor?.let { autor ->
            val nombre = autor.nombre ?: autor.handle ?: "alguien"
            val handle = autor.handle
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 48.dp)
                        .clip(AgoraButtonShape)
                        .clickable(
                            enabled = handle != null,
                            role = Role.Button,
                            onClickLabel = "Ver perfil",
                        ) { handle?.let(onPerfilClick) },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    AgoraAvatar(nombre = nombre, fotoUrl = autor.fotoUrl, size = 38.dp)
                    Text(
                        buildAnnotatedString {
                            withStyle(SpanStyle(color = AgoraColors.TextoMedio)) { append("Organiza ") }
                            withStyle(SpanStyle(color = AgoraColors.Texto, fontWeight = FontWeight.SemiBold)) {
                                append(nombre)
                            }
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (onMensaje != null && handle != null) {
                    BotonBorde(
                        texto = if (abriendoChat) "Abriendo…" else "Mensaje",
                        onClick = { onMensaje(handle) },
                        enabled = !abriendoChat,
                    )
                }
            }
        }
    }
}

/** «FIESTA · GENERACIÓN 2024» en naranja suave, con el ícono de la comunidad si hay. */
@Composable
private fun EtiquetaEvento(item: EventoDetalleDto) {
    val tipo = tiposEvento[item.tipo] ?: item.tipo
    val comunidad = item.comunidad
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(AgoraColors.NaranjaSuave)
            .padding(horizontal = 10.dp, vertical = 5.dp)
            .clearAndSetSemantics {
                contentDescription = listOfNotNull(tipo, comunidad?.let { "comunidad ${it.nombre}" }).joinToString(", ")
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (comunidad != null) {
            Icon(
                iconoComunidad(tipoComunidad(comunidad.slug)),
                contentDescription = null,
                tint = AgoraColors.NaranjaTinta,
                modifier = Modifier.size(14.dp),
            )
        }
        Text(
            listOfNotNull(tipo, comunidad?.nombre).joinToString(" · ").uppercase(Locale("es", "MX")),
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.3.sp),
            color = AgoraColors.NaranjaTinta,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Avatares de quién va + «Van Diego y 21 más» + lugares que quedan. Todo sale de la API. */
@Composable
private fun QuienVa(item: EventoDetalleDto) {
    val lugares = textoLugares(item.cupo, item.vanAIr)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(AgoraColors.Superficie)
            .padding(12.dp)
            .semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (item.asistentes.isNotEmpty()) {
            AvataresApilados(item.asistentes.map { it.nombre to it.fotoUrl })
        }
        Text(
            textoQuienVa(item.vanAIr, item.asistentes, yoVoy = item.miRespuesta == VOY),
            style = MaterialTheme.typography.bodyMedium,
            color = AgoraColors.Texto,
            modifier = Modifier.weight(1f),
        )
        if (lugares != null) {
            Text(
                lugares,
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                color = if (item.cupo != null && item.vanAIr >= item.cupo) AgoraColors.Danger else AgoraColors.Success,
            )
        }
    }
}

/** Tarjeta chica de acción: «Cómo llegar», «Aventones». */
@Composable
private fun TarjetaAccion(
    icono: ImageVector,
    titulo: String,
    accion: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clip(AgoraFotoShape)
            .background(AgoraColors.Superficie)
            .clickable(role = Role.Button, onClickLabel = accion, onClick = onClick)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(icono, contentDescription = null, tint = AgoraColors.Texto, modifier = Modifier.size(20.dp))
        Text(
            titulo,
            style = MaterialTheme.typography.titleSmall,
            color = AgoraColors.Texto,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(accion, style = MaterialTheme.typography.labelMedium, color = AgoraColors.NaranjaTinta)
    }
}

/**
 * Barra fija `oscuro` (radio 22, márgenes 14): Calendario, Me interesa y Voy. Sobre
 * `oscuro` el blanco va fijo: la barra es oscura en los dos temas.
 */
@Composable
private fun BarraEvento(
    miRespuesta: String?,
    lleno: Boolean,
    ocupado: Boolean,
    onCalendario: () -> Unit,
    onResponder: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val interesa = miRespuesta == ME_INTERESA
    val voy = miRespuesta == VOY
    // Lleno solo bloquea a quien no va: quien ya va puede quitarse.
    val sinLugar = lleno && !voy
    val forma = RoundedCornerShape(16.dp)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = AgoraSpacing.Tarjeta, end = AgoraSpacing.Tarjeta, top = 8.dp, bottom = AgoraSpacing.Tarjeta)
            .clip(RoundedCornerShape(22.dp))
            .background(AgoraColors.Oscuro)
            .padding(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(50.dp)
                .clip(forma)
                .background(Color.White.copy(alpha = 0.12f))
                .clickable(role = Role.Button, onClick = onCalendario),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.Event,
                contentDescription = "Agregar a mi calendario",
                tint = Color.White,
                modifier = Modifier.size(22.dp),
            )
        }

        Row(
            modifier = Modifier
                .height(50.dp)
                .clip(forma)
                .background(if (interesa) Color.White else Color.White.copy(alpha = 0.12f))
                .clickable(enabled = !ocupado, role = Role.Button) { onResponder(ME_INTERESA) }
                .alpha(if (ocupado) 0.6f else 1f)
                .semantics {
                    selected = interesa
                    if (interesa) stateDescription = "Seleccionado. Toca para quitar."
                }
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (interesa) {
                Icon(Icons.Outlined.Check, contentDescription = null, tint = AgoraColors.Oscuro, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
            }
            Text(
                "Me interesa",
                style = MaterialTheme.typography.labelLarge.copy(fontSize = 15.sp),
                color = if (interesa) AgoraColors.Oscuro else Color.White,
                maxLines = 1,
            )
        }

        Row(
            modifier = Modifier
                .weight(1f)
                .height(50.dp)
                .clip(forma)
                .background(if (sinLugar) Color.White.copy(alpha = 0.12f) else AgoraColors.Naranja)
                .clickable(enabled = !ocupado && !sinLugar, role = Role.Button) { onResponder(VOY) }
                .alpha(if (ocupado) 0.6f else 1f)
                .semantics {
                    selected = voy
                    if (voy) stateDescription = "Vas a ir. Toca para quitar tu respuesta."
                },
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (voy) {
                Icon(Icons.Outlined.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
            }
            Text(
                when {
                    sinLugar -> "Sin lugares"
                    voy -> "Vas a ir"
                    else -> "Voy"
                },
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold, fontSize = 16.sp),
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
