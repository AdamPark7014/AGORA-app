package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.RemoveCircleOutline
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ComentarioDto
import mx.agora.mobile.nativeapp.data.api.CrearComentarioRequest
import mx.agora.mobile.nativeapp.data.api.CrearReporteRequest
import mx.agora.mobile.nativeapp.data.api.EditarPostRequest
import mx.agora.mobile.nativeapp.data.api.EncuestaDto
import mx.agora.mobile.nativeapp.data.api.ModeracionApi
import mx.agora.mobile.nativeapp.data.api.RetirarPostRequest
import mx.agora.mobile.nativeapp.data.api.PostDetalleDto
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.api.ReaccionarRequest
import mx.agora.mobile.nativeapp.data.api.ReportesApi
import mx.agora.mobile.nativeapp.data.api.VotarEncuestaRequest
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.EncuestaBloque
import mx.agora.mobile.nativeapp.ui.components.GuardarButton
import mx.agora.mobile.nativeapp.ui.components.MOTIVOS_REPORTE
import mx.agora.mobile.nativeapp.ui.components.mensajeErrorVoto
import mx.agora.mobile.nativeapp.ui.components.RetirarPostDialogo
import mx.agora.mobile.nativeapp.ui.components.PostMediaGrid
import mx.agora.mobile.nativeapp.ui.components.ReaccionesRow
import mx.agora.mobile.nativeapp.ui.components.TextoConHashtags
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics
import retrofit2.HttpException

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(
    postId: String,
    tokenProvider: () -> String?,
    miHandle: String?,
    onBack: () -> Unit,
    onDeleted: () -> Unit = onBack,
    onHashtagClick: (String) -> Unit = {},
    onAuthorClick: (String) -> Unit = {},
) {
    var post by remember(postId) { mutableStateOf<PostDetalleDto?>(null) }
    var cargando by remember(postId) { mutableStateOf(true) }
    var refrescando by remember(postId) { mutableStateOf(false) }
    var error by remember(postId) { mutableStateOf<String?>(null) }
    var textoComentario by remember { mutableStateOf("") }
    var menuAbierto by remember { mutableStateOf(false) }
    var dialogoReporte by remember { mutableStateOf(false) }
    var dialogoEditar by remember { mutableStateOf(false) }
    var dialogoBorrar by remember { mutableStateOf(false) }
    var reporteComentarioId by remember { mutableStateOf<String?>(null) }
    var textoEditar by remember { mutableStateOf("") }
    var miReaccion by remember(postId) { mutableStateOf<String?>(null) }
    var totalReacciones by remember(postId) { mutableIntStateOf(0) }
    var encuesta by remember(postId) { mutableStateOf<EncuestaDto?>(null) }
    var votando by remember(postId) { mutableStateOf(false) }
    // El detalle no trae el voto propio; solo la respuesta de votar (miVoto).
    var miVoto by remember(postId) { mutableStateOf<String?>(null) }
    var enviandoComentario by remember(postId) { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val haptics = rememberHaptics()
    val context = LocalContext.current
    var puedeModerar by remember { mutableStateOf(false) }
    var dialogoRetirar by remember { mutableStateOf(false) }
    var retirando by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        puedeModerar = YoCache.obtener(tokenProvider)?.puedeModerar == true
    }

    fun aplicarDetalle(detalle: PostDetalleDto) {
        post = detalle
        miReaccion = detalle.miReaccion
        totalReacciones = detalle.numReactions
        encuesta = detalle.encuesta
    }

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else if (post == null) cargando = true
            error = null
            try {
                val detalle = ApiClient.api<PostsApi>(tokenProvider).detalle(postId)
                aplicarDetalle(detalle)
            } catch (e: Exception) {
                val msg = mensajeDe(e)
                error = msg
                if (post != null) snackbarHostState.showSnackbar(msg)
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    LaunchedEffect(postId) { cargar() }

    fun reaccionar(tipo: String) {
        val activa = miReaccion == tipo
        val anterior = miReaccion
        val totalAnterior = totalReacciones
        miReaccion = if (activa) null else tipo
        totalReacciones += when {
            activa -> -1
            anterior != null -> 0
            else -> 1
        }
        haptics.perform(HapticType.Toggle)
        scope.launch {
            try {
                val resp = ApiClient.api<PostsApi>(tokenProvider).reaccionar(postId, ReaccionarRequest(tipo))
                miReaccion = resp.miReaccion
            } catch (_: Exception) {
                miReaccion = anterior
                totalReacciones = totalAnterior
            }
        }
    }

    fun votar(opcionId: String) {
        if (votando || encuesta == null) return
        votando = true
        scope.launch {
            var fallo: Exception? = null
            try {
                val resp = ApiClient.api<PostsApi>(tokenProvider).votar(postId, VotarEncuestaRequest(opcionId))
                if (resp.opciones.isNotEmpty()) encuesta = encuesta?.copy(opciones = resp.opciones)
                miVoto = resp.miVoto ?: opcionId
                haptics.perform(HapticType.Success)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                fallo = e
            } finally {
                votando = false
            }
            fallo?.let { snackbarHostState.showSnackbar(mensajeErrorVoto(it)) }
        }
    }

    fun comentar() {
        val texto = textoComentario.trim()
        // enviandoComentario evita que un doble toque publique el comentario dos veces.
        if (texto.isBlank() || enviandoComentario) return
        enviandoComentario = true
        scope.launch {
            var fallo: Exception? = null
            val resp = try {
                ApiClient.api<PostsApi>(tokenProvider).comentar(postId, CrearComentarioRequest(texto))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                fallo = e
                null
            } finally {
                enviandoComentario = false
            }
            if (resp == null) {
                val e = fallo
                snackbarHostState.showSnackbar(
                    e?.let { ApiClient.mensajeDelServidor(it) ?: mensajeDe(it) } ?: AgoraCopy.errors.generic,
                )
                return@launch
            }
            // Solo se limpia si no siguió escribiendo mientras se enviaba.
            if (textoComentario.trim() == texto) textoComentario = ""
            cargar()
            // Si la moderación lo dejó en revisión, el API lo explica en `aviso`.
            resp.aviso?.takeIf { it.isNotBlank() }?.let { snackbarHostState.showSnackbar(it) }
        }
    }

    fun reportar(motivo: String) {
        val comentarioId = reporteComentarioId
        dialogoReporte = false
        reporteComentarioId = null
        scope.launch {
            try {
                ApiClient.api<ReportesApi>(tokenProvider).reportar(
                    CrearReporteRequest(
                        postId = if (comentarioId == null) postId else null,
                        commentId = comentarioId,
                        motivo = motivo,
                    ),
                )
                val mensaje = if (comentarioId != null) {
                    "Comentario reportado. Gracias."
                } else {
                    "Publicación reportada. Gracias."
                }
                snackbarHostState.showSnackbar(mensaje)
            } catch (e: Exception) {
                snackbarHostState.showSnackbar(mensajeDe(e))
            }
        }
    }

    fun editar() {
        val texto = textoEditar.trim()
        if (texto.isBlank()) return
        scope.launch {
            try {
                ApiClient.api<PostsApi>(tokenProvider).editar(postId, EditarPostRequest(texto))
                dialogoEditar = false
                snackbarHostState.showSnackbar("Publicación actualizada.")
                cargar()
            } catch (e: Exception) {
                snackbarHostState.showSnackbar(mensajeDe(e))
            }
        }
    }

    fun borrar() {
        scope.launch {
            try {
                ApiClient.api<PostsApi>(tokenProvider).borrar(postId)
                dialogoBorrar = false
                onDeleted()
            } catch (e: Exception) {
                snackbarHostState.showSnackbar(mensajeDe(e))
                dialogoBorrar = false
            }
        }
    }

    fun retirar(motivo: String) {
        scope.launch {
            retirando = true
            try {
                val resp = ApiClient.api<ModeracionApi>(tokenProvider)
                    .retirarPost(postId, RetirarPostRequest(motivo))
                if (!resp.isSuccessful) throw HttpException(resp)
                dialogoRetirar = false
                onDeleted()
            } catch (e: Exception) {
                snackbarHostState.showSnackbar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            } finally {
                retirando = false
            }
        }
    }

    val esAutor = post?.autor?.handle != null && post?.autor?.handle == miHandle

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Publicación") },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text("Volver") }
                },
                actions = {
                    IconButton(onClick = { compartirEnlace(context, EnlacesWeb.publicacion(postId)) }) {
                        Icon(Icons.Outlined.Share, contentDescription = AgoraCopy.compartir.accion)
                    }
                    IconButton(onClick = { menuAbierto = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Más opciones")
                    }
                    DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                        DropdownMenuItem(
                            text = { Text("Reportar") },
                            onClick = {
                                menuAbierto = false
                                reporteComentarioId = null
                                dialogoReporte = true
                            },
                            leadingIcon = { Icon(Icons.Default.Flag, contentDescription = null) },
                        )
                        if (puedeModerar && !esAutor) {
                            DropdownMenuItem(
                                text = { Text("Retirar (moderación)") },
                                onClick = {
                                    menuAbierto = false
                                    dialogoRetirar = true
                                },
                                leadingIcon = { Icon(Icons.Outlined.RemoveCircleOutline, contentDescription = null) },
                            )
                        }
                        if (esAutor) {
                            DropdownMenuItem(
                                text = { Text("Editar") },
                                onClick = {
                                    menuAbierto = false
                                    textoEditar = post?.texto ?: ""
                                    dialogoEditar = true
                                },
                                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                            )
                            DropdownMenuItem(
                                text = { Text("Eliminar") },
                                onClick = {
                                    menuAbierto = false
                                    dialogoBorrar = true
                                },
                                leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null) },
                            )
                        }
                    }
                },
            )
        },
        // Caja de comentar fija abajo: con edge-to-edge (targetSdk 36) el
        // teclado ya no encoge la ventana, así que la barra sube con imePadding.
        bottomBar = {
            if (post != null) {
                BarraComentar(
                    texto = textoComentario,
                    onTextoChange = { textoComentario = it },
                    enviando = enviandoComentario,
                    onEnviar = ::comentar,
                )
            }
        },
    ) { padding ->
        AgoraPullToRefreshBox(
            isRefreshing = refrescando,
            onRefresh = { cargar(refresh = true) },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                cargando && post == null -> {
                    BoxCentered { CircularProgressIndicator() }
                }
                post == null -> {
                    BoxCentered {
                        AgoraErrorState(
                            title = "No pudimos abrir esta publicación",
                            message = error ?: AgoraCopy.errors.generic,
                            onRetry = { cargar() },
                        )
                    }
                }
                else -> {
                    val actual = post!!
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Row(
                            modifier = actual.autor?.handle?.let { handle ->
                                Modifier.clickable { onAuthorClick(handle) }
                            } ?: Modifier,
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                actual.autor?.nombre ?: "Alguien",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                "· ${actual.comunidad.nombre} · ${haceCuanto(actual.createdAt)}",
                                style = MaterialTheme.typography.labelMedium,
                                color = AgoraColors.TextoMedio,
                            )
                        }

                        if (actual.texto.isNotBlank()) {
                            TextoConHashtags(
                                texto = actual.texto,
                                onHashtagClick = onHashtagClick,
                                onMentionClick = onAuthorClick,
                            )
                        }

                        if (actual.media.isNotEmpty()) {
                            PostMediaGrid(
                                media = actual.media,
                                postId = postId,
                                isVisible = true,
                                onDoubleTapReact = { reaccionar("ME_LATE") },
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }

                        encuesta?.let { poll ->
                            EncuestaBloque(
                                encuesta = poll,
                                onVotar = ::votar,
                                votando = votando,
                                miVoto = miVoto,
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.Bottom,
                            horizontalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            ReaccionesRow(
                                miReaccion = miReaccion,
                                totalReacciones = totalReacciones,
                                numComments = actual.numComments,
                                onReaccionar = ::reaccionar,
                                modifier = Modifier.weight(1f),
                            )
                            GuardarButton(
                                postId = postId,
                                guardado = actual.miGuardado,
                                tokenProvider = tokenProvider,
                                onError = { mensaje -> scope.launch { snackbarHostState.showSnackbar(mensaje) } },
                            )
                        }

                        Text("Comentarios", style = MaterialTheme.typography.titleSmall)

                        if (actual.comentarios.isEmpty()) {
                            Text(
                                "Nadie ha comentado todavía. ¡Rompe el hielo!",
                                style = MaterialTheme.typography.bodySmall,
                                color = AgoraColors.TextoMedio,
                            )
                        }

                        actual.comentarios.forEach { comentario ->
                            ComentarioFila(
                                comentario = comentario,
                                onAutorClick = onAuthorClick,
                                onReportar = {
                                    reporteComentarioId = comentario.id
                                    dialogoReporte = true
                                },
                            )
                        }
                    }
                }
            }
        }
    }

    if (dialogoReporte) {
        AlertDialog(
            onDismissRequest = {
                dialogoReporte = false
                reporteComentarioId = null
            },
            title = {
                Text(
                    if (reporteComentarioId != null) "Reportar comentario" else "Reportar publicación",
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    MOTIVOS_REPORTE.forEach { (codigo, etiqueta) ->
                        TextButton(onClick = { reportar(codigo) }, modifier = Modifier.fillMaxWidth()) {
                            Text(etiqueta, modifier = Modifier.fillMaxWidth())
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = {
                    dialogoReporte = false
                    reporteComentarioId = null
                }) { Text("Cancelar") }
            },
        )
    }

    if (dialogoRetirar) {
        RetirarPostDialogo(
            enviando = retirando,
            onConfirmar = ::retirar,
            onCerrar = { dialogoRetirar = false },
        )
    }

    if (dialogoEditar) {
        AlertDialog(
            onDismissRequest = { dialogoEditar = false },
            title = { Text("Editar publicación") },
            text = {
                OutlinedTextField(
                    value = textoEditar,
                    onValueChange = { textoEditar = it },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                )
            },
            confirmButton = {
                TextButton(onClick = ::editar) { Text("Guardar") }
            },
            dismissButton = {
                TextButton(onClick = { dialogoEditar = false }) { Text("Cancelar") }
            },
        )
    }

    if (dialogoBorrar) {
        AlertDialog(
            onDismissRequest = { dialogoBorrar = false },
            title = { Text("¿Eliminar publicación?") },
            text = { Text("Esta acción no se puede deshacer.") },
            confirmButton = {
                TextButton(onClick = ::borrar) { Text("Eliminar", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { dialogoBorrar = false }) { Text("Cancelar") }
            },
        )
    }
}

@Composable
private fun ComentarioFila(
    comentario: ComentarioDto,
    onAutorClick: (String) -> Unit,
    onReportar: () -> Unit,
) {
    var menuAbierto by remember { mutableStateOf(false) }
    val nombre = comentario.autor?.nombre ?: "Alguien"
    val handle = comentario.autor?.handle

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(AgoraColors.Superficie)
            .padding(start = 10.dp, end = 0.dp, top = 4.dp, bottom = 10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Avatar y nombre llevan al perfil, igual que el autor en PostCard.
            Row(
                modifier = Modifier
                    .weight(1f, fill = false)
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .then(
                        if (handle != null) {
                            Modifier.clickable(
                                role = Role.Button,
                                onClickLabel = "Ver perfil de $nombre",
                            ) { onAutorClick(handle) }
                        } else {
                            Modifier
                        },
                    )
                    .padding(end = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                AgoraAvatar(nombre = comentario.autor?.nombre, fotoUrl = comentario.autor?.fotoUrl, size = 32.dp)
                Text(
                    nombre,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
            }
            Box {
                IconButton(onClick = { menuAbierto = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Opciones del comentario")
                }
                DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                    DropdownMenuItem(
                        text = { Text("Reportar") },
                        onClick = {
                            menuAbierto = false
                            onReportar()
                        },
                        leadingIcon = { Icon(Icons.Default.Flag, contentDescription = null) },
                    )
                }
            }
        }
        Column(modifier = Modifier.padding(end = 10.dp)) {
            Text(comentario.texto, style = MaterialTheme.typography.bodyMedium)
            Text(
                haceCuanto(comentario.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = AgoraColors.TextoMedio,
            )
        }
    }
}

/** Mismo límite que `crearComentarioSchema` en packages/contracts. */
private const val LIMITE_COMENTARIO = 1000

@Composable
private fun BarraComentar(
    texto: String,
    onTextoChange: (String) -> Unit,
    enviando: Boolean,
    onEnviar: () -> Unit,
) {
    Surface(color = AgoraColors.Superficie, shadowElevation = 6.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedTextField(
                value = texto,
                onValueChange = { if (it.length <= LIMITE_COMENTARIO) onTextoChange(it) },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Escribe un comentario…") },
                maxLines = 4,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
            )
            Button(
                onClick = onEnviar,
                enabled = !enviando && texto.isNotBlank(),
            ) {
                Text(if (enviando) "Enviando…" else "Comentar")
            }
        }
    }
}

/**
 * Centra el contenido pero con scroll aunque quepa: sin un hijo desplazable
 * el gesto de jalar para recargar no llega a [AgoraPullToRefreshBox].
 */
@Composable
private fun BoxCentered(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .heightIn(min = maxHeight),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            content()
        }
    }
}
