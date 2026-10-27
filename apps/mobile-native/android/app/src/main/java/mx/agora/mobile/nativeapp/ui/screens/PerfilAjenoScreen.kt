package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Block
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsOff
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Psychology
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import java.util.Locale
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.AbrirConversacionRequest
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.BloquearRequest
import mx.agora.mobile.nativeapp.data.api.BloqueosApi
import mx.agora.mobile.nativeapp.data.api.CrearRetoRequest
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.api.GamificacionDto
import mx.agora.mobile.nativeapp.data.api.MediaDto
import mx.agora.mobile.nativeapp.data.api.MensajesApi
import mx.agora.mobile.nativeapp.data.api.PerfilAjenoDto
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PerfilPublicacionDto
import mx.agora.mobile.nativeapp.data.api.PersonaResumenDto
import mx.agora.mobile.nativeapp.data.api.RetosApi
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AvataresApilados
import mx.agora.mobile.nativeapp.ui.components.BotonBorde
import mx.agora.mobile.nativeapp.ui.components.BotonTinta
import mx.agora.mobile.nativeapp.ui.components.GamificacionPublicSection
import mx.agora.mobile.nativeapp.ui.components.PostMediaGrid
import mx.agora.mobile.nativeapp.ui.components.TituloSeccion
import mx.agora.mobile.nativeapp.ui.components.esVideoMedia
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.navigation.AgoraRoutes
import mx.agora.mobile.nativeapp.ui.navigation.DeepLinkBus
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraCardShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraChipShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.theme.AgoraRadii
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.EnlacesWeb
import mx.agora.mobile.nativeapp.ui.util.compartirEnlace
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import retrofit2.HttpException

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PerfilAjenoScreen(
    handle: String,
    tokenProvider: () -> String?,
    miHandle: String?,
    onBack: () -> Unit,
    onMensaje: (String) -> Unit,
    onAjustes: () -> Unit,
    /** Abre la lista de seguidores o seguidos ([TipoConexion]). */
    onConexiones: (tipo: String) -> Unit = {},
    /**
     * Abre el detalle de una publicación (AgoraNavHost lo pasa en la ruta
     * PERFIL). Si llega null se abre por [DeepLinkBus], que regresa al inicio al volver.
     */
    onPublicacion: ((String) -> Unit)? = null,
    /**
     * Tu perfil como pestaña (barra del Feed B): en vez de «Volver» va el menú ☰ que abre
     * Campus (aventones, directorio, sin nombre, tu día, ajustes).
     */
    onCampus: (() -> Unit)? = null,
) {
    val context = LocalContext.current
    var perfil by remember { mutableStateOf<PerfilAjenoDto?>(null) }
    var gamificacion by remember { mutableStateOf<GamificacionDto?>(null) }
    var publicaciones by remember { mutableStateOf<List<PerfilPublicacionDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var siguiendo by remember { mutableStateOf(false) }
    var bloqueado by remember { mutableStateOf(false) }
    var silenciado by remember { mutableStateOf(false) }
    var cargando by remember { mutableStateOf(true) }
    var ocupado by remember { mutableStateOf(false) }
    /** Solo para la carga del perfil. Los fallos de acciones van al snackbar. */
    var error by remember { mutableStateOf<String?>(null) }
    /** Falló traer las publicaciones; el resto del perfil sí se ve. */
    var errorPublicaciones by remember { mutableStateOf<String?>(null) }
    var cargandoMas by remember { mutableStateOf(false) }
    var puedeRetar by remember { mutableStateOf(false) }
    var mostrarDialogRetar by remember { mutableStateOf(false) }
    var enviandoReto by remember { mutableStateOf(false) }
    var errorReto by remember { mutableStateOf<String?>(null) }
    var menuAbierto by remember { mutableStateOf(false) }
    /** 0 = Publicaciones, 1 = Fotos. */
    var pestana by remember { mutableIntStateOf(0) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val abrirPublicacion: (String) -> Unit = onPublicacion ?: { id -> DeepLinkBus.emit(AgoraRoutes.post(id)) }
    val esMio = miHandle == handle

    /** Aviso corto sin bloquear los botones mientras se ve. */
    fun avisar(texto: String) {
        scope.launch { snackbarHostState.showSnackbar(texto) }
    }

    suspend fun traerPublicaciones() {
        errorPublicaciones = null
        try {
            val p = ApiClient.api<PerfilApi>(tokenProvider).publicaciones(handle)
            publicaciones = p.publicaciones
            cursor = p.siguienteCursor
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            errorPublicaciones = mensajeDe(e)
        }
    }

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
                    // Si falla el estado de bloqueo, el perfil se ve igual.
                    runCatching { ApiClient.api<BloqueosApi>(tokenProvider).estado(handle) }
                        .onSuccess { estado ->
                            bloqueado = estado.bloqueado
                            silenciado = estado.silenciado
                        }
                }
                if (!datos.restringido) {
                    traerPublicaciones()
                } else {
                    publicaciones = emptyList()
                    cursor = null
                    errorPublicaciones = null
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
            } catch (e: CancellationException) {
                throw e
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
                // El contador de seguidores sigue al botón sin recargar el perfil.
                if (resp.siguiendo != era) {
                    perfil = perfil?.let {
                        it.copy(seguidores = ((it.seguidores ?: 0) + if (resp.siguiendo) 1 else -1).coerceAtLeast(0))
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                siguiendo = era
                avisar(mensajeDe(e))
            } finally {
                ocupado = false
            }
        }
    }

    fun alternarBloqueo() {
        scope.launch {
            ocupado = true
            try {
                val api = ApiClient.api<BloqueosApi>(tokenProvider)
                if (bloqueado) {
                    val resp = api.quitar(handle)
                    if (!resp.isSuccessful) throw HttpException(resp)
                    bloqueado = false
                    silenciado = false
                    avisar("Desbloqueado.")
                } else {
                    val resp = api.aplicar(handle, BloquearRequest(soloSilencio = false))
                    bloqueado = resp.bloqueado
                    silenciado = resp.silenciado
                    if (resp.bloqueado) {
                        // Aparte, para no dejar «ocupado» mientras se ve el aviso.
                        scope.launch {
                            val r = snackbarHostState.showSnackbar(
                                "Bloqueado. Ya no se ven ni se escriben.",
                                actionLabel = "Deshacer",
                                duration = SnackbarDuration.Long,
                            )
                            // Deshacer = desbloquear (DELETE bloqueos/{handle}).
                            if (r == SnackbarResult.ActionPerformed && bloqueado && !ocupado) alternarBloqueo()
                        }
                    } else {
                        avisar("Bloqueado. Ya no se ven ni se escriben.")
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                avisar(mensajeDe(e))
            } finally {
                ocupado = false
            }
        }
    }

    /**
     * Silenciar: dejo de ver sus publicaciones sin que se entere ni se rompa el
     * contacto (bloquear, en cambio, es "no nos vemos").
     */
    fun alternarSilencio() {
        scope.launch {
            ocupado = true
            try {
                val api = ApiClient.api<BloqueosApi>(tokenProvider)
                if (silenciado) {
                    val resp = api.quitar(handle)
                    if (!resp.isSuccessful) throw HttpException(resp)
                    silenciado = false
                    bloqueado = false
                    avisar("Ya no está silenciado.")
                } else {
                    val resp = api.aplicar(handle, BloquearRequest(soloSilencio = true))
                    silenciado = resp.silenciado
                    bloqueado = resp.bloqueado
                    avisar("Silenciado. No verás sus publicaciones.")
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                avisar(mensajeDe(e))
            } finally {
                ocupado = false
            }
        }
    }

    fun escribir() {
        scope.launch {
            ocupado = true
            try {
                val resp = ApiClient.api<MensajesApi>(tokenProvider)
                    .abrir(AbrirConversacionRequest(handle))
                onMensaje(resp.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                avisar(mensajeDe(e))
            } finally {
                ocupado = false
            }
        }
    }

    fun cargarMas() {
        val c = cursor ?: return
        if (cargandoMas) return
        scope.launch {
            cargandoMas = true
            try {
                val p = ApiClient.api<PerfilApi>(tokenProvider).publicaciones(handle, cursor = c)
                val ids = publicaciones.mapTo(HashSet()) { it.id }
                publicaciones = publicaciones + p.publicaciones.filter { it.id !in ids }
                cursor = p.siguienteCursor
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                avisar(mensajeDe(e))
            } finally {
                cargandoMas = false
            }
        }
    }

    fun enviarReto(tipo: String) {
        scope.launch {
            enviandoReto = true
            errorReto = null
            try {
                ApiClient.api<RetosApi>(tokenProvider).crear(
                    CrearRetoRequest(retadoHandle = handle, tipo = tipo),
                )
                mostrarDialogRetar = false
                puedeRetar = false
                avisar("Reto enviado. A ver si le entra.")
                GamificacionEvents.notifyPingResult(emptyList())
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // El diálogo sigue abierto y tapa el snackbar: el error va adentro.
                errorReto = mensajeDe(e)
            } finally {
                enviandoReto = false
            }
        }
    }

    if (mostrarDialogRetar) {
        AlertDialog(
            onDismissRequest = {
                if (!enviandoReto) {
                    mostrarDialogRetar = false
                    errorReto = null
                }
            },
            containerColor = AgoraColors.Superficie,
            title = { Text("Retar a @$handle", color = AgoraColors.Texto) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("¿A qué le entramos?", color = AgoraColors.TextoMedio)
                    errorReto?.let {
                        Text(it, color = AgoraColors.Danger, style = MaterialTheme.typography.bodySmall)
                    }
                    OpcionReto(
                        icono = Icons.Outlined.LocalFireDepartment,
                        titulo = "Racha diaria",
                        detalle = "Quien mantenga más días seguidos gana.",
                        enabled = !enviandoReto,
                        onClick = { enviarReto("RACHA") },
                    )
                    OpcionReto(
                        icono = Icons.Outlined.Psychology,
                        titulo = "Semana de preguntas",
                        detalle = "Quien responda más preguntas del día gana.",
                        enabled = !enviandoReto,
                        onClick = { enviarReto("SEMANA_PREGUNTA") },
                    )
                    if (enviandoReto) {
                        CircularProgressIndicator(
                            color = AgoraColors.Naranja,
                            modifier = Modifier.align(Alignment.CenterHorizontally),
                        )
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(
                    onClick = {
                        mostrarDialogRetar = false
                        errorReto = null
                    },
                    enabled = !enviandoReto,
                ) {
                    Text("Cancelar", color = AgoraColors.Texto)
                }
            },
        )
    }

    Scaffold(
        containerColor = AgoraColors.Fondo,
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                cargando -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = AgoraColors.Naranja)
                    }
                }
                error != null || perfil == null -> {
                    AgoraErrorState(
                        message = error ?: AgoraCopy.errors.notFound,
                        modifier = Modifier.fillMaxSize(),
                        onRetry = { cargar() },
                    )
                }
                else -> {
                    val p = perfil!!
                    val nombreCompleto = "${p.nombre} ${p.apellidos}".trim()
                    // Las fotos salen de las publicaciones ya cargadas: no hay endpoint aparte.
                    val fotos = remember(publicaciones) {
                        publicaciones.flatMap { pub -> pub.media.filter { !it.esVideoMedia() }.map { pub.id to it } }
                    }
                    val pestanas = if (fotos.isEmpty()) listOf("Publicaciones") else listOf("Publicaciones", "Fotos")
                    val pestanaActiva = pestana.coerceIn(0, pestanas.lastIndex)

                    fun abrirLista(tipo: String): (() -> Unit)? =
                        if (p.restringido) null else ({ onConexiones(tipo) })

                    val cifras = buildList<CifraPerfil> {
                        p.publicaciones?.let { add(cifraConteo(it, "publicación", "publicaciones")) }
                        p.seguidores?.let {
                            add(cifraConteo(it, "seguidor", "seguidores", onClick = abrirLista(TipoConexion.SEGUIDORES)))
                        }
                        p.siguiendo?.let {
                            add(cifraSiguiendo(it, onClick = abrirLista(TipoConexion.SIGUIENDO)))
                        }
                        gamificacion?.rachaActual?.takeIf { it > 0 }?.let { add(cifraRacha(it)) }
                    }

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = AgoraSpacing.Lg),
                        verticalArrangement = Arrangement.spacedBy(AgoraSpacing.EntreTarjetas),
                    ) {
                        item(key = "cabecera") {
                            CabeceraPortadaPerfil(
                                portadaUrl = p.portadaUrl,
                                nombre = nombreCompleto,
                                fotoUrl = p.fotoUrl,
                            ) {
                                when {
                                    p.restringido -> Unit
                                    esMio -> BotonBorde("Editar perfil", onClick = onAjustes)
                                    else -> {
                                        if (siguiendo) {
                                            BotonBorde(
                                                "Siguiendo",
                                                onClick = { alternarSeguir() },
                                                enabled = !ocupado && !bloqueado,
                                                modifier = Modifier.semantics { contentDescription = "Siguiendo a @$handle" },
                                            )
                                        } else {
                                            BotonTinta(
                                                "Seguir",
                                                onClick = { alternarSeguir() },
                                                enabled = !ocupado && !bloqueado,
                                                modifier = Modifier.semantics { contentDescription = "Seguir a @$handle" },
                                            )
                                        }
                                        BotonBorde(
                                            "Mensaje",
                                            onClick = { escribir() },
                                            enabled = !ocupado && !bloqueado,
                                        )
                                    }
                                }
                            }
                        }

                        item(key = "datos") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = AgoraSpacing.Pantalla),
                                verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Sm),
                            ) {
                                DatosPerfilD(
                                    nombre = nombreCompleto,
                                    verificado = p.verificado,
                                    linea = listOfNotNull("@${p.handle}", p.carrera, p.generacion?.let { "Gen $it" }, p.ciudadOrigen),
                                    lineaSecundaria = listOfNotNull(p.escuela, p.colegio?.let { "Colegio $it" }),
                                    bio = p.bio,
                                    instagram = p.instagram,
                                    intereses = p.intereses,
                                    busco = p.busco,
                                )
                                if (p.suspendido) {
                                    Text(
                                        "Esta cuenta está suspendida.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = AgoraColors.Danger,
                                    )
                                }
                                // Bloquear ahora vive en «…»: sin esta línea, Seguir y Mensaje
                                // apagados no dicen por qué.
                                if (bloqueado && !esMio) {
                                    Text(
                                        "Bloqueaste a esta persona. Para deshacerlo, abre «Más opciones».",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = AgoraColors.TextoMedio,
                                    )
                                }
                                CifrasPerfil(cifras)
                                LoSiguen(p.seguidoresEnComun, p.numSeguidoresEnComun)
                                GamificacionPublicSection(gamificacion = gamificacion)
                            }
                        }

                        if (p.restringido) {
                            item(key = "privado") {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = AgoraSpacing.Tarjeta)
                                        .clip(AgoraCardShape)
                                        .background(AgoraColors.Superficie)
                                        .padding(horizontal = 20.dp, vertical = 24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs),
                                ) {
                                    Icon(
                                        Icons.Outlined.Lock,
                                        contentDescription = null,
                                        tint = AgoraColors.TextoMedio,
                                        modifier = Modifier.size(28.dp),
                                    )
                                    Text(
                                        "Este perfil es privado o no compartes comunidades con esta persona.",
                                        style = MaterialTheme.typography.bodyMedium,
                                        textAlign = TextAlign.Center,
                                        color = AgoraColors.TextoMedio,
                                    )
                                }
                            }
                        } else {
                            item(key = "pestanas") {
                                if (pestanas.size > 1) {
                                    PestanasPerfil(
                                        opciones = pestanas,
                                        seleccion = pestanaActiva,
                                        onSeleccion = { pestana = it },
                                        modifier = Modifier.padding(top = AgoraSpacing.Xxs),
                                    )
                                } else {
                                    TituloSeccion("Publicaciones", modifier = Modifier.padding(top = AgoraSpacing.Xs))
                                }
                            }

                            val falloPublicaciones = errorPublicaciones
                            when {
                                falloPublicaciones != null && publicaciones.isEmpty() -> item(key = "error-publicaciones") {
                                    AgoraErrorState(
                                        message = falloPublicaciones,
                                        title = "No pudimos traer sus publicaciones",
                                        onRetry = { scope.launch { traerPublicaciones() } },
                                        modifier = Modifier.padding(horizontal = AgoraSpacing.Tarjeta),
                                    )
                                }
                                publicaciones.isEmpty() -> item(key = "sin-publicaciones") {
                                    AgoraEmptyState(
                                        state = AgoraCopy.emptyPerfilPublicaciones,
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                }
                                pestanaActiva == 1 -> item(key = "fotos") {
                                    CuadriculaFotos(
                                        fotos = fotos,
                                        onAbrir = abrirPublicacion,
                                        modifier = Modifier.padding(horizontal = AgoraSpacing.Tarjeta),
                                    )
                                }
                                else -> items(publicaciones, key = { it.id }) { pub ->
                                    PublicacionPerfilCard(
                                        pub,
                                        onClick = { abrirPublicacion(pub.id) },
                                        media = pub.media,
                                        modifier = Modifier.padding(horizontal = AgoraSpacing.Tarjeta),
                                    )
                                }
                            }

                            if (cursor != null) {
                                item(key = "cargar-mas") {
                                    Box(
                                        modifier = Modifier.fillMaxWidth(),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        BotonBorde(
                                            if (cargandoMas) "Cargando…" else "Cargar más",
                                            onClick = { cargarMas() },
                                            enabled = !cargandoMas,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Volver y «…» flotan sobre la portada y se quedan a la mano al desplazar.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(AgoraSpacing.Tarjeta),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                if (onCampus != null) {
                    BotonSobrePortada(Icons.Outlined.Menu, "Campus: aventones, directorio y más", onCampus)
                } else {
                    BotonSobrePortada(Icons.AutoMirrored.Outlined.ArrowBack, "Volver", onBack)
                }
                val cargado = perfil
                if (!cargando && error == null && cargado != null) {
                    Box {
                        BotonSobrePortada(Icons.Outlined.MoreHoriz, "Más opciones") { menuAbierto = true }
                        DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                            DropdownMenuItem(
                                text = { Text("Compartir perfil") },
                                leadingIcon = { Icon(Icons.Outlined.Share, contentDescription = null) },
                                onClick = {
                                    menuAbierto = false
                                    compartirEnlace(context, EnlacesWeb.perfil(handle), "@$handle en Ágora")
                                },
                            )
                            if (!esMio && !cargado.restringido) {
                                if (puedeRetar && !bloqueado) {
                                    DropdownMenuItem(
                                        text = { Text("Retar") },
                                        leadingIcon = { Icon(Icons.Outlined.EmojiEvents, contentDescription = null) },
                                        enabled = !ocupado && !enviandoReto,
                                        onClick = {
                                            menuAbierto = false
                                            mostrarDialogRetar = true
                                        },
                                    )
                                }
                                DropdownMenuItem(
                                    text = { Text(if (silenciado) "Quitar silencio" else "Silenciar") },
                                    leadingIcon = {
                                        Icon(
                                            if (silenciado) Icons.Outlined.Notifications else Icons.Outlined.NotificationsOff,
                                            contentDescription = null,
                                        )
                                    },
                                    enabled = !ocupado,
                                    onClick = {
                                        menuAbierto = false
                                        alternarSilencio()
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text(if (bloqueado) "Desbloquear" else "Bloquear") },
                                    leadingIcon = { Icon(Icons.Outlined.Block, contentDescription = null) },
                                    enabled = !ocupado,
                                    colors = if (bloqueado) {
                                        MenuDefaults.itemColors()
                                    } else {
                                        MenuDefaults.itemColors(
                                            textColor = AgoraColors.Danger,
                                            leadingIconColor = AgoraColors.Danger,
                                        )
                                    },
                                    onClick = {
                                        menuAbierto = false
                                        alternarBloqueo()
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/* ---------- Piezas del perfil (diseño D, §4 «Perfil»); «Yo» usa las mismas. ---------- */

internal val AltoPortadaPerfil = 150.dp

/**
 * Portada (o un bloque `superficie-2` del mismo alto, sin degradado) con el avatar
 * de 88 montado sobre su borde inferior y [acciones] a la derecha del avatar.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun CabeceraPortadaPerfil(
    portadaUrl: String?,
    nombre: String,
    fotoUrl: String?,
    modifier: Modifier = Modifier,
    acciones: @Composable () -> Unit = {},
) {
    val portada = ApiClient.resolveUrl(portadaUrl)
    Box(modifier = modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(AltoPortadaPerfil)
                .background(AgoraColors.Superficie2),
        ) {
            if (portada != null) {
                AsyncImage(
                    model = portada,
                    contentDescription = null,
                    modifier = Modifier.matchParentSize(),
                    contentScale = ContentScale.Crop,
                )
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = AltoPortadaPerfil - 42.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(AgoraSpacing.Sm),
        ) {
            // Marco de 4 dp en `fondo`: separa el avatar de la portada en los dos temas.
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(RoundedCornerShape(AgoraRadii.AvatarPerfil + 4.dp))
                    .background(AgoraColors.Fondo)
                    .padding(4.dp),
            ) {
                AgoraAvatar(nombre = nombre, fotoUrl = fotoUrl, size = 88.dp)
            }
            // FlowRow: con letra grande «Siguiendo» y «Mensaje» no caben junto al avatar.
            FlowRow(
                modifier = Modifier
                    .weight(1f)
                    .padding(bottom = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.End),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                acciones()
            }
        }
    }
}

/**
 * Nombre, «@handle · carrera · Gen · ciudad» (solo las piezas que vengan), bio e
 * intereses y «Busca…» como chips de solo lectura.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun DatosPerfilD(
    nombre: String,
    verificado: Boolean,
    linea: List<String>,
    modifier: Modifier = Modifier,
    lineaSecundaria: List<String> = emptyList(),
    bio: String? = null,
    instagram: String? = null,
    intereses: List<String> = emptyList(),
    busco: String? = null,
    /** «Busca» en el perfil ajeno, «Busco» en el mío. */
    prefijoBusco: String = "Busca",
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Sm)) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            if (nombre.isNotBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    // TalkBack dice «perfil verificado» en vez de describir el ícono.
                    modifier = Modifier.clearAndSetSemantics {
                        heading()
                        contentDescription = if (verificado) "$nombre, perfil verificado" else nombre
                    },
                ) {
                    Text(
                        nombre,
                        style = MaterialTheme.typography.headlineMedium,
                        color = AgoraColors.Texto,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (verificado) {
                        Icon(
                            Icons.Outlined.Verified,
                            contentDescription = null,
                            tint = AgoraColors.Naranja,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }
            }
            val datos = linea.filter { it.isNotBlank() }
            if (datos.isNotEmpty()) {
                Text(
                    datos.joinToString(" · "),
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp),
                    color = AgoraColors.TextoMedio,
                )
            }
            val extra = lineaSecundaria.filter { it.isNotBlank() }
            if (extra.isNotEmpty()) {
                Text(
                    extra.joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = AgoraColors.TextoMedio,
                )
            }
        }
        bio?.takeIf { it.isNotBlank() }?.let {
            Text(it, style = MaterialTheme.typography.bodyMedium, color = AgoraColors.Texto)
        }
        instagram?.takeIf { it.isNotBlank() }?.let { cuentaIg ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.clearAndSetSemantics { contentDescription = "Instagram: @$cuentaIg" },
            ) {
                Icon(
                    Icons.Outlined.PhotoCamera,
                    contentDescription = null,
                    tint = AgoraColors.TextoMedio,
                    modifier = Modifier.size(16.dp),
                )
                Text("@$cuentaIg", style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
            }
        }
        val chips = intereses.filter { it.isNotBlank() }
        val buscoLimpio = busco?.trim()?.takeIf { it.isNotEmpty() }
        if (chips.isNotEmpty() || buscoLimpio != null) {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                chips.forEach { ChipLectura(it) }
                buscoLimpio?.let { ChipLectura("$prefijoBusco: $it", destacado = true) }
            }
        }
    }
}

/** Chip que solo informa (intereses, «Busca…»): sin toque, para no parecer un filtro. */
@Composable
private fun ChipLectura(texto: String, destacado: Boolean = false) {
    Text(
        texto,
        style = MaterialTheme.typography.labelLarge.copy(
            fontSize = 13.sp,
            fontWeight = if (destacado) FontWeight.SemiBold else FontWeight.Medium,
        ),
        color = if (destacado) AgoraColors.NaranjaTinta else AgoraColors.Texto,
        modifier = Modifier
            .clip(AgoraChipShape)
            .background(if (destacado) AgoraColors.NaranjaSuave else AgoraColors.Superficie2)
            .padding(horizontal = 10.dp, vertical = 6.dp),
    )
}

/** Una cifra del perfil: [etiqueta] se ve bajo el número, [descripcion] la lee TalkBack. */
internal class CifraPerfil(
    val valor: Int,
    val etiqueta: String,
    val descripcion: String,
    val conFuego: Boolean = false,
    val onClick: (() -> Unit)? = null,
)

internal fun cifraConteo(n: Int, singular: String, plural: String, onClick: (() -> Unit)? = null): CifraPerfil {
    val texto = cuenta(n, singular, plural)
    return CifraPerfil(n, texto.substringAfter(' '), texto, onClick = onClick)
}

internal fun cifraSiguiendo(n: Int, onClick: (() -> Unit)? = null): CifraPerfil =
    CifraPerfil(n, "siguiendo", "Sigue a ${cuenta(n, "persona", "personas")}", onClick = onClick)

internal fun cifraRacha(dias: Int): CifraPerfil =
    CifraPerfil(dias, "racha", "Racha de ${cuenta(dias, "día", "días")}", conFuego = true)

/** Publicaciones, seguidores, siguiendo y racha: solo las que dio la API. */
@Composable
internal fun CifrasPerfil(cifras: List<CifraPerfil>, modifier: Modifier = Modifier) {
    if (cifras.isEmpty()) return
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(AgoraColors.Superficie)
            .padding(4.dp),
    ) {
        cifras.forEach { cifra ->
            val abrir = cifra.onClick
            Column(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 56.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .then(
                        if (abrir != null) {
                            Modifier.clickable(role = Role.Button, onClickLabel = "Ver lista", onClick = abrir)
                        } else {
                            Modifier
                        },
                    )
                    .semantics(mergeDescendants = true) { contentDescription = cifra.descripcion }
                    .padding(vertical = 8.dp, horizontal = 2.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    if (cifra.conFuego) {
                        Icon(
                            Icons.Outlined.LocalFireDepartment,
                            contentDescription = null,
                            tint = AgoraColors.Naranja,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                    Text(
                        cifra.valor.toString(),
                        fontFamily = AgoraFonts.titulo,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 20.sp,
                        lineHeight = 24.sp,
                        color = AgoraColors.Texto,
                        modifier = Modifier.clearAndSetSemantics {},
                    )
                }
                Text(
                    cifra.etiqueta,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp),
                    color = AgoraColors.TextoMedio,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.clearAndSetSemantics {},
                )
            }
        }
    }
}

/** «Lo siguen Ana y Luis» con sus avatares; sin seguidores en común no se muestra. */
@Composable
private fun LoSiguen(personas: List<PersonaResumenDto>, total: Int, modifier: Modifier = Modifier) {
    val texto = textoLoSiguen(personas, total) ?: return
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(AgoraColors.Superficie)
            .padding(horizontal = 12.dp, vertical = 10.dp)
            .semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs),
    ) {
        val visibles = personas.take(3)
        if (visibles.isNotEmpty()) {
            // AvataresApilados encima 10 dp pero mide el ancho completo: se recorta
            // el sobrante para que el texto no quede lejos.
            Box(Modifier.width(24.dp + 14.dp * (visibles.size - 1))) {
                AvataresApilados(
                    personas = visibles.map { it.nombre to it.fotoUrl },
                    modifier = Modifier.wrapContentWidth(Alignment.Start, unbounded = true),
                    tamano = 24.dp,
                )
            }
        }
        Text(
            texto,
            style = MaterialTheme.typography.bodySmall,
            color = AgoraColors.TextoMedio,
            modifier = Modifier.weight(1f),
        )
    }
}

/**
 * «Lo sigue Ana», «Lo siguen Ana y Luis», «Lo siguen Ana, Luis y 3 más». Los
 * nombres van en tinta; el total sale de `numSeguidoresEnComun`.
 */
private fun textoLoSiguen(personas: List<PersonaResumenDto>, totalApi: Int): AnnotatedString? {
    val total = maxOf(totalApi, personas.size)
    if (total <= 0) return null
    val nombres = personas.map { it.nombre.trim().substringBefore(' ') }.filter { it.isNotBlank() }
    // Si la API mandó a todos (hasta 3), van todos; si hay más, dos nombres y «N más».
    val visibles = if (nombres.size >= total) nombres.take(3) else nombres.take(2)
    val resto = total - visibles.size
    val tinta = SpanStyle(color = AgoraColors.Texto, fontWeight = FontWeight.SemiBold)
    return buildAnnotatedString {
        append(if (total == 1) "Lo sigue " else "Lo siguen ")
        if (visibles.isEmpty()) {
            append(cuenta(total, "persona que sigues", "personas que sigues"))
            return@buildAnnotatedString
        }
        visibles.forEachIndexed { i, nombre ->
            if (i > 0) {
                val esUltimo = i == visibles.lastIndex && resto == 0
                append(if (esUltimo) " ${conjuncionY(nombre)} " else ", ")
            }
            withStyle(tinta) { append(nombre) }
        }
        if (resto > 0) append(" y $resto más")
    }
}

/** «e» ante sonido /i/ («Renata e Isabella»), salvo diptongo («y Hierro»). */
private fun conjuncionY(siguiente: String): String {
    val s = siguiente.lowercase(Locale("es", "MX"))
    val sonidoI = s.startsWith("i") || s.startsWith("í") ||
        (s.startsWith("hi") && s.getOrNull(2)?.let { it !in "aeiouáéíóú" } != false)
    return if (sonidoI) "e" else "y"
}

/** Pestañas Publicaciones / Fotos: la activa en `tinta`, las demás con borde. */
@Composable
private fun PestanasPerfil(
    opciones: List<String>,
    seleccion: Int,
    onSeleccion: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = AgoraSpacing.Pantalla)
            .selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        opciones.forEachIndexed { i, texto ->
            val activa = i == seleccion
            Box(
                modifier = Modifier
                    .heightIn(min = 48.dp)
                    .selectable(selected = activa, role = Role.Tab, onClick = { onSeleccion(i) }),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    texto,
                    style = MaterialTheme.typography.labelLarge.copy(
                        fontWeight = if (activa) FontWeight.SemiBold else FontWeight.Medium,
                    ),
                    color = if (activa) AgoraColors.Fondo else AgoraColors.Texto,
                    maxLines = 1,
                    modifier = Modifier
                        .heightIn(min = 38.dp)
                        .clip(AgoraChipShape)
                        .background(if (activa) AgoraColors.Texto else AgoraColors.Superficie)
                        .then(if (activa) Modifier else Modifier.border(1.dp, AgoraColors.Borde, AgoraChipShape))
                        .padding(horizontal = 14.dp, vertical = 9.dp),
                )
            }
        }
    }
}

/** Fotos de sus publicaciones en cuadrícula de 3; tocar una abre la publicación. */
@Composable
private fun CuadriculaFotos(
    fotos: List<Pair<String, MediaDto>>,
    onAbrir: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        fotos.chunked(3).forEach { fila ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                fila.forEach { (postId, media) ->
                    AsyncImage(
                        model = ApiClient.resolveUrl(media.url),
                        contentDescription = "Foto de una publicación",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(AgoraColors.Superficie2)
                            .clickable(role = Role.Button, onClickLabel = "Abrir publicación") { onAbrir(postId) },
                    )
                }
                repeat(3 - fila.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

/** Volver y «…» sobre la portada: `superficie` translúcida, se lee sobre foto y sin ella. */
@Composable
private fun BotonSobrePortada(icono: ImageVector, descripcion: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(AgoraButtonShape)
            .background(AgoraColors.Superficie.copy(alpha = 0.92f))
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = descripcion },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icono, contentDescription = null, tint = AgoraColors.Texto, modifier = Modifier.size(22.dp))
    }
}

/** Opción del diálogo de reto: ícono de línea en vez del emoji de antes. */
@Composable
private fun OpcionReto(
    icono: ImageVector,
    titulo: String,
    detalle: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clip(AgoraButtonShape)
            .border(1.dp, AgoraColors.Borde, AgoraButtonShape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AgoraSpacing.Sm),
    ) {
        Icon(icono, contentDescription = null, tint = AgoraColors.Naranja, modifier = Modifier.size(22.dp))
        Column {
            Text(
                titulo,
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                color = AgoraColors.Texto,
            )
            Text(detalle, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
        }
    }
}

/** "N seguidores" / "N siguiendo" tocable (abre la lista) cuando el perfil es visible. */
@Composable
internal fun ContadorConexion(
    texto: String,
    habilitado: Boolean,
    onClick: () -> Unit,
) {
    // Área táctil de 48dp; el texto queda centrado y se ve igual que antes.
    Box(
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(6.dp))
            .clickable(enabled = habilitado, role = Role.Button, onClickLabel = "Ver lista", onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = if (habilitado) FontWeight.SemiBold else FontWeight.Normal,
            color = if (habilitado) AgoraColors.NaranjaTinta else AgoraColors.Texto,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
        )
    }
}

private val HASHTAG = Regex("#[\\p{L}\\p{N}_]{2,40}")

/** #hashtags en `naranja-tinta`; el toque es de la tarjeta, que abre el detalle. */
@Composable
private fun textoConEtiquetas(texto: String): AnnotatedString {
    val tinta = AgoraColors.NaranjaTinta
    return remember(texto, tinta) {
        buildAnnotatedString {
            var ultimo = 0
            HASHTAG.findAll(texto).forEach { m ->
                append(texto.substring(ultimo, m.range.first))
                withStyle(SpanStyle(color = tinta, fontWeight = FontWeight.SemiBold)) { append(m.value) }
                ultimo = m.range.last + 1
            }
            append(texto.substring(ultimo))
        }
    }
}

/**
 * Publicación en la lista de un perfil (también la usa «Yo»). Tocarla abre el
 * detalle. [media] son las fotos y videos de `perfil/{handle}/publicaciones`
 * (`pub.media`), pintados con [PostMediaGrid]. La API del perfil da el total de
 * reacciones, no el desglose por tipo: por eso no lleva los chips del feed.
 */
@Composable
internal fun PublicacionPerfilCard(
    pub: PerfilPublicacionDto,
    onClick: () -> Unit,
    media: List<MediaDto> = emptyList(),
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(AgoraCardShape)
            .background(AgoraColors.Superficie)
            .clickable(role = Role.Button, onClickLabel = "Abrir publicación", onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs),
    ) {
        Text(
            listOf(pub.comunidad, haceCuanto(pub.createdAt)).filter { it.isNotBlank() }.joinToString(" · "),
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Medium),
            color = AgoraColors.TextoMedio,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (pub.texto.isNotBlank()) {
            Text(
                textoConEtiquetas(pub.texto),
                style = MaterialTheme.typography.bodyMedium,
                color = AgoraColors.Texto,
                maxLines = 4,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (media.isNotEmpty()) {
            PostMediaGrid(
                media = media,
                postId = pub.id,
            )
        }
        Text(
            "${cuenta(pub.numReactions, "reacción", "reacciones")} · ${cuenta(pub.numComments, "comentario", "comentarios")}",
            style = MaterialTheme.typography.bodySmall,
            color = AgoraColors.TextoMedio,
        )
    }
}
