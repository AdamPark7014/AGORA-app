package mx.agora.mobile.nativeapp.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.NetworkMonitor
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.ModeracionApi
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.data.api.RetirarPostRequest
import mx.agora.mobile.nativeapp.data.local.OfflineCache
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraFeedSkeleton
import mx.agora.mobile.nativeapp.ui.components.AgoraPieErrorPagina
import mx.agora.mobile.nativeapp.ui.components.EncabezadoInicioB
import mx.agora.mobile.nativeapp.ui.components.EstiloPost
import mx.agora.mobile.nativeapp.ui.components.HistoriasClips
import mx.agora.mobile.nativeapp.ui.components.InicioVacioTarjeta
import mx.agora.mobile.nativeapp.ui.components.OfflineBanner
import mx.agora.mobile.nativeapp.ui.components.PildoraFiltro
import mx.agora.mobile.nativeapp.ui.components.PostCard
import mx.agora.mobile.nativeapp.ui.components.PreguntaDelDiaBanner
import mx.agora.mobile.nativeapp.ui.components.RetirarPostDialogo
import mx.agora.mobile.nativeapp.ui.components.nombreCortoComunidad
import mx.agora.mobile.nativeapp.ui.components.colorComunidad
import mx.agora.mobile.nativeapp.ui.components.Talavera
import mx.agora.mobile.nativeapp.ui.components.esVideoMedia
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import retrofit2.HttpException

/**
 * Inicio con el Feed B que eligió Adam (docs/diseno-d.md §0): «Ágora» en naranja con Avisos y
 * Mensajes, la fila de historias (los clips del campus) y publicaciones a todo lo ancho. Lo que
 * FeedB no define sale del artboard Main: los filtros en píldora (Para ti, Siguiendo, tu carrera,
 * tu generación) y la pregunta del día. «Ahora en el campus», el mini evento y «Tu día» quedan
 * fuera del inicio (Tu día vive en Campus). Paridad con `FeedView.swift`.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    tokenProvider: () -> String?,
    reloadKey: Int = 0,
    /** Cambia cuando se vuelve a tocar Inicio: la lista sube al encabezado. */
    irArriba: Int = 0,
    onPostClick: (String) -> Unit = {},
    onHashtagClick: (String) -> Unit = {},
    onAuthorClick: (String) -> Unit = {},
    mensajesSinLeer: Int = 0,
    avisosSinLeer: Int = 0,
    onMensajes: () -> Unit = {},
    onAvisos: () -> Unit = {},
    /** Abre los clips a pantalla completa, desde el clip tocado (null: desde el primero). */
    onClip: (String?) -> Unit = {},
    onPublicar: () -> Unit = {},
    onCrearEvento: () -> Unit = {},
) {
    var posts by remember { mutableStateOf<List<PostDto>>(emptyList()) }
    var clips by remember { mutableStateOf<List<PostDto>>(emptyList()) }
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

    LaunchedEffect(irArriba) {
        if (irArriba > 0) listState.animateScrollToItem(0)
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

    /** Falló traer mis comunidades: se reintenta al volver la red o al jalar para refrescar. */
    var comunidadesPendientes by remember { mutableStateOf(false) }

    fun cargarComunidades() {
        scope.launch {
            try {
                comunidades = ApiClient.api<PerfilApi>(tokenProvider).misComunidades()
                comunidadesPendientes = false
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                comunidadesPendientes = true
            }
        }
    }

    // Historias: los clips recientes del campus. Si fallan, la fila queda solo con «Tu historia».
    fun cargarClips() {
        scope.launch {
            clips = try {
                ApiClient.feedApi(tokenProvider).feed(tipo = "clips").publicaciones
                    .filter { post -> post.media.any { it.esVideoMedia() } }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                clips
            }
        }
    }

    LaunchedEffect(Unit) {
        sinConexion = !NetworkMonitor.isOnline(context)
        cargarComunidades()
    }

    LaunchedEffect(reloadKey) { cargarClips() }

    LaunchedEffect(Unit) {
        NetworkMonitor.connectivityFlow(context).collect { online ->
            sinConexion = !online
            if (online && comunidadesPendientes) cargarComunidades()
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
                // Sin red y sin caché no es un feed «tranquilo»: estado de error con «Reintentar».
                if (posts.isEmpty()) error = AgoraCopy.errors.network
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
                // (encabezado, historias, filtros, pregunta) van antes de los posts.
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

    // `tipo` llegó con la D; con una API anterior se deduce del slug.
    val miCarrera = comunidades.firstOrNull {
        (it.tipo == "CARRERA" || it.slug.startsWith("carrera:")) && !it.silenciada
    }
    val miGeneracion = comunidades.firstOrNull {
        (it.tipo == "GENERACION" || it.slug.startsWith("generacion:")) && !it.silenciada
    }
    val miColegio = comunidades.firstOrNull {
        (it.tipo == "COLEGIO" || it.slug.startsWith("colegio:")) && !it.silenciada
    }

    AgoraPullToRefreshBox(
        isRefreshing = refrescando,
        onRefresh = {
            if (comunidadesPendientes) cargarComunidades()
            cargarClips()
            traer(null, reemplazar = true, refresh = true)
        },
        modifier = Modifier
            .fillMaxSize()
            .background(AgoraColors.FondoFeed),
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = AgoraSpacing.Lg),
        ) {
            item(key = "cabeza") {
                Column {
                    EncabezadoInicioB(
                        avisosSinLeer = avisosSinLeer,
                        mensajesSinLeer = mensajesSinLeer,
                        onAvisos = onAvisos,
                        onMensajes = onMensajes,
                    )
                    // B «Cholula»: franja de azulejo de Talavera bajo el encabezado.
                    Talavera(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp),
                    )
                }
            }

            if (sinConexion) {
                item(key = "offline") {
                    OfflineBanner(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                }
            }

            item(key = "historias") {
                HistoriasClips(
                    clips = clips,
                    onTuHistoria = onPublicar,
                    onClip = { id -> onClip(id) },
                )
            }

            item(key = "filtros") {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(start = 16.dp, end = 16.dp, top = 2.dp, bottom = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        PildoraFiltro("Para ti", activa = !siguiendo && comunidadSlug == null) {
                            siguiendo = false
                            comunidadSlug = null
                        }
                        PildoraFiltro("Siguiendo", activa = siguiendo) {
                            siguiendo = true
                            comunidadSlug = null
                        }
                        // B «Cholula»: cada comunidad con el cuadrito de su color.
                        listOfNotNull(miCarrera, miGeneracion, miColegio).forEach { c ->
                            PildoraFiltro(
                                nombreCortoComunidad(c.nombre, c.slug),
                                activa = !siguiendo && comunidadSlug == c.slug,
                                color = colorComunidad(c.slug),
                            ) {
                                siguiendo = false
                                comunidadSlug = c.slug
                            }
                        }
                    }
                }
            }

            item(key = "pregunta") {
                PreguntaDelDiaBanner(
                    tokenProvider = tokenProvider,
                    modifier = Modifier.padding(start = 12.dp, end = 12.dp, top = 2.dp, bottom = 14.dp),
                )
            }

            when {
                cargando && posts.isEmpty() -> item(key = "cargando") {
                    AgoraFeedSkeleton()
                }
                error != null && posts.isEmpty() -> item(key = "error") {
                    AgoraErrorState(
                        message = error!!,
                        onRetry = { traer(null, reemplazar = true) },
                        modifier = Modifier.padding(top = AgoraSpacing.Lg),
                    )
                }
                posts.isEmpty() && siguiendo -> item(key = "vacio") {
                    AgoraEmptyState(
                        emoji = "",
                        title = "Nadie de los que sigues ha publicado",
                        subtitle = "Busca gente de tu carrera en el directorio y síguela.",
                        modifier = Modifier.padding(top = AgoraSpacing.Lg, bottom = AgoraSpacing.Md),
                    )
                }
                posts.isEmpty() && comunidadSlug != null -> item(key = "vacio") {
                    AgoraEmptyState(
                        emoji = "",
                        title = "Todavía no hay nada aquí",
                        subtitle = "Lo que publiques en esta comunidad lo ve toda tu gente.",
                        modifier = Modifier.padding(top = AgoraSpacing.Lg, bottom = AgoraSpacing.Md),
                    )
                }
                posts.isEmpty() -> item(key = "vacio") {
                    InicioVacioTarjeta(
                        onPublicar = onPublicar,
                        onClip = onPublicar,
                        onEvento = onCrearEvento,
                        modifier = Modifier.padding(start = 12.dp, end = 12.dp, top = 4.dp, bottom = 6.dp),
                    )
                }
            }

            posts.forEach { post ->
                item(key = post.id) {
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
                        estilo = EstiloPost.FeedB,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }
            }

            if (cargandoMas) {
                item(key = "pie") {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = AgoraSpacing.Md),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = AgoraColors.Naranja)
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
        // Al cambiar de filtro la lista anterior sigue: que se note que carga.
        if (cargando && posts.isNotEmpty()) {
            LinearProgressIndicator(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter),
            )
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
