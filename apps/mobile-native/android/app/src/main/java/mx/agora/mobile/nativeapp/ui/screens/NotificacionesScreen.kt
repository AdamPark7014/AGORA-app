package mx.agora.mobile.nativeapp.ui.screens

import mx.agora.mobile.nativeapp.ui.util.haceCuanto
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.background
import androidx.compose.ui.graphics.Color
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.components.Sello
import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.NotificacionDto
import mx.agora.mobile.nativeapp.data.api.NotificacionesApi
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.AgoraEstadoDesplazable
import mx.agora.mobile.nativeapp.ui.components.AgoraPieErrorPagina
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.formatearFecha
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificacionesScreen(
    tokenProvider: () -> String?,
    onNavigateUrl: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var notificaciones by remember { mutableStateOf<List<NotificacionDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(true) }
    var refrescando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Cursor de la siguiente página (la API pagina de 30 en 30). */
    var cursor by remember { mutableStateOf<String?>(null) }
    var cargandoMas by remember { mutableStateOf(false) }
    var errorMas by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    fun cargarMas() {
        val desde = cursor ?: return
        if (cargandoMas) return
        scope.launch {
            cargandoMas = true
            errorMas = null
            try {
                val resp = ApiClient.api<NotificacionesApi>(tokenProvider).listar(cursor = desde)
                val vistos = notificaciones.mapTo(HashSet()) { it.id }
                notificaciones = notificaciones + resp.notificaciones.filter { it.id !in vistos }
                cursor = resp.siguienteCursor
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMas = mensajeDe(e)
            } finally {
                cargandoMas = false
            }
        }
    }

    fun cargar(refresh: Boolean = false) {
        scope.launch {
            if (refresh) refrescando = true else cargando = true
            error = null
            try {
                val api = ApiClient.api<NotificacionesApi>(tokenProvider)
                val resp = api.listar()
                notificaciones = resp.notificaciones
                cursor = resp.siguienteCursor
                errorMas = null
                runCatching { api.marcarLeidas() }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val mensaje = mensajeDe(e)
                error = mensaje
                // Con lista en pantalla el error no se pinta encima: se avisa.
                if (refresh && notificaciones.isNotEmpty()) {
                    Toast.makeText(context, mensaje, Toast.LENGTH_SHORT).show()
                }
            } finally {
                cargando = false
                refrescando = false
            }
        }
    }

    LaunchedEffect(Unit) { cargar() }

    AgoraPullToRefreshBox(
        isRefreshing = refrescando,
        onRefresh = { cargar(refresh = true) },
        modifier = modifier.fillMaxSize(),
    ) {
        when {
            cargando && notificaciones.isEmpty() -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            // Desplazables para que el jalón de refrescar funcione aunque no haya lista.
            error != null && notificaciones.isEmpty() -> {
                AgoraEstadoDesplazable {
                    AgoraErrorState(
                        message = error!!,
                        title = "No pudimos traer tus avisos",
                        onRetry = { cargar() },
                    )
                }
            }
            notificaciones.isEmpty() -> {
                AgoraEstadoDesplazable {
                    AgoraEmptyState(state = AgoraCopy.emptyNotificaciones)
                }
            }
            else -> {
                // B «Cholula» (WowB-Avisos): sello por tipo y los del mismo tipo sobre lo mismo, juntos.
                val grupos = agruparAvisos(notificaciones)
                LazyColumn(contentPadding = PaddingValues(bottom = 12.dp)) {
                    items(grupos, key = { it.id }) { grupo ->
                        FilaAviso(grupo, onNavigateUrl)
                    }
                    if (cursor != null) {
                        item(key = "mas") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                when {
                                    cargandoMas -> CircularProgressIndicator()
                                    errorMas != null -> AgoraPieErrorPagina(
                                        mensaje = errorMas!!,
                                        onReintentar = { cargarMas() },
                                    )
                                    // Llegar al final pide la siguiente página.
                                    else -> LaunchedEffect(cursor) { cargarMas() }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Avisos del mismo tipo sobre la misma cosa (misma publicación o conversación; seguidores, el mismo
 * día), con quiénes fueron. Uno solo se queda con su texto original. Paridad con `GrupoAvisos` de iOS.
 */
internal class GrupoAvisos(val avisos: List<NotificacionDto>) {
    private val principal get() = avisos.first()
    val id: String get() = principal.id
    val tipo: String get() = principal.tipo
    val createdAt: String get() = principal.createdAt
    val url: String? get() = principal.url
    val leida: Boolean get() = avisos.all { it.leida }

    /** Nombres de pila distintos, del más reciente al más viejo. */
    private val nombres: List<String>
        get() = avisos.mapNotNull { it.actor?.nombre?.trim()?.substringBefore(' ')?.takeIf { n -> n.isNotBlank() } }.distinct()

    /** «Diego», «Diego e Isa», «Diego, Isa y 3 más». */
    private val quienes: String?
        get() {
            val lista = nombres
            val primero = lista.firstOrNull() ?: return null
            if (lista.size == 1) return primero
            val segundo = lista[1]
            if (lista.size == 2) {
                val y = if (segundo.lowercase().startsWith("i") || segundo.lowercase().startsWith("hi")) "e" else "y"
                return "$primero $y $segundo"
            }
            return "$primero, $segundo y ${lista.size - 2} más"
        }

    /** Texto del grupo; si no hay varias personas, el del aviso tal cual llegó. */
    val texto: String
        get() {
            val q = quienes
            if (nombres.size < 2 || q == null) return principal.texto
            return when (tipo) {
                "REACCION" -> "A $q les gustó tu publicación"
                "COMENTARIO" -> "$q comentaron tu publicación"
                "MENCION" -> "$q te mencionaron"
                "SEGUIDOR" -> "$q empezaron a seguirte"
                "MENSAJE" -> "$q te escribieron"
                else -> principal.texto
            }
        }
}

private val tiposAgrupables = setOf("REACCION", "COMENTARIO", "MENCION", "SEGUIDOR", "MENSAJE")

/** Conserva el orden de llegada: el grupo va donde está su aviso más reciente. */
internal fun agruparAvisos(avisos: List<NotificacionDto>): List<GrupoAvisos> {
    val porLlave = LinkedHashMap<String, MutableList<NotificacionDto>>()
    avisos.forEach { aviso ->
        val llave = if (aviso.tipo in tiposAgrupables) {
            val sobre = if (aviso.tipo == "SEGUIDOR") aviso.createdAt.take(10) else (aviso.url ?: aviso.id)
            "${aviso.tipo}|$sobre"
        } else {
            aviso.id
        }
        porLlave.getOrPut(llave) { mutableListOf() }.add(aviso)
    }
    return porLlave.values.map { GrupoAvisos(it) }
}

/** Sello por tipo: texto corto en mayúsculas, fondo y tinta (mismo catálogo que iOS). */
internal fun selloAviso(tipo: String): Triple<String, Color, Color> = when (tipo) {
    "REACCION" -> Triple("LATE", AgoraColors.Adobe, Color.White)
    "COMENTARIO" -> Triple("COMENTA", AgoraColors.Talavera, Color.White)
    "MENCION" -> Triple("TE NOMBRA", AgoraColors.Talavera, Color.White)
    "MENSAJE" -> Triple("MENSAJE", AgoraColors.Jade, Color.White)
    "EVENTO_NUEVO", "EVENTO_RECORDATORIO" -> Triple("EVENTO", AgoraColors.Jade, Color.White)
    "AVENTON_APARTADO", "AVENTON_CANCELADO", "AVENTON_RECORDATORIO" -> Triple("AVENTÓN", AgoraColors.Maiz, AgoraColors.SobreMaiz)
    "SEGUIDOR" -> Triple("TE SIGUE", AgoraColors.Adobe, Color.White)
    "INSIGNIA" -> Triple("SELLO", AgoraColors.Maiz, AgoraColors.SobreMaiz)
    "RETO" -> Triple("RETO", AgoraColors.Adobe, Color.White)
    else -> Triple("AVISO", AgoraColors.Texto, AgoraColors.Fondo)
}

/** Fila de aviso (WowB-Avisos): sello a la izquierda, texto con «· hace cuánto» y raya abajo. */
@Composable
private fun FilaAviso(grupo: GrupoAvisos, onNavigateUrl: (String) -> Unit) {
    val (sello, fondo, tinta) = selloAviso(grupo.tipo)
    val url = grupo.url?.takeIf { it.isNotBlank() }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (grupo.leida) Color.Transparent else AgoraColors.NaranjaSuave.copy(alpha = 0.45f))
            // TalkBack lee la fila entera y si ya se leyó (antes solo lo decía el color).
            .semantics(mergeDescendants = true) {
                stateDescription = if (grupo.leida) "Leído" else "No leído"
            }
            .then(
                if (url != null) {
                    Modifier.clickable(role = Role.Button, onClickLabel = "Abrir") { onNavigateUrl(url) }
                } else {
                    Modifier
                },
            ),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(Modifier.width(76.dp), contentAlignment = Alignment.CenterStart) {
                Sello(texto = sello, fondo = fondo, color = tinta, alto = 22.dp)
            }
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = if (grupo.leida) FontWeight.Normal else FontWeight.SemiBold)) {
                        append(grupo.texto)
                    }
                    withStyle(SpanStyle(color = AgoraColors.TextoMedio)) { append(" · ${haceCuanto(grupo.createdAt)}") }
                },
                fontSize = 14.sp,
                lineHeight = 19.sp,
                color = AgoraColors.Texto,
                modifier = Modifier.weight(1f),
            )
        }
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(AgoraColors.Borde),
        )
    }
}
