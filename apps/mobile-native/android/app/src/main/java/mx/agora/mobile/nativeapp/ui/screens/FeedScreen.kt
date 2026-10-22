package mx.agora.mobile.nativeapp.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.NetworkMonitor
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.FeedApi
import mx.agora.mobile.nativeapp.data.api.ModeracionApi
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.data.api.RetirarPostRequest
import mx.agora.mobile.nativeapp.data.local.OfflineCache
import mx.agora.mobile.nativeapp.ui.components.AgoraChipItem
import mx.agora.mobile.nativeapp.ui.components.AgoraChipRow
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.components.AgoraFeedSkeleton
import mx.agora.mobile.nativeapp.ui.components.AgoraPieErrorPagina
import mx.agora.mobile.nativeapp.ui.components.CarruselFeed
import mx.agora.mobile.nativeapp.ui.components.OfflineBanner
import mx.agora.mobile.nativeapp.ui.components.PostCard
import mx.agora.mobile.nativeapp.ui.components.RetirarPostDialogo
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import retrofit2.HttpException

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    tokenProvider: () -> String?,
    reloadKey: Int = 0,
    onPostClick: (String) -> Unit = {},
    onHashtagClick: (String) -> Unit = {},
    onAuthorClick: (String) -> Unit = {},
    onEventoClick: (String) -> Unit = {},
) {
    var posts by remember { mutableStateOf<List<PostDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(true) }
    var cargandoMas by remember { mutableStateOf(false) }
    var refrescando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Falló la siguiente página: se enseña al pie con «Reintentar». */
    var errorMas by remember { mutableStateOf<String?>(null) }
    var comunidades by remember { mutableStateOf<List<ComunidadDto>>(emptyList()) }
    var comunidadSlug by remember { mutableStateOf<String?>(null) }
    var siguiendo by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    var activePostId by remember { mutableStateOf<String?>(null) }
    var sinConexion by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val offlineCache = remember { OfflineCache.get(context) }
    var puedeModerar by remember { mutableStateOf(false) }
    var retirandoId by remember { mutableStateOf<String?>(null) }
    var enviandoRetiro by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        puedeModerar = YoCache.obtener(tokenProvider)?.puedeModerar == true
    }

    fun retirar(postId: String, motivo: String) {
        scope.launch {
            enviandoRetiro = true
            try {
                val resp = ApiClient.api<ModeracionApi>(tokenProvider)
                    .retirarPost(postId, RetirarPostRequest(motivo))
                if (!resp.isSuccessful) throw HttpException(resp)
                posts = posts.filter { it.id != postId }
                retirandoId = null
                Toast.makeText(context, "Publicación retirada.", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                val msg = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
                Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
            } finally {
                enviandoRetiro = false
            }
        }
    }

    val finCercano by remember {
        derivedStateOf {
            val info = listState.layoutInfo
            val ultimo = info.visibleItemsInfo.lastOrNull()?.index ?: 0
            ultimo >= info.totalItemsCount - 3
        }
    }

    LaunchedEffect(Unit) {
        sinConexion = !NetworkMonitor.isOnline(context)
        runCatching {
            comunidades = ApiClient.api<PerfilApi>(tokenProvider).misComunidades()
        }
    }

    LaunchedEffect(Unit) {
        NetworkMonitor.connectivityFlow(context).collect { online ->
            sinConexion = !online
        }
    }

    suspend fun cargarCache() {
        offlineCache.loadFeed()?.let { cached ->
            posts = cached.publicaciones
            cursor = cached.siguienteCursor
            error = null
        }
    }

    fun traer(desde: String?, reemplazar: Boolean, refresh: Boolean = false) {
        scope.launch {
            val online = NetworkMonitor.isOnline(context)
            sinConexion = !online
            if (!online && reemplazar) {
                cargando = true
                cargarCache()
                cargando = false
                refrescando = false
                return@launch
            }
            if (refresh) refrescando = true
            else if (desde == null) cargando = true
            else cargandoMas = true
            error = null
            errorMas = null
            try {
                val api = ApiClient.feedApi(tokenProvider)
                val resp = api.feed(
                    cursor = desde,
                    comunidadSlug = comunidadSlug,
                    siguiendo = if (siguiendo) "true" else null,
                )
                posts = if (reemplazar) resp.publicaciones else posts + resp.publicaciones
                cursor = resp.siguienteCursor
                if (reemplazar && desde == null) {
                    offlineCache.saveFeed(resp)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (reemplazar) {
                    // Lo que ya está en pantalla se queda; la caché solo si no hay nada.
                    if (posts.isEmpty()) cargarCache()
                    if (posts.isEmpty()) {
                        error = mensajeDe(e)
                    } else {
                        // Hay lista en pantalla: no se tapa, pero se avisa.
                        Toast.makeText(context, mensajeDe(e), Toast.LENGTH_SHORT).show()
                    }
                } else {
                    // Falló la siguiente página: pie con el motivo y «Reintentar».
                    // Además frena el scroll infinito para que no reintente en bucle.
                    errorMas = mensajeDe(e)
                }
            } finally {
                cargando = false
                refrescando = false
                cargandoMas = false
            }
        }
    }

    LaunchedEffect(reloadKey, comunidadSlug, siguiendo) {
        traer(desde = null, reemplazar = true)
    }

    LaunchedEffect(listState, posts) {
        snapshotFlow { listState.layoutInfo to posts }
            .collect { (layoutInfo, currentPosts) ->
                if (currentPosts.isEmpty()) {
                    activePostId = null
                    return@collect
                }
                val viewportStart = layoutInfo.viewportStartOffset
                val viewportEnd = layoutInfo.viewportEndOffset
                // Por key y no por índice: así no depende de cuántos items
                // (carrusel, aviso sin conexión, filtros) van antes de los posts.
                val idsPosts = currentPosts.mapTo(HashSet()) { it.id }

                val mostVisible = layoutInfo.visibleItemsInfo
                    .filter { item -> item.key in idsPosts }
                    .maxByOrNull { item ->
                        val itemStart = item.offset
                        val itemEnd = item.offset + item.size
                        val visibleStart = maxOf(itemStart, viewportStart)
                        val visibleEnd = minOf(itemEnd, viewportEnd)
                        visibleEnd - visibleStart
                    }

                activePostId = mostVisible?.key as? String
            }
    }

    LaunchedEffect(finCercano, cursor, cargandoMas, cargando, errorMas) {
        snapshotFlow { finCercano }
            .distinctUntilChanged()
            .collect { cerca ->
                if (cerca && cursor != null && !cargandoMas && !cargando && errorMas == null) {
                    traer(desde = cursor, reemplazar = false)
                }
            }
    }

    AgoraPullToRefreshBox(
        isRefreshing = refrescando,
        onRefresh = { traer(null, reemplazar = true, refresh = true) },
        modifier = Modifier.fillMaxSize(),
    ) {
        when {
            cargando && posts.isEmpty() -> {
                AgoraFeedSkeleton(modifier = Modifier.fillMaxSize())
            }
            error != null && posts.isEmpty() -> {
                // Desplazable: así también se puede jalar para refrescar.
                AgoraEstadoDesplazable {
                    AgoraErrorState(
                        message = error!!,
                        onRetry = { traer(null, reemplazar = true) },
                    )
                }
            }
            else -> {
                LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(AgoraSpacing.Sm),
                    verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs),
                ) {
                    // Pregunta del día, pulso, eventos en vivo, racha, retos y tip:
                    // un solo item horizontal que no se recrea al hacer scroll.
                    item(key = "carrusel") {
                        CarruselFeed(
                            tokenProvider = tokenProvider,
                            onHashtagClick = onHashtagClick,
                            onPerfilClick = onAuthorClick,
                            onEventoClick = onEventoClick,
                        )
                    }

                    if (sinConexion) {
                        item(key = "offline") {
                            OfflineBanner(
                                modifier = Modifier.padding(bottom = AgoraSpacing.Xxs),
                            )
                        }
                    }

                    item(key = "filtros") {
                        FiltrosFeed(
                            siguiendo = siguiendo,
                            comunidadSlug = comunidadSlug,
                            comunidades = comunidades,
                            onSiguiendo = { siguiendo = !siguiendo },
                            onTodas = { comunidadSlug = null; siguiendo = false },
                            onComunidad = { slug -> comunidadSlug = slug; siguiendo = false },
                        )
                    }

                    if (posts.isEmpty() && !cargando) {
                        item(key = "vacio") {
                            AgoraEmptyState(
                                state = AgoraCopy.emptyFeed,
                                modifier = Modifier.padding(top = AgoraSpacing.Lg, bottom = AgoraSpacing.Md),
                            )
                        }
                    }

                    items(posts, key = { it.id }) { post ->
                        PostCard(
                            post = post,
                            tokenProvider = tokenProvider,
                            onPostClick = { onPostClick(post.id) },
                            onHashtagClick = onHashtagClick,
                            onAuthorClick = post.autor?.handle?.let { handle ->
                                { onAuthorClick(handle) }
                            },
                            isActive = post.id == activePostId,
                            onMentionClick = onAuthorClick,
                            onRetirar = if (puedeModerar) {
                                { retirandoId = post.id }
                            } else {
                                null
                            },
                        )
                    }

                    if (cargandoMas) {
                        item(key = "pie") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = AgoraSpacing.Md),
                                contentAlignment = Alignment.Center,
                            ) {
                                CircularProgressIndicator()
                            }
                        }
                    } else if (errorMas != null && cursor != null) {
                        item(key = "pie_error") {
                            AgoraPieErrorPagina(
                                mensaje = errorMas!!,
                                onReintentar = { traer(desde = cursor, reemplazar = false) },
                            )
                        }
                    }
                }
            }
        }
    }

    retirandoId?.let { postId ->
        RetirarPostDialogo(
            enviando = enviandoRetiro,
            onConfirmar = { motivo -> retirar(postId, motivo) },
            onCerrar = { retirandoId = null },
        )
    }
}

@Composable
private fun FiltrosFeed(
    siguiendo: Boolean,
    comunidadSlug: String?,
    comunidades: List<ComunidadDto>,
    onSiguiendo: () -> Unit,
    onTodas: () -> Unit,
    onComunidad: (String) -> Unit,
) {
    val chips = buildList {
        add(AgoraChipItem("siguiendo", "Siguiendo"))
        add(AgoraChipItem("todas", "Todas"))
        comunidades.forEach { c ->
            add(AgoraChipItem(c.slug, c.nombre))
        }
    }

    val selectedId = when {
        siguiendo -> "siguiendo"
        comunidadSlug != null -> comunidadSlug
        else -> "todas"
    }

    AgoraChipRow(
        chips = chips,
        selectedId = selectedId,
        onChipSelected = { id ->
            when (id) {
                "siguiendo" -> onSiguiendo()
                "todas" -> onTodas()
                else -> onComunidad(id)
            }
        },
    )
}
