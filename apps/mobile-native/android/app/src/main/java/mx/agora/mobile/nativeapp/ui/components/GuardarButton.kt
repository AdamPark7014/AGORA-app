package mx.agora.mobile.nativeapp.ui.components

import android.widget.Toast
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.GuardadosApi
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics
import java.io.IOException

@Composable
fun GuardarButton(
    postId: String,
    guardado: Boolean,
    tokenProvider: () -> String?,
    modifier: Modifier = Modifier,
    onChanged: (Boolean) -> Unit = {},
    /** Si la pantalla tiene snackbar, pásalo aquí; si no, el aviso sale como Toast. */
    onError: ((String) -> Unit)? = null,
) {
    val context = LocalContext.current
    var estado by remember(postId, guardado) { mutableStateOf(guardado) }
    var cargando by remember { mutableStateOf(false) }
    var bounceKey by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val haptics = rememberHaptics()

    val scale by animateFloatAsState(
        targetValue = if (bounceKey > 0) 1.35f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "bookmarkScale",
        finishedListener = { if (bounceKey > 0) bounceKey = 0 },
    )

    IconButton(
        modifier = modifier
            .scale(scale)
            .semantics { stateDescription = if (estado) "Guardada" else "Sin guardar" },
        enabled = !cargando,
        onClick = {
            haptics.perform(HapticType.Toggle)
            bounceKey++
            val anterior = estado
            // Optimista: el icono cambia ya. El endpoint es un interruptor, así
            // que un fallo NO se reintenta: si la primera llamada sí llegó, la
            // segunda desharía el guardado. Se revierte y se avisa.
            estado = !anterior
            scope.launch {
                cargando = true
                try {
                    val resp = ApiClient.api<GuardadosApi>(tokenProvider).alternar(postId)
                    estado = resp.guardado
                    onChanged(resp.guardado)
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    estado = anterior
                    val accion = if (anterior) "No se pudo quitar de guardados." else "No se pudo guardar."
                    val detalle = ApiClient.mensajeDelServidor(e)
                        ?: if (e is IOException) "Revisa tu conexión." else "Intenta de nuevo."
                    val mensaje = "$accion $detalle"
                    if (onError != null) {
                        onError(mensaje)
                    } else {
                        Toast.makeText(context, mensaje, Toast.LENGTH_SHORT).show()
                    }
                } finally {
                    cargando = false
                }
            }
        },
    ) {
        Icon(
            imageVector = if (estado) Icons.Outlined.Bookmark else Icons.Outlined.BookmarkBorder,
            contentDescription = if (estado) "Quitar de guardados" else "Guardar publicación",
            tint = if (estado) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(0.6f),
        )
    }
}
