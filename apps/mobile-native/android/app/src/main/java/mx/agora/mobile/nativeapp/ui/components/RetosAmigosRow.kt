package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.RetoAmigoDto
import mx.agora.mobile.nativeapp.data.api.ResponderRetoRequest
import mx.agora.mobile.nativeapp.data.api.RetosApi
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/** Retos entre amigos — pendientes y duelos activos en el feed. */
@Composable
fun RetosAmigosRow(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
) {
    var pendientes by remember { mutableStateOf<List<RetoAmigoDto>>(emptyList()) }
    var activos by remember { mutableStateOf<List<RetoAmigoDto>>(emptyList()) }
    var respondiendo by remember { mutableStateOf<String?>(null) }
    var miHandle by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun cargar() {
        val token = tokenProvider() ?: return
        runCatching {
            val resp = ApiClient.api<RetosApi> { token }.activos()
            pendientes = resp.pendientes
            activos = resp.activos
        }
    }

    LaunchedEffect(Unit) {
        val token = tokenProvider() ?: return@LaunchedEffect
        runCatching {
            miHandle = ApiClient.api<PerfilApi> { token }.mio().handle
        }
        cargar()
        GamificacionEvents.refresh.collect {
            cargar()
        }
    }

    if (pendientes.isEmpty() && activos.isEmpty()) return

    fun responder(reto: RetoAmigoDto, aceptar: Boolean) {
        scope.launch {
            val token = tokenProvider() ?: return@launch
            respondiendo = reto.id
            runCatching {
                ApiClient.api<RetosApi> { token }.responder(reto.id, ResponderRetoRequest(aceptar))
                cargar()
            }
            respondiendo = null
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Superficie)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            "⚔️ Retos con amigos",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )
        Text(
            "Acepta el reto o quédate viendo cómo te ganan.",
            style = MaterialTheme.typography.labelSmall,
            color = AgoraColors.TextoMedio,
        )

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            pendientes.forEach { reto ->
                RetoPendienteCard(
                    reto = reto,
                    cargando = respondiendo == reto.id,
                    onAceptar = { responder(reto, true) },
                    onRechazar = { responder(reto, false) },
                )
            }
            activos.forEach { reto ->
                RetoActivoCard(
                    reto = reto,
                    miHandle = miHandle,
                )
            }
        }
    }
}

@Composable
private fun RetoPendienteCard(
    reto: RetoAmigoDto,
    cargando: Boolean,
    onAceptar: () -> Unit,
    onRechazar: () -> Unit,
) {
    val tipoLabel = when (reto.tipo) {
        "RACHA" -> "🔥 racha diaria"
        "SEMANA_PREGUNTA" -> "🧠 semana de preguntas"
        // Nunca el código crudo de la API.
        else -> "un reto"
    }

    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Fondo)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            "Te retaron",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )
        Text(
            "@${reto.retador.handle} te desafía a $tipoLabel",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = onAceptar,
                enabled = !cargando,
                colors = ButtonDefaults.buttonColors(containerColor = AgoraColors.Naranja),
                shape = RoundedCornerShape(50),
                // «¡Va!» y «Nel» solos no dicen qué hacen con TalkBack.
                modifier = Modifier
                    .weight(1f)
                    .semantics { contentDescription = "Aceptar reto de @${reto.retador.handle}" },
            ) {
                Text("¡Va!", style = MaterialTheme.typography.labelSmall)
            }
            OutlinedButton(
                onClick = onRechazar,
                enabled = !cargando,
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .weight(1f)
                    .semantics { contentDescription = "Rechazar reto de @${reto.retador.handle}" },
            ) {
                Text("Nel", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun RetoActivoCard(
    reto: RetoAmigoDto,
    miHandle: String?,
) {
    val soyRetador = miHandle != null && reto.retador.handle == miHandle
    val rival = if (soyRetador) reto.retado else reto.retador
    val miPuntaje = if (soyRetador) reto.puntajeRetador else reto.puntajeRetado
    val suPuntaje = if (soyRetador) reto.puntajeRetado else reto.puntajeRetador

    val tipoLabel = when (reto.tipo) {
        "RACHA" -> "🔥 Racha"
        "SEMANA_PREGUNTA" -> "🧠 Preguntas"
        else -> "Reto"
    }

    val estadoEmoji = when (reto.ganando) {
        "retador" -> if (soyRetador) "😎" else "😬"
        "retado" -> if (soyRetador) "😬" else "😎"
        "empate" -> "🤝"
        else -> "⚔️"
    }

    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Fondo)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            "$tipoLabel $estadoEmoji",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )
        Text(
            "Tú $miPuntaje vs @${rival.handle} $suPuntaje",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            when (reto.ganando) {
                "retador" -> if (soyRetador) "Vas ganando, no te confíes" else "Te están ganando, despierta"
                "retado" -> if (soyRetador) "Te están ganando, despierta" else "Vas ganando, no te confíes"
                "empate" -> "Empate técnico — drama puro"
                else -> "Duelo en curso"
            },
            style = MaterialTheme.typography.labelSmall,
            color = AgoraColors.TextoMedio,
        )
    }
}
