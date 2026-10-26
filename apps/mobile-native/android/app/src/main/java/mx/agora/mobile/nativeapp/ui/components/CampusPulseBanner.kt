package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CumpleDto
import mx.agora.mobile.nativeapp.data.api.HashtagsApi
import mx.agora.mobile.nativeapp.data.api.NotificacionesApi
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/** Trending + cumpleaños del campus — paridad con carril derecho web. */
@Composable
fun CampusPulseBanner(
    tokenProvider: () -> String?,
    onHashtagClick: (String) -> Unit = {},
    onPerfilClick: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var trending by remember { mutableStateOf<List<Pair<String, Int>>>(emptyList()) }
    var cumples by remember { mutableStateOf<List<CumpleDto>>(emptyList()) }

    LaunchedEffect(Unit) {
        val token = tokenProvider() ?: return@LaunchedEffect
        runCatching {
            trending = ApiClient.api<HashtagsApi> { token }.trending().hashtags.map { it.tag to it.usos }
        }
        runCatching {
            cumples = ApiClient.api<NotificacionesApi> { token }.cumples().cumples
        }
    }

    if (trending.isEmpty() && cumples.isEmpty()) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Superficie)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (trending.isNotEmpty()) {
            Text("🔥 Trending hoy", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = AgoraColors.Naranja)
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                trending.forEach { (tag, _) ->
                    Text(
                        "#$tag",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = AgoraColors.Naranja,
                        modifier = Modifier
                            // Área táctil de 48 dp sin agrandar la pastilla.
                            .minimumInteractiveComponentSize()
                            .clip(RoundedCornerShape(50))
                            .background(AgoraColors.NaranjaSuave)
                            .clickable(role = Role.Button) { onHashtagClick(tag) }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                }
            }
        }

        if (cumples.isNotEmpty()) {
            Text("🎂 Cumplen hoy", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = AgoraColors.Naranja)
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                cumples.forEach { c ->
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .clickable(onClickLabel = "Ver perfil de ${c.nombre}", role = Role.Button) {
                                onPerfilClick(c.handle)
                            }
                            .padding(4.dp),
                    ) {
                        CumpleAvatar(nombre = c.nombre)
                        Text(
                            c.nombre.split(" ").firstOrNull() ?: c.nombre,
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1,
                        )
                    }
                }
            }
            Text(
                "Mándale un mensaje, cuesta nada.",
                style = MaterialTheme.typography.labelSmall,
                color = AgoraColors.TextoMedio,
            )
        }
    }
}

@Composable
private fun CumpleAvatar(nombre: String) {
    val inicial = nombre.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(AgoraColors.NaranjaSuave),
        contentAlignment = Alignment.Center,
    ) {
        // Inicial decorativa: el nombre ya se lee abajo.
        Text(
            inicial,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
            fontSize = 18.sp,
            modifier = Modifier.clearAndSetSemantics {},
        )
    }
}
