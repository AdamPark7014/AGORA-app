package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.api.LeaderboardEntryDto
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

private val MEDALLAS = listOf("🥇", "🥈", "🥉")

/** Top rachas del campus — paridad con `leaderboard-rachas.tsx`. */
@Composable
fun LeaderboardRachasRow(
    tokenProvider: () -> String?,
    onPerfilClick: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var entradas by remember { mutableStateOf<List<LeaderboardEntryDto>>(emptyList()) }
    var miPosicion by remember { mutableStateOf<Int?>(null) }
    var ultimaPosicion by rememberSaveable { mutableIntStateOf(-1) }
    var pulse by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        val token = tokenProvider() ?: return@LaunchedEffect
        suspend fun cargar() {
            runCatching {
                val resp = ApiClient.api<GamificacionApi> { token }.leaderboard(limite = 5)
                entradas = resp.entradas
                val nuevaPosicion = resp.miPosicion
                if (nuevaPosicion != null && ultimaPosicion > 0 && nuevaPosicion < ultimaPosicion) {
                    pulse++
                }
                if (nuevaPosicion != null) {
                    ultimaPosicion = nuevaPosicion
                }
                miPosicion = nuevaPosicion
            }
        }
        cargar()
        GamificacionEvents.refresh.collect {
            cargar()
        }
    }

    if (entradas.isEmpty()) return

    val posicionScale by animateFloatAsState(
        targetValue = if (pulse > 0) 1.08f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "posicionPulse",
        finishedListener = { if (pulse > 0) pulse = 0 },
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Superficie)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "🔥 Top rachas del campus",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.Naranja,
            )
            miPosicion?.let { posicion ->
                Text(
                    "Tu posición: #$posicion",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = AgoraColors.Naranja,
                    modifier = Modifier
                        .scale(posicionScale)
                        .clip(RoundedCornerShape(50))
                        .background(AgoraColors.NaranjaSuave)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
        Text(
            "Los más constantes del momento — ¿te sumas mañana?",
            style = MaterialTheme.typography.labelSmall,
            color = AgoraColors.TextoMedio,
        )

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            entradas.forEachIndexed { index, entrada ->
                LeaderboardRachaCard(
                    entrada = entrada,
                    medalla = MEDALLAS.getOrElse(index) { "#${index + 1}" },
                    onClick = { onPerfilClick(entrada.handle) },
                )
            }
        }
    }
}

@Composable
private fun LeaderboardRachaCard(
    entrada: LeaderboardEntryDto,
    medalla: String,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Fondo)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(medalla, style = MaterialTheme.typography.labelSmall)
        LeaderboardAvatar(nombre = entrada.nombre)
        Text(
            entrada.nombre.split(" ").firstOrNull() ?: entrada.nombre,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            "🔥 ${entrada.rachaActual} ${if (entrada.rachaActual == 1) "día" else "días"}",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )
    }
}

@Composable
private fun LeaderboardAvatar(nombre: String) {
    val inicial = nombre.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(AgoraColors.NaranjaSuave),
        contentAlignment = Alignment.Center,
    ) {
        Text(inicial, fontWeight = FontWeight.Bold, color = AgoraColors.Naranja, fontSize = 16.sp)
    }
}
