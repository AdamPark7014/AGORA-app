package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PersonaListaDto
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

/** Tipos de lista de [ConexionesScreen]; son también el segmento de la ruta. */
object TipoConexion {
    const val SEGUIDORES = "seguidores"
    const val SIGUIENDO = "siguiendo"
}

/** Seguidores o seguidos de un perfil (`GET perfil/{handle}/seguidores|siguiendo`). */
@Composable
fun ConexionesScreen(
    handle: String,
    tipo: String,
    tokenProvider: () -> String?,
    onPerfil: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var personas by remember { mutableStateOf<List<PersonaListaDto>>(emptyList()) }
    var restringido by remember { mutableStateOf(false) }
    var cargando by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var intento by remember { mutableIntStateOf(0) }

    LaunchedEffect(handle, tipo, intento) {
        cargando = true
        error = null
        try {
            val api = ApiClient.api<PerfilApi>(tokenProvider)
            val resp = if (tipo == TipoConexion.SIGUIENDO) api.siguiendo(handle) else api.seguidores(handle)
            personas = resp.personas
            restringido = resp.restringido
        } catch (e: Exception) {
            error = mensajeDe(e)
        } finally {
            cargando = false
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        when {
            cargando -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            error != null -> AgoraErrorState(
                message = error!!,
                modifier = Modifier.align(Alignment.Center),
                onRetry = { intento++ },
            )
            restringido -> Text(
                "Este perfil es privado o no compartís comunidades.",
                textAlign = TextAlign.Center,
                color = AgoraColors.TextoMedio,
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(24.dp),
            )
            personas.isEmpty() -> AgoraEmptyState(
                state = if (tipo == TipoConexion.SIGUIENDO) AgoraCopy.emptySiguiendo else AgoraCopy.emptySeguidores,
                modifier = Modifier.align(Alignment.Center),
            )
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(personas, key = { it.handle }) { persona ->
                    Card(
                        onClick = { onPerfil(persona.handle) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = AgoraColors.Superficie),
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AgoraAvatar(persona.nombre, persona.fotoUrl, size = 44.dp)
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    if (persona.verificado) "${persona.nombre} ✓" else persona.nombre,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                )
                                Text(
                                    "@${persona.handle}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AgoraColors.TextoMedio,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
