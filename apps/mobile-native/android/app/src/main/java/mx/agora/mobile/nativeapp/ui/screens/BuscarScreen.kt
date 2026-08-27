package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.BuscarAnuncioDto
import mx.agora.mobile.nativeapp.data.api.BuscarEventoDto
import mx.agora.mobile.nativeapp.data.api.BuscarPersonaDto
import mx.agora.mobile.nativeapp.data.api.BuscarPublicacionDto
import mx.agora.mobile.nativeapp.data.api.BusquedaApi
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.formatearPrecio
import mx.agora.mobile.nativeapp.ui.util.haceCuanto

private data class TipoBusqueda(val valor: String, val etiqueta: String)

private val tipos = listOf(
    TipoBusqueda("todo", "Todo"),
    TipoBusqueda("personas", "Personas"),
    TipoBusqueda("publicaciones", "Posts"),
    TipoBusqueda("eventos", "Eventos"),
    TipoBusqueda("marketplace", "Market"),
)

@Composable
fun BuscarScreen(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
    onPerfil: (String) -> Unit = {},
    onPublicacion: (String) -> Unit = {},
    onEvento: (String) -> Unit = {},
    onAnuncio: (String) -> Unit = {},
) {
    var q by remember { mutableStateOf("") }
    var tipo by remember { mutableStateOf("todo") }
    var personas by remember { mutableStateOf<List<BuscarPersonaDto>>(emptyList()) }
    var publicaciones by remember { mutableStateOf<List<BuscarPublicacionDto>>(emptyList()) }
    var eventos by remember { mutableStateOf<List<BuscarEventoDto>>(emptyList()) }
    var anuncios by remember { mutableStateOf<List<BuscarAnuncioDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(false) }

    LaunchedEffect(q, tipo) {
        if (q.trim().length < 2) {
            personas = emptyList()
            publicaciones = emptyList()
            eventos = emptyList()
            anuncios = emptyList()
            return@LaunchedEffect
        }
        delay(300)
        cargando = true
        try {
            val datos = ApiClient.api<BusquedaApi>(tokenProvider).buscar(q.trim(), tipo)
            personas = datos.personas
            publicaciones = datos.publicaciones
            eventos = datos.eventos
            anuncios = datos.anuncios
        } catch (_: Exception) {
            personas = emptyList()
            publicaciones = emptyList()
            eventos = emptyList()
            anuncios = emptyList()
        } finally {
            cargando = false
        }
    }

    val vacio = q.trim().length >= 2 && !cargando &&
        personas.isEmpty() && publicaciones.isEmpty() && eventos.isEmpty() && anuncios.isEmpty()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        OutlinedTextField(
            value = q,
            onValueChange = { q = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Buscar personas, posts, eventos…") },
            singleLine = true,
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            tipos.forEach { t ->
                FilterChip(
                    selected = tipo == t.valor,
                    onClick = { tipo = t.valor },
                    label = { Text(t.etiqueta) },
                )
            }
        }

        if (cargando) {
            Box(Modifier.fillMaxWidth().padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        if (q.trim().length < 2 && !cargando) {
            AgoraEmptyState(
                state = AgoraCopy.emptyBuscarHints,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )
            Text(
                "Prueba con:",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = AgoraColors.TextoMedio,
                modifier = Modifier.padding(top = 8.dp),
            )
            AgoraCopy.buscarEjemplos.forEach { ejemplo ->
                Text(
                    "«$ejemplo»",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AgoraColors.Naranja,
                    modifier = Modifier.padding(vertical = 2.dp),
                )
            }
        }

        if (vacio) {
            AgoraEmptyState(
                state = AgoraCopy.emptyBuscar.copy(
                    subtitle = "No encontramos nada con «${q.trim()}». Prueba «${AgoraCopy.buscarEjemplos.first()}» o «${AgoraCopy.buscarEjemplos[1]}».",
                ),
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
        }

        if (personas.isNotEmpty()) {
            BloqueTitulo("Personas")
            personas.forEach { p ->
                FilaPersona(
                    iniciales = inicialesDe(p.nombre),
                    titulo = p.nombre,
                    subtitulo = "@${p.handle}${p.carrera?.let { " · $it" } ?: ""}",
                    onClick = { onPerfil(p.handle) },
                )
            }
        }

        if (publicaciones.isNotEmpty()) {
            BloqueTitulo("Publicaciones")
            publicaciones.forEach { p ->
                TarjetaResultado(
                    meta = "${p.autor?.nombre ?: "Alguien"} · ${p.comunidad} · ${haceCuanto(p.createdAt)}",
                    texto = p.texto,
                    onClick = { onPublicacion(p.id) },
                )
            }
        }

        if (eventos.isNotEmpty()) {
            BloqueTitulo("Eventos")
            eventos.forEach { ev ->
                TarjetaResultado(
                    titulo = ev.titulo,
                    meta = "${ev.lugar ?: ""} · ${formatearFecha(ev.inicioAt)}",
                    onClick = { onEvento(ev.id) },
                )
            }
        }

        if (anuncios.isNotEmpty()) {
            BloqueTitulo("Marketplace")
            anuncios.forEach { a ->
                TarjetaResultado(
                    titulo = a.titulo,
                    meta = "${formatearPrecio(a.precioMxn)} MXN",
                    onClick = { onAnuncio(a.id) },
                )
            }
        }
    }
}

@Composable
private fun BloqueTitulo(texto: String) {
    Text(
        texto,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = AgoraColors.TextoMedio,
    )
}

@Composable
private fun FilaPersona(
    iniciales: String,
    titulo: String,
    subtitulo: String,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(iniciales, fontWeight = FontWeight.Bold, color = AgoraColors.Naranja)
            }
            Column(Modifier.weight(1f)) {
                Text(titulo, fontWeight = FontWeight.Bold)
                Text(subtitulo, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
            }
        }
    }
}

@Composable
private fun TarjetaResultado(
    titulo: String? = null,
    meta: String,
    texto: String? = null,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
    ) {
        Column(Modifier.padding(12.dp)) {
            if (titulo != null) {
                Text(titulo, fontWeight = FontWeight.Bold)
            }
            Text(meta, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
            if (texto != null) {
                Text(texto, modifier = Modifier.padding(top = 6.dp), maxLines = 3)
            }
        }
    }
}

private fun inicialesDe(nombre: String): String =
    nombre.split(' ')
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }
        .joinToString("")
