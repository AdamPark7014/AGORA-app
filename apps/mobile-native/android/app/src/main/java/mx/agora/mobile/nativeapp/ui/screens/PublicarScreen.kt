package mx.agora.mobile.nativeapp.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.foundation.layout.size
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.MediaRepository
import mx.agora.mobile.nativeapp.data.NetworkMonitor
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.CrearEncuestaRequest
import mx.agora.mobile.nativeapp.data.api.CrearPostRequest
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.data.local.OfflineCache
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.MiniaturaAdjunto
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics
import java.io.IOException

private const val LIMITE_TEXTO = 2000
private const val LIMITE_PREGUNTA = 200
private const val LIMITE_OPCION = 100
private const val MIN_OPCIONES = 2
private const val MAX_OPCIONES = 6

/** Igual que `crearPostSchema.mediaIds.max(4)` en packages/contracts. */
private const val MAX_ADJUNTOS = 4

private data class AdjuntoPendiente(
    val uri: Uri,
    val mediaId: String? = null,
    val previewUrl: String? = null,
    val esVideo: Boolean = false,
    val subiendo: Boolean = false,
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PublicarScreen(
    tokenProvider: () -> String?,
    onPublicado: () -> Unit,
) {
    val context = LocalContext.current
    val mediaRepo = remember { MediaRepository(context) }
    val offlineCache = remember { OfflineCache.get(context) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val haptics = rememberHaptics()
    var mostrandoExito by remember { mutableStateOf(false) }

    val checkScale by animateFloatAsState(
        targetValue = if (mostrandoExito) 1f else 0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "publishCheck",
    )
    val overlayAlpha by animateFloatAsState(
        targetValue = if (mostrandoExito) 1f else 0f,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "overlayAlpha",
    )

    var comunidades by remember { mutableStateOf<List<ComunidadDto>>(emptyList()) }
    var slug by remember { mutableStateOf<String?>(null) }
    var texto by remember { mutableStateOf("") }
    val adjuntos = remember { mutableStateListOf<AdjuntoPendiente>() }
    var cargandoComunidades by remember { mutableStateOf(true) }
    var enviando by remember { mutableStateOf(false) }

    var encuestaActiva by remember { mutableStateOf(false) }
    var preguntaEncuesta by remember { mutableStateOf("") }
    val opcionesEncuesta = remember { mutableStateListOf("", "") }

    // Cada adjunto se ubica por su uri, nunca por un índice guardado: si la
    // persona quita otro mientras este sube, el índice ya no apunta a él.
    fun agregarAdjuntos(uris: List<Uri>) {
        val nuevos = uris.distinct().filter { uri -> adjuntos.none { it.uri == uri } }
        if (nuevos.isEmpty()) return
        val aceptados = nuevos.take((MAX_ADJUNTOS - adjuntos.size).coerceAtLeast(0))
        if (aceptados.size < nuevos.size) {
            scope.launch {
                snackbarHostState.showSnackbar("Solo caben $MAX_ADJUNTOS fotos o videos por publicación.")
            }
        }
        aceptados.forEach { uri ->
            val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
            val esVideo = mime.startsWith("video/")
            adjuntos.add(AdjuntoPendiente(uri = uri, esVideo = esVideo, subiendo = true))
            scope.launch {
                try {
                    val subida = mediaRepo.subir(uri, tokenProvider)
                    val i = adjuntos.indexOfFirst { it.uri == uri }
                    if (i >= 0) {
                        adjuntos[i] = adjuntos[i].copy(
                            mediaId = subida.id,
                            previewUrl = ApiClient.resolveUrl(subida.url),
                            esVideo = subida.mime?.startsWith("video/") == true || esVideo,
                            subiendo = false,
                        )
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    adjuntos.removeAll { it.uri == uri }
                    snackbarHostState.showSnackbar(mensajeDe(e))
                }
            }
        }
    }

    val cupoAdjuntos = (MAX_ADJUNTOS - adjuntos.size).coerceAtLeast(0)
    // PickMultipleVisualMedia exige maxItems > 1; con un solo lugar libre se usa el selector simple.
    val pickerVarios = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = cupoAdjuntos.coerceAtLeast(2)),
    ) { uris -> agregarAdjuntos(uris) }
    val pickerUno = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri -> if (uri != null) agregarAdjuntos(listOf(uri)) }

    // Posts que estaban en cola sin conexión y que el servidor rechazó (4xx):
    // ya salieron de la cola; aquí se avisa una vez y se ofrece recuperar el texto.
    LaunchedEffect(Unit) {
        val rechazados = offlineCache.tomarPostsRechazados()
        if (rechazados.isEmpty()) return@LaunchedEffect
        val primero = rechazados.first()
        val mensaje = if (rechazados.size == 1) {
            "No se pudo publicar tu post pendiente" + (primero.motivo?.let { ": $it" } ?: ".")
        } else {
            "No se pudieron publicar ${rechazados.size} posts pendientes" +
                (primero.motivo?.let { ": $it" } ?: ".")
        }
        val recuperable = primero.texto.isNotBlank()
        val resultado = snackbarHostState.showSnackbar(
            message = mensaje,
            actionLabel = if (recuperable) "Recuperar texto" else null,
            withDismissAction = !recuperable,
            duration = SnackbarDuration.Long,
        )
        if (resultado == SnackbarResult.ActionPerformed && texto.isBlank()) {
            texto = primero.texto.take(LIMITE_TEXTO)
        }
    }

    LaunchedEffect(Unit) {
        cargandoComunidades = true
        try {
            val lista = ApiClient.api<PerfilApi>(tokenProvider).misComunidades()
            comunidades = lista
            slug = lista.firstOrNull()?.slug
        } catch (e: Exception) {
            snackbarHostState.showSnackbar(mensajeDe(e))
        } finally {
            cargandoComunidades = false
        }
    }

    val opcionesValidas = opcionesEncuesta
        .map { it.trim() }
        .filter { it.isNotBlank() }
    val opcionesUnicas = opcionesValidas.toSet()
    val encuestaValida = !encuestaActiva || (
        preguntaEncuesta.trim().isNotBlank() &&
            opcionesValidas.size >= MIN_OPCIONES &&
            opcionesValidas.size <= MAX_OPCIONES &&
            opcionesUnicas.size == opcionesValidas.size
        )

    val restantes = LIMITE_TEXTO - texto.length
    val mediaIds = adjuntos.mapNotNull { it.mediaId }
    val subiendoAlguno = adjuntos.any { it.subiendo }
    val puedePublicar = slug != null &&
        (texto.isNotBlank() || mediaIds.isNotEmpty()) &&
        encuestaValida &&
        !enviando &&
        !subiendoAlguno

    Box(modifier = Modifier.fillMaxSize()) {
    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Column(
            // Con edge-to-edge (targetSdk 36) adjustResize ya no encoge la ventana:
            // imePadding va antes del scroll para que el teclado no tape los campos.
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Publicar en", style = MaterialTheme.typography.titleSmall)
            if (cargandoComunidades) {
                CircularProgressIndicator()
            } else {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    comunidades.forEach { c ->
                        FilterChip(
                            selected = slug == c.slug,
                            onClick = { slug = c.slug },
                            label = { Text(c.nombre) },
                        )
                    }
                }
            }

            OutlinedTextField(
                value = texto,
                onValueChange = { if (it.length <= LIMITE_TEXTO) texto = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                placeholder = { Text("¿Qué está pasando en el campus?") },
            )

            if (adjuntos.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    items(adjuntos, key = { a -> a.uri.toString() }) { adj ->
                        MiniaturaAdjunto(
                            model = adj.previewUrl ?: adj.uri,
                            esVideo = adj.esVideo,
                            subiendo = adj.subiendo,
                            onQuitar = { adjuntos.removeAll { it.uri == adj.uri } },
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = {
                        val request = PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)
                        if (cupoAdjuntos >= 2) pickerVarios.launch(request) else pickerUno.launch(request)
                    },
                    enabled = !subiendoAlguno && cupoAdjuntos > 0,
                ) {
                    Text(
                        when {
                            subiendoAlguno -> "Subiendo…"
                            cupoAdjuntos == 0 -> "Máx. $MAX_ADJUNTOS"
                            else -> "📷 Fotos o videos"
                        },
                    )
                }
                if (adjuntos.isNotEmpty()) {
                    Text(
                        "${adjuntos.size}/$MAX_ADJUNTOS",
                        style = MaterialTheme.typography.labelSmall,
                        color = AgoraColors.TextoMedio,
                        modifier = Modifier.align(Alignment.CenterVertically),
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Agregar encuesta", style = MaterialTheme.typography.titleSmall)
                Switch(
                    checked = encuestaActiva,
                    onCheckedChange = { encuestaActiva = it },
                )
            }

            if (encuestaActiva) {
                OutlinedTextField(
                    value = preguntaEncuesta,
                    onValueChange = { if (it.length <= LIMITE_PREGUNTA) preguntaEncuesta = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Pregunta de la encuesta") },
                    placeholder = { Text("¿Qué quieres preguntar?") },
                    singleLine = true,
                )

                opcionesEncuesta.forEachIndexed { index, opcion ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        OutlinedTextField(
                            value = opcion,
                            onValueChange = { nuevo ->
                                if (nuevo.length <= LIMITE_OPCION) opcionesEncuesta[index] = nuevo
                            },
                            modifier = Modifier.weight(1f),
                            label = { Text("Opción ${index + 1}") },
                            singleLine = true,
                        )
                        if (opcionesEncuesta.size > MIN_OPCIONES) {
                            IconButton(onClick = { opcionesEncuesta.removeAt(index) }) {
                                Icon(Icons.Default.Close, contentDescription = "Quitar opción")
                            }
                        }
                    }
                }

                if (opcionesEncuesta.size < MAX_OPCIONES) {
                    OutlinedButton(
                        onClick = { opcionesEncuesta.add("") },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Text("Agregar opción", modifier = Modifier.padding(start = 4.dp))
                    }
                }

                if (encuestaActiva && opcionesValidas.size >= MIN_OPCIONES &&
                    opcionesUnicas.size < opcionesValidas.size
                ) {
                    Text(
                        "Las opciones no pueden repetirse.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            if (restantes < 200) {
                Text(
                    "$restantes",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (restantes < 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface.copy(0.6f),
                )
            }

            Button(
                onClick = {
                    scope.launch {
                        enviando = true
                        val encuesta = if (encuestaActiva && encuestaValida) {
                            CrearEncuestaRequest(
                                pregunta = preguntaEncuesta.trim(),
                                opciones = opcionesValidas,
                            )
                        } else {
                            null
                        }
                        val request = CrearPostRequest(
                            comunidadSlug = slug!!,
                            texto = texto.trim(),
                            mediaIds = mediaIds,
                            encuesta = encuesta,
                        )
                        try {
                            if (!NetworkMonitor.isOnline(context)) {
                                offlineCache.enqueuePost(request)
                                snackbarHostState.showSnackbar("Sin conexión. Se publicará al reconectar.")
                                return@launch
                            }
                            val resp = ApiClient.api<PostsApi>(tokenProvider).crear(request)
                            GamificacionEvents.notifyPingResult(resp.nuevasInsignias ?: emptyList())
                            AgoraAnalytics.publicar(tokenProvider, mapOf("comunidadSlug" to slug!!))
                            haptics.perform(HapticType.Success)
                            mostrandoExito = true
                            delay(650)
                            mostrandoExito = false
                            onPublicado()
                        } catch (e: Exception) {
                            if (e is IOException) {
                                offlineCache.enqueuePost(request)
                                snackbarHostState.showSnackbar("Sin conexión. Se publicará al reconectar.")
                            } else {
                                snackbarHostState.showSnackbar(mensajeDe(e))
                            }
                        } finally {
                            enviando = false
                        }
                    }
                },
                enabled = puedePublicar,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (enviando) "Publicando…" else "Publicar")
            }
        }
    }

    if (overlayAlpha > 0.01f) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .alpha(overlayAlpha)
                .background(Color.Black.copy(alpha = 0.35f)),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .scale(checkScale)
                    .clip(CircleShape)
                    .background(AgoraColors.Naranja),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(48.dp),
                )
            }
        }
    }
    }
}
