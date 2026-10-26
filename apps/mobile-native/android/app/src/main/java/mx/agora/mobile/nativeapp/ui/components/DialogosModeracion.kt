package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** Motivos de `MOTIVOS_REPORTE` (packages/contracts) con su etiqueta en pantalla. */
val MOTIVOS_REPORTE = listOf(
    "INTIMIDAD_SEXUAL" to "Contenido íntimo sin permiso",
    "DATOS_PERSONALES" to "Datos personales",
    "AMENAZA_VIOLENCIA" to "Amenaza de violencia",
    "ACOSO_DIRIGIDO" to "Acoso dirigido",
    "SUPLANTACION" to "Suplantación",
    "OTRO" to "Otro",
)

/** Elegir el motivo de un reporte (publicación, comentario o post anónimo). */
@Composable
fun ReportarDialogo(
    titulo: String,
    onMotivo: (String) -> Unit,
    onCerrar: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onCerrar,
        title = { Text(titulo) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                MOTIVOS_REPORTE.forEach { (codigo, etiqueta) ->
                    TextButton(onClick = { onMotivo(codigo) }, modifier = Modifier.fillMaxWidth()) {
                        Text(etiqueta, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onCerrar) { Text("Cancelar") }
        },
    )
}

/**
 * Retiro directo de una publicación por el staff. El motivo es obligatorio
 * (3–500): el autor tiene derecho a saber por qué se retiró su contenido.
 */
@Composable
fun RetirarPostDialogo(
    enviando: Boolean,
    onConfirmar: (motivo: String) -> Unit,
    onCerrar: () -> Unit,
) {
    var motivo by remember { mutableStateOf("") }
    val valido = motivo.trim().length >= 3

    AlertDialog(
        onDismissRequest = { if (!enviando) onCerrar() },
        title = { Text("Retirar publicación") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Motivo del retiro (lo verá el autor)",
                    style = MaterialTheme.typography.bodyMedium,
                )
                OutlinedTextField(
                    value = motivo,
                    onValueChange = { if (it.length <= 500) motivo = it },
                    // Etiqueta: sin ella TalkBack solo lee el ejemplo.
                    label = { Text("Motivo") },
                    placeholder = { Text("Ej. datos personales de un tercero") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    enabled = !enviando,
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirmar(motivo.trim()) },
                enabled = valido && !enviando,
            ) {
                Text(
                    if (enviando) "Retirando…" else "Retirar",
                    color = MaterialTheme.colorScheme.error,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onCerrar, enabled = !enviando) { Text("Cancelar") }
        },
    )
}
