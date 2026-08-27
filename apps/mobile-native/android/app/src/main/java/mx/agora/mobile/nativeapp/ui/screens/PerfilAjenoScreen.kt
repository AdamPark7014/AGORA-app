package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.AbrirConversacionRequest
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.BloquearRequest
import mx.agora.mobile.nativeapp.data.api.BloqueosApi
import mx.agora.mobile.nativeapp.data.api.CrearRetoRequest
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.api.GamificacionDto
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.PerfilAjenoDto
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PerfilPublicacionDto
import mx.agora.mobile.nativeapp.data.api.RetosApi
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.GamificacionPublicSection
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PerfilAjenoScreen(
    handle: String,
    tokenProvider: () -> String?,
    miHandle: String?,
    onBack: () -> Unit,
    onMensaje: (String) -> Unit,
    onAjustes: () -> Unit,
) {
    var perfil by remember { mutableStateOf<PerfilAjenoDto?>(null) }
    var gamificacion by remember { mutableStateOf<GamificacionDto?>(null) }
    var publicaciones by remember { mutableStateOf<List<PerfilPublicacionDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var siguiendo by remember { mutableStateOf(false) }
    var bloqueado by remember { mutableStateOf(false) }
    var cargando by remember { mutableStateOf(true) }
    var ocupado by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var puedeRetar by remember { mutableStateOf(false) }
    var mostrarDialogRetar by remember { mutableStateOf(false) }
    var enviandoReto by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun cargar() {
        scope.launch {
            cargando = true
            error = null
            try {
                val api = ApiClient.api<PerfilApi>(tokenProvider)
                val datos = api.porHandle(handle)
                perfil = datos
                siguiendo = datos.yoLeSigo
                if (miHandle != null && miHandle != handle) {
                    bloqueado = ApiClient.api<BloqueosApi>(tokenProvider).estado(handle).bloqueado
                }
                if (!datos.restringido) {
                    val p = api.publicaciones(handle)
                    publicaciones = p.publicaciones
                    cursor = p.siguienteCursor
                } else {
                    publicaciones = emptyList()
                    cursor = null
                }
                runCatching {
                    gamificacion = ApiClient.api<GamificacionApi>(tokenProvider).porHandle(handle)
                }
                if (miHandle != null && miHandle != handle && !datos.restringido) {
                    puedeRetar = runCatching {
                        ApiClient.api<RetosApi>(tokenProvider).puede(handle).puedeRetar
                    }.getOrDefault(false)
                } else {
                    puedeRetar = false
                }
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
            }
        }
    }

    LaunchedEffect(handle) { cargar() }

    fun alternarSeguir() {
        scope.launch {
            ocupado = true
            val era = siguiendo
            siguiendo = !era
            try {
                val resp = ApiClient.api<PerfilApi>(tokenProvider).seguir(handle)
                siguiendo = resp.siguiendo
            } catch (_: Exception) {
                siguiendo = era
            } finally {
                ocupado = false
            }
        }
    }

    fun alternarBloqueo() {
        scope.launch {
            ocupado = true
            error = null
            try {
                val api = ApiClient.api<BloqueosApi>(tokenProvider)
                if (bloqueado) {
                    api.quitar(handle)
                    bloqueado = false
                } else {
                    val resp = api.aplicar(handle, BloquearRequest(soloSilencio = false))
                    bloqueado = resp.bloqueado
                }
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                ocupado = false
            }
        }
    }

    fun escribir() {
        scope.launch {
            ocupado = true
            error = null
            try {
                val resp = ApiClient.api<MensajesApi>(tokenProvider)
                    .abrir(AbrirConversacionRequest(handle))
                onMensaje(resp.id)
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                ocupado = false
            }
        }
    }

    fun cargarMas() {
        val c = cursor ?: return
        scope.launch {
            try {
                val p = ApiClient.api<PerfilApi>(tokenProvider).publicaciones(handle, cursor = c)
                publicaciones = publicaciones + p.publicaciones
                cursor = p.siguienteCursor
            } catch (_: Exception) {
                // Silencioso.
            }
        }
    }

    fun enviarReto(tipo: String) {
        scope.launch {
            enviandoReto = true
            error = null
            try {
                ApiClient.api<RetosApi>(tokenProvider).crear(
                    CrearRetoRequest(retadoHandle = handle, tipo = tipo),
                )
                mostrarDialogRetar = false
                puedeRetar = false
                snackbarHostState.showSnackbar("Reto enviado. A ver si le entra.")
                GamificacionEvents.notifyPingResult(emptyList())
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                enviandoReto = false
            }
        }
    }

    if (mostrarDialogRetar) {
        AlertDialog(
            onDismissRequest = {
                if (!enviandoReto) mostrarDialogRetar = false
            },
            title = { Text("Retar a @$handle") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("¿A qué le entramos?")
                    OutlinedButton(
                        onClick = { enviarReto("RACHA") },
                        enabled = !enviandoReto,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(vertical = 4.dp)) {
                            Text("🔥 Racha diaria", fontWeight = FontWeight.Bold)
                            Text(
                                "Quien mantenga más días seguidos gana.",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = { enviarReto("SEMANA_PREGUNTA") },
                        enabled = !enviandoReto,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(vertical = 4.dp)) {
                            Text("🧠 Semana de preguntas", fontWeight = FontWeight.Bold)
                            Text(
                                "Quien responda más preguntas del día gana.",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                            )
                        }
                    }
                    if (enviandoReto) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(
                    onClick = { mostrarDialogRetar = false },
                    enabled = !enviandoReto,
                ) {
                    Text("Cancelar")
                }
            },
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("@$handle") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
            )
        },
    ) { padding ->
        when {
            cargando -> {
                Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            error != null || perfil == null -> {
                AgoraErrorState(
                    message = error ?: AgoraCopy.errors.notFound,
                    modifier = Modifier.fillMaxSize().padding(padding),
                    onRetry = onBack,
                    retryLabel = "Volver",
                )
            }
            else -> {
                val p = perfil!!
                val esMio = miHandle == handle
                val nombreCompleto = "${p.nombre} ${p.apellidos}".trim()

                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                val foto = ApiClient.resolveUrl(p.fotoUrl)
                                if (foto != null) {
                                    AsyncImage(
                                        model = foto,
                                        contentDescription = null,
                                        modifier = Modifier.size(76.dp).clip(CircleShape),
                                        contentScale = ContentScale.Crop,
                                    )
                                } else {
                                    Box(
                                        modifier = Modifier
                                            .size(76.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.primaryContainer),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            nombreCompleto.split(' ').take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString(""),
                                            style = MaterialTheme.typography.headlineSmall,
                                            fontWeight = FontWeight.Bold,
                                        )
                                    }
                                }

                                Text(
                                    buildString {
                                        append(nombreCompleto)
                                        if (p.verificado) append(" ✓")
                                    },
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text("@${p.handle}", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                p.bio?.takeIf { it.isNotBlank() }?.let {
                                    Text(it, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
                                }
                                if (!p.carrera.isNullOrBlank()) {
                                    Text(
                                        "${p.escuela ?: ""} · ${p.carrera}".trim(' ', '·'),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                                    )
                                }
                                p.ciudadOrigen?.let {
                                    Text("📍 $it", style = MaterialTheme.typography.bodySmall)
                                }
                                p.instagram?.let {
                                    Text("📷 @$it", style = MaterialTheme.typography.bodySmall)
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    Text("${p.publicaciones ?: 0} posts", style = MaterialTheme.typography.bodySmall)
                                    Text("${p.seguidores ?: 0} seguidores", style = MaterialTheme.typography.bodySmall)
                                    Text("${p.siguiendo ?: 0} siguiendo", style = MaterialTheme.typography.bodySmall)
                                }

                                GamificacionPublicSection(
                                    gamificacion = gamificacion,
                                    modifier = Modifier.padding(top = 8.dp),
                                )

                                when {
                                    p.restringido -> {
                                        Text(
                                            "Este perfil es privado o no compartís comunidades.",
                                            textAlign = TextAlign.Center,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                                            modifier = Modifier.padding(top = 8.dp),
                                        )
                                    }
                                    esMio -> {
                                        OutlinedButton(onClick = onAjustes, modifier = Modifier.padding(top = 8.dp)) {
                                            Text("Editar perfil")
                                        }
                                    }
                                    else -> {
                                        Row(
                                            modifier = Modifier.padding(top = 8.dp),
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        ) {
                                            Button(
                                                onClick = { alternarSeguir() },
                                                enabled = !ocupado && !bloqueado,
                                            ) {
                                                Text(if (siguiendo) "✓ Siguiendo" else "＋ Seguir")
                                            }
                                            OutlinedButton(
                                                onClick = { escribir() },
                                                enabled = !ocupado && !bloqueado,
                                            ) {
                                                Text("Escribirle")
                                            }
                                            if (puedeRetar) {
                                                OutlinedButton(
                                                    onClick = { mostrarDialogRetar = true },
                                                    enabled = !ocupado && !enviandoReto && !bloqueado,
                                                ) {
                                                    Text("Retar 🔥")
                                                }
                                            }
                                        }
                                        OutlinedButton(
                                            onClick = { alternarBloqueo() },
                                            enabled = !ocupado,
                                            modifier = Modifier.padding(top = 8.dp),
                                        ) {
                                            Text(if (bloqueado) "Desbloquear" else "Bloquear")
                                        }
                                    }
                                }

                                if (p.intereses.isNotEmpty()) {
                                    FlowRow(
                                        modifier = Modifier.padding(top = 8.dp),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        p.intereses.forEach { interes ->
                                            Box(
                                                modifier = Modifier
                                                    .background(
                                                        MaterialTheme.colorScheme.surfaceVariant,
                                                        CircleShape,
                                                    )
                                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                            ) {
                                                Text(interes, style = MaterialTheme.typography.bodySmall)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (!p.restringido) {
                        item {
                            Text(
                                "Publicaciones",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 4.dp, bottom = 4.dp),
                            )
                        }

                        if (publicaciones.isEmpty()) {
                            item {
                                AgoraEmptyState(
                                    state = AgoraCopy.emptyPerfilPublicaciones,
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                        }

                        items(publicaciones, key = { it.id }) { pub ->
                            PublicacionCard(pub)
                        }

                        if (cursor != null) {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    OutlinedButton(onClick = { cargarMas() }) {
                                        Text("Cargar más")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PublicacionCard(pub: PerfilPublicacionDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                "${haceCuanto(pub.createdAt)} · ${pub.comunidad}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
            Text(
                pub.texto,
                modifier = Modifier.padding(top = 6.dp),
                maxLines = 4,
            )
            Text(
                "${pub.numReactions} reacciones · ${pub.numComments} comentarios",
                modifier = Modifier.padding(top = 8.dp),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
