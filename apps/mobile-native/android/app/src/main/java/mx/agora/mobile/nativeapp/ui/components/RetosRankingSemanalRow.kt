package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.RetosApi
import mx.agora.mobile.nativeapp.data.api.RetosRankingSemanalEntradaDto
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

private val MEDALLAS = listOf("🥇", "🥈", "🥉")

/** Top victorias en duelos de la semana — paridad con `RetosRankingSemanalRow.swift`. */
@Composable
fun RetosRankingSemanalRow(
    tokenProvider: () -> String?,
    onPerfilClick: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var entradas by remember { mutableStateOf<List<RetosRankingSemanalEntradaDto>>(emptyList()) }

    LaunchedEffect(Unit) {
        val token = tokenProvider() ?: return@LaunchedEffect
        suspend fun cargar() {
            runCatching {
                val resp = ApiClient.api<RetosApi> { token }.rankingSemanal(limite = 5)
                entradas = resp.entradas
            }
        }
        cargar()
        GamificacionEvents.refresh.collect {
            cargar()
        }
    }

    if (entradas.isEmpty()) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Superficie)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            "🏆 Duelos de la semana",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )
        Text(
            "Los que van ganando sus duelos esta semana.",
            style = MaterialTheme.typography.labelSmall,
            color = AgoraColors.TextoMedio,
        )

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            entradas.forEachIndexed { index, entrada ->
                RankingSemanalCard(
                    entrada = entrada,
                    medalla = MEDALLAS.getOrElse(index) { "#${index + 1}" },
                    onClick = { onPerfilClick(entrada.handle) },
                )
            }
        }
    }
}

@Composable
private fun RankingSemanalCard(
    entrada: RetosRankingSemanalEntradaDto,
    medalla: String,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Fondo)
            .clickable(onClickLabel = "Ver perfil de ${entrada.nombre}", role = Role.Button, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(medalla, style = MaterialTheme.typography.labelSmall)
        RankingAvatar(nombre = entrada.nombre, fotoUrl = entrada.fotoUrl)
        Text(
            entrada.nombre.split(" ").firstOrNull() ?: entrada.nombre,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            "🏆 ${entrada.victorias} ${if (entrada.victorias == 1) "victoria" else "victorias"}",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )
    }
}

@Composable
private fun RankingAvatar(nombre: String, fotoUrl: String?) {
    val url = ApiClient.resolveUrl(fotoUrl)
    if (url != null) {
        AsyncImage(
            model = url,
            contentDescription = null,
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop,
        )
    } else {
        val inicial = nombre.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(AgoraColors.NaranjaSuave),
            contentAlignment = Alignment.Center,
        ) {
            // Inicial decorativa: el nombre ya se lee abajo.
            Text(
                inicial,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.Naranja,
                fontSize = 16.sp,
                modifier = Modifier.clearAndSetSemantics {},
            )
        }
    }
}
