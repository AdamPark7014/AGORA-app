package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.Bookmarks
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PersonSearch
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.TheaterComedy
import androidx.compose.material3.Badge
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import mx.agora.mobile.nativeapp.ui.components.AgoraPieLegal
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.cuenta

private data class EnlaceMas(
    val ruta: String,
    val icono: ImageVector,
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
            EnlaceMas("buscar", Icons.Outlined.Search, "Buscar", "Personas, publicaciones y más"),
            EnlaceMas("directorio", Icons.Outlined.PersonSearch, "Directorio", "Buscar gente por carrera"),
            EnlaceMas("guardados", Icons.Outlined.Bookmarks, "Guardados", "Publicaciones para ver después"),
        ),
    ),
    SeccionMas(
        titulo = "Campus",
        enlaces = listOf(
            EnlaceMas("marketplace", Icons.Outlined.Storefront, "Mercado", "Compra y vende en el campus"),
            EnlaceMas("aventones", Icons.Outlined.DirectionsCar, "Aventones", "Comparte coche a Cholula"),
            EnlaceMas("anonimo", Icons.Outlined.TheaterComedy, "Sin nombre", "Publicar sin firmar"),
        ),
    ),
    SeccionMas(
        titulo = "Tu cuenta",
        enlaces = listOf(
            EnlaceMas("notificaciones", Icons.Outlined.Notifications, "Avisos", "Todo tu historial"),
            EnlaceMas("mensajes", Icons.AutoMirrored.Outlined.Send, "Mensajes", "Tus conversaciones"),
            EnlaceMas("ajustes", Icons.Outlined.Settings, "Ajustes", "Tu perfil y privacidad"),
        ),
    ),
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MasScreen(
    auth: AuthRepository,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    onTerminos: () -> Unit = {},
    onPrivacidad: () -> Unit = {},
    modifier: Modifier = Modifier,
    onReglas: () -> Unit = {},
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
    // onLogout es asíncrono (corta en 8 s): si seguimos aquí después, se reactiva el botón.
    LaunchedEffect(cerrando) {
        if (cerrando) {
            delay(12_000)
            cerrando = false
        }
    }

    val seccionesVisibles = if (yo?.puedeModerar == true) {
        secciones + SeccionMas(
            titulo = "Equipo",
            enlaces = listOf(EnlaceMas("moderacion", Icons.Outlined.Shield, "Moderación", "Cola de reportes")),
        )
    } else {
        secciones
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // El título «Más» ya va en la barra de arriba.
        yo?.handle?.let { handle ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(AgoraCardShape)
                    .background(AgoraColors.Superficie)
                    .border(1.dp, AgoraColors.Borde, AgoraCardShape)
                    .clickable(role = Role.Button) { onNavigate("perfil-yo") }
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AgoraAvatar(nombre = yo?.nombre ?: handle, fotoUrl = yo?.fotoUrl, size = 56.dp)
                Column {
                    Text(yo?.nombre ?: "Tu perfil", fontWeight = FontWeight.Bold)
                    Text("@$handle", color = AgoraColors.TextoMedio)
                    Text(
                        "Ver mi perfil ›",
                        style = MaterialTheme.typography.labelMedium,
                        color = AgoraColors.NaranjaTinta,
                        modifier = Modifier
                            .padding(top = 2.dp)
                            .clearAndSetSemantics { contentDescription = "Ver mi perfil" },
                    )
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
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(AgoraCardShape)
                    .background(AgoraColors.Superficie)
                    .border(1.dp, AgoraColors.Borde, AgoraCardShape),
            ) {
                run {
                    seccion.enlaces.forEachIndexed { index, item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(role = Role.Button) { onNavigate(item.ruta) }
                                .padding(horizontal = 14.dp, vertical = 14.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            // Ícono y «›» son decorativos: TalkBack lee el título.
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(AgoraColors.NaranjaSuave),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(item.icono, contentDescription = null, tint = AgoraColors.NaranjaTinta, modifier = Modifier.size(20.dp))
                            }
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
                                Badge(
                                    modifier = Modifier.clearAndSetSemantics {
                                        contentDescription = cuenta(pendientes, "mensaje sin leer", "mensajes sin leer")
                                    },
                                ) { Text(if (pendientes > 99) "99+" else pendientes.toString()) }
                            }
                            Text("›", color = AgoraColors.TextMuted, modifier = Modifier.clearAndSetSemantics {})
                        }
                        if (index < seccion.enlaces.lastIndex) {
                            HorizontalDivider(color = AgoraColors.BordeSutil)
                        }
                    }
                }
            }
        }

        // TextButton trae el área táctil mínima de 48 dp; el texto suelto con
        // clickable medía lo que la letra (~20 dp) y costaba atinarle. FlowRow:
        // con las reglas, los tres enlaces no caben en una línea de 360 dp.
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
        ) {
            TextButton(
                onClick = onTerminos,
                modifier = Modifier.heightIn(min = 48.dp),
            ) {
                Text("Términos de uso", color = AgoraColors.NaranjaTinta)
            }
            Text(
                "·",
                color = AgoraColors.TextMuted,
                modifier = Modifier.align(Alignment.CenterVertically).clearAndSetSemantics {},
            )
            TextButton(
                onClick = onPrivacidad,
                modifier = Modifier.heightIn(min = 48.dp),
            ) {
                Text("Aviso de privacidad", color = AgoraColors.NaranjaTinta)
            }
            Text(
                "·",
                color = AgoraColors.TextMuted,
                modifier = Modifier.align(Alignment.CenterVertically).clearAndSetSemantics {},
            )
            TextButton(
                onClick = onReglas,
                modifier = Modifier.heightIn(min = 48.dp),
            ) {
                Text("Reglas de la comunidad", color = AgoraColors.NaranjaTinta)
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
