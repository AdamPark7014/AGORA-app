package mx.agora.mobile.nativeapp.ui.screens

import androidx.activity.compose.BackHandler
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.components.nombreCortoComunidad
import mx.agora.mobile.nativeapp.ui.components.Talavera
import mx.agora.mobile.nativeapp.push.PushRegistration
import androidx.core.app.NotificationManagerCompat
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.draw.drawBehind
import androidx.compose.material.icons.automirrored.outlined.ArrowBackIos
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.foundation.layout.width
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.RepeatMode
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import android.os.Build
import android.Manifest
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.House
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.Normalizer
import java.util.Calendar
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.SessionUser
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CarreraDto
import mx.agora.mobile.nativeapp.data.api.CatalogoDto
import mx.agora.mobile.nativeapp.data.api.CrearPerfilRequest
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraPrimaryButton
import mx.agora.mobile.nativeapp.ui.components.ChipD
import mx.agora.mobile.nativeapp.ui.components.ZonaCampus
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

/** Texto legal abierto encima del registro (aún no hay NavHost: la sesión no tiene perfil). */
private enum class LegalRegistro { TERMINOS, REGLAS }

/*
 * «Sube a tu campus» (B «Cholula», artboard WowB-Arranque): el correo ya es el primer escalón al
 * entrar; aquí se suben tu carrera (con tu @, nombre y generación), tu colegio y tus avisos, que
 * también es donde se aceptan las reglas y se crea el perfil. Paridad con `RegistroView.swift`.
 */
private const val PASO_CARRERA = 2
private const val PASO_COLEGIO = 3
private const val PASO_AVISOS = 4
private const val TOTAL_PASOS = 4

private val FormaCampo = RoundedCornerShape(16.dp)
private val FormaOpcion = RoundedCornerShape(16.dp)

/** Carrera con el nombre de su escuela, para la segunda línea de cada resultado. */
private data class CarreraConEscuela(val carrera: CarreraDto, val escuela: String)

/** Resultado del buscador: dónde cayó cada palabra buscada, para resaltarla. */
private data class Coincidencia(val opcion: CarreraConEscuela, val rangos: List<IntRange>, val alInicioDePalabra: Boolean)

/**
 * Sin acentos y en minúsculas, letra por letra: el texto conserva su largo y
 * los índices de lo encontrado sirven tal cual para resaltar el nombre original.
 */
private fun normalizar(texto: String): String = buildString(texto.length) {
    texto.forEach { c ->
        val base = Normalizer.normalize(c.toString(), Normalizer.Form.NFD).firstOrNull() ?: c
        append(base.lowercaseChar())
    }
}

/** Cada palabra de la búsqueda tiene que estar en el nombre (en cualquier orden): «ing sist». */
private fun buscarCarreras(opciones: List<CarreraConEscuela>, consulta: String): List<Coincidencia> {
    val palabras = normalizar(consulta).split(' ', '\t').filter { it.isNotBlank() }
    if (palabras.isEmpty()) return emptyList()
    return opciones.mapNotNull { opcion ->
        val nombre = normalizar(opcion.carrera.nombre)
        val rangos = palabras.map { p ->
            val i = nombre.indexOf(p)
            if (i < 0) return@mapNotNull null
            i until i + p.length
        }
        val alInicio = rangos.all { it.first == 0 || !nombre[it.first - 1].isLetterOrDigit() }
        Coincidencia(opcion, rangos, alInicio)
    }.sortedWith(
        // Primero las que empiezan palabra con lo escrito («sist» → Sistemas antes que «Ingeniería… asistida»).
        compareBy<Coincidencia>({ if (it.alInicioDePalabra) 0 else 1 }, { it.rangos.first().first }, { it.opcion.carrera.nombre }),
    )
}

private fun resaltar(texto: String, rangos: List<IntRange>, color: Color): AnnotatedString = buildAnnotatedString {
    append(texto)
    rangos.forEach { r ->
        addStyle(SpanStyle(fontWeight = FontWeight.ExtraBold, color = color), r.first, r.last + 1)
    }
}

@Composable
private fun coloresCampo(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = AgoraColors.Superficie,
    unfocusedContainerColor = AgoraColors.Superficie,
    focusedBorderColor = AgoraColors.Naranja,
    unfocusedBorderColor = AgoraColors.Borde,
)

@Composable
fun RegistroScreen(
    auth: AuthRepository,
    onCompletado: (SessionUser) -> Unit,
) {
    var catalogo by remember { mutableStateOf<CatalogoDto?>(null) }
    var cargandoCatalogo by remember { mutableStateOf(true) }
    var paso by remember { mutableIntStateOf(PASO_CARRERA) }
    var handle by remember { mutableStateOf("") }
    var nombre by remember { mutableStateOf("") }
    var apellidos by remember { mutableStateOf("") }
    var carreraSlug by remember { mutableStateOf<String?>(null) }
    var colegioSlug by remember { mutableStateOf<String?>(null) }
    /** Lo escrito en el buscador de carreras; se conserva al ir y volver entre pasos. */
    var busquedaCarrera by remember { mutableStateOf("") }
    var enviando by remember { mutableStateOf(false) }
    var exito by remember { mutableStateOf(false) }
    var usuarioCreado by remember { mutableStateOf<SessionUser?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val anioActual = remember { Calendar.getInstance(ZonaCampus).get(Calendar.YEAR) }
    /** Mismo rango y default que la web (`apps/web/app/registro`): 10 años, del que entra hacia atrás. */
    val generaciones = remember(anioActual) { List(10) { anioActual + 1 - it } }
    var generacion by remember { mutableIntStateOf(anioActual) }
    /**
     * Apple (1.2) y Google Play (contenido de usuarios) piden aceptar términos
     * con cero tolerancia antes de usar la app. La API no tiene campo: es un
     * candado de la interfaz sobre «Crear perfil».
     */
    var aceptaReglas by remember { mutableStateOf(false) }
    var legalAbierto by remember { mutableStateOf<LegalRegistro?>(null) }
    /** Sube con «Reintentar» y vuelve a pedir el catálogo. */
    var intentoCatalogo by remember { mutableIntStateOf(0) }
    val context = LocalContext.current
    val correo = remember { auth.loadSession()?.email.orEmpty().lowercase(Locale.ROOT) }
    fun avisosPermitidos() = NotificationManagerCompat.from(context).areNotificationsEnabled()
    /** El último escalón: el permiso del sistema se pide aquí y en Ajustes, nunca antes. */
    var avisosActivos by remember { mutableStateOf(avisosPermitidos()) }
    val pedirPermiso = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { concedido ->
        avisosActivos = concedido
    }

    fun activarAvisos() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !avisosPermitidos()) {
            pedirPermiso.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            avisosActivos = avisosPermitidos()
        }
    }

    LaunchedEffect(intentoCatalogo) {
        cargandoCatalogo = true
        error = null
        try {
            catalogo = ApiClient.catalogo.todo()
        } catch (_: Exception) {
            // Sin catálogo se muestra AgoraErrorState con «Reintentar».
            catalogo = null
        } finally {
            cargandoCatalogo = false
        }
    }

    val carreras: List<CarreraConEscuela> = remember(catalogo) {
        catalogo?.escuelas?.flatMap { e -> e.carreras.map { CarreraConEscuela(it, e.nombre) } } ?: emptyList()
    }
    val coincidencias = remember(carreras, busquedaCarrera) { buscarCarreras(carreras, busquedaCarrera) }
    val carreraElegida = carreras.firstOrNull { it.carrera.slug == carreraSlug }
    val colegioElegido = catalogo?.colegios?.firstOrNull { it.slug == colegioSlug }

    fun irAPaso(nuevo: Int) {
        paso = nuevo.coerceIn(PASO_CARRERA, TOTAL_PASOS)
        error = null
        focusManager.clearFocus()
    }

    fun crearPerfil() {
        if (enviando) return
        scope.launch {
            enviando = true
            error = null
            try {
                val user = auth.crearPerfil(
                    CrearPerfilRequest(
                        handle = handle.trim().lowercase(),
                        nombre = nombre.trim(),
                        apellidos = apellidos.trim(),
                        generacion = generacion,
                        carreraSlug = carreraSlug!!,
                        colegioSlug = colegioSlug,
                    ),
                )
                usuarioCreado = user
                exito = true
                // El token ya se registró al abrir la sesión; con el permiso recién dado se refresca.
                if (avisosActivos) PushRegistration.registerCurrentDeviceAsync(context.applicationContext)
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                enviando = false
            }
        }
    }

    // Encima del formulario y no en otra ruta: así no se pierde lo ya capturado.
    BackHandler(enabled = legalAbierto != null) { legalAbierto = null }
    // Pasado el primero, «atrás» del sistema regresa un paso como la flecha de arriba; antes cerraba la app.
    BackHandler(enabled = paso > PASO_CARRERA && legalAbierto == null && !exito) { irAPaso(paso - 1) }
    when (legalAbierto) {
        LegalRegistro.TERMINOS -> {
            TerminosScreen(onBack = { legalAbierto = null })
            return
        }
        LegalRegistro.REGLAS -> {
            ReglasScreen(onBack = { legalAbierto = null })
            return
        }
        null -> Unit
    }

    if (exito && usuarioCreado != null) {
        RegistroExitoView(
            handle = usuarioCreado!!.handle ?: handle,
            onContinuar = { onCompletado(usuarioCreado!!) },
        )
        return
    }

    when {
        cargandoCatalogo -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AgoraColors.Naranja)
            }
        }
        catalogo == null -> {
            Box(
                Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                AgoraErrorState(
                    message = "No pudimos cargar las carreras. Revisa tu conexión e intenta de nuevo.",
                    onRetry = { intentoCatalogo++ },
                )
            }
        }
        else -> {
            val carreraCorta = carreraElegida?.let { nombreCortoComunidad(it.carrera.nombre, "carrera:") }
            val colegioCorto = colegioElegido?.let { nombreCortoComunidad(it.nombre, "colegio:") }
            val escalones = listOf(
                Escalon(
                    if (correo.endsWith("@udlap.mx")) "Tu correo UDLAP" else "Tu correo",
                    EstadoEscalon.HECHO,
                    AgoraColors.Adobe,
                ),
                Escalon(
                    if (paso > PASO_CARRERA) "Tu carrera · ${carreraCorta ?: "lista"}" else "Tu carrera",
                    if (paso > PASO_CARRERA) EstadoEscalon.HECHO else EstadoEscalon.AHORA,
                    AgoraColors.Talavera,
                ),
                Escalon(
                    when {
                        paso <= PASO_COLEGIO -> "Tu colegio"
                        colegioCorto != null -> "Tu colegio · $colegioCorto"
                        else -> "Sin colegio"
                    },
                    when {
                        paso > PASO_COLEGIO -> EstadoEscalon.HECHO
                        paso == PASO_COLEGIO -> EstadoEscalon.AHORA
                        else -> EstadoEscalon.FALTA
                    },
                    if (colegioCorto == null) AgoraColors.TextoMedio else AgoraColors.Maiz,
                    if (colegioCorto == null) Color.White else AgoraColors.SobreMaiz,
                ),
                Escalon(
                    "Tus avisos",
                    when {
                        avisosActivos -> EstadoEscalon.HECHO
                        paso == PASO_AVISOS -> EstadoEscalon.AHORA
                        else -> EstadoEscalon.FALTA
                    },
                    AgoraColors.Jade,
                ),
            )
            val subtitulo = when (paso) {
                PASO_CARRERA -> "Cada escalón te junta con más gente tuya. Primero, tu carrera."
                PASO_COLEGIO -> "Cada escalón te junta con más gente tuya. Ahora, tu colegio."
                else -> "Último escalón: te avisamos cuando caiga la pregunta del día y cuando te escriban."
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(AgoraColors.Fondo)
                    .safeDrawingPadding(),
            ) {
                Talavera(
                    Modifier
                        .fillMaxWidth()
                        .height(12.dp),
                    lado = 12.dp,
                )

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = AgoraSpacing.Pantalla, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item(key = "titulo") {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (paso > PASO_CARRERA) {
                                Row(
                                    modifier = Modifier
                                        .heightIn(min = 44.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .clickable(role = Role.Button, onClickLabel = "Regresar") { irAPaso(paso - 1) }
                                        .semantics { contentDescription = "Escalón anterior" }
                                        .padding(end = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Outlined.ArrowBackIos,
                                        contentDescription = null,
                                        tint = AgoraColors.TextoMedio,
                                        modifier = Modifier.size(14.dp),
                                    )
                                    Text(
                                        "Atrás",
                                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                                        color = AgoraColors.TextoMedio,
                                    )
                                }
                            } else {
                                Spacer(Modifier.height(12.dp))
                            }
                            Text(
                                "PASO $paso DE $TOTAL_PASOS",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    letterSpacing = 1.4.sp,
                                ),
                                color = AgoraColors.NaranjaTinta,
                                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                            )
                            Text(
                                "Sube a tu campus",
                                fontFamily = AgoraFonts.titulo,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 36.sp,
                                lineHeight = 38.sp,
                                letterSpacing = (-0.8).sp,
                                color = AgoraColors.Texto,
                                modifier = Modifier.semantics { heading() },
                            )
                            Text(subtitulo, style = MaterialTheme.typography.bodyLarge, color = AgoraColors.TextoMedio)
                        }
                    }
                    item(key = "piramide") {
                        PiramideCampus(escalones, Modifier.padding(top = 14.dp, bottom = 16.dp))
                    }
                    when (paso) {
                        PASO_CARRERA -> {
                            item(key = "handle") {
                                OutlinedTextField(
                                    value = handle,
                                    onValueChange = { handle = it.filter { c -> c.isLetterOrDigit() || c == '_' } },
                                    label = { Text("Tu @ en Ágora") },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    shape = FormaCampo,
                                    colors = coloresCampo(),
                                    prefix = { Text("@", color = AgoraColors.Naranja) },
                                    keyboardOptions = KeyboardOptions(
                                        capitalization = KeyboardCapitalization.None,
                                        autoCorrectEnabled = false,
                                        imeAction = ImeAction.Next,
                                    ),
                                )
                                // El filtro quita en silencio lo inválido: la regla va a la vista.
                                Text(
                                    "Elige tu @ — será tu identidad en el campus. Letras, números y guion bajo. Mínimo 3.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AgoraColors.TextoMedio,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                            item(key = "nombre") {
                                OutlinedTextField(
                                    value = nombre,
                                    onValueChange = { nombre = it },
                                    label = { Text("Nombre") },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    shape = FormaCampo,
                                    colors = coloresCampo(),
                                    keyboardOptions = KeyboardOptions(
                                        capitalization = KeyboardCapitalization.Words,
                                        imeAction = ImeAction.Next,
                                    ),
                                )
                            }
                            item(key = "apellidos") {
                                OutlinedTextField(
                                    value = apellidos,
                                    onValueChange = { apellidos = it },
                                    label = { Text("Apellidos") },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    shape = FormaCampo,
                                    colors = coloresCampo(),
                                    keyboardOptions = KeyboardOptions(
                                        capitalization = KeyboardCapitalization.Words,
                                        imeAction = ImeAction.Done,
                                    ),
                                    keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                )
                            }
                            item(key = "generacion") {
                                Column(
                                    modifier = Modifier.padding(top = 6.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    EtiquetaSeccion("¿DE QUÉ GENERACIÓN ERES?")
                                    Text(
                                        "El año en que entraste a la UDLAP",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = AgoraColors.TextoMedio,
                                    )
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        items(generaciones, key = { it }) { anio ->
                                            ChipD(
                                                texto = anio.toString(),
                                                activo = generacion == anio,
                                                onClick = { generacion = anio },
                                                descripcion = "Generación $anio",
                                            )
                                        }
                                    }
                                }
                            }
                            item(key = "etiqueta-carrera") {
                                EtiquetaSeccion("TU CARRERA", modifier = Modifier.padding(top = 6.dp))
                            }
                            item(key = "buscador") {
                                OutlinedTextField(
                                    value = busquedaCarrera,
                                    onValueChange = { busquedaCarrera = it },
                                    placeholder = { Text("Busca tu carrera") },
                                    leadingIcon = {
                                        Icon(Icons.Outlined.Search, contentDescription = null, tint = AgoraColors.TextoMedio)
                                    },
                                    trailingIcon = if (busquedaCarrera.isNotEmpty()) {
                                        {
                                            IconButton(onClick = { busquedaCarrera = "" }) {
                                                Icon(Icons.Outlined.Close, contentDescription = "Borrar búsqueda")
                                            }
                                        }
                                    } else {
                                        null
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .semantics { contentDescription = "Busca tu carrera" },
                                    singleLine = true,
                                    shape = FormaCampo,
                                    colors = coloresCampo(),
                                    keyboardOptions = KeyboardOptions(
                                        capitalization = KeyboardCapitalization.None,
                                        autoCorrectEnabled = false,
                                        imeAction = ImeAction.Search,
                                    ),
                                    keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                                )
                            }
                            // Sin búsqueda no se lista nada (son 52 carreras): solo la ya elegida, si hay.
                            if (busquedaCarrera.isBlank()) {
                                if (carreraElegida != null) {
                                    item(key = "elegida") {
                                        FilaOpcion(
                                            titulo = AnnotatedString(carreraElegida.carrera.nombre),
                                            detalle = carreraElegida.escuela,
                                            icono = Icons.Outlined.School,
                                            elegida = true,
                                            onClick = {},
                                        )
                                    }
                                } else {
                                    item(key = "pista") {
                                        Text(
                                            "Escribe parte del nombre de tu carrera: Sistemas, Derecho, Arquitectura…",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = AgoraColors.TextoMedio,
                                        )
                                    }
                                }
                            } else if (coincidencias.isEmpty()) {
                                item(key = "sin-resultados") {
                                    Text(
                                        "No encontramos «${busquedaCarrera.trim()}». Prueba con otra palabra.",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = AgoraColors.TextoMedio,
                                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                                    )
                                }
                            } else {
                                item(key = "conteo") {
                                    EtiquetaSeccion(
                                        cuenta(coincidencias.size, "resultado", "resultados").uppercase(Locale("es", "MX")),
                                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                                    )
                                }
                                items(coincidencias, key = { "carrera-${it.opcion.carrera.slug}" }) { c ->
                                    FilaOpcion(
                                        titulo = resaltar(c.opcion.carrera.nombre, c.rangos, AgoraColors.NaranjaTinta),
                                        detalle = c.opcion.escuela,
                                        icono = Icons.Outlined.School,
                                        elegida = carreraSlug == c.opcion.carrera.slug,
                                        onClick = {
                                            carreraSlug = c.opcion.carrera.slug
                                            busquedaCarrera = ""
                                            error = null
                                            focusManager.clearFocus()
                                        },
                                    )
                                }
                            }
                            // «N de tu generación en <carrera> ya están aquí» (diseño D) espera un
                            // conteo que la API aún no da: sin el dato, no se muestra.
                        }
                        PASO_COLEGIO -> {
                            val opciones = catalogo!!.colegios.map { colegio ->
                                Triple(colegio.slug as String?, nombreCortoComunidad(colegio.nombre, "colegio:"), AgoraColors.Maiz)
                            } + Triple(null, "No vivo en colegio", AgoraColors.TextoMedio)
                            items(opciones.chunked(2), key = { fila -> "colegios-${fila.first().first ?: "ninguno"}" }) { fila ->
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    fila.forEach { (slug, texto, color) ->
                                        OpcionColegio(
                                            texto = texto,
                                            color = color,
                                            elegido = colegioSlug == slug,
                                            onClick = { colegioSlug = slug },
                                            modifier = Modifier.weight(1f),
                                        )
                                    }
                                    if (fila.size == 1) Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                        else -> {
                            item(key = "avisos") {
                                BotonAvisos(activos = avisosActivos, onActivar = ::activarAvisos)
                            }
                        }
                    }
                }

                // Fuera de la lista para que se vea junto al botón.
                if (paso == PASO_AVISOS) {
                    AceptarReglas(
                        aceptado = aceptaReglas,
                        onCambio = { aceptaReglas = it },
                        onTerminos = { legalAbierto = LegalRegistro.TERMINOS },
                        onReglas = { legalAbierto = LegalRegistro.REGLAS },
                        modifier = Modifier.padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = 8.dp),
                    )
                }

                // Junto al botón y no al final de la lista, donde nadie lo veía.
                error?.let {
                    Text(
                        it,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier
                            .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = 8.dp)
                            .semantics { liveRegion = LiveRegionMode.Polite },
                    )
                }

                val margenBoton = Modifier
                    .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = 12.dp, bottom = 20.dp)
                if (paso < PASO_AVISOS) {
                    BotonEscalon(
                        habilitado = when (paso) {
                            PASO_CARRERA -> handle.length >= 3 && nombre.trim().length >= 2 &&
                                apellidos.trim().length >= 2 && carreraSlug != null
                            else -> true
                        },
                        onClick = { irAPaso(paso + 1) },
                        modifier = margenBoton,
                    )
                } else {
                    AgoraPrimaryButton(
                        text = if (enviando) "Creando…" else "Crear perfil",
                        onClick = { crearPerfil() },
                        enabled = carreraSlug != null && aceptaReglas,
                        loading = enviando,
                        modifier = margenBoton.heightIn(min = 54.dp),
                    )
                }
            }
        }
    }
}

/** Etiqueta en versalitas («2 RESULTADOS», «¿DE QUÉ GENERACIÓN ERES?»). */
@Composable
private fun EtiquetaSeccion(texto: String, modifier: Modifier = Modifier) {
    Text(
        texto,
        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.6.sp),
        color = AgoraColors.TextoMedio,
        modifier = modifier,
    )
}

/**
 * Opción elegible (carrera o colegio): elegida lleva borde naranja, fondo
 * naranja suave y la palomita; las demás, superficie con borde de 1 dp.
 */
@Composable
private fun FilaOpcion(
    titulo: AnnotatedString,
    detalle: String?,
    icono: ImageVector,
    elegida: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clip(FormaOpcion)
            .background(if (elegida) AgoraColors.NaranjaSuave else AgoraColors.Superficie)
            .border(
                if (elegida) BorderStroke(2.dp, AgoraColors.Naranja) else BorderStroke(1.dp, AgoraColors.Borde),
                FormaOpcion,
            )
            .selectable(selected = elegida, role = Role.RadioButton, onClick = onClick)
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (elegida) AgoraColors.Naranja else AgoraColors.Fondo),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                icono,
                contentDescription = null,
                tint = if (elegida) MaterialTheme.colorScheme.onPrimary else AgoraColors.Texto,
                modifier = Modifier.size(20.dp),
            )
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                titulo,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                color = AgoraColors.Texto,
            )
            detalle?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
            }
        }
        if (elegida) {
            Icon(
                Icons.Filled.Check,
                contentDescription = null,
                tint = AgoraColors.Naranja,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

/**
 * Casilla obligatoria del registro. «Términos» y «Reglas de la comunidad» son
 * enlaces (LinkAnnotation); un toque en el resto del renglón marca la casilla.
 */
@Composable
private fun AceptarReglas(
    aceptado: Boolean,
    onCambio: (Boolean) -> Unit,
    onTerminos: () -> Unit,
    onReglas: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val alTerminos by rememberUpdatedState(onTerminos)
    val alReglas by rememberUpdatedState(onReglas)
    val estiloEnlace = TextLinkStyles(
        style = SpanStyle(
            color = AgoraColors.Naranja,
            fontWeight = FontWeight.SemiBold,
            textDecoration = TextDecoration.Underline,
        ),
    )
    val texto = remember(AgoraColors.oscuro) {
        buildAnnotatedString {
            append("Acepto los ")
            withLink(LinkAnnotation.Clickable("terminos", estiloEnlace) { alTerminos() }) {
                append("Términos")
            }
            append(" y las ")
            withLink(LinkAnnotation.Clickable("reglas", estiloEnlace) { alReglas() }) {
                append("Reglas de la comunidad")
            }
            append(". Cero tolerancia al acoso, las amenazas y el contenido ofensivo.")
        }
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .toggleable(value = aceptado, role = Role.Checkbox, onValueChange = onCambio)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = aceptado, onCheckedChange = null)
        Text(
            texto,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(start = 12.dp),
        )
    }
}

@Composable
private fun RegistroExitoView(
    handle: String,
    onContinuar: () -> Unit,
) {
    var mostrarCheck by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (mostrarCheck) 1f else 0f,
        label = "checkScale",
    )

    LaunchedEffect(Unit) {
        delay(200)
        mostrarCheck = true
        delay(1200)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AgoraColors.Fondo)
            .safeDrawingPadding()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        AnimatedVisibility(
            visible = mostrarCheck,
            enter = scaleIn() + fadeIn(),
        ) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .scale(scale)
                    .clip(CircleShape)
                    .background(AgoraColors.Naranja),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.Check,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(48.dp),
                )
            }
        }
        Spacer(Modifier.height(24.dp))
        Text(
            "¡Ya estás en Ágora!",
            style = MaterialTheme.typography.headlineLarge,
            color = AgoraColors.Texto,
            textAlign = TextAlign.Center,
            modifier = Modifier.semantics { heading() },
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "@$handle ya es parte del campus",
            style = MaterialTheme.typography.bodyLarge,
            color = AgoraColors.TextoMedio,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(40.dp))
        AgoraPrimaryButton(
            text = "Explorar Ágora",
            onClick = onContinuar,
            modifier = Modifier.heightIn(min = 54.dp),
        )
    }
}

/* ---------- Pirámide «Sube a tu campus» (B «Cholula», WowB-Arranque) ---------- */

/** Hecho: relleno del color con palomita; ahora: punteado naranja con el punto que late; falta: punteado. */
private enum class EstadoEscalon { HECHO, AHORA, FALTA }

private data class Escalon(
    val texto: String,
    val estado: EstadoEscalon,
    val color: Color,
    val tinta: Color = Color.White,
)

/** Anchos del artboard (350, 290, 230, 170 de 390) como fracción del ancho: el correo abajo, el más ancho. */
private val AnchosEscalon = listOf(0.9f, 0.745f, 0.59f, 0.435f)

/** «Tu campus» arriba y los escalones de abajo hacia arriba: correo, carrera, colegio y avisos. */
@Composable
private fun PiramideCampus(escalones: List<Escalon>, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) {},
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            modifier = Modifier
                .size(96.dp, 40.dp)
                .border(2.dp, AgoraColors.Naranja, RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "Tu campus",
                fontFamily = AgoraFonts.titulo,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 13.sp,
                color = AgoraColors.NaranjaTinta,
            )
        }
        escalones.withIndex().reversed().forEach { (i, escalon) ->
            EscalonVista(escalon, Modifier.fillMaxWidth(AnchosEscalon[minOf(i, AnchosEscalon.lastIndex)]))
        }
    }
}

@Composable
private fun EscalonVista(escalon: Escalon, modifier: Modifier = Modifier) {
    val forma = RoundedCornerShape(10.dp)
    val fondo = when (escalon.estado) {
        EstadoEscalon.HECHO -> escalon.color
        EstadoEscalon.AHORA -> AgoraColors.Superficie
        EstadoEscalon.FALTA -> Color.Transparent
    }
    val tinta = when (escalon.estado) {
        EstadoEscalon.HECHO -> escalon.tinta
        EstadoEscalon.AHORA -> AgoraColors.Texto
        EstadoEscalon.FALTA -> AgoraColors.TextoMedio
    }
    val punteado = when (escalon.estado) {
        EstadoEscalon.HECHO -> null
        EstadoEscalon.AHORA -> AgoraColors.Naranja
        EstadoEscalon.FALTA -> AgoraColors.Borde
    }
    val estadoVoz = when (escalon.estado) {
        EstadoEscalon.HECHO -> "listo"
        EstadoEscalon.AHORA -> "ahora"
        EstadoEscalon.FALTA -> "falta"
    }
    Row(
        modifier = modifier
            .height(58.dp)
            .clip(forma)
            .background(fondo)
            .then(
                if (punteado != null) {
                    Modifier.drawBehind {
                        val grosor = 2.dp.toPx()
                        drawRoundRect(
                            color = punteado,
                            topLeft = Offset(grosor / 2, grosor / 2),
                            size = Size(size.width - grosor, size.height - grosor),
                            cornerRadius = CornerRadius(10.dp.toPx()),
                            style = Stroke(
                                width = grosor,
                                pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx())),
                            ),
                        )
                    }
                } else {
                    Modifier
                },
            )
            .clearAndSetSemantics { contentDescription = "${escalon.texto}, $estadoVoz" }
            .padding(horizontal = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when (escalon.estado) {
            EstadoEscalon.HECHO -> Icon(Icons.Filled.Check, contentDescription = null, tint = tinta, modifier = Modifier.size(18.dp))
            EstadoEscalon.AHORA -> PuntoLatido()
            EstadoEscalon.FALTA -> Unit
        }
        Text(
            escalon.texto,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
            color = tinta,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** El punto naranja del escalón en curso, latiendo. */
@Composable
private fun PuntoLatido() {
    val latido = rememberInfiniteTransition(label = "latido")
    val escala by latido.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "escala",
    )
    Box(
        Modifier
            .size(10.dp)
            .scale(escala)
            .clip(CircleShape)
            .background(AgoraColors.Naranja),
    )
}

/** Colegio a elegir: cuadrito de su color y el nombre corto; el elegido lleva borde de tinta de 2. */
@Composable
private fun OpcionColegio(
    texto: String,
    color: Color,
    elegido: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val forma = RoundedCornerShape(12.dp)
    Row(
        modifier = modifier
            .heightIn(min = 48.dp)
            .clip(forma)
            .background(AgoraColors.Superficie)
            .border(if (elegido) 2.dp else 1.dp, if (elegido) AgoraColors.Texto else AgoraColors.Borde, forma)
            .selectable(selected = elegido, role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(10.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(color),
        )
        Text(
            texto,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            color = AgoraColors.Texto,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
    }
}

/** «Subir un escalón»: el botón relleno de B «Cholula». */
@Composable
private fun BotonEscalon(habilitado: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 54.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(if (habilitado) AgoraColors.Boton else AgoraColors.Boton.copy(alpha = 0.4f))
            .clickable(enabled = habilitado, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text("Subir un escalón", color = AgoraColors.SobreBoton, fontWeight = FontWeight.Bold, fontSize = 16.sp)
    }
}

/** El último escalón: pedir el permiso de avisos, o decir que ya están. */
@Composable
private fun BotonAvisos(activos: Boolean, onActivar: () -> Unit) {
    val forma = RoundedCornerShape(12.dp)
    if (activos) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .clip(forma)
                .background(AgoraColors.Superficie),
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = AgoraColors.Success, modifier = Modifier.size(20.dp))
            Text("Avisos activados", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = AgoraColors.Success)
        }
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .clip(forma)
                    .background(AgoraColors.Superficie)
                    .border(2.dp, AgoraColors.Texto, forma)
                    .clickable(role = Role.Button, onClick = onActivar),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.NotificationsActive, contentDescription = null, tint = AgoraColors.Texto, modifier = Modifier.size(20.dp))
                Text("Activar avisos", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AgoraColors.Texto)
            }
            Text(
                "Puedes cambiarlo cuando quieras en Ajustes.",
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextoMedio,
            )
        }
    }
}
