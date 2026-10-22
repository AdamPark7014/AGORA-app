package mx.agora.mobile.nativeapp.ui.screens

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import mx.agora.mobile.nativeapp.data.ModoTema
import mx.agora.mobile.nativeapp.data.PreferenciasTema
import mx.agora.mobile.nativeapp.data.SessionUser
import mx.agora.mobile.nativeapp.data.api.ActualizarPerfilRequest
import mx.agora.mobile.nativeapp.data.api.ActualizarPreferenciasRequest
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.CambiarContrasenaRequest
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.CrearContrasenaRequest
import mx.agora.mobile.nativeapp.data.api.CuentaApi
import mx.agora.mobile.nativeapp.data.api.EliminarCuentaRequest
import mx.agora.mobile.nativeapp.data.api.NotificacionesApi
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PreferenciaNotificacionDto
import mx.agora.mobile.nativeapp.data.api.SilenciarComunidadRequest
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.ui.components.FormularioContrasena
import mx.agora.mobile.nativeapp.ui.components.diasParaConfirmarUdlap
import mx.agora.mobile.nativeapp.ui.components.ModoContrasena
import mx.agora.mobile.nativeapp.ui.components.SubScreenScaffold
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import retrofit2.HttpException

private val MESES = listOf(
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)

/** Días por mes en año bisiesto, como la API: el 29 de febrero se acepta. */
private val DIAS_POR_MES = intArrayOf(31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)

/** PATCH perfil con campos en null explícito (Moshi omite los null de los DTO). */
private fun jsonConNulos(vararg campos: String) =
    JSONObject().apply { campos.forEach { put(it, JSONObject.NULL) } }
        .toString()
        .toRequestBody("application/json".toMediaType())

private fun Context.buscarActivity(): Activity? {
    var actual: Context? = this
    while (actual is ContextWrapper) {
        if (actual is Activity) return actual
        actual = actual.baseContext
    }
    return null
}

private val etiquetasPreferencia = mapOf(
    "COMENTARIO" to "Comentarios",
    "REACCION" to "Reacciones",
    "MENSAJE" to "Mensajes",
    "EVENTO_NUEVO" to "Eventos nuevos",
    "EVENTO_RECORDATORIO" to "Recordatorio de eventos a los que vas",
    "AVENTON_APARTADO" to "Aventones",
    "AVENTON_CANCELADO" to "Aventones cancelados",
    "MODERACION" to "Moderación",
    "MENCION" to "Menciones",
    "SEGUIDOR" to "Nuevos seguidores",
    "INSIGNIA" to "Insignias",
    "RETO" to "Retos y duelos",
    "PREGUNTA" to "Pregunta del día",
)

@Composable
fun AjustesScreen(
    auth: AuthRepository,
    modifier: Modifier = Modifier,
    onCuentaEliminada: () -> Unit = {},
    /** Se confirmó la UDLAP desde la tarjeta «Correo UDLAP» (sesión nueva ya guardada). */
    onUdlapConfirmada: (SessionUser) -> Unit = {},
) {
    AjustesScreenContent(
        tokenProvider = { auth.token() },
        modifier = modifier,
        onCuentaEliminada = onCuentaEliminada,
        auth = auth,
        onUdlapConfirmada = onUdlapConfirmada,
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
    /** Sin él (variante solo con token) no se ofrece confirmar la UDLAP. */
    auth: AuthRepository? = null,
    onUdlapConfirmada: (SessionUser) -> Unit = {},
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
    var portadaUrl by remember { mutableStateOf<String?>(null) }
    var subiendoPortada by remember { mutableStateOf(false) }
    var cumpleMes by remember { mutableStateOf<Int?>(null) }
    var cumpleDia by remember { mutableStateOf<Int?>(null) }
    /** Si el perfil ya tenía cumpleaños al cargar: quitarlo exige mandar null explícito. */
    var teniaCumple by remember { mutableStateOf(false) }
    var avisoPregunta by remember { mutableStateOf(true) }
    /** Si la cuenta ya tiene contraseña (`auth/yo`). Null: API anterior o sin respuesta; no se muestra la tarjeta. */
    var tieneContrasena by remember { mutableStateOf<Boolean?>(null) }
    /** `auth/yo` si la cuenta se registró con el correo personal y aún debe confirmar la UDLAP. */
    var yoUdlap by remember { mutableStateOf<YoResponse?>(null) }
    var modoTema by remember { mutableStateOf(PreferenciasTema.leer(context)) }
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

    val pickerPortada = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            subiendoPortada = true
            error = null
            try {
                val media = mediaRepo.subir(uri, tokenProvider)
                ApiClient.api<PerfilApi>(tokenProvider)
                    .actualizar(ActualizarPerfilRequest(portadaMediaId = media.id))
                portadaUrl = media.url
                aviso = "Portada actualizada."
            } catch (e: Exception) {
                error = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
            } finally {
                subiendoPortada = false
            }
        }
    }

    fun quitarPortada() {
        scope.launch {
            subiendoPortada = true
            error = null
            try {
                ApiClient.api<PerfilApi>(tokenProvider).actualizarJson(jsonConNulos("portadaMediaId"))
                portadaUrl = null
                aviso = "Portada quitada."
            } catch (e: Exception) {
                error = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
            } finally {
                subiendoPortada = false
            }
        }
    }

    fun cambiarTema(nuevo: ModoTema) {
        if (nuevo == modoTema) return
        PreferenciasTema.guardar(context, nuevo)
        modoTema = nuevo
        // Los colores de la app se leen al crear la Activity: recrearla aplica el tema.
        context.buscarActivity()?.recreate()
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
            portadaUrl = perfil.portadaUrl
            cumpleMes = perfil.cumpleMes
            cumpleDia = perfil.cumpleDia
            teniaCumple = perfil.cumpleMes != null && perfil.cumpleDia != null
            avisoPregunta = perfil.avisoPregunta ?: true
            comunidades = api.misComunidades()
            preferencias = ApiClient.api<NotificacionesApi>(tokenProvider).preferencias().preferencias
            generacion = api.porHandle(perfil.handle).generacion
            // Aparte: si falla, el resto de Ajustes sigue sirviendo.
            val yo = runCatching { ApiClient.api<AuthApi>(tokenProvider).yo() }.getOrNull()
            tieneContrasena = yo?.tieneContrasena
            yoUdlap = yo?.takeIf { it.udlapPendiente == true }
        } catch (e: Exception) {
            error = mensajeDe(e)
        } finally {
            cargando = false
        }
    }

    fun guardar() {
        val mes = cumpleMes
        val dia = cumpleDia
        if ((mes == null) != (dia == null)) {
            error = "El cumpleaños necesita mes y día."
            aviso = null
            return
        }
        scope.launch {
            guardando = true
            error = null
            aviso = null
            try {
                val api = ApiClient.api<PerfilApi>(tokenProvider)
                api.actualizar(
                    ActualizarPerfilRequest(
                        bio = bio.trim(),
                        ciudadOrigen = ciudad.trim().ifBlank { null },
                        instagram = instagram.trim().removePrefix("@").ifBlank { null },
                        busco = busco.trim().ifBlank { null },
                        intereses = intereses,
                        visibilidad = visibilidad,
                        cumpleMes = mes,
                        cumpleDia = dia,
                    ),
                )
                if (mes == null && teniaCumple) {
                    api.actualizarJson(jsonConNulos("cumpleMes", "cumpleDia"))
                }
                teniaCumple = mes != null
                aviso = "Cambios guardados."
            } catch (e: Exception) {
                error = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
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

    fun alternarAvisoPregunta(activo: Boolean) {
        val antes = avisoPregunta
        avisoPregunta = activo
        scope.launch {
            try {
                ApiClient.api<PerfilApi>(tokenProvider)
                    .actualizar(ActualizarPerfilRequest(avisoPregunta = activo))
            } catch (e: Exception) {
                avisoPregunta = antes
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

                    Text("Apariencia", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ModoTema.entries.forEach { modo ->
                            FilterChip(
                                selected = modoTema == modo,
                                onClick = { cambiarTema(modo) },
                                label = { Text(modo.etiqueta) },
                            )
                        }
                    }

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

                    Text("Portada", style = MaterialTheme.typography.labelLarge)
                    val portada = ApiClient.resolveUrl(portadaUrl)
                    if (portada != null) {
                        AsyncImage(
                            model = portada,
                            contentDescription = null,
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(3f)
                                .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop,
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(3f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(AgoraColors.NaranjaSuave),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("Sin portada", color = AgoraColors.TextoMedio, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = {
                                pickerPortada.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            },
                            enabled = !subiendoPortada,
                        ) {
                            Text(if (subiendoPortada) "Subiendo…" else "Cambiar portada")
                        }
                        if (portadaUrl != null) {
                            TextButton(onClick = { quitarPortada() }, enabled = !subiendoPortada) {
                                Text("Quitar")
                            }
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
                    Text("Cumpleaños", style = MaterialTheme.typography.labelLarge)
                    Text(
                        "Sin año: sirve para felicitarte, no para saber tu edad.",
                        style = MaterialTheme.typography.bodySmall,
                        color = AgoraColors.TextoMedio,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SelectorSimple(
                            texto = cumpleMes?.let { MESES[it - 1] } ?: "Mes",
                            opciones = MESES.mapIndexed { i, nombreMes -> (i + 1) to nombreMes },
                            onElegir = { mes ->
                                cumpleMes = mes
                                val tope = DIAS_POR_MES[mes - 1]
                                cumpleDia = cumpleDia?.coerceAtMost(tope)
                            },
                        )
                        SelectorSimple(
                            texto = cumpleDia?.toString() ?: "Día",
                            opciones = (1..(cumpleMes?.let { DIAS_POR_MES[it - 1] } ?: 31)).map { it to it.toString() },
                            onElegir = { cumpleDia = it },
                        )
                        if (cumpleMes != null || cumpleDia != null) {
                            TextButton(onClick = { cumpleMes = null; cumpleDia = null }) {
                                Text("Quitar")
                            }
                        }
                    }

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

                    val pendiente = yoUdlap
                    if (auth != null && pendiente != null) {
                        CorreoUdlapSeccion(
                            auth = auth,
                            yo = pendiente,
                            onConfirmada = { user ->
                                // Confirmar borró la contraseña y se eligió otra en el flujo.
                                yoUdlap = null
                                tieneContrasena = true
                                error = null
                                onUdlapConfirmada(user)
                            },
                        )
                    }

                    tieneContrasena?.let { tiene ->
                        ContrasenaSeccion(
                            tiene = tiene,
                            tokenProvider = tokenProvider,
                            onGuardada = {
                                tieneContrasena = true
                                error = null
                                aviso = if (tiene) AgoraCopy.login.ajustes.cambiada else AgoraCopy.login.ajustes.creada
                            },
                        )
                    }

                    Text("Notificaciones", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("⚡ Avísame cuando caiga la pregunta", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "Sale a una hora sorpresa; tienes 2 minutos para contestar a tiempo.",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        Switch(checked = avisoPregunta, onCheckedChange = { alternarAvisoPregunta(it) })
                    }
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

/** Botón con menú desplegable (mes, día). */
@Composable
private fun SelectorSimple(
    texto: String,
    opciones: List<Pair<Int, String>>,
    onElegir: (Int) -> Unit,
) {
    var abierto by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { abierto = true }) {
            Text("$texto ▾")
        }
        DropdownMenu(expanded = abierto, onDismissRequest = { abierto = false }) {
            opciones.forEach { (valor, etiqueta) ->
                DropdownMenuItem(
                    text = { Text(etiqueta) },
                    onClick = {
                        abierto = false
                        onElegir(valor)
                    },
                )
            }
        }
    }
}

/**
 * Tarjeta «Contraseña» (paridad con `componentes/seccion-contrasena.tsx`).
 * Quien aún no tiene (cuenta de antes de las contraseñas) la crea aquí sin más
 * trámite: su sesión ya prueba que el buzón es suyo. Quien tiene, la cambia
 * dando la actual; la API cierra las otras sesiones.
 */
@Composable
private fun ContrasenaSeccion(
    tiene: Boolean,
    tokenProvider: () -> String?,
    onGuardada: () -> Unit,
) {
    val copy = AgoraCopy.login.ajustes
    var abierto by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(copy.titulo, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
        Text(
            if (tiene) copy.tiene else copy.noTiene,
            style = MaterialTheme.typography.bodySmall,
            color = AgoraColors.TextoMedio,
        )
        if (!abierto) {
            OutlinedButton(
                onClick = { abierto = true },
                modifier = Modifier.padding(top = 4.dp),
            ) {
                Text(if (tiene) copy.botonCambiar else copy.botonCrear)
            }
        } else {
            FormularioContrasena(
                modo = if (tiene) ModoContrasena.CAMBIAR else ModoContrasena.CREAR,
                enviar = { actual, nueva ->
                    val api = ApiClient.api<AuthApi>(tokenProvider)
                    val resp = if (tiene) {
                        api.cambiarContrasena(CambiarContrasenaRequest(actual, nueva))
                    } else {
                        api.crearContrasena(CrearContrasenaRequest(nueva))
                    }
                    if (!resp.isSuccessful) throw HttpException(resp)
                    YoCache.limpiar()
                },
                onListo = {
                    abierto = false
                    onGuardada()
                },
                modifier = Modifier.padding(top = 4.dp),
                textoBoton = if (tiene) copy.botonCambiar.trimEnd('…') else null,
            )
            TextButton(onClick = { abierto = false }) {
                Text(copy.cancelar)
            }
        }
    }
}

/**
 * Tarjeta «Correo UDLAP»: solo para una cuenta registrada con el correo personal
 * que aún no confirma su buzón @udlap.mx. El texto del aviso del feed y el flujo
 * de confirmación en la misma tarjeta.
 */
@Composable
private fun CorreoUdlapSeccion(
    auth: AuthRepository,
    yo: YoResponse,
    onConfirmada: (SessionUser) -> Unit,
) {
    val textos = AgoraCopy.login.udlap
    var abierto by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(textos.ajustesTitulo, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
        yo.diasParaConfirmarUdlap()?.let { dias ->
            Text(
                textos.avisoTexto(dias),
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextoMedio,
            )
        }
        if (!abierto) {
            OutlinedButton(
                onClick = { abierto = true },
                modifier = Modifier.padding(top = 4.dp),
            ) {
                Text(textos.ajustesBoton)
            }
        } else {
            Spacer(Modifier.height(8.dp))
            ConfirmarUdlap(
                auth = auth,
                email = yo.email ?: auth.loadSession()?.email.orEmpty(),
                onConfirmada = onConfirmada,
            )
            TextButton(onClick = { abierto = false }) {
                Text(AgoraCopy.login.ajustes.cancelar)
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
