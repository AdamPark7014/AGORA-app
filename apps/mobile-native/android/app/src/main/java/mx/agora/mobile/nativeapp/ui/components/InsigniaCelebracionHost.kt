package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.gamificacion.BadgesCampus
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents

/**
 * Escucha insignias recién otorgadas y las muestra en el SnackbarHost compartido
 * (p. ej. el de [mx.agora.mobile.nativeapp.ui.session.SessionExpiredHost]).
 */
@Composable
fun InsigniaCelebracionListener(snackbarHostState: SnackbarHostState) {
    val scope = rememberCoroutineScope()

    LaunchedEffect(snackbarHostState) {
        GamificacionEvents.nuevasInsignias.collect { codigos ->
            codigos.forEach { codigo ->
                scope.launch {
                    // Corto y con «x»: varias insignias seguidas ya no tapan la pantalla.
                    snackbarHostState.showSnackbar(
                        message = BadgesCampus.mensajeNuevaInsignia(codigo),
                        withDismissAction = true,
                        duration = SnackbarDuration.Short,
                    )
                }
            }
        }
    }
}
