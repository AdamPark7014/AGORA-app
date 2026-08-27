package mx.agora.mobile.nativeapp.ui.screens

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.AnonimoApi
import mx.agora.mobile.nativeapp.data.api.AnonimoPostDto
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.api.PublicarAnonimoRequest
import mx.agora.mobile.nativeapp.data.api.ReaccionarRequest
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

private val reacciones = listOf(
    "ME_LATE" to "🔥",
    "ME_RIO" to "😂",
    "APOYO" to "🤝",
)

@Composable
fun AnonimoScreen(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
) {
    var habilitada by remember { mutableStateOf<Boolean?>(null) }
    var alias by remember { mutableStateOf<String?>(null) }
    var posts by remember { mutableStateOf<List<AnonimoPostDto>>(emptyList()) }
    var texto by remember { mutableStateOf("") }
    var cargando by remember { mutableStateOf(true) }
    var enviando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun cargarFeed() {
        scope.launch {
            try {
                posts = ApiClient.api<AnonimoApi>(tokenProvider).feed().publicaciones
            } catch (e: Exception) {
                posts = emptyList()
            }
        }
    }

    LaunchedEffect(Unit) {
        cargando = true
        try {
            val estado = ApiClient.api<AnonimoApi>(tokenProvider).estado()
            habilitada = estado.habilitada
            if (estado.habilitada) {
                cargarFeed()
                alias = ApiClient.api<AnonimoApi>(tokenProvider).alias().alias
            }
        } catch (_: Exception) {
            habilitada = false
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
        habilitada != true -> {
            Column(
                modifier = modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Zona sin nombre apagada", style = MaterialTheme.typography.titleMedium)
                Text(
                    "El equipo la tiene desactivada por ahora.",
                    color = AgoraColors.TextoMedio,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier.fillMaxSize(),
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
                                "Publicas como ${alias ?: "…"}",
                                style = MaterialTheme.typography.labelMedium,
                                color = AgoraColors.TextoMedio,
                            )
                            OutlinedTextField(
                                value = texto,
                                onValueChange = { if (it.length <= 600) texto = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(100.dp),
                                placeholder = { Text("Di algo sin que sepan quién eres…") },
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
                                            cargarFeed()
                                        } catch (e: Exception) {
                                            error = mensajeDe(e)
                                        } finally {
                                            enviando = false
                                        }
                                    }
                                },
                                enabled = !enviando && texto.isNotBlank(),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(if (enviando) "…" else "Publicar")
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
                            onReaccionar = { tipo ->
                                scope.launch {
                                    try {
                                        val quita = post.miReaccion == tipo
                                        ApiClient.api<PostsApi>(tokenProvider).reaccionar(
                                            post.id,
                                            ReaccionarRequest(if (quita) null else tipo),
                                        )
                                        cargarFeed()
                                    } catch (e: Exception) {
                                        error = mensajeDe(e)
                                    }
                                }
                            },
                            onBorrar = {
                                scope.launch {
                                    try {
                                        ApiClient.api<AnonimoApi>(tokenProvider).borrar(post.id)
                                        cargarFeed()
                                    } catch (e: Exception) {
                                        error = mensajeDe(e)
                                    }
                                }
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AnonimoPostCard(
    post: AnonimoPostDto,
    onReaccionar: (String) -> Unit,
    onBorrar: () -> Unit,
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
                if (post.esMio) {
                    TextButton(onClick = onBorrar) { Text("Borrar") }
                }
            }
            Text(haceCuanto(post.createdAt), style = MaterialTheme.typography.labelSmall, color = AgoraColors.TextoMedio)
            Text(post.texto, style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                reacciones.forEach { (tipo, emoji) ->
                    TextButton(onClick = { onReaccionar(tipo) }) {
                        Text(
                            "$emoji ${post.numReactions}",
                            color = if (post.miReaccion == tipo) AgoraColors.Naranja else AgoraColors.TextoMedio,
                        )
                    }
                }
            }
        }
    }
}
