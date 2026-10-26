package mx.agora.mobile.nativeapp.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.NetworkMonitor
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ComunidadDto
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.api.ModeracionApi
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.PostDto
import mx.agora.mobile.nativeapp.data.api.RetirarPostRequest
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.data.local.OfflineCache
import mx.agora.mobile.nativeapp.ui.components.AgoraAvatar
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraFeedSkeleton
import mx.agora.mobile.nativeapp.ui.components.AgoraPieErrorPagina
import mx.agora.mobile.nativeapp.ui.components.AhoraEnCampus
import mx.agora.mobile.nativeapp.ui.components.CarruselFeed
import mx.agora.mobile.nativeapp.ui.components.ChipD
import mx.agora.mobile.nativeapp.ui.components.FilaClips
import mx.agora.mobile.nativeapp.ui.components.MiniEvento
import mx.agora.mobile.nativeapp.ui.components.OfflineBanner
import mx.agora.mobile.nativeapp.ui.components.PostCard
import mx.agora.mobile.nativeapp.ui.components.PreguntaDelDiaBanner
import mx.agora.mobile.nativeapp.ui.components.RetirarPostDialogo
import mx.agora.mobile.nativeapp.ui.components.Segmento
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.AgoraPullToRefreshBox
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import retrofit2.HttpException

/** Plaza general del campus: en el segmento es «Campus», no un chip más. */
private const val SLUG_CAMPUS = "universidad:udlap"

/** Separación entre bloques del inicio (diseño D). */
private val Hueco = AgoraSpacing.EntreTarjetas

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    tokenProvider: () -> String?,
    reloadKey: Int = 0,
    onPostClick: (String) -> Unit = {},
    onHashtagClick: (String) -> Unit = {},
    onAuthorClick: (String) -> Unit = {},
    onEventoClick: (String) -> Unit = {},
    mensajesSinLeer: Int = 0,
    avisosSinLeer: Int = 0,
    onMensajes: () -> Unit = {},
    onAvisos: () -> Unit = {},
    onMiPerfil: () -> Unit = {},
    onVerClips: () -> Unit = {},
    onAventones: (() -> Unit)? = null,
) {
    var posts by remember { mutableStateOf<List<PostDto>>(emptyList()) }
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(true) }
    var cargandoMas by remember { mutableStateOf(false) }
    var refrescando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Falló la siguiente página: se enseña al pie con «Reintentar». */
    var errorMas by remember { mutableStateOf<String?>(null) }
    var comunidades by remember { mutableStateOf<List<ComunidadDto>>(emptyList()) }
    var comunidadSlug by remember { mutableStateOf<String?>(null) }
    var siguiendo by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    var activePostId by remember { mutableStateOf<String?>(null) }
    var sinConexion by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val offlineCache = remember { OfflineCache.get(context) }
    var puedeModerar by remember { mutableStateOf(false) }
    var retirandoId by remember { mutableStateOf<String?>(null) }
    var enviandoRetiro by remember { mutableStateOf(false) }
    var yo by remember { mutableStateOf<YoResponse?>(null) }
    var racha by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        yo = YoCache.obtener(tokenProvider)
        puedeModerar = yo?.puedeModerar == true
    }

    // La racha va en la insignia del avatar; si falla, el avatar sale sin ella.
    LaunchedEffect(reloadKey) {
        racha = runCatching { ApiClient.api<GamificacionApi>(tokenProvider).mio().rachaActual }
            .getOrDefault(racha)
    }

    fun retirar(postId: String, motivo: String) {
        scope.launch {
            enviandoRetiro = true
            try {
                val resp = ApiClient.api<ModeracionApi>(tokenProvider)
                    .retirarPost(postId, RetirarPostRequest(motivo))
                if (!resp.isSuccessful) throw HttpException(resp)
                posts = posts.filter { it.id != postId }
                retirandoId = null
                Toast.makeText(context, "Publicación retirada.", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                val msg = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
                Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
            } finally {
                enviandoRetiro = false
            }
        }
    }

    val finCercano by remember {
        derivedStateOf {
            val info = listState.layoutInfo
            val ultimo = info.visibleItemsInfo.lastOrNull()?.index ?: 0
            ultimo >= info.totalItemsCount - 3
        }
    }

    /** Falló traer mis comunidades: se reintenta al volver la red o al jalar para refrescar. */
    var comunidadesPendientes by remember { mutableStateOf(false) }

    fun cargarComunidades() {
        scope.launch {
            try {
                comunidades = ApiClient.api<PerfilApi>(tokenProvider).misComunidades()
                comunidadesPendientes = false
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                comunidadesPendientes = true
            }
        }
    }

    LaunchedEffect(Unit) {
        sinConexion = !NetworkMonitor.isOnline(context)
        cargarComunidades()
    }

    LaunchedEffect(Unit) {
        NetworkMonitor.connectivityFlow(context).collect { online ->
            sinConexion = !online
            if (online && comunidadesPendientes) cargarComunidades()
        }
    }

    suspend fun cargarCache() {
        offlineCache.loadFeed()?.let { cached ->
            posts = cached.publicaciones
            cursor = cached.siguienteCursor
            error = null
        }
    }

    fun traer(desde: String?, reemplazar: Boolean, refresh: Boolean = false) {
        scope.launch {
            val online = NetworkMonitor.isOnline(context)
            sinConexion = !online
            if (!online && reemplazar) {
                cargando = true
                cargarCache()
                // Sin red y sin caché no es un feed «tranquilo»: estado de error con «Reintentar».
                if (posts.isEmpty()) error = AgoraCopy.errors.network
                cargando = false
                refrescando = false
                return@launch
            }
            if (refresh) refrescando = true
            else if (desde == null) cargando = true
            else cargandoMas = true
            error = null
            errorMas = null
            try {
                val api = ApiClient.feedApi(tokenProvider)
                val resp = api.feed(
                    cursor = desde,
                    comunidadSlug = comunidadSlug,
                    siguiendo = if (siguiendo) "true" else null,
                )
                posts = if (reemplazar) resp.publicaciones else posts + resp.publicaciones
                cursor = resp.siguienteCursor
                if (reemplazar && desde == null) {
                    offlineCache.saveFeed(resp)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (reemplazar) {
                    // Lo que ya está en pantalla se queda; la caché solo si no hay nada.
                    if (posts.isEmpty()) cargarCache()
                    if (posts.isEmpty()) {
                        error = mensajeDe(e)
                    } else {
                        // Hay lista en pantalla: no se tapa, pero se avisa.
                        Toast.makeText(context, mensajeDe(e), Toast.LENGTH_SHORT).show()
                    }
                } else {
                    // Falló la siguiente página: pie con el motivo y «Reintentar».
                    // Además frena el scroll infinito para que no reintente en bucle.
                    errorMas = mensajeDe(e)
                }
            } finally {
                cargando = false
                refrescando = false
                cargandoMas = false
            }
        }
    }

    LaunchedEffect(reloadKey, comunidadSlug, siguiendo) {
        traer(desde = null, reemplazar = true)
    }

    LaunchedEffect(listState, posts) {
        snapshotFlow { listState.layoutInfo to posts }
            .collect { (layoutInfo, currentPosts) ->
                if (currentPosts.isEmpty()) {
                    activePostId = null
                    return@collect
                }
                val viewportStart = layoutInfo.viewportStartOffset
                val viewportEnd = layoutInfo.viewportEndOffset
                // Por key y no por índice: así no depende de cuántos items
                // (encabezado, pregunta, clips, mini evento) van antes o entre los posts.
                val idsPosts = currentPosts.mapTo(HashSet()) { it.id }

                val mostVisible = layoutInfo.visibleItemsInfo
                    .filter { item -> item.key in idsPosts }
                    .maxByOrNull { item ->
                        val itemStart = item.offset
                        val itemEnd = item.offset + item.size
                        val visibleStart = maxOf(itemStart, viewportStart)
                        val visibleEnd = minOf(itemEnd, viewportEnd)
                        visibleEnd - visibleStart
                    }

                activePostId = mostVisible?.key as? String
            }
    }

    LaunchedEffect(finCercano, cursor, cargandoMas, cargando, errorMas) {
        snapshotFlow { finCercano }
            .distinctUntilChanged()
            .collect { cerca ->
                if (cerca && cursor != null && !cargandoMas && !cargando && errorMas == null) {
                    traer(desde = cursor, reemplazar = false)
                }
            }
    }

    val miCarrera = comunidades.firstOrNull { it.tipo == "CARRERA" && !it.silenciada }
    // El segmento cubre Campus, Mi carrera y Siguiendo; las demás comunidades
    // (generación, colegio…) quedan como chips debajo.
    val otrasComunidades = comunidades.filter {
        !it.silenciada && it.slug != SLUG_CAMPUS && it.slug != miCarrera?.slug
    }
    // Clips y mini evento se intercalan entre publicaciones (docs/diseno-d.md §4).
    val clipsTras = minOf(2, posts.lastIndex)
    val eventoTras = minOf(6, posts.lastIndex)
    val margenTarjeta = Modifier.padding(start = AgoraSpacing.Tarjeta, end = AgoraSpacing.Tarjeta, bottom = Hueco)

    AgoraPullToRefreshBox(
        isRefreshing = refrescando,
        onRefresh = {
            if (comunidadesPendientes) cargarComunidades()
            traer(null, reemplazar = true, refresh = true)
        },
        modifier = Modifier.fillMaxSize(),
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = AgoraSpacing.Lg),
        ) {
            item(key = "cabeza") {
                EncabezadoInicio(
                    nombre = yo?.nombre ?: yo?.handle,
                    fotoUrl = yo?.fotoUrl,
                    racha = racha,
                    mensajesSinLeer = mensajesSinLeer,
                    avisosSinLeer = avisosSinLeer,
                    onMensajes = onMensajes,
                    onAvisos = onAvisos,
                    onMiPerfil = onMiPerfil,
                )
            }

            item(key = "segmento") {
                val opciones = buildList {
                    add("Campus")
                    if (miCarrera != null) add("Mi carrera")
                    add("Siguiendo")
                }
                val seleccion = when {
                    siguiendo -> opciones.lastIndex
                    comunidadSlug == null -> 0
                    miCarrera != null && comunidadSlug == miCarrera.slug -> 1
                    // Una comunidad de los chips: ninguna opción del segmento activa.
                    else -> -1
                }
                Segmento(
                    opciones = opciones,
                    seleccion = seleccion,
                    onSeleccion = { i ->
                        when (opciones[i]) {
                            "Siguiendo" -> {
                                siguiendo = true
                                comunidadSlug = null
                            }
                            "Mi carrera" -> {
                                siguiendo = false
                                comunidadSlug = miCarrera?.slug
                            }
                            else -> {
                                siguiendo = false
                                comunidadSlug = null
                            }
                        }
                    },
                    descripcion = "Qué ver",
                    modifier = Modifier.padding(bottom = Hueco),
                )
            }

            if (otrasComunidades.isNotEmpty()) {
                item(key = "comunidades") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = AgoraSpacing.Pantalla)
                            .padding(bottom = Hueco - 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs),
                    ) {
                        otrasComunidades.forEach { c ->
                            val activa = !siguiendo && comunidadSlug == c.slug
                            ChipD(
                                texto = c.nombre,
                                activo = activa,
                                onClick = {
                                    siguiendo = false
                                    // Tocar la activa regresa a todo el campus.
                                    comunidadSlug = if (activa) null else c.slug
                                },
                            )
                        }
                    }
                }
            }

            if (sinConexion) {
                item(key = "offline") {
                    OfflineBanner(modifier = margenTarjeta)
                }
            }

            item(key = "ahora") {
                AhoraEnCampus(
                    tokenProvider = tokenProvider,
                    onEventoClick = onEventoClick,
                    modifier = Modifier.padding(bottom = Hueco),
                    onAventonesClick = onAventones,
                )
            }

            item(key = "pregunta") {
                PreguntaDelDiaBanner(tokenProvider = tokenProvider, modifier = margenTarjeta)
            }

            // «Tu día»: pulso, racha, retos y ranking en un carrusel que no estorba.
            item(key = "tu-dia") {
                CarruselFeed(
                    tokenProvider = tokenProvider,
                    onHashtagClick = onHashtagClick,
                    onPerfilClick = onAuthorClick,
                    modifier = Modifier.padding(bottom = Hueco - AgoraSpacing.Xxs),
                )
            }

            when {
                cargando && posts.isEmpty() -> item(key = "cargando") {
                    AgoraFeedSkeleton()
                }
                error != null && posts.isEmpty() -> item(key = "error") {
                    AgoraErrorState(
                        message = error!!,
                        onRetry = { traer(null, reemplazar = true) },
                        modifier = Modifier.padding(top = AgoraSpacing.Lg),
                    )
                }
                posts.isEmpty() -> item(key = "vacio") {
                    AgoraEmptyState(
                        state = AgoraCopy.emptyFeed,
                        modifier = Modifier.padding(top = AgoraSpacing.Lg, bottom = AgoraSpacing.Md),
                    )
                }
            }

            posts.forEachIndexed { i, post ->
                item(key = post.id) {
                    PostCard(
                        post = post,
                        tokenProvider = tokenProvider,
                        onPostClick = { onPostClick(post.id) },
                        onHashtagClick = onHashtagClick,
                        onAuthorClick = post.autor?.handle?.let { handle ->
                            { onAuthorClick(handle) }
                        },
                        isActive = post.id == activePostId,
                        onMentionClick = onAuthorClick,
                        onRetirar = if (puedeModerar) {
                            { retirandoId = post.id }
                        } else {
                            null
                        },
                        modifier = margenTarjeta,
                    )
                }
                if (i == clipsTras) {
                    item(key = "clips") {
                        FilaClips(
                            tokenProvider = tokenProvider,
                            onVerTodos = onVerClips,
                            onClipClick = { onVerClips() },
                            modifier = Modifier.padding(bottom = Hueco),
                        )
                    }
                }
                if (i == eventoTras) {
                    item(key = "mini-evento") {
                        MiniEvento(
                            tokenProvider = tokenProvider,
                            onEventoClick = onEventoClick,
                            modifier = margenTarjeta,
                        )
                    }
                }
            }

            if (cargandoMas) {
                item(key = "pie") {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = AgoraSpacing.Md),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
            } else if (errorMas != null && cursor != null) {
                item(key = "pie_error") {
                    AgoraPieErrorPagina(
                        mensaje = errorMas!!,
                        onReintentar = { traer(desde = cursor, reemplazar = false) },
                    )
                }
            }
        }
        // Al cambiar de filtro la lista anterior sigue: que se note que carga.
        if (cargando && posts.isNotEmpty()) {
            LinearProgressIndicator(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter),
            )
        }
    }

    retirandoId?.let { postId ->
        RetirarPostDialogo(
            enviando = enviandoRetiro,
            onConfirmar = { motivo -> retirar(postId, motivo) },
            onCerrar = { retirandoId = null },
        )
    }
}

private val zonaMx = ZoneId.of("America/Mexico_City")
private val formatoHoy = DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", Locale("es", "MX"))

/**
 * «Lunes 26 de octubre». La guía pide también la semana del semestre, pero no hay
 * fecha oficial de inicio de clases en la API: sin ella no se inventa (igual que la web).
 */
private fun textoDeHoy(): String {
    val texto = formatoHoy.format(ZonedDateTime.now(zonaMx))
    return texto.replaceFirstChar { it.titlecase(Locale("es", "MX")) }
}

/** Encabezado del inicio (diseño D): marca y fecha; a la derecha mensajes, avisos y tu avatar con la racha. */
@Composable
private fun EncabezadoInicio(
    nombre: String?,
    fotoUrl: String?,
    racha: Int,
    mensajesSinLeer: Int,
    avisosSinLeer: Int,
    onMensajes: () -> Unit,
    onAvisos: () -> Unit,
    onMiPerfil: () -> Unit,
) {
    val hoy = remember { textoDeHoy() }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = 16.dp, bottom = Hueco),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                "Ágora",
                style = MaterialTheme.typography.headlineLarge,
                color = AgoraColors.Texto,
                modifier = Modifier.semantics { heading() },
            )
            Text(hoy, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BotonEncabezado(
                icono = Icons.AutoMirrored.Outlined.Send,
                nombre = "Mensajes",
                sinLeer = mensajesSinLeer,
                onClick = onMensajes,
            )
            BotonEncabezado(
                icono = Icons.Outlined.Notifications,
                nombre = "Avisos",
                sinLeer = avisosSinLeer,
                onClick = onAvisos,
            )
            AvatarConRacha(nombre = nombre, fotoUrl = fotoUrl, racha = racha, onClick = onMiPerfil)
        }
    }
}

/** Botón cuadrado de 44 con borde y contador naranja encimado en la esquina. */
@Composable
private fun BotonEncabezado(
    icono: ImageVector,
    nombre: String,
    sinLeer: Int,
    onClick: () -> Unit,
) {
    val descripcion = if (sinLeer > 0) "$nombre, $sinLeer sin leer" else nombre
    Box(
        modifier = Modifier.semantics(mergeDescendants = true) {
            contentDescription = descripcion
            role = Role.Button
        },
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(AgoraColors.Superficie)
                .border(1.dp, AgoraColors.Borde, RoundedCornerShape(14.dp))
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icono, contentDescription = null, tint = AgoraColors.Texto, modifier = Modifier.size(20.dp))
        }
        if (sinLeer > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = 4.dp, y = (-4).dp)
                    .heightIn(min = 18.dp)
                    .widthIn(min = 18.dp)
                    .clip(RoundedCornerShape(9.dp))
                    .background(AgoraColors.Naranja)
                    .border(2.dp, AgoraColors.Fondo, RoundedCornerShape(9.dp))
                    .padding(horizontal = 4.dp)
                    .clearAndSetSemantics {},
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (sinLeer > 9) "9+" else sinLeer.toString(),
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

/** Tu avatar (abre tu perfil) con la insignia de racha: llama + días, solo si hay racha. */
@Composable
private fun AvatarConRacha(
    nombre: String?,
    fotoUrl: String?,
    racha: Int,
    onClick: () -> Unit,
) {
    val descripcion = if (racha > 0) {
        "Tu perfil, racha de ${cuenta(racha, "día", "días")}"
    } else {
        "Tu perfil"
    }
    Box(
        modifier = Modifier.semantics(mergeDescendants = true) {
            contentDescription = descripcion
            role = Role.Button
        },
    ) {
        AgoraAvatar(
            nombre = nombre,
            fotoUrl = fotoUrl,
            size = 44.dp,
            modifier = Modifier
                .clearAndSetSemantics {}
                .clickable(onClick = onClick),
        )
        if (racha > 0) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = 6.dp, y = 6.dp)
                    .clip(RoundedCornerShape(50))
                    .background(AgoraColors.Oscuro)
                    .border(2.dp, AgoraColors.Fondo, RoundedCornerShape(50))
                    .padding(start = 3.dp, end = 5.dp, top = 1.dp, bottom = 1.dp)
                    .clearAndSetSemantics {},
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Rounded.LocalFireDepartment,
                    contentDescription = null,
                    tint = Color(0xFFFF8A4C),
                    modifier = Modifier.size(11.dp),
                )
                Text(racha.toString(), color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
