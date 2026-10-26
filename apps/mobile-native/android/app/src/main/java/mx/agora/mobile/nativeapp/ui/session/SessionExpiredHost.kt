package mx.agora.mobile.nativeapp.ui.session

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.data.session.SessionEvents
import mx.agora.mobile.nativeapp.ui.components.InsigniaCelebracionListener

@Composable
fun SessionExpiredHost(
    onSessionExpired: () -> Unit,
    content: @Composable () -> Unit,
) {
    // El host de snackbar queda para las insignias; la sesión expirada solo usa el diálogo.
    val snackbarHostState = remember { SnackbarHostState() }
    var showDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        SessionEvents.expired.collect {
            // Antes salía también un snackbar con otro texto: dos avisos para lo mismo.
            showDialog = true
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = {
                showDialog = false
                onSessionExpired()
            },
            title = { Text("Sesión expirada") },
            text = { Text("Tu sesión ya no es válida. Inicia sesión de nuevo para continuar.") },
            confirmButton = {
                TextButton(onClick = {
                    showDialog = false
                    onSessionExpired()
                }) {
                    Text("Entrar de nuevo")
                }
            },
        )
    }

    Box(Modifier.fillMaxSize()) {
        content()
        InsigniaCelebracionListener(snackbarHostState)
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp),
        )
    }
}
