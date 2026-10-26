package mx.agora.mobile.nativeapp.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.AnonimoApi
import mx.agora.mobile.nativeapp.data.api.AnonimoPostDto
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CrearReporteRequest
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.api.PublicarAnonimoRequest
import mx.agora.mobile.nativeapp.data.api.ReaccionarRequest
import mx.agora.mobile.nativeapp.data.api.ReportesApi
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.components.DialogoConfirmacion
import mx.agora.mobile.nativeapp.ui.components.ReportarDialogo
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

/** Tope de texto de una publicación anónima. */
private const val LIMITE_ANONIMO = 600

/** Las mismas tres que la web (`apps/web/app/anonimo`): tipo y etiqueta. Diseño D: texto, sin emojis. */
private val reacciones = listOf(
    "ME_LATE" to "Me late",
    "ME_RIO" to "Me río",
    "APOYO" to "Apoyo",
)

@Composable
fun AnonimoScreen(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
) {
    /** null = aún no se sabe (cargando o falló la red); false = el equipo la apagó. */
    var habilitada by remember { mutableStateOf<Boolean?>(null) }
    var alias by remember { mutableStateOf<String?>(null) }
    var posts by remember { mutableStateOf<List<AnonimoPostDto>>(emptyList()) }
    var texto by remember { mutableStateOf("") }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    /** Falló la carga (estado o feed): se muestra con «Reintentar», no como zona apagada. */
    var errorCarga by remember { mutableStateOf<String?>(null) }
    var enviando by remember { mutableStateOf(false) }
    /** Error al publicar: vive junto al cuadro de texto. */
    var error by remember { mutableStateOf<String?>(null) }
    /** Post anónimo que se está reportando (se reporta igual que uno normal). */
    var reportandoId by remember { mutableStateOf<String?>(null) }
    /** Post propio que se pidió borrar y falta confirmar. */
    var porBorrar by remember { mutableStateOf<String?>(null) }
    var borrando by remember { mutableStateOf(false) }
    /** Post con una reacción en camino: evita el doble toque. */
    var reaccionando by remember { mutableStateOf<String?>(null) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun avisar(mensaje: String) {
        scope.launch { snackbar.showSnackbar(mensaje) }
    }

    fun reportar(postId: String, motivo: String) {
        reportandoId = null
        scope.launch {
            try {
                val resp = ApiClient.api<ReportesApi>(tokenProvider)
                    .reportar(CrearReporteRequest(postId = postId, motivo = motivo))
                if (!resp.isSuccessful) throw retrofit2.HttpException(resp)
                Toast.makeText(context, "Gracias. Un moderador lo va a revisar.", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            }
        }
    }

    /** Estado de la zona + feed + alias. Con [refresh] se usa el indicador de jalar. */
    fun cargarTodo(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            errorCarga = null
            try {
                val api = ApiClient.api<AnonimoApi>(tokenProvider)
                val estado = api.estado()
                habilitada = estado.habilitada
                if (estado.habilitada) {
                    posts = api.feed().publicaciones
                    if (alias == null) {
                        alias = try {
                            api.alias().alias
                        } catch (_: Exception) {
                            null
                        }
                    }
                }
            } catch (e: Exception) {
                val mensaje = mensajeDe(e)
                // Si la zona ya estaba en pantalla, no se tapa: basta con avisar.
                if (refresh && habilitada == true) avisar(mensaje) else errorCarga = mensaje
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    /** Solo el feed, sin indicador (después de publicar). */
    fun recargarFeed() {
        scope.launch {
            try {
                posts = ApiClient.api<AnonimoApi>(tokenProvider).feed().publicaciones
            } catch (e: Exception) {
                avisar(mensajeDe(e))
            }
        }
    }

    fun reaccionar(post: AnonimoPostDto, tipo: String) {
        if (reaccionando != null) return
        scope.launch {
            reaccionando = post.id
            try {
                // Siempre se manda el tipo tocado: el API alterna (el mismo tipo otra vez la quita).
                val resp = ApiClient.api<PostsApi>(tokenProvider).reaccionar(
                    post.id,
                    ReaccionarRequest(tipo),
                )
                val mia = resp.miReaccion
                // Mismo cálculo que la web: cambiar de reacción no mueve el total.
                val delta = when {
                    mia != null && post.miReaccion == null -> 1
                    mia == null && post.miReaccion != null -> -1
                    else -> 0
                }
                posts = posts.map {
                    if (it.id == post.id) {
                        it.copy(miReaccion = mia, numReactions = (it.numReactions + delta).coerceAtLeast(0))
                    } else {
                        it
                    }
                }
            } catch (e: Exception) {
                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            } finally {
                reaccionando = null
            }
        }
    }

    fun borrar(postId: String) {
        scope.launch {
            borrando = true
            try {
                val resp = ApiClient.api<AnonimoApi>(tokenProvider).borrar(postId)
                if (!resp.isSuccessful) throw retrofit2.HttpException(resp)
                posts = posts.filterNot { it.id == postId }
                porBorrar = null
                avisar("Se borró tu publicación.")
            } catch (e: Exception) {
                porBorrar = null
                avisar(ApiClient.mensajeDelServidor(e) ?: mensajeDe(e))
            } finally {
                borrando = false
            }
        }
    }

    LaunchedEffect(Unit) { cargarTodo() }

    Box(modifier = modifier.fillMaxSize()) {
        if (cargando && habilitada == null && errorCarga == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            AgoraPullToRefreshBox(
                isRefreshing = refrescando,
                onRefresh = { cargarTodo(refresh = true) },
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    // Error y zona apagada van en algo desplazable para que el jalón de refrescar funcione.
                    errorCarga != null -> {
                        AgoraEstadoDesplazable {
                            AgoraErrorState(
                                message = errorCarga!!,
                                title = "No pudimos abrir la zona sin nombre",
                                onRetry = { cargarTodo() },
                            )
                        }
                    }
                    habilitada != true -> {
                        AgoraEstadoDesplazable {
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text("La zona sin nombre está apagada", style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "El equipo la desactivó por ahora. Vuelve más tarde.",
                                    color = AgoraColors.TextoMedio,
                                    modifier = Modifier.padding(top = 8.dp),
                                )
                            }
                        }
                    }
                    else -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
                                    colors = CardDefaults.cardColors(containerColor = AgoraColors.Superficie),
                                ) {
                                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text(
                                            // Si falló alias() no se queda en «…».
                                            alias?.let { "Publicas como $it" } ?: "Publicas con un alias anónimo",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = AgoraColors.TextoMedio,
                                        )
                                        OutlinedTextField(
                                            value = texto,
                                            onValueChange = { if (it.length <= LIMITE_ANONIMO) texto = it },
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(100.dp),
                                            placeholder = { Text("Di algo sin que sepan quién eres…") },
                                            // Antes cortaba en seco al llegar al tope: ahora se ve venir.
                                            supportingText = if (LIMITE_ANONIMO - texto.length < 100) {
                                                { Text("${texto.length}/$LIMITE_ANONIMO") }
                                            } else {
                                                null
                                            },
                                        )
                                        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                                        Button(
                                            onClick = {
                                                if (texto.isBlank()) return@Button
                                                scope.launch {
                                                    enviando = true
                                                    error = null
                                                    try {
                                                        ApiClient.api<AnonimoApi>(tokenProvider).publicar(
                                                            PublicarAnonimoRequest(texto.trim()),
                                                        )
                                                        texto = ""
                                                        recargarFeed()
                                                    } catch (e: Exception) {
                                                        error = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
                                                    } finally {
                                                        enviando = false
                                                    }
                                                }
                                            },
                                            enabled = !enviando && texto.isNotBlank(),
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Text(if (enviando) "Publicando…" else "Publicar")
                                        }
                                    }
                                }
                            }

                            if (posts.isEmpty()) {
                                item {
                                    AgoraEmptyState(
                                        state = AgoraCopy.emptyAnonimo,
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                }
                            } else {
                                items(posts, key = { it.id }) { post ->
                                    AnonimoPostCard(
                                        post = post,
                                        reaccionando = reaccionando == post.id,
                                        onReaccionar = { tipo -> reaccionar(post, tipo) },
                                        onBorrar = { porBorrar = post.id },
                                        onReportar = { reportandoId = post.id },
                                    )
                                }
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

    reportandoId?.let { postId ->
        ReportarDialogo(
            titulo = "Reportar publicación",
            onMotivo = { motivo -> reportar(postId, motivo) },
            onCerrar = { reportandoId = null },
        )
    }

    porBorrar?.let { postId ->
        DialogoConfirmacion(
            titulo = "¿Borrar tu publicación?",
            mensaje = "Se borra para todos y no se puede deshacer.",
            textoConfirmar = "Sí, borrar",
            onConfirmar = { borrar(postId) },
            onCerrar = { porBorrar = null },
            enProceso = borrando,
        )
    }
}

@Composable
private fun AnonimoPostCard(
    post: AnonimoPostDto,
    onReaccionar: (String) -> Unit,
    onBorrar: () -> Unit,
    onReportar: () -> Unit,
    reaccionando: Boolean = false,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = AgoraColors.Superficie),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(post.alias, style = MaterialTheme.typography.titleSmall)
                // Con a quién o qué se refiere: en la lista hay muchos «Reportar».
                if (post.esMio) {
                    TextButton(
                        onClick = onBorrar,
                        modifier = Modifier.semantics { contentDescription = "Borrar tu publicación" },
                    ) { Text("Borrar") }
                } else {
                    TextButton(
                        onClick = onReportar,
                        modifier = Modifier.semantics { contentDescription = "Reportar publicación de ${post.alias}" },
                    ) {
                        Text("Reportar", color = AgoraColors.TextoMedio)
                    }
                }
            }
            Text(haceCuanto(post.createdAt), style = MaterialTheme.typography.labelSmall, color = AgoraColors.TextoMedio)
            Text(post.texto, style = MaterialTheme.typography.bodyMedium)
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // El API solo da el total (numReactions), no el conteo por tipo: los chips
                // van sin número y el total se muestra una sola vez, como en la web.
                reacciones.forEach { (tipo, etiqueta) ->
                    val mia = post.miReaccion == tipo
                    FilterChip(
                        selected = mia,
                        onClick = { onReaccionar(tipo) },
                        enabled = !reaccionando,
                        label = { Text(etiqueta, style = MaterialTheme.typography.labelLarge) },
                        modifier = Modifier.semantics {
                            contentDescription = if (mia) "$etiqueta (tu reacción, toca para quitarla)" else etiqueta
                        },
                    )
                }
                if (post.numReactions > 0) {
                    Text(
                        cuenta(post.numReactions, "reacción", "reacciones"),
                        style = MaterialTheme.typography.labelMedium,
                        color = AgoraColors.TextoMedio,
                        modifier = Modifier.padding(start = 4.dp),
                    )
                }
            }
        }
    }
}
