package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.EventoEnVivoDto
import mx.agora.mobile.nativeapp.data.api.EventosApi
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/** Eventos en curso o que empiezan pronto — carril horizontal del feed. */
@Composable
fun EventosEnVivoBanner(
    tokenProvider: () -> String?,
    onEventoClick: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var eventos by remember { mutableStateOf<List<EventoEnVivoDto>>(emptyList()) }

    LaunchedEffect(Unit) {
        val token = tokenProvider() ?: return@LaunchedEffect
        runCatching {
            eventos = ApiClient.api<EventosApi> { token }.enVivo().eventos
        }
    }

    if (eventos.isEmpty()) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Superficie)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            "🔴 En vivo / pronto",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )
        Text(
            "Pasa por el campus antes de que se acabe el hype.",
            style = MaterialTheme.typography.labelSmall,
            color = AgoraColors.TextoMedio,
        )

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            eventos.forEach { evento ->
                EventoEnVivoCard(
                    evento = evento,
                    onClick = { onEventoClick(evento.id) },
                )
            }
        }
    }
}

@Composable
private fun EventoEnVivoCard(
    evento: EventoEnVivoDto,
    onClick: () -> Unit,
) {
    val badge = if (evento.enCurso) {
        "🔴 En vivo"
    } else {
        evento.empiezaEnMinutos?.let { min ->
            when {
                min <= 0 -> "⚡ Ahorita"
                min < 60 -> "⏱ En $min min"
                else -> "📅 En ${min / 60}h"
            }
        } ?: "⏳ Pronto"
    }

    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Fondo)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            badge,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = if (evento.enCurso) AgoraColors.Danger else AgoraColors.Naranja,
        )
        Text(
            evento.titulo,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            evento.lugar?.let { lugar ->
                Text(
                    "📍 $lugar",
                    style = MaterialTheme.typography.labelSmall,
                    color = AgoraColors.TextoMedio,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (evento.vanAIr > 0) {
                Text(
                    "👋 ${evento.vanAIr}",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = AgoraColors.Naranja,
                )
            }
        }
    }
}
