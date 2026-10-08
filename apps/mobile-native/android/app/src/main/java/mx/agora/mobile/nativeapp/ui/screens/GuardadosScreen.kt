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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.GuardadosApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.PostCard
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy

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
    val scope = rememberCoroutineScope()

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            try {
                publicaciones = ApiClient.api<GuardadosApi>(tokenProvider).listar().publicaciones
            } catch (_: Exception) {
                publicaciones = emptyList()
            } finally {
                cargando = false
                refrescando = false
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
            publicaciones.isEmpty() -> {
                AgoraEmptyState(
                    state = AgoraCopy.emptyGuardados,
                    modifier = Modifier.align(Alignment.Center),
                )
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
                }
            }
        }
    }
}
