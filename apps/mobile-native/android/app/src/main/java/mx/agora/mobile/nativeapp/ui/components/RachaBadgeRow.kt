package mx.agora.mobile.nativeapp.ui.components

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.api.ComparacionCampusDto
import mx.agora.mobile.nativeapp.data.api.GamificacionBadgeDto
import mx.agora.mobile.nativeapp.data.api.GamificacionDto
import mx.agora.mobile.nativeapp.data.gamificacion.BadgesCampus
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

fun textoCompartirRacha(rachaActual: Int): String =
    "Llevo 🔥 $rachaActual días seguidos en Ágora — ¿te sumas? https://udlagora.com"

fun compartirRacha(context: Context, rachaActual: Int) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, textoCompartirRacha(rachaActual))
    }
    context.startActivity(Intent.createChooser(intent, "Compartir racha"))
}

@Composable
fun RachaBadgeRow(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
    compact: Boolean = true,
) {
    var gamificacion by remember { mutableStateOf<GamificacionDto?>(null) }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        val token = tokenProvider() ?: return@LaunchedEffect
        suspend fun cargar() {
            runCatching {
                gamificacion = ApiClient.api<GamificacionApi> { token }.mio()
            }
        }
        cargar()
        GamificacionEvents.refresh.collect {
            cargar()
        }
    }

    val data = gamificacion ?: return
    if (data.rachaActual <= 0 && data.badges.isEmpty() && data.comparacionCampus == null &&
        (data.duelosGanados ?: 0) <= 0
    ) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Superficie)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (data.rachaActual > 0) {
                RachaChip(dias = data.rachaActual)
            }

            if (data.badges.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    data.badges.forEach { badge ->
                        BadgeEmoji(badge = badge, compact = compact)
                    }
                }
            }

            if (data.rachaActual >= 2) {
                IconButton(
                    onClick = { compartirRacha(context, data.rachaActual) },
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Compartir racha",
                        tint = AgoraColors.Naranja,
                    )
                }
            }
        }

        data.comparacionCampus?.let { comparacion ->
            ComparacionRachaChip(comparacion = comparacion)
        }

        (data.duelosGanados ?: 0).takeIf { it > 0 }?.let { ganados ->
            Text(
                "🏆 $ganados ${if (ganados == 1) "duelo ganando" else "duelos ganando"}",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.Naranja,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(AgoraColors.NaranjaSuave)
                    .padding(horizontal = 10.dp, vertical = 6.dp),
            )
        }
    }
}

@Composable
fun GamificacionProfileSection(
    gamificacion: GamificacionDto?,
    modifier: Modifier = Modifier,
) {
    val data = gamificacion ?: return
    if (data.rachaActual <= 0 && data.badges.isEmpty() && (data.duelosGanados ?: 0) <= 0) return
    val context = LocalContext.current

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ColumnSection {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (data.rachaActual > 0) {
                    RachaChip(dias = data.rachaActual)
                }
                if (data.rachaActual >= 2) {
                    IconButton(
                        onClick = { compartirRacha(context, data.rachaActual) },
                        modifier = Modifier.size(36.dp),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Compartir racha",
                            tint = AgoraColors.Naranja,
                        )
                    }
                }
            }
            if (data.rachaActual > 0 && data.rachaMaxima > data.rachaActual) {
                Text(
                    "Mejor: ${data.rachaMaxima} días",
                    style = MaterialTheme.typography.labelSmall,
                    color = AgoraColors.TextoMedio,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        if (data.badges.isNotEmpty()) {
            ColumnSection(modifier = Modifier.weight(1f)) {
                Text(
                    "Logros",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = AgoraColors.Naranja,
                    modifier = Modifier.padding(bottom = 6.dp),
                )
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    data.badges.forEach { badge ->
                        BadgeEmoji(badge = badge, compact = false)
                    }
                }
            }
        }
    }
}

/** Rachas e insignias públicas en perfil ajeno (solo lectura). */
@Composable
fun GamificacionPublicSection(
    gamificacion: GamificacionDto?,
    modifier: Modifier = Modifier,
) {
    val data = gamificacion ?: return
    if (data.rachaActual <= 0 && data.badges.isEmpty() && (data.duelosGanados ?: 0) <= 0) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AgoraColors.Superficie)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            "Racha",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = AgoraColors.Naranja,
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (data.rachaActual > 0) {
                RachaChip(dias = data.rachaActual)
            }

            if (data.badges.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    data.badges.forEach { badge ->
                        BadgeEmoji(badge = badge, compact = true)
                    }
                }
            }
        }

        (data.duelosGanados ?: 0).takeIf { it > 0 }?.let { ganados ->
            Text(
                "🏆 $ganados ${if (ganados == 1) "duelo ganando" else "duelos ganando"}",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.Naranja,
            )
        }
    }
}

@Composable
private fun ColumnSection(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier, content = { content() })
}

@Composable
private fun ComparacionRachaChip(comparacion: ComparacionCampusDto) {
    Text(
        "Tu racha vs campus: 🔥 ${comparacion.tuRacha} vs promedio ${comparacion.promedioRacha}",
        style = MaterialTheme.typography.labelSmall,
        fontWeight = if (comparacion.porEncimaDelPromedio) FontWeight.Bold else FontWeight.Normal,
        color = if (comparacion.porEncimaDelPromedio) AgoraColors.Naranja else AgoraColors.TextoMedio,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(AgoraColors.Fondo)
            .padding(horizontal = 10.dp, vertical = 6.dp),
    )
}

@Composable
private fun RachaChip(dias: Int) {
    Text(
        "🔥 $dias ${if (dias == 1) "día" else "días"}",
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Bold,
        color = AgoraColors.Naranja,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(AgoraColors.NaranjaSuave)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

@Composable
private fun BadgeEmoji(badge: GamificacionBadgeDto, compact: Boolean) {
    var mostrarInfo by remember { mutableStateOf(false) }
    val def = BadgesCampus.badge(badge.codigo)
    val etiqueta = def?.etiqueta ?: badge.etiqueta
    val subtitulo = def?.subtitulo.orEmpty()

    Text(
        text = badge.emoji,
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(AgoraColors.Fondo)
            .clickable { mostrarInfo = true }
            .padding(horizontal = if (compact) 8.dp else 10.dp, vertical = if (compact) 6.dp else 8.dp),
    )

    if (mostrarInfo) {
        AlertDialog(
            onDismissRequest = { mostrarInfo = false },
            title = { Text(etiqueta) },
            text = if (subtitulo.isNotEmpty()) {
                { Text(subtitulo) }
            } else {
                null
            },
            confirmButton = {
                TextButton(onClick = { mostrarInfo = false }) {
                    Text("OK")
                }
            },
        )
    }
}
