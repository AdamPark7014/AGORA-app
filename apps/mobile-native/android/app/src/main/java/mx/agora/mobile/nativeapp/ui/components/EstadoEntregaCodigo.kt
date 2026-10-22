package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

/**
 * Esperas entre preguntas, igual que la web (`componentes/estado-entrega.tsx`):
 * casi todo se resuelve en los primeros 10 s, así que se pregunta seguido al
 * principio y cada vez menos después. Suman ~90 s y se rinde.
 */
private val ESPERAS_MS = longArrayOf(1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000)

private val FINALES = setOf("entregado", "rebotado", "bloqueado", "error")

private enum class Tono { ESPERA, OK, MAL }

/**
 * Dice si el código llegó al buzón. Un correo mal escrito se ve en segundos
 * (rebote de Outlook) en vez de diez minutos de espera inútil.
 *
 * [consultar] devuelve el estado, null si la API ya no conoce el envío (404,
 * se oculta la fila) o lanza si falló la red (se sigue preguntando).
 * [personal]: el código fue al correo personal, no al buzón UDLAP (cambian los
 * textos de entregado, demorado y rebotado).
 */
@Composable
fun EstadoEntregaCodigo(
    envioId: String,
    email: String,
    consultar: suspend (String) -> String?,
    onCorregir: () -> Unit,
    onReenviar: () -> Unit,
    modifier: Modifier = Modifier,
    personal: Boolean = false,
) {
    var estado by remember(envioId) { mutableStateOf("enviado") }
    var agotado by remember(envioId) { mutableStateOf(false) }
    var perdido by remember(envioId) { mutableStateOf(false) }

    LaunchedEffect(envioId) {
        var paso = 0
        delay(ESPERAS_MS[paso++])
        while (true) {
            try {
                val r = consultar(envioId)
                if (r == null) {
                    // La API se reinició y olvidó el envío: no hay nada que seguir.
                    perdido = true
                    return@LaunchedEffect
                }
                estado = r
                if (r in FINALES) return@LaunchedEffect
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // Red intermitente: se vuelve a preguntar en la siguiente espera.
            }
            if (paso >= ESPERAS_MS.size) {
                agotado = true
                return@LaunchedEffect
            }
            delay(ESPERAS_MS[paso++])
        }
    }

    if (perdido) return

    val textos = AgoraCopy.login.entrega
    when (estado) {
        "entregado" -> FilaEntrega(
            Tono.OK,
            if (personal) textos.entregadoPersonal else textos.entregado,
            modifier = modifier,
        )
        "rebotado" -> FilaEntrega(
            Tono.MAL,
            if (personal) textos.rebotadoPersonal(email) else textos.rebotado(email),
            accion = AgoraCopy.login.cambiarCorreo,
            onAccion = onCorregir,
            modifier = modifier,
        )
        "bloqueado", "error" -> FilaEntrega(
            Tono.MAL,
            if (estado == "bloqueado") textos.bloqueado else textos.error,
            accion = AgoraCopy.login.reenviar,
            onAccion = onReenviar,
            modifier = modifier,
        )
        else -> FilaEntrega(
            Tono.ESPERA,
            when {
                agotado -> textos.sinNoticias
                estado == "demorado" -> if (personal) textos.demoradoPersonal else textos.demorado
                else -> textos.enviado
            },
            girando = !agotado,
            accion = if (agotado) AgoraCopy.login.reenviar else null,
            onAccion = onReenviar,
            modifier = modifier,
        )
    }
}

@Composable
private fun FilaEntrega(
    tono: Tono,
    texto: String,
    modifier: Modifier = Modifier,
    girando: Boolean = false,
    accion: String? = null,
    onAccion: () -> Unit = {},
) {
    val (fondo, borde, color) = when (tono) {
        Tono.ESPERA -> Triple(AgoraColors.SurfaceElevated, AgoraColors.Borde, AgoraColors.TextoMedio)
        Tono.OK -> Triple(AgoraColors.SuccessSuave, AgoraColors.Success.copy(alpha = 0.35f), AgoraColors.Success)
        Tono.MAL -> Triple(AgoraColors.DangerSuave, AgoraColors.Danger.copy(alpha = 0.35f), AgoraColors.Danger)
    }
    val forma = RoundedCornerShape(12.dp)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(fondo, forma)
            .border(1.dp, borde, forma)
            .padding(horizontal = 12.dp, vertical = 10.dp)
            .semantics {
                liveRegion = if (tono == Tono.MAL) LiveRegionMode.Assertive else LiveRegionMode.Polite
            },
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        when {
            girando -> CircularProgressIndicator(
                modifier = Modifier.padding(top = 2.dp).size(16.dp),
                strokeWidth = 2.dp,
                color = AgoraColors.Naranja,
            )
            else -> Icon(
                if (tono == Tono.OK) Icons.Outlined.CheckCircle else Icons.Outlined.ErrorOutline,
                contentDescription = null,
                tint = if (tono == Tono.ESPERA) AgoraColors.TextoMedio else color,
                modifier = Modifier.size(18.dp),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                texto,
                style = MaterialTheme.typography.bodySmall,
                color = if (tono == Tono.ESPERA) AgoraColors.Texto else color,
            )
            if (accion != null) {
                TextButton(
                    onClick = onAccion,
                    contentPadding = PaddingValues(0.dp),
                ) {
                    Text(
                        accion,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = if (tono == Tono.MAL) color else AgoraColors.Naranja,
                    )
                }
            }
        }
    }
}
