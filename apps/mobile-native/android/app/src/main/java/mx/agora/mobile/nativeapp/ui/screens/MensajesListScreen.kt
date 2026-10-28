package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.border
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.components.Terrazas
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ConversacionDto
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MensajesListScreen(
    tokenProvider: () -> String?,
    onConversacionClick: (String) -> Unit,
    onBuscar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var conversaciones by remember { mutableStateOf<List<ConversacionDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    /** Hay una carga en curso: el refresco automático no encima otra. */
    var ocupado by remember { mutableStateOf(false) }

    /**
     * [jalon]: la pidió el usuario jalando la lista (enseña la ruedita).
     * [silencioso]: el refresco automático; no enseña nada y, si falla, deja
     * la lista como estaba sin pintar error encima.
     */
    fun cargar(jalon: Boolean = false, silencioso: Boolean = false) {
        if (silencioso && ocupado) return
        scope.launch {
            ocupado = true
            when {
                jalon -> refrescando = true
                !silencioso && conversaciones.isEmpty() -> cargando = true
            }
            if (!silencioso) error = null
            try {
                conversaciones = ApiClient.api<MensajesApi>(tokenProvider).bandeja().conversaciones
                error = null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val mensaje = mensajeDe(e)
                if (!silencioso || conversaciones.isEmpty()) error = mensaje
                // Con la lista en pantalla el error no se pinta: se avisa.
                if (jalon && conversaciones.isNotEmpty()) {
                    Toast.makeText(context, mensaje, Toast.LENGTH_SHORT).show()
                }
            } finally {
                ocupado = false
                cargando = false
                refrescando = false
            }
        }
    }

    LaunchedEffect(Unit) {
        cargar()
        while (isActive) {
            delay(15_000)
            cargar(silencioso = true)
        }
    }

    AgoraPullToRefreshBox(
        isRefreshing = refrescando,
        onRefresh = { cargar(jalon = true) },
        modifier = modifier.fillMaxSize(),
    ) {
        when {
            cargando && conversaciones.isEmpty() -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            error != null && conversaciones.isEmpty() -> {
                AgoraEstadoDesplazable {
                    AgoraErrorState(
                        message = error!!,
                        onRetry = { cargar() },
                    )
                }
            }
            conversaciones.isEmpty() -> {
                AgoraEstadoDesplazable {
                    AgoraEmptyState(
                        state = AgoraCopy.emptyMensajes,
                        ctaLabel = AgoraCopy.cta.explorarDirectorio,
                        onCta = onBuscar,
                    )
                }
            }
            else -> {
                // B «Cholula» (WowB-Mensajes): «Sin leer» y «Antes» separados por terrazas.
                val sinLeer = conversaciones.filter { it.noLeidos > 0 }
                val antes = conversaciones.filter { it.noLeidos == 0 }
                LazyColumn(contentPadding = PaddingValues(bottom = 12.dp)) {
                    if (sinLeer.isNotEmpty()) {
                        item(key = "sin-leer") { DivisorMensajes("SIN LEER") }
                        items(sinLeer, key = { it.id }) { conv ->
                            ConversacionRow(conv, onClick = { onConversacionClick(conv.id) })
                        }
                    }
                    if (antes.isNotEmpty()) {
                        item(key = "antes") { DivisorMensajes(if (sinLeer.isEmpty()) "TUS CONVERSACIONES" else "ANTES") }
                        items(antes, key = { it.id }) { conv ->
                            ConversacionRow(conv, onClick = { onConversacionClick(conv.id) })
                        }
                    }
                }
            }
        }
    }
}

/** Divisor de la bandeja: terrazas naranjas y el texto en versalitas. */
@Composable
private fun DivisorMensajes(texto: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 4.dp)
            .semantics { heading() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Terrazas(AgoraColors.Naranja, Modifier.width(18.dp).height(10.dp), niveles = 2)
        Text(
            texto,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            color = AgoraColors.TextoMedio,
        )
    }
}

/**
 * Fila de la bandeja (WowB-Mensajes): avatar con aro naranja si hay nuevos, nombre, último texto
 * y la cuenta de no leídos en un cuadro `boton`. Sin tarjeta: filas sobre el fondo.
 */
@Composable
private fun ConversacionRow(conv: ConversacionDto, onClick: () -> Unit) {
    val nueva = conv.noLeidos > 0
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = "Abrir conversación", role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .border(2.dp, if (nueva) AgoraColors.Naranja else AgoraColors.Borde, CircleShape)
                .padding(4.dp),
            contentAlignment = Alignment.Center,
        ) {
            val foto = ApiClient.resolveUrl(conv.con?.fotoUrl)
            if (foto != null) {
                AsyncImage(
                    model = foto,
                    contentDescription = null,
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(AgoraColors.Superficie2),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(iniciales(conv.con?.nombre), fontWeight = FontWeight.Bold, color = AgoraColors.Texto)
                }
            }
        }

        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                conv.con?.nombre ?: "Alguien",
                fontSize = 15.sp,
                fontWeight = if (nueva) FontWeight.Bold else FontWeight.SemiBold,
                color = AgoraColors.Texto,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                buildString {
                    if (conv.mioElUltimo) append("Tú: ")
                    append(conv.ultimoTexto ?: "Sin mensajes")
                },
                fontSize = 14.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = if (nueva) AgoraColors.Texto else AgoraColors.TextoMedio,
            )
        }

        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(haceCuanto(conv.ultimoAt), fontSize = 12.sp, color = AgoraColors.TextoMedio)
            if (nueva) {
                Box(
                    modifier = Modifier
                        .heightIn(min = 20.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(AgoraColors.Boton)
                        .padding(horizontal = 6.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (conv.noLeidos > 9) "9+" else conv.noLeidos.toString(),
                        fontSize = 11.sp,
                        color = AgoraColors.SobreBoton,
                        fontWeight = FontWeight.Bold,
                        // Un número suelto no dice nada al lector; aquí va la cuenta real.
                        modifier = Modifier.semantics {
                            contentDescription = cuenta(conv.noLeidos, "mensaje sin leer", "mensajes sin leer")
                        },
                    )
                }
            }
        }
    }
}

private fun iniciales(nombre: String?): String =
    nombre
        ?.split(' ')
        ?.filter { it.isNotBlank() }
        ?.take(2)
        ?.mapNotNull { it.firstOrNull()?.uppercaseChar() }
        ?.joinToString("")
        ?: "?"
