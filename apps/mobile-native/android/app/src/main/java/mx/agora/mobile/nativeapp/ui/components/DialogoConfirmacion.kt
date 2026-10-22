package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

/**
 * Pregunta antes de una acción que no se puede deshacer (borrar, cancelar…).
 * Mientras [enProceso] es true, los botones se bloquean y el diálogo no se cierra
 * con un toque afuera, para que no se mande dos veces.
 */
@Composable
fun DialogoConfirmacion(
    titulo: String,
    mensaje: String,
    textoConfirmar: String,
    onConfirmar: () -> Unit,
    onCerrar: () -> Unit,
    textoCancelar: String = "Mejor no",
    destructivo: Boolean = true,
    enProceso: Boolean = false,
) {
    AlertDialog(
        onDismissRequest = { if (!enProceso) onCerrar() },
        title = { Text(titulo) },
        text = { Text(mensaje) },
        confirmButton = {
            TextButton(onClick = onConfirmar, enabled = !enProceso) {
                Text(
                    if (enProceso) "Un momento…" else textoConfirmar,
                    color = if (destructivo && !enProceso) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onCerrar, enabled = !enProceso) { Text(textoCancelar) }
        },
    )
}
