package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Badge
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.ui.components.AgoraPieLegal
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

private data class EnlaceMas(
    val ruta: String,
    val emoji: String,
    val titulo: String,
    val nota: String,
)

private data class SeccionMas(
    val titulo: String,
    val enlaces: List<EnlaceMas>,
)

private val secciones = listOf(
    SeccionMas(
        titulo = "Descubre",
        enlaces = listOf(
            EnlaceMas("buscar", "🔍", "Buscar", "Personas, posts y más"),
            EnlaceMas("directorio", "📇", "Directorio", "Buscar gente por carrera"),
            EnlaceMas("guardados", "🔖", "Guardados", "Posts para ver después"),
        ),
    ),
    SeccionMas(
        titulo = "Campus",
        enlaces = listOf(
            EnlaceMas("marketplace", "🛍", "Marketplace", "Compra y vende en campus"),
            EnlaceMas("aventones", "🚗", "Aventones", "Comparte coche a Cholula"),
            EnlaceMas("anonimo", "🎭", "Sin nombre", "Publicar sin firmar"),
        ),
    ),
    SeccionMas(
        titulo = "Tu cuenta",
        enlaces = listOf(
            EnlaceMas("notificaciones", "🔔", "Notificaciones", "Todo tu historial"),
            EnlaceMas("mensajes", "✉️", "Mensajes", "Tus conversaciones"),
            EnlaceMas("ajustes", "⚙️", "Ajustes", "Tu perfil y privacidad"),
        ),
    ),
)

@Composable
fun MasScreen(
    auth: AuthRepository,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    onTerminos: () -> Unit = {},
    onPrivacidad: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var yo by remember { mutableStateOf<YoResponse?>(null) }
    var mensajesSinLeer by remember { mutableIntStateOf(0) }
    var cerrando by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        yo = YoCache.obtener { auth.token() }
    }
    LaunchedEffect(Unit) {
        mensajesSinLeer = runCatching {
            ApiClient.api<MensajesApi> { auth.token() }.noLeidos().total
        }.getOrDefault(0)
    }

    val seccionesVisibles = if (yo?.puedeModerar == true) {
        secciones + SeccionMas(
            titulo = "Equipo",
            enlaces = listOf(EnlaceMas("moderacion", "🛡️", "Moderación", "Cola de reportes")),
        )
    } else {
        secciones
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Más", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)

        yo?.handle?.let { handle ->
            Card(
                onClick = { onNavigate("perfil-yo") },
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = AgoraColors.SurfaceElevated),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .border(2.5.dp, AgoraColors.Naranja, CircleShape)
                            .padding(3.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                iniciales(yo?.nombre ?: handle),
                                fontWeight = FontWeight.Bold,
                                color = AgoraColors.Naranja,
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }
                    }
                    Column {
                        Text(yo?.nombre ?: "Tu perfil", fontWeight = FontWeight.Bold)
                        Text("@$handle", color = AgoraColors.TextoMedio)
                        Text(
                            "Ver mi perfil ›",
                            style = MaterialTheme.typography.labelMedium,
                            color = AgoraColors.Naranja,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                }
            }
        }

        seccionesVisibles.forEach { seccion ->
            Text(
                seccion.titulo,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = AgoraColors.TextoMedio,
                modifier = Modifier.padding(start = 4.dp, bottom = 2.dp),
            )
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            ) {
                Column {
                    seccion.enlaces.forEachIndexed { index, item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onNavigate(item.ruta) }
                                .padding(horizontal = 14.dp, vertical = 14.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(item.emoji)
                            Column(Modifier.weight(1f)) {
                                Text(item.titulo, fontWeight = FontWeight.SemiBold)
                                Text(
                                    item.nota,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AgoraColors.TextoMedio,
                                )
                            }
                            val pendientes = if (item.ruta == "mensajes") mensajesSinLeer else 0
                            if (pendientes > 0) {
                                Badge { Text(if (pendientes > 99) "99+" else pendientes.toString()) }
                            }
                            Text("›", color = AgoraColors.TextMuted)
                        }
                        if (index < seccion.enlaces.lastIndex) {
                            HorizontalDivider(color = AgoraColors.BordeSutil)
                        }
                    }
                }
            }
        }

        // TextButton trae el área táctil mínima de 48 dp; el texto suelto con
        // clickable medía lo que la letra (~20 dp) y costaba atinarle.
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(
                onClick = onTerminos,
                modifier = Modifier.heightIn(min = 48.dp),
            ) {
                Text("Términos", color = AgoraColors.Naranja)
            }
            Text("·", color = AgoraColors.TextMuted)
            TextButton(
                onClick = onPrivacidad,
                modifier = Modifier.heightIn(min = 48.dp),
            ) {
                Text("Privacidad", color = AgoraColors.Naranja)
            }
        }

        OutlinedButton(
            onClick = {
                cerrando = true
                onLogout()
            },
            enabled = !cerrando,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                if (cerrando) "Cerrando sesión…" else "Cerrar sesión",
                color = MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Bold,
            )
        }

        AgoraPieLegal(modifier = Modifier.padding(top = 8.dp, bottom = 8.dp))
    }
}

private fun iniciales(nombre: String): String =
    nombre.split(' ')
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }
        .joinToString("")
