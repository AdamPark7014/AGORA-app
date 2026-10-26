package mx.agora.mobile.nativeapp.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.DynamicFeed
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.push.PushRegistration
import mx.agora.mobile.nativeapp.ui.components.AgoraMarcaHorizontal
import mx.agora.mobile.nativeapp.ui.components.AgoraPrimaryButton
import mx.agora.mobile.nativeapp.ui.theme.AgoraButtonShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

private data class WelcomePage(
    val icono: ImageVector,
    val title: String,
    val description: String,
)

/** Las tres páginas de presentación; la cuarta (avisos) es [PaginaAvisos]. */
private val paginasPresentacion = listOf(
    WelcomePage(
        icono = Icons.Outlined.DynamicFeed,
        title = "Tu feed del campus",
        description = "Descubre lo que pasa en la UDLAP: publicaciones, encuestas y conversaciones de tu comunidad verificada.",
    ),
    WelcomePage(
        icono = Icons.Outlined.Verified,
        title = "Comunidades verificadas",
        description = "Carreras, colegios y grupos oficiales con insignia de verificado. Solo gente real de la UDLAP.",
    ),
    WelcomePage(
        icono = Icons.Outlined.CalendarMonth,
        title = "Eventos en vivo",
        description = "Fiestas, charlas, torneos y más. Confirma tu asistencia y no te pierdas nada del campus.",
    ),
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun WelcomeScreen(
    onFinished: () -> Unit,
) {
    val context = LocalContext.current
    val totalPaginas = paginasPresentacion.size + 1
    val pagerState = rememberPagerState(pageCount = { totalPaginas })
    val scope = rememberCoroutineScope()
    val isLastPage = pagerState.currentPage == totalPaginas - 1
    /** Evita lanzar dos veces el diálogo del sistema con un doble toque. */
    var pidiendoPermiso by remember { mutableStateOf(false) }

    // Aquí, y solo aquí (o en Ajustes), se pide el permiso de avisos del
    // sistema: al entrar o al iniciar sesión nadie sabe aún para qué es.
    // Se conceda o no, la bienvenida termina.
    val pedirPermiso = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { concedido ->
        pidiendoPermiso = false
        // El token ya se registró al abrir la sesión; se repite para que la API
        // lo tenga fresco ahora que sí pueden llegar avisos.
        if (concedido) PushRegistration.registerCurrentDeviceAsync(context.applicationContext)
        onFinished()
    }

    fun activarAvisos() {
        if (pidiendoPermiso) return
        val faltaPermiso = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        if (faltaPermiso) {
            pidiendoPermiso = true
            pedirPermiso.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            onFinished()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AgoraColors.Fondo)
            .safeDrawingPadding(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 56.dp)
                .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla - 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IndicadorPasos(total = totalPaginas, actual = pagerState.currentPage)
            if (isLastPage) {
                Text(
                    "Último paso",
                    style = MaterialTheme.typography.bodySmall,
                    color = AgoraColors.TextoMedio,
                    modifier = Modifier.padding(end = 6.dp),
                )
            } else {
                // «Saltar» se brinca la presentación, no la decisión de los avisos:
                // esa pantalla ya trae su propio «Ahora no».
                TextButton(
                    onClick = { scope.launch { pagerState.animateScrollToPage(totalPaginas - 1) } },
                    modifier = Modifier.heightIn(min = 48.dp),
                ) {
                    Text("Saltar", color = AgoraColors.TextoMedio)
                }
            }
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
        ) { page ->
            // Con letra grande el texto no cabía: cada página se desplaza, y el
            // alto mínimo la deja centrada cuando sí cabe (como en LoginScreen).
            BoxWithConstraints(Modifier.fillMaxSize()) {
                val alto = maxHeight
                if (page < paginasPresentacion.size) {
                    PaginaPresentacion(
                        item = paginasPresentacion[page],
                        conMarca = page == 0,
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                            .heightIn(min = alto)
                            .padding(horizontal = AgoraSpacing.Pantalla),
                    )
                } else {
                    PaginaAvisos(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                            .heightIn(min = alto)
                            .padding(horizontal = AgoraSpacing.Pantalla),
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = AgoraSpacing.Pantalla, end = AgoraSpacing.Pantalla, top = 12.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (isLastPage) {
                AgoraPrimaryButton(
                    text = "Activar avisos",
                    onClick = { activarAvisos() },
                    loading = pidiendoPermiso,
                    modifier = Modifier.heightIn(min = 54.dp),
                )
                TextButton(
                    onClick = onFinished,
                    enabled = !pidiendoPermiso,
                    shape = AgoraButtonShape,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 48.dp),
                ) {
                    Text(
                        "Ahora no",
                        style = MaterialTheme.typography.labelLarge,
                        color = AgoraColors.TextoMedio,
                    )
                }
            } else {
                AgoraPrimaryButton(
                    text = "Siguiente",
                    onClick = {
                        scope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    },
                    modifier = Modifier.heightIn(min = 54.dp),
                )
            }
        }
    }
}

/** Barras de paso (22 × 6) del mockup; TalkBack lee en qué paso va. */
@Composable
private fun IndicadorPasos(total: Int, actual: Int) {
    Row(
        modifier = Modifier.clearAndSetSemantics {
            contentDescription = "Paso ${actual + 1} de $total"
        },
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        repeat(total) { i ->
            Box(
                Modifier
                    .width(22.dp)
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(if (i <= actual) AgoraColors.Naranja else AgoraColors.Borde),
            )
        }
    }
}

@Composable
private fun PaginaPresentacion(
    item: WelcomePage,
    conMarca: Boolean,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.Center,
    ) {
        if (conMarca) {
            AgoraMarcaHorizontal(isotipo = 32.dp)
            Spacer(Modifier.height(28.dp))
        }
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(AgoraColors.NaranjaSuave),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                item.icono,
                contentDescription = null,
                modifier = Modifier.size(36.dp),
                tint = AgoraColors.NaranjaTinta,
            )
        }
        Spacer(Modifier.height(24.dp))
        Text(
            item.title,
            style = MaterialTheme.typography.headlineLarge,
            color = AgoraColors.Texto,
            modifier = Modifier.semantics { heading() },
        )
        Spacer(Modifier.height(10.dp))
        Text(
            item.description,
            style = MaterialTheme.typography.bodyLarge,
            color = AgoraColors.TextoMedio,
        )
    }
}

/** Un aviso de muestra: tipos que Ágora sí manda (PREGUNTA, COMENTARIO, EVENTO_RECORDATORIO). */
private data class AvisoEjemplo(
    val icono: ImageVector,
    val titulo: String,
    val detalle: String?,
    val fondoIcono: Color,
    val tintaIcono: Color,
)

@Composable
private fun PaginaAvisos(modifier: Modifier = Modifier) {
    val ejemplos = listOf(
        AvisoEjemplo(
            icono = Icons.Outlined.Bolt,
            titulo = "Cayó la pregunta del día",
            detalle = "Tienes 2 minutos para contestar a tiempo.",
            fondoIcono = AgoraColors.Naranja,
            tintaIcono = MaterialTheme.colorScheme.onPrimary,
        ),
        AvisoEjemplo(
            icono = Icons.Outlined.ChatBubbleOutline,
            titulo = "Comentaron tu publicación",
            detalle = null,
            // `oscuro` lleva texto blanco en los dos temas.
            fondoIcono = AgoraColors.Oscuro,
            tintaIcono = Color.White,
        ),
        AvisoEjemplo(
            icono = Icons.Outlined.Event,
            titulo = "Un evento al que vas está por empezar",
            detalle = null,
            fondoIcono = AgoraColors.NaranjaSuave,
            tintaIcono = AgoraColors.NaranjaTinta,
        ),
    )

    Column(
        modifier = modifier.padding(top = 8.dp, bottom = 8.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            "Que no se te pase nada del campus",
            style = MaterialTheme.typography.headlineLarge,
            color = AgoraColors.Texto,
            modifier = Modifier.semantics { heading() },
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Solo te avisamos de lo que es para ti. Tú eliges qué en Ajustes, cuando quieras.",
            style = MaterialTheme.typography.bodyLarge,
            color = AgoraColors.TextoMedio,
        )
        Spacer(Modifier.height(22.dp))

        // Las tarjetas son una muestra: se leen como un solo texto, no como avisos reales.
        Column(
            modifier = Modifier.clearAndSetSemantics {
                contentDescription = "Ejemplos de avisos: " + ejemplos.joinToString("; ") { it.titulo }
            },
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ejemplos.forEachIndexed { i, aviso ->
                TarjetaAvisoEjemplo(
                    aviso = aviso,
                    destacada = i == 0,
                    // Encimadas como una pila de avisos: cada una un poco más adentro y más tenue.
                    modifier = Modifier
                        .padding(horizontal = (10 * i).dp)
                        .alpha(1f - 0.08f * i),
                )
            }
        }

        Spacer(Modifier.height(24.dp))
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            PuntoAvisos("Mensajes y respuestas a lo tuyo")
            PuntoAvisos("Eventos y aventones a los que vas")
            PuntoAvisos("Nunca publicidad")
        }
    }
}

@Composable
private fun TarjetaAvisoEjemplo(
    aviso: AvisoEjemplo,
    destacada: Boolean,
    modifier: Modifier = Modifier,
) {
    val forma = RoundedCornerShape(18.dp)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(if (destacada) Modifier.shadow(6.dp, forma) else Modifier)
            .clip(forma)
            .background(AgoraColors.Superficie)
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(aviso.fondoIcono),
            contentAlignment = Alignment.Center,
        ) {
            Icon(aviso.icono, contentDescription = null, tint = aviso.tintaIcono, modifier = Modifier.size(20.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("Ágora", style = MaterialTheme.typography.labelMedium, color = AgoraColors.TextoMedio)
            Text(
                aviso.titulo,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                color = AgoraColors.Texto,
            )
            aviso.detalle?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
            }
        }
    }
}

@Composable
private fun PuntoAvisos(texto: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Check, contentDescription = null, tint = AgoraColors.Success, modifier = Modifier.size(18.dp))
        Text(texto, style = MaterialTheme.typography.bodyMedium, color = AgoraColors.Texto)
    }
}
