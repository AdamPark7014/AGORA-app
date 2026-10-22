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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.HashtagsApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraPieErrorPagina
import mx.agora.mobile.nativeapp.ui.components.PostCard
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

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
    var error by remember { mutableStateOf<String?>(null) }
    var cargandoMas by remember { mutableStateOf(false) }
    var errorMas by remember { mutableStateOf<String?>(null) }
    /** Sube con «Reintentar» para volver a pedir la primera página. */
    var intento by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    fun cargarMas() {
        val desde = cursor ?: return
        if (cargandoMas) return
        scope.launch {
            cargandoMas = true
            errorMas = null
            try {
                val datos = ApiClient.api<HashtagsApi>(tokenProvider).publicaciones(tag, desde)
                val vistos = publicaciones.mapTo(HashSet()) { it.id }
                publicaciones = publicaciones + datos.publicaciones.filter { it.id !in vistos }
                cursor = datos.siguienteCursor
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMas = mensajeDe(e)
            } finally {
                cargandoMas = false
            }
        }
    }

    // La primera página se espera aquí mismo: antes se lanzaba aparte y
    // «cargando» se apagaba antes de tener datos, así que parpadeaba el vacío.
    LaunchedEffect(tag, intento) {
        cargando = true
        error = null
        errorMas = null
        try {
            val datos = ApiClient.api<HashtagsApi>(tokenProvider).publicaciones(tag, null)
            publicaciones = datos.publicaciones
            cursor = datos.siguienteCursor
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            publicaciones = emptyList()
            cursor = null
            error = mensajeDe(e)
        } finally {
            cargando = false
        }
    }

    when {
        cargando -> {
            Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        error != null -> {
            Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                AgoraErrorState(
                    message = error!!,
                    title = "No pudimos cargar #$tag",
                    onRetry = { intento++ },
                )
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item(key = "titulo") {
                    Text(
                        "#$tag",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 4.dp),
                    )
                }
                if (publicaciones.isEmpty()) {
                    item(key = "vacio") {
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
