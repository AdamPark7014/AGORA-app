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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.HashtagsApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.PostCard
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy

@Composable
fun HashtagScreen(
    tag: String,
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
    onPublicacion: (String) -> Unit = {},
    onHashtagClick: (String) -> Unit = {},
    onAuthorClick: (String) -> Unit = {},
) {
    var publicaciones by remember { mutableStateOf<List<PostDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    fun cargar(desde: String? = null) {
        scope.launch {
            try {
                val datos = ApiClient.api<HashtagsApi>(tokenProvider).publicaciones(tag, desde)
                publicaciones = if (desde != null) publicaciones + datos.publicaciones else datos.publicaciones
                cursor = datos.siguienteCursor
            } catch (_: Exception) {
                if (desde == null) publicaciones = emptyList()
            }
        }
    }

    LaunchedEffect(tag) {
        cargando = true
        publicaciones = emptyList()
        cursor = null
        cargar()
        cargando = false
    }

    when {
        cargando -> {
            Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item {
                    Text(
                        "#$tag",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 4.dp),
                    )
                }
                if (publicaciones.isEmpty()) {
                    item {
                        AgoraEmptyState(
                            state = AgoraCopy.emptyHashtag,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                } else {
                    items(publicaciones, key = { it.id }) { post ->
                        PostCard(
                            post = post,
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
                        item {
                            LaunchedEffect(cursor) { cargar(cursor) }
                        }
                    }
                }
            }
        }
    }
}
