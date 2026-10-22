package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.GuardadosApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.components.AgoraPieErrorPagina
import mx.agora.mobile.nativeapp.ui.components.PostCard
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuardadosScreen(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
    onPublicacion: (String) -> Unit = {},
    onHashtagClick: (String) -> Unit = {},
    onAuthorClick: (String) -> Unit = {},
) {
    var publicaciones by remember { mutableStateOf<List<PostDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    /** Falló la primera página. Antes se veía como «no tienes guardados». */
    var error by remember { mutableStateOf<String?>(null) }
    /** Cursor de la siguiente página: antes solo se veían los primeros 20. */
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargandoMas by remember { mutableStateOf(false) }
    var errorMas by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            error = null
            try {
                val resp = ApiClient.api<GuardadosApi>(tokenProvider).listar()
                publicaciones = resp.publicaciones
                cursor = resp.siguienteCursor
                errorMas = null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Si ya había lista, se queda; el error solo tapa la pantalla vacía.
                error = mensajeDe(e)
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    fun cargarMas() {
        val desde = cursor ?: return
        if (cargandoMas) return
        scope.launch {
            cargandoMas = true
            errorMas = null
            try {
                val resp = ApiClient.api<GuardadosApi>(tokenProvider).listar(cursor = desde)
                val vistos = publicaciones.mapTo(HashSet()) { it.id }
                publicaciones = publicaciones + resp.publicaciones.filter { it.id !in vistos }
                cursor = resp.siguienteCursor
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMas = mensajeDe(e)
            } finally {
                cargandoMas = false
            }
        }
    }

    LaunchedEffect(Unit) { cargar() }

    AgoraPullToRefreshBox(
        isRefreshing = refrescando,
        onRefresh = { cargar(refresh = true) },
        modifier = modifier.fillMaxSize(),
    ) {
        when {
            cargando && publicaciones.isEmpty() -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            error != null && publicaciones.isEmpty() -> {
                AgoraEstadoDesplazable {
                    AgoraErrorState(
                        message = error!!,
                        title = "No pudimos traer tus guardados",
                        onRetry = { cargar() },
                    )
                }
            }
            publicaciones.isEmpty() -> {
                AgoraEstadoDesplazable {
                    AgoraEmptyState(state = AgoraCopy.emptyGuardados)
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(publicaciones, key = { it.id }) { post ->
                        PostCard(
                            post = post.copy(miGuardado = true),
                            tokenProvider = tokenProvider,
                            onPostClick = { onPublicacion(post.id) },
                            onHashtagClick = onHashtagClick,
                            onAuthorClick = post.autor?.handle?.let { handle ->
                                { onAuthorClick(handle) }
                            },
                            onMentionClick = onAuthorClick,
                        )
                    }
                    if (cursor != null) {
                        item(key = "mas") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                when {
                                    cargandoMas -> CircularProgressIndicator()
                                    errorMas != null -> AgoraPieErrorPagina(
                                        mensaje = errorMas!!,
                                        onReintentar = { cargarMas() },
                                    )
                                    // Llegar al final pide la siguiente página.
                                    else -> LaunchedEffect(cursor) { cargarMas() }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
