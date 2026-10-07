package mx.agora.mobile.nativeapp.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.MediaRepository
import mx.agora.mobile.nativeapp.data.api.ActualizarPerfilRequest
import mx.agora.mobile.nativeapp.data.api.ActualizarPreferenciasRequest
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.CuentaApi
import mx.agora.mobile.nativeapp.data.api.EliminarCuentaRequest
import mx.agora.mobile.nativeapp.data.api.NotificacionesApi
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PreferenciaNotificacionDto
import mx.agora.mobile.nativeapp.data.api.SilenciarComunidadRequest
import mx.agora.mobile.nativeapp.ui.components.SubScreenScaffold
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import retrofit2.HttpException

private val etiquetasPreferencia = mapOf(
    "COMENTARIO" to "Comentarios",
    "REACCION" to "Reacciones",
    "MENSAJE" to "Mensajes",
    "EVENTO_NUEVO" to "Eventos nuevos",
    "AVENTON_APARTADO" to "Aventones",
    "MODERACION" to "Moderación",
    "MENCION" to "Menciones",
    "SEGUIDOR" to "Nuevos seguidores",
    "INSIGNIA" to "Insignias",
    "RETO" to "Retos y duelos",
)

@Composable
fun AjustesScreen(
    auth: AuthRepository,
    modifier: Modifier = Modifier,
    onCuentaEliminada: () -> Unit = {},
) {
    AjustesScreenContent(
        tokenProvider = { auth.token() },
        modifier = modifier,
        onCuentaEliminada = onCuentaEliminada,
    )
}

@Composable
fun AjustesScreen(
    tokenProvider: () -> String?,
    onBack: () -> Unit,
) {
    SubScreenScaffold(title = "Ajustes", onBack = onBack) { padding ->
        AjustesScreenContent(tokenProvider = tokenProvider, modifier = Modifier.padding(padding))
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AjustesScreenContent(
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
    onCuentaEliminada: () -> Unit = {},
) {
    val context = LocalContext.current
    val mediaRepo = remember { MediaRepository(context) }
    val scope = rememberCoroutineScope()

    var handle by remember { mutableStateOf("") }
    var nombre by remember { mutableStateOf("") }
    var apellidos by remember { mutableStateOf("") }
    var generacion by remember { mutableStateOf<Int?>(null) }
    var bio by remember { mutableStateOf("") }
    var ciudad by remember { mutableStateOf("") }
    var instagram by remember { mutableStateOf("") }
    var busco by remember { mutableStateOf("") }
    var intereses by remember { mutableStateOf<List<String>>(emptyList()) }
    var nuevoInteres by remember { mutableStateOf("") }
    var visibilidad by remember { mutableStateOf("UNIVERSIDAD") }
    var comunidades by remember { mutableStateOf<List<ComunidadDto>>(emptyList()) }
    var fotoUrl by remember { mutableStateOf<String?>(null) }
    var preferencias by remember { mutableStateOf<List<PreferenciaNotificacionDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(true) }
    var guardando by remember { mutableStateOf(false) }
    var subiendoFoto by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var aviso by remember { mutableStateOf<String?>(null) }

    val picker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            subiendoFoto = true
            error = null
            try {
                val media = mediaRepo.subir(uri, tokenProvider)
                ApiClient.api<PerfilApi>(tokenProvider)
                    .actualizar(ActualizarPerfilRequest(fotoMediaId = media.id))
                fotoUrl = media.url
                aviso = "Foto actualizada."
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                subiendoFoto = false
            }
        }
    }

    LaunchedEffect(Unit) {
        cargando = true
        error = null
        try {
            val api = ApiClient.api<PerfilApi>(tokenProvider)
            val perfil = api.mio()
            handle = perfil.handle
            nombre = perfil.nombre
            apellidos = perfil.apellidos
            bio = perfil.bio.orEmpty()
            ciudad = perfil.ciudadOrigen.orEmpty()
            instagram = perfil.instagram.orEmpty()
            busco = perfil.busco.orEmpty()
            intereses = perfil.intereses
            visibilidad = perfil.visibilidad ?: "UNIVERSIDAD"
            fotoUrl = perfil.fotoUrl
            comunidades = api.misComunidades()
            preferencias = ApiClient.api<NotificacionesApi>(tokenProvider).preferencias().preferencias
            generacion = api.porHandle(perfil.handle).generacion
        } catch (e: Exception) {
            error = mensajeDe(e)
        } finally {
            cargando = false
        }
    }

    fun guardar() {
        scope.launch {
            guardando = true
            error = null
            aviso = null
            try {
                ApiClient.api<PerfilApi>(tokenProvider).actualizar(
                    ActualizarPerfilRequest(
                        bio = bio.trim(),
                        ciudadOrigen = ciudad.trim().ifBlank { null },
                        instagram = instagram.trim().removePrefix("@").ifBlank { null },
                        busco = busco.trim().ifBlank { null },
                        intereses = intereses,
                        visibilidad = visibilidad,
                    ),
                )
                aviso = "Cambios guardados."
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                guardando = false
            }
        }
    }

    fun guardarPreferencias(nuevas: List<PreferenciaNotificacionDto>) {
        preferencias = nuevas
        scope.launch {
            try {
                preferencias = ApiClient.api<NotificacionesApi>(tokenProvider)
                    .actualizarPreferencias(ActualizarPreferenciasRequest(nuevas))
                    .preferencias
            } catch (e: Exception) {
                error = mensajeDe(e)
            }
        }
    }

    fun alternarSilencio(slug: String, silenciada: Boolean) {
        scope.launch {
            try {
                ApiClient.api<PerfilApi>(tokenProvider)
                    .silenciarComunidad(slug, SilenciarComunidadRequest(silenciada))
                comunidades = comunidades.map {
                    if (it.slug == slug) it.copy(silenciada = silenciada) else it
                }
            } catch (e: Exception) {
                error = mensajeDe(e)
            }
        }
    }

    fun agregarInteres() {
        val limpio = nuevoInteres.trim()
        if (limpio.isBlank() || intereses.size >= 10) return
        if (intereses.any { it.equals(limpio, ignoreCase = true) }) {
            nuevoInteres = ""
            return
        }
        intereses = intereses + limpio
        nuevoInteres = ""
    }

    Box(modifier = modifier.fillMaxSize()) {
        when {
            cargando -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text("@$handle", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)

                    Text("Foto de perfil", style = MaterialTheme.typography.labelLarge)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        val foto = ApiClient.resolveUrl(fotoUrl)
                        if (foto != null) {
                            AsyncImage(
                                model = foto,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(CircleShape),
                                contentScale = ContentScale.Crop,
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("?", style = MaterialTheme.typography.headlineSmall)
                            }
                        }
                        OutlinedButton(
                            onClick = {
                                picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            },
                            enabled = !subiendoFoto,
                        ) {
                            Text(if (subiendoFoto) "Subiendo…" else "Cambiar foto")
                        }
                    }

                    OutlinedTextField(
                        value = nombre,
                        onValueChange = {},
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Nombre") },
                        readOnly = true,
                        enabled = false,
                    )
                    OutlinedTextField(
                        value = apellidos,
                        onValueChange = {},
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Apellidos") },
                        readOnly = true,
                        enabled = false,
                    )
                    generacion?.let {
                        OutlinedTextField(
                            value = "Generación $it",
                            onValueChange = {},
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Generación") },
                            readOnly = true,
                            enabled = false,
                        )
                    }

                    Text("Bio", style = MaterialTheme.typography.labelLarge)
                    OutlinedTextField(
                        value = bio,
                        onValueChange = { if (it.length <= 280) bio = it },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        placeholder = { Text("Cuéntanos algo sobre ti") },
                    )
                    Text(
                        "${bio.length}/280",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(0.5f),
                    )

                    OutlinedTextField(
                        value = ciudad,
                        onValueChange = { ciudad = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Ciudad de origen") },
                    )
                    OutlinedTextField(
                        value = instagram,
                        onValueChange = { instagram = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Instagram (sin @)") },
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = busco,
                        onValueChange = { if (it.length <= 120) busco = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("¿Qué buscas en Ágora?") },
                    )

                    Text("Intereses", style = MaterialTheme.typography.labelLarge)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        intereses.forEach { interes ->
                            FilterChip(
                                selected = true,
                                onClick = { intereses = intereses.filter { it != interes } },
                                label = { Text("$interes ×") },
                            )
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedTextField(
                            value = nuevoInteres,
                            onValueChange = { nuevoInteres = it },
                            modifier = Modifier.weight(1f),
                            label = { Text("Agregar interés") },
                            singleLine = true,
                        )
                        Button(onClick = { agregarInteres() }) {
                            Text("+")
                        }
                    }

                    Text("Quién ve tu perfil", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = visibilidad == "UNIVERSIDAD",
                            onClick = { visibilidad = "UNIVERSIDAD" },
                            label = { Text("Toda la UDLAP") },
                        )
                        FilterChip(
                            selected = visibilidad == "COMUNIDADES",
                            onClick = { visibilidad = "COMUNIDADES" },
                            label = { Text("Solo mis comunidades") },
                        )
                    }

                    if (comunidades.isNotEmpty()) {
                        Text("Silenciar comunidades en el feed", style = MaterialTheme.typography.titleSmall)
                        comunidades.forEach { comunidad ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(comunidad.nombre, modifier = Modifier.weight(1f))
                                Switch(
                                    checked = comunidad.silenciada,
                                    onCheckedChange = { alternarSilencio(comunidad.slug, it) },
                                )
                            }
                        }
                    }

                    Text("Notificaciones", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
                    preferencias.forEach { pref ->
                        val etiqueta = etiquetasPreferencia[pref.tipo] ?: pref.tipo
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(etiqueta, style = MaterialTheme.typography.bodyMedium)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("En la app", style = MaterialTheme.typography.bodySmall)
                                Switch(
                                    checked = pref.inApp,
                                    onCheckedChange = { checked ->
                                        guardarPreferencias(
                                            preferencias.map {
                                                if (it.tipo == pref.tipo) it.copy(inApp = checked) else it
                                            },
                                        )
                                    },
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("Push", style = MaterialTheme.typography.bodySmall)
                                Switch(
                                    checked = pref.push,
                                    onCheckedChange = { checked ->
                                        guardarPreferencias(
                                            preferencias.map {
                                                if (it.tipo == pref.tipo) it.copy(push = checked) else it
                                            },
                                        )
                                    },
                                )
                            }
                        }
                    }

                    error?.let {
                        Text(it, color = MaterialTheme.colorScheme.error)
                    }
                    aviso?.let {
                        Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium)
                    }

                    Button(
                        onClick = { guardar() },
                        enabled = !guardando,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(if (guardando) "Guardando…" else "Guardar cambios")
                    }

                    EliminarCuentaSeccion(
                        handle = handle,
                        tokenProvider = tokenProvider,
                        onCuentaEliminada = onCuentaEliminada,
                    )
                }
            }
        }
    }
}

@Composable
private fun EliminarCuentaSeccion(
    handle: String,
    tokenProvider: () -> String?,
    onCuentaEliminada: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var abierto by remember { mutableStateOf(false) }
    var confirmacion by remember { mutableStateOf("") }
    var eliminando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val esperado = handle.ifBlank { "ELIMINAR" }
    val coincide = confirmacion.trim().removePrefix("@").equals(esperado, ignoreCase = true)

    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("Eliminar mi cuenta", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.error)
        Text(
            "Se borran tu perfil, tus publicaciones, comentarios, mensajes y tu actividad. No se puede deshacer.",
            style = MaterialTheme.typography.bodySmall,
        )
        OutlinedButton(
            onClick = {
                confirmacion = ""
                error = null
                abierto = true
            },
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Eliminar mi cuenta")
        }
    }

    if (abierto) {
        AlertDialog(
            onDismissRequest = { if (!eliminando) abierto = false },
            title = { Text("¿Eliminar tu cuenta?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        if (handle.isNotBlank()) "Para confirmar, escribe tu usuario: @$handle"
                        else "Para confirmar, escribe ELIMINAR",
                    )
                    OutlinedTextField(
                        value = confirmacion,
                        onValueChange = { confirmacion = it },
                        singleLine = true,
                        enabled = !eliminando,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = coincide && !eliminando,
                    onClick = {
                        scope.launch {
                            eliminando = true
                            error = null
                            try {
                                val resp = ApiClient.api<CuentaApi>(tokenProvider)
                                    .eliminar(EliminarCuentaRequest(confirmacion.trim()))
                                if (resp.isSuccessful) {
                                    abierto = false
                                    onCuentaEliminada()
                                } else if (resp.code() == 400) {
                                    error = "La confirmación no coincide."
                                } else {
                                    error = mensajeDe(HttpException(resp))
                                }
                            } catch (e: Exception) {
                                error = mensajeDe(e)
                            } finally {
                                eliminando = false
                            }
                        }
                    },
                ) {
                    Text(if (eliminando) "Eliminando…" else "Eliminar", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { abierto = false }, enabled = !eliminando) { Text("Cancelar") }
            },
        )
    }
}
