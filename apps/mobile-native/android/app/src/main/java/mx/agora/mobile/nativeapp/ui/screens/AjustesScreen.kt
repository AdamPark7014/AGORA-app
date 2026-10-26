package mx.agora.mobile.nativeapp.ui.screens

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import coil.compose.AsyncImage
import kotlinx.coroutines.CancellationException
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
import mx.agora.mobile.nativeapp.push.PushRegistration
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.FormularioContrasena
import mx.agora.mobile.nativeapp.ui.components.diasParaConfirmarUdlap
import mx.agora.mobile.nativeapp.ui.components.ModoContrasena
import mx.agora.mobile.nativeapp.ui.components.SubScreenScaffold
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import mx.agora.mobile.nativeapp.ui.util.mensajeLegibleDelServidor
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

/**
 * Si al teléfono le pueden llegar avisos de Ágora: permiso concedido (Android 13+)
 * y avisos de la app encendidos en el sistema (en cualquier versión se apagan ahí).
 */
private fun avisosDelSistemaActivos(context: Context): Boolean {
    val permiso = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
    return permiso && NotificationManagerCompat.from(context).areNotificationsEnabled()
}

/** Abre los avisos de Ágora en los ajustes del sistema (antes de Android 8, la ficha de la app). */
private fun abrirAjustesDeAvisos(context: Context) {
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
    }
    if (context.buscarActivity() == null) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { context.startActivity(intent) }
}

private val etiquetasPreferencia = mapOf(
    "COMENTARIO" to "Comentarios",
    "REACCION" to "Reacciones",
    "MENSAJE" to "Mensajes",
    "EVENTO_NUEVO" to "Eventos nuevos",
    "EVENTO_RECORDATORIO" to "Recordatorio de eventos a los que vas",
    "AVENTON_APARTADO" to "Aventones",
    "AVENTON_CANCELADO" to "Aventones cancelados",
    "AVENTON_RECORDATORIO" to "Tu aventón está por salir",
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
    /**
     * No se pudo leer `perfil/mio`. Se muestra el error con «Reintentar» en vez
     * del formulario: vacío, «Guardar cambios» habría borrado bio, ciudad, etc.
     */
    var errorCarga by remember { mutableStateOf<String?>(null) }
    /** Sube con «Reintentar» y vuelve a lanzar la carga. */
    var intentoCarga by remember { mutableIntStateOf(0) }
    var guardando by remember { mutableStateOf(false) }
    var subiendoFoto by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var aviso by remember { mutableStateOf<String?>(null) }
    /** Comunidades, avisos o generación no cargaron: aviso en su sección con «Reintentar». */
    var extrasFallaron by remember { mutableStateOf(false) }
    /** `auth/yo` falló: sin aviso, las tarjetas Contraseña y Correo UDLAP desaparecían en silencio. */
    var yoFallo by remember { mutableStateOf(false) }
    var reintentando by remember { mutableStateOf(false) }
    val scrollAjustes = rememberScrollState()

    // El error vive al final del formulario largo: se baja hasta él al aparecer.
    // Los avisos de éxito no («Foto actualizada.» alejaría la vista de la foto).
    LaunchedEffect(error) {
        if (error != null) scrollAjustes.animateScrollTo(scrollAjustes.maxValue)
    }

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
                error = (e as? HttpException)?.let { mensajeLegibleDelServidor(it) } ?: mensajeDe(e)
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
                error = (e as? HttpException)?.let { mensajeLegibleDelServidor(it) } ?: mensajeDe(e)
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

    // Con el perfil ya en pantalla, lo demás puede fallar sin riesgo de pisar
    // datos: se avisa en su sección y «Reintentar» repite solo esa parte
    // (recargar el perfil borraría lo que ya se editó).
    suspend fun cargarExtras() {
        extrasFallaron = false
        try {
            val api = ApiClient.api<PerfilApi>(tokenProvider)
            comunidades = api.misComunidades()
            preferencias = ApiClient.api<NotificacionesApi>(tokenProvider).preferencias().preferencias
            generacion = api.porHandle(handle).generacion
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            extrasFallaron = true
        }
    }

    // Aparte: si falla, el resto de Ajustes sigue sirviendo.
    suspend fun cargarYo() {
        yoFallo = false
        try {
            val yo = ApiClient.api<AuthApi>(tokenProvider).yo()
            tieneContrasena = yo.tieneContrasena
            yoUdlap = yo.takeIf { it.udlapPendiente == true }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            tieneContrasena = null
            yoUdlap = null
            yoFallo = true
        }
    }

    fun reintentar(carga: suspend () -> Unit) {
        if (reintentando) return
        scope.launch {
            reintentando = true
            try {
                carga()
            } finally {
                reintentando = false
            }
        }
    }

    LaunchedEffect(intentoCarga) {
        cargando = true
        error = null
        errorCarga = null
        try {
            val api = ApiClient.api<PerfilApi>(tokenProvider)
            val perfil = try {
                api.mio()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorCarga = mensajeDe(e)
                return@LaunchedEffect
            }
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
            cargarExtras()
            cargarYo()
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
                // Los textos opcionales van siempre, vacíos si se borraron: la API
                // trata la ausencia (Moshi omite los null) como «no cambiar» y
                // solo `""` los limpia (instagram vacío queda en null allá).
                api.actualizar(
                    ActualizarPerfilRequest(
                        bio = bio.trim(),
                        ciudadOrigen = ciudad.trim(),
                        instagram = instagram.trim().removePrefix("@"),
                        busco = busco.trim(),
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
                error = (e as? HttpException)?.let { mensajeLegibleDelServidor(it) } ?: mensajeDe(e)
            } finally {
                guardando = false
            }
        }
    }

    fun guardarPreferencias(nuevas: List<PreferenciaNotificacionDto>) {
        val antes = preferencias
        preferencias = nuevas
        scope.launch {
            try {
                preferencias = ApiClient.api<NotificacionesApi>(tokenProvider)
                    .actualizarPreferencias(ActualizarPreferenciasRequest(nuevas))
                    .preferencias
            } catch (e: Exception) {
                // Como alternarAvisoPregunta: el interruptor no se queda en un valor que no se guardó.
                preferencias = antes
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
            errorCarga != null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AgoraErrorState(
                        title = "No pudimos cargar tus ajustes",
                        message = errorCarga.orEmpty(),
                        onRetry = { intentoCarga++ },
                    )
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .imePadding()
                        .verticalScroll(scrollAjustes)
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
                            TextButton(
                                onClick = { quitarPortada() },
                                enabled = !subiendoPortada,
                                modifier = Modifier.semantics { contentDescription = "Quitar portada" },
                            ) {
                                Text("Quitar")
                            }
                        }
                    }

                    // Solo lectura pero no deshabilitados: deshabilitados se leían sin contraste.
                    OutlinedTextField(
                        value = nombre,
                        onValueChange = {},
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Nombre") },
                        readOnly = true,
                        enabled = true,
                    )
                    OutlinedTextField(
                        value = apellidos,
                        onValueChange = {},
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Apellidos") },
                        readOnly = true,
                        enabled = true,
                    )
                    generacion?.let {
                        OutlinedTextField(
                            value = it.toString(),
                            onValueChange = {},
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Generación") },
                            readOnly = true,
                            enabled = true,
                        )
                    }

                    // La etiqueta va en el campo (como Ciudad e Instagram): con un
                    // Text suelto encima, TalkBack leía el campo sin nombre.
                    OutlinedTextField(
                        value = bio,
                        onValueChange = { if (it.length <= 280) bio = it },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        label = { Text("Bio") },
                        placeholder = { Text("Cuéntanos algo sobre ti") },
                    )
                    Text(
                        "${bio.length}/280",
                        style = MaterialTheme.typography.bodySmall,
                        color = AgoraColors.TextMuted,
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
                            etiqueta = "Mes de cumpleaños",
                            elegido = cumpleMes != null,
                            opciones = MESES.mapIndexed { i, nombreMes -> (i + 1) to nombreMes },
                            onElegir = { mes ->
                                cumpleMes = mes
                                val tope = DIAS_POR_MES[mes - 1]
                                cumpleDia = cumpleDia?.coerceAtMost(tope)
                            },
                        )
                        SelectorSimple(
                            texto = cumpleDia?.toString() ?: "Día",
                            etiqueta = "Día de cumpleaños",
                            elegido = cumpleDia != null,
                            opciones = (1..(cumpleMes?.let { DIAS_POR_MES[it - 1] } ?: 31)).map { it to it.toString() },
                            onElegir = { cumpleDia = it },
                        )
                        if (cumpleMes != null || cumpleDia != null) {
                            TextButton(
                                onClick = { cumpleMes = null; cumpleDia = null },
                                modifier = Modifier.semantics { contentDescription = "Quitar cumpleaños" },
                            ) {
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
                            // Un botón que quita, no una casilla «seleccionada»: mismos
                            // colores que el FilterChip marcado que había.
                            AssistChip(
                                onClick = { intereses = intereses.filter { it != interes } },
                                label = { Text(interes) },
                                trailingIcon = {
                                    Icon(
                                        Icons.Filled.Close,
                                        contentDescription = "Quitar $interes",
                                        modifier = Modifier.size(AssistChipDefaults.IconSize),
                                    )
                                },
                                colors = AssistChipDefaults.assistChipColors(
                                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                    labelColor = MaterialTheme.colorScheme.onSecondaryContainer,
                                    trailingIconContentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                                ),
                                border = null,
                            )
                        }
                    }
                    val topeIntereses = intereses.size >= 10
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
                            supportingText = if (topeIntereses) {
                                { Text("Máximo 10") }
                            } else {
                                null
                            },
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = { agregarInteres() }),
                        )
                        Button(
                            onClick = { agregarInteres() },
                            enabled = !topeIntereses,
                            modifier = Modifier.semantics { contentDescription = "Agregar interés" },
                        ) {
                            Text("+", modifier = Modifier.clearAndSetSemantics { })
                        }
                    }

                    Text("Quién ve tu perfil", style = MaterialTheme.typography.labelLarge)
                    // FlowRow: con letra grande los dos chips no caben en un renglón.
                    FlowRow(
                        modifier = Modifier.selectableGroup(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
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
                            // El renglón entero alterna: TalkBack lee el nombre con el interruptor.
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .toggleable(
                                        value = comunidad.silenciada,
                                        role = Role.Switch,
                                        onValueChange = { alternarSilencio(comunidad.slug, it) },
                                    ),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(comunidad.nombre, modifier = Modifier.weight(1f))
                                Switch(
                                    checked = comunidad.silenciada,
                                    onCheckedChange = null,
                                    modifier = Modifier.minimumInteractiveComponentSize(),
                                )
                            }
                        }
                    }

                    if (yoFallo) {
                        AvisoReintentar(
                            texto = "No pudimos cargar las opciones de tu contraseña.",
                            reintentando = reintentando,
                            onReintentar = { reintentar { cargarYo() } },
                        )
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
                    AvisosDelTelefono()
                    if (extrasFallaron) {
                        AvisoReintentar(
                            texto = "No pudimos cargar tus avisos ni tus comunidades.",
                            reintentando = reintentando,
                            onReintentar = { reintentar { cargarExtras() } },
                        )
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .toggleable(
                                value = avisoPregunta,
                                role = Role.Switch,
                                onValueChange = { alternarAvisoPregunta(it) },
                            ),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Avísame cuando caiga la pregunta", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "Sale a una hora sorpresa; tienes 2 minutos para contestar a tiempo.",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        Switch(
                            checked = avisoPregunta,
                            onCheckedChange = null,
                            modifier = Modifier.minimumInteractiveComponentSize(),
                        )
                    }
                    preferencias.forEach { pref ->
                        // Tipo nuevo sin etiqueta: legible («Tipo nuevo»), no el código crudo TIPO_NUEVO.
                        val etiqueta = etiquetasPreferencia[pref.tipo]
                            ?: pref.tipo.lowercase().replace('_', ' ').replaceFirstChar { it.uppercase() }
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(etiqueta, style = MaterialTheme.typography.bodyMedium)
                            // TalkBack dice el tipo con el canal: «Comentarios, en la app».
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .toggleable(
                                        value = pref.inApp,
                                        role = Role.Switch,
                                        onValueChange = { checked ->
                                            guardarPreferencias(
                                                preferencias.map {
                                                    if (it.tipo == pref.tipo) it.copy(inApp = checked) else it
                                                },
                                            )
                                        },
                                    )
                                    .semantics { contentDescription = "$etiqueta, en la app" },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("En la app", style = MaterialTheme.typography.bodySmall)
                                Switch(
                                    checked = pref.inApp,
                                    onCheckedChange = null,
                                    modifier = Modifier.minimumInteractiveComponentSize(),
                                )
                            }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .toggleable(
                                        value = pref.push,
                                        role = Role.Switch,
                                        onValueChange = { checked ->
                                            guardarPreferencias(
                                                preferencias.map {
                                                    if (it.tipo == pref.tipo) it.copy(push = checked) else it
                                                },
                                            )
                                        },
                                    )
                                    .semantics { contentDescription = "$etiqueta, en el celular" },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("En el celular", style = MaterialTheme.typography.bodySmall)
                                Switch(
                                    checked = pref.push,
                                    onCheckedChange = null,
                                    modifier = Modifier.minimumInteractiveComponentSize(),
                                )
                            }
                        }
                    }

                    error?.let {
                        Text(
                            it,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                        )
                    }
                    aviso?.let {
                        Text(
                            it,
                            color = AgoraColors.Success,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                        )
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

/**
 * «Avisos en este teléfono»: el permiso del sistema, aparte de las preferencias
 * por tipo (esas viven en la API). Junto con la bienvenida, el único lugar donde
 * se pide (docs/diseno-d.md §6).
 */
@Composable
private fun AvisosDelTelefono() {
    val context = LocalContext.current
    var activos by remember { mutableStateOf(avisosDelSistemaActivos(context)) }
    /** Si el sistema ya iba a explicar el permiso antes de pedirlo: distingue «negó ahora» de «ya no deja pedirlo». */
    var explicabaAntes by remember { mutableStateOf(false) }

    // Se prenden y apagan fuera de la app: se vuelve a mirar al regresar.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observador = LifecycleEventObserver { _, evento ->
            if (evento == Lifecycle.Event.ON_RESUME) activos = avisosDelSistemaActivos(context)
        }
        lifecycleOwner.lifecycle.addObserver(observador)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observador) }
    }

    val pedirPermiso = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { concedido ->
        activos = avisosDelSistemaActivos(context)
        if (concedido) {
            PushRegistration.registerCurrentDeviceAsync(context.applicationContext)
            return@rememberLauncherForActivityResult
        }
        // Negado sin diálogo: ni antes ni después había explicación, o sea que
        // el sistema ya no deja pedirlo y solo queda su pantalla de ajustes. Si
        // la persona acaba de decir que no en el diálogo, se le respeta.
        val activity = context.buscarActivity()
        val explicaAhora = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && activity != null &&
            ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.POST_NOTIFICATIONS)
        if (!explicabaAntes && !explicaAhora) abrirAjustesDeAvisos(context)
    }

    fun activar() {
        val faltaPermiso = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        if (faltaPermiso) {
            val activity = context.buscarActivity()
            explicabaAntes = activity != null &&
                ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.POST_NOTIFICATIONS)
            pedirPermiso.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            // Antes de Android 13 (o con el permiso dado) se apagan en el sistema: solo ahí se prenden.
            abrirAjustesDeAvisos(context)
        }
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite },
        ) {
            Text("Avisos en este teléfono", style = MaterialTheme.typography.bodyMedium)
            Text(
                if (activos) "Activados" else "Desactivados",
                style = MaterialTheme.typography.bodySmall,
                color = if (activos) AgoraColors.Success else AgoraColors.TextoMedio,
            )
            if (!activos) {
                Text(
                    "Mientras estén apagados no te llega nada al celular, aunque lo actives abajo.",
                    style = MaterialTheme.typography.bodySmall,
                    color = AgoraColors.TextoMedio,
                )
            }
        }
        if (!activos) {
            OutlinedButton(
                onClick = { activar() },
                shape = AgoraButtonShape,
                modifier = Modifier.semantics { contentDescription = "Activar avisos en este teléfono" },
            ) {
                Text("Activar")
            }
        }
    }
}

/** Una parte de Ajustes no cargó: lo dice en su lugar y deja repetir solo esa carga. */
@Composable
private fun AvisoReintentar(
    texto: String,
    reintentando: Boolean,
    onReintentar: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.weight(1f),
        )
        TextButton(onClick = onReintentar, enabled = !reintentando) {
            Text(AgoraCopy.cta.reintentar)
        }
    }
}

/**
 * Botón con menú desplegable (mes, día). [etiqueta] es lo que lee TalkBack
 * («Mes de cumpleaños: Marzo»); [elegido] en false si [texto] es el marcador.
 */
@Composable
private fun SelectorSimple(
    texto: String,
    etiqueta: String,
    elegido: Boolean,
    opciones: List<Pair<Int, String>>,
    onElegir: (Int) -> Unit,
) {
    var abierto by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick = { abierto = true },
            modifier = Modifier.semantics {
                contentDescription = if (elegido) "$etiqueta: $texto" else "$etiqueta, sin elegir"
                role = Role.DropdownList
            },
        ) {
            Text(texto)
            Icon(
                Icons.Filled.ArrowDropDown,
                contentDescription = null,
                modifier = Modifier.size(ButtonDefaults.IconSize),
            )
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
                        label = { Text(if (handle.isNotBlank()) "Tu usuario" else "Escribe ELIMINAR") },
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
