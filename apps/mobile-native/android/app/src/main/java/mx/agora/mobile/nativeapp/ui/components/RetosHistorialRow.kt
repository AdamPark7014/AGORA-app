package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.RetosApi
import mx.agora.mobile.nativeapp.data.api.RetosHistorialResponse
import mx.agora.mobile.nativeapp.data.api.RetoHistorialDto
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

private fun etiquetaResultado(resultado: String?): String = when (resultado) {
    "ganaste" -> "🏆 Ganaste"
    "perdiste" -> "😬 Perdiste"
    "empate" -> "🤝 Empate"
    "rechazado" -> "🚫 Rechazado"
    else -> "Duelo"
}

private fun etiquetaTipo(tipo: String): String = when (tipo) {
    "RACHA" -> "🔥 Racha"
    else -> "🧠 Preguntas"
}

/** Historial de duelos rechazados o de semanas pasadas — paridad con web `/retos`. */
@Composable
fun RetosHistorialRow(
    tokenProvider: () -> String?,
    onPerfilClick: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var items by remember { mutableStateOf<List<RetoHistorialDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(false) }
    var miHandle by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun cargar(reset: Boolean) {
        val token = tokenProvider() ?: return
        cargando = true
        runCatching {
            if (miHandle == null) {
                miHandle = ApiClient.api<PerfilApi> { token }.mio().handle
            }
            val resp: RetosHistorialResponse = ApiClient.api<RetosApi> { token }.historial(
                cursor = if (reset) null else cursor,
                limite = 8,
            )
            items = if (reset) resp.items else items + resp.items
            cursor = resp.siguienteCursor
        }
        cargando = false
    }

    LaunchedEffect(Unit) {
        cargar(reset = true)
        GamificacionEvents.refresh.collect {
            cursor = null
            cargar(reset = true)
        }
    }

    if (items.isEmpty()) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Superficie)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            "📜 Historial de duelos",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )
        Text(
            "Retos rechazados y duelos de semanas pasadas.",
            style = MaterialTheme.typography.labelSmall,
            color = AgoraColors.TextoMedio,
        )

        items.forEach { reto ->
            val rival = if (miHandle != null && reto.retador.handle == miHandle) reto.retado else reto.retador
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(AgoraColors.Fondo)
                    .clickable(onClickLabel = "Ver perfil de ${rival.nombre}", role = Role.Button) {
                        onPerfilClick(rival.handle)
                    }
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    etiquetaTipo(reto.tipo),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = AgoraColors.Naranja,
                )
                Text(
                    "@${rival.handle}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    etiquetaResultado(reto.resultado),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        if (!cursor.isNullOrBlank()) {
            TextButton(
                onClick = {
                    if (!cargando) {
                        scope.launch { cargar(reset = false) }
                    }
                },
                enabled = !cargando,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (cargando) "Cargando…" else "Ver más")
            }
        }
    }
}
