package mx.agora.mobile.nativeapp.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CarreraDto
import mx.agora.mobile.nativeapp.data.api.CatalogoDto
import mx.agora.mobile.nativeapp.data.api.CrearPerfilRequest
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.SessionUser
import mx.agora.mobile.nativeapp.ui.components.ZonaCampus
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import java.util.Calendar

/** Texto legal abierto encima del registro (aún no hay NavHost: la sesión no tiene perfil). */
private enum class LegalRegistro { TERMINOS, REGLAS }

@OptIn(ExperimentalMaterial3Api::class)
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
    var enviando by remember { mutableStateOf(false) }
    var exito by remember { mutableStateOf(false) }
    var usuarioCreado by remember { mutableStateOf<SessionUser?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
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

    LaunchedEffect(Unit) {
        cargandoCatalogo = true
        error = null
        try {
            catalogo = ApiClient.catalogo.todo()
        } catch (e: Exception) {
            error = mensajeDe(e)
        } finally {
            cargandoCatalogo = false
        }
    }

    val carreras: List<CarreraDto> = catalogo?.escuelas?.flatMap { it.carreras } ?: emptyList()

    // Encima del formulario y no en otra ruta: así no se pierde lo ya capturado.
    BackHandler(enabled = legalAbierto != null) { legalAbierto = null }
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
            Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(error ?: "No se pudo cargar el catálogo.", color = MaterialTheme.colorScheme.error)
            }
        }
        else -> {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background),
            ) {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text(
                        "Crea tu perfil",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "Paso $paso de 2",
                        style = MaterialTheme.typography.labelLarge,
                        color = AgoraColors.Naranja,
                    )
                    Spacer(Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { paso / 2f },
                        modifier = Modifier.fillMaxWidth(),
                        color = AgoraColors.Naranja,
                        trackColor = AgoraColors.Borde,
                    )
                }

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (paso == 1) {
                        item {
                            Text(
                                "¿Cómo te conocerán en el campus?",
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }
                        item {
                            OutlinedTextField(
                                value = handle,
                                onValueChange = { handle = it.filter { c -> c.isLetterOrDigit() || c == '_' } },
                                label = { Text("Tu @ en Ágora") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                prefix = { Text("@", color = AgoraColors.Naranja) },
                            )
                            Text(
                                "Elige tu @ — será tu identidad en el campus",
                                style = MaterialTheme.typography.bodySmall,
                                color = AgoraColors.TextoMedio,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                        item {
                            OutlinedTextField(
                                value = nombre,
                                onValueChange = { nombre = it },
                                label = { Text("Nombre") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                            )
                        }
                        item {
                            OutlinedTextField(
                                value = apellidos,
                                onValueChange = { apellidos = it },
                                label = { Text("Apellidos") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                            )
                        }
                    } else {
                        item {
                            Text(
                                "Cuéntanos de ti",
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Text(
                                "Así te conectamos con tu comunidad",
                                style = MaterialTheme.typography.bodySmall,
                                color = AgoraColors.TextoMedio,
                            )
                        }
                        item {
                            Text("Generación", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "El año en que entraste a la UDLAP",
                                style = MaterialTheme.typography.bodySmall,
                                color = AgoraColors.TextoMedio,
                            )
                        }
                        item {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(generaciones, key = { it }) { anio ->
                                    FilterChip(
                                        selected = generacion == anio,
                                        onClick = { generacion = anio },
                                        label = { Text(anio.toString()) },
                                    )
                                }
                            }
                        }
                        item { Text("Carrera", style = MaterialTheme.typography.titleSmall) }
                        items(carreras, key = { it.slug }) { carrera ->
                            FilterChip(
                                selected = carreraSlug == carrera.slug,
                                onClick = { carreraSlug = carrera.slug },
                                label = { Text(carrera.nombre) },
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                        item { Text("Colegio (opcional)", style = MaterialTheme.typography.titleSmall) }
                        items(catalogo!!.colegios, key = { it.slug }) { colegio ->
                            FilterChip(
                                selected = colegioSlug == colegio.slug,
                                onClick = {
                                    colegioSlug = if (colegioSlug == colegio.slug) null else colegio.slug
                                },
                                label = { Text(colegio.nombre) },
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }

                    if (error != null) {
                        item {
                            Text(error!!, color = MaterialTheme.colorScheme.error)
                        }
                    }
                }

                // Fuera de la lista para que se vea junto al botón sin tener
                // que bajar hasta el final de las carreras y colegios.
                if (paso == 2) {
                    AceptarReglas(
                        aceptado = aceptaReglas,
                        onCambio = { aceptaReglas = it },
                        onTerminos = { legalAbierto = LegalRegistro.TERMINOS },
                        onReglas = { legalAbierto = LegalRegistro.REGLAS },
                        modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 8.dp),
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (paso == 2) {
                        TextButton(
                            onClick = { paso = 1; error = null },
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Atrás")
                        }
                    }
                    Button(
                        onClick = {
                            if (paso == 1) {
                                paso = 2
                                error = null
                            } else {
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
                        },
                        enabled = when (paso) {
                            1 -> handle.length >= 3 && nombre.length >= 2 && apellidos.length >= 2
                            else -> !enviando && carreraSlug != null && aceptaReglas
                        },
                        modifier = Modifier.weight(if (paso == 2) 2f else 1f),
                    ) {
                        Text(
                            when {
                                enviando -> "Creando…"
                                paso == 1 -> "Siguiente"
                                else -> "Crear perfil"
                            },
                        )
                    }
                }
            }
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
            .background(MaterialTheme.colorScheme.background)
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
            "¡Bienvenido a Ágora!",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "@$handle ya es parte del campus",
            style = MaterialTheme.typography.bodyLarge,
            color = AgoraColors.TextoMedio,
        )
        Spacer(Modifier.height(40.dp))
        Button(
            onClick = onContinuar,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Explorar Ágora")
        }
    }
}
