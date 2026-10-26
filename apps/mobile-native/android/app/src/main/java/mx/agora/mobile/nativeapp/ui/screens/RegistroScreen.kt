package mx.agora.mobile.nativeapp.ui.screens

import androidx.activity.compose.BackHandler
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

/** Tu nombre y tu @ → carrera y generación → colegio → revisar y aceptar las reglas. */
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
    var paso by remember { mutableIntStateOf(1) }
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
        paso = nuevo.coerceIn(1, TOTAL_PASOS)
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
    BackHandler(enabled = paso > 1 && legalAbierto == null && !exito) { irAPaso(paso - 1) }
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
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(AgoraColors.Fondo)
                    .safeDrawingPadding(),
            ) {
                BarraPasos(
                    paso = paso,
                    onAtras = if (paso > 1) ({ irAPaso(paso - 1) }) else null,
                )

                val (titulo, subtitulo) = when (paso) {
                    1 -> "¿Cómo te llamas?" to "Así te van a encontrar en el campus."
                    2 -> "¿Qué estudias?" to "Te metemos en las comunidades de tu carrera, tu escuela y tu generación."
                    3 -> "¿Vives en un colegio?" to
                        "Si vives en un colegio residencial, entras también a su comunidad. Es opcional."
                    else -> "Revisa y entra" to "Mira que todo esté bien antes de crear tu perfil."
                }

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = AgoraSpacing.Pantalla, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item(key = "titulo-$paso") {
                        Column(
                            modifier = Modifier.padding(bottom = 6.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text(
                                titulo,
                                style = MaterialTheme.typography.headlineLarge,
                                color = AgoraColors.Texto,
                                modifier = Modifier.semantics { heading() },
                            )
                            Text(subtitulo, style = MaterialTheme.typography.bodyMedium, color = AgoraColors.TextoMedio)
                        }
                    }
                    when (paso) {
                        1 -> {
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
                        }
                        2 -> {
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
                                    item(key = "etiqueta-elegida") { EtiquetaSeccion("TU CARRERA") }
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
                                            "Escribe parte del nombre de tu carrera.",
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
                                            error = null
                                            // Sin teclado se ve la generación, que va debajo.
                                            focusManager.clearFocus()
                                        },
                                    )
                                }
                            }
                            item(key = "generacion") {
                                Column(
                                    modifier = Modifier.padding(top = 10.dp),
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
                            // «N de tu generación en <carrera> ya están aquí» (diseño D) espera un
                            // conteo que la API aún no da: sin el dato, no se muestra.
                        }
                        3 -> {
                            items(catalogo!!.colegios, key = { "colegio-${it.slug}" }) { colegio ->
                                FilaOpcion(
                                    titulo = AnnotatedString(colegio.nombre),
                                    detalle = null,
                                    icono = Icons.Outlined.House,
                                    elegida = colegioSlug == colegio.slug,
                                    // Tocar el elegido lo quita: el colegio es opcional.
                                    onClick = {
                                        colegioSlug = if (colegioSlug == colegio.slug) null else colegio.slug
                                    },
                                )
                            }
                        }
                        else -> {
                            item(key = "resumen") {
                                ResumenRegistro(
                                    handle = handle.trim().lowercase(),
                                    nombreCompleto = "${nombre.trim()} ${apellidos.trim()}",
                                    carrera = carreraElegida?.carrera?.nombre.orEmpty(),
                                    generacion = generacion,
                                    colegio = colegioElegido?.nombre,
                                    onCambiar = ::irAPaso,
                                )
                            }
                        }
                    }
                }

                // Fuera de la lista para que se vea junto al botón.
                if (paso == TOTAL_PASOS) {
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

                AgoraPrimaryButton(
                    text = when {
                        enviando -> "Creando…"
                        paso < TOTAL_PASOS -> "Continuar"
                        else -> "Crear perfil"
                    },
                    onClick = {
                        if (paso < TOTAL_PASOS) irAPaso(paso + 1) else crearPerfil()
                    },
                    enabled = when (paso) {
                        1 -> handle.length >= 3 && nombre.trim().length >= 2 && apellidos.trim().length >= 2
                        2 -> carreraSlug != null
                        3 -> true
                        else -> carreraSlug != null && aceptaReglas
                    },
                    loading = enviando,
                    modifier = Modifier
                        .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = 12.dp, bottom = 20.dp)
                        .heightIn(min = 54.dp),
                )
            }
        }
    }
}

/** Flecha para regresar, barra de progreso en cuatro tramos y «Paso n de 4». */
@Composable
private fun BarraPasos(
    paso: Int,
    onAtras: (() -> Unit)?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 60.dp)
            .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (onAtras != null) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(AgoraColors.Superficie)
                    .border(1.dp, AgoraColors.Borde, RoundedCornerShape(14.dp))
                    .clickable(role = Role.Button, onClickLabel = "Regresar", onClick = onAtras)
                    .semantics { contentDescription = "Paso anterior" },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = null,
                    tint = AgoraColors.Texto,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
        // El texto de al lado ya dice el paso: los tramos son solo dibujo.
        Row(
            modifier = Modifier
                .weight(1f)
                .clearAndSetSemantics {},
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            repeat(TOTAL_PASOS) { i ->
                Box(
                    Modifier
                        .weight(1f)
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(if (i < paso) AgoraColors.Naranja else AgoraColors.Borde),
                )
            }
        }
        Text(
            "Paso $paso de $TOTAL_PASOS",
            style = MaterialTheme.typography.bodySmall,
            color = AgoraColors.TextoMedio,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
        )
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

/** Último paso: lo capturado, con «Cambiar» para volver al paso de cada dato. */
@Composable
private fun ResumenRegistro(
    handle: String,
    nombreCompleto: String,
    carrera: String,
    generacion: Int,
    colegio: String?,
    onCambiar: (Int) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(AgoraCardShape)
            .background(AgoraColors.Superficie)
            .border(1.dp, AgoraColors.Borde, AgoraCardShape)
            .padding(horizontal = 16.dp, vertical = 6.dp),
    ) {
        FilaResumen("Tu @", "@$handle", "Cambiar tu @") { onCambiar(1) }
        FilaResumen("Nombre", nombreCompleto, "Cambiar tu nombre") { onCambiar(1) }
        FilaResumen("Carrera", "$carrera · Generación $generacion", "Cambiar carrera o generación") { onCambiar(2) }
        FilaResumen("Colegio", colegio ?: "Sin colegio", "Cambiar colegio") { onCambiar(3) }
    }
}

@Composable
private fun FilaResumen(
    etiqueta: String,
    valor: String,
    descripcionCambiar: String,
    onCambiar: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .semantics(mergeDescendants = true) {},
        ) {
            Text(etiqueta, style = MaterialTheme.typography.labelMedium, color = AgoraColors.TextoMedio)
            Text(valor, style = MaterialTheme.typography.bodyMedium, color = AgoraColors.Texto)
        }
        Text(
            "Cambiar",
            style = MaterialTheme.typography.labelLarge,
            color = AgoraColors.NaranjaTinta,
            modifier = Modifier
                .heightIn(min = 44.dp)
                .clip(RoundedCornerShape(12.dp))
                .clickable(role = Role.Button, onClick = onCambiar)
                .semantics { contentDescription = descripcionCambiar }
                .padding(horizontal = 8.dp, vertical = 12.dp),
        )
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
