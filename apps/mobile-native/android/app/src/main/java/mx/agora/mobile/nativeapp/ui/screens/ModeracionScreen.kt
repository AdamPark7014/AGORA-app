package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ModeracionApi
import mx.agora.mobile.nativeapp.data.api.ModeracionColaItemDto
import mx.agora.mobile.nativeapp.data.api.ResolverReporteRequest
import mx.agora.mobile.nativeapp.ui.components.AgoraEmptyState
import mx.agora.mobile.nativeapp.ui.components.AgoraErrorState
import mx.agora.mobile.nativeapp.ui.components.SubScreenScaffold
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.util.cuenta
import mx.agora.mobile.nativeapp.ui.util.mensajeDe

@Composable
fun ModeracionScreen(
    tokenProvider: () -> String?,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<ModeracionColaItemDto>>(emptyList()) }
    var cargando by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var resolviendo by remember { mutableStateOf<String?>(null) }
    /** Acción que se está mandando (para «Retirando…», «Suspendiendo…»). */
    var accionResolviendo by remember { mutableStateOf<String?>(null) }
    /** Falló resolver: va dentro del diálogo, que sigue abierto y taparía cualquier aviso. */
    var errorResolver by remember { mutableStateOf<String?>(null) }
    var dialogoItem by remember { mutableStateOf<ModeracionColaItemDto?>(null) }
    var dialogoAccion by remember { mutableStateOf<String?>(null) }
    var motivo by remember { mutableStateOf("") }
    /** Suspender exige USUARIO_SUSPENDER, más que moderar: no todo el staff lo ve. */
    var puedeSuspender by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        puedeSuspender = YoCache.obtener(tokenProvider)?.puedeSuspender == true
    }

    fun recargar() {
        scope.launch {
            cargando = true
            error = null
            try {
                items = ApiClient.api<ModeracionApi>(tokenProvider).cola().items
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
            }
        }
    }

    LaunchedEffect(Unit) { recargar() }

    fun resolver(item: ModeracionColaItemDto, accion: String, motivoTexto: String) {
        scope.launch {
            resolviendo = item.reporteId
            accionResolviendo = accion
            errorResolver = null
            try {
                ApiClient.api<ModeracionApi>(tokenProvider).resolver(
                    item.reporteId,
                    ResolverReporteRequest(accion = accion, motivo = motivoTexto),
                )
                items = items.filter { it.reporteId != item.reporteId }
                dialogoItem = null
                dialogoAccion = null
                motivo = ""
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorResolver = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
            } finally {
                resolviendo = null
                accionResolviendo = null
            }
        }
    }

    SubScreenScaffold(title = "Moderación", onBack = onBack) { padding ->
        when {
            cargando -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            error != null && items.isEmpty() -> {
                AgoraErrorState(
                    message = error!!,
                    modifier = Modifier.fillMaxSize().padding(padding),
                    onRetry = { recargar() },
                )
            }
            items.isEmpty() -> {
                AgoraEmptyState(
                    state = AgoraCopy.emptyModeracion,
                    modifier = Modifier.fillMaxSize().padding(padding),
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Ítem vacío: conserva el margen de arriba (spacedBy). El error de
                    // resolver ya no sale aquí: va dentro del diálogo.
                    item {}
                    items(items, key = { it.reporteId }) { item ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    "${etiquetaTipo(item.tipo)} · ${cuenta(item.numReportes, "reporte", "reportes")}",
                                    style = MaterialTheme.typography.labelLarge,
                                )
                                item.comunidad?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall)
                                }
                                Text(item.texto, style = MaterialTheme.typography.bodyMedium)
                                item.autor?.let {
                                    Text("@${it.handle} — ${it.nombre}", style = MaterialTheme.typography.bodySmall)
                                }
                                Text(
                                    "Motivos: ${item.motivos.joinToString()}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(0.7f),
                                )
                                RowAcciones(
                                    cargando = resolviendo == item.reporteId,
                                    accionEnCurso = if (resolviendo == item.reporteId) accionResolviendo else null,
                                    onSinAccion = {
                                        dialogoItem = item
                                        dialogoAccion = "SIN_ACCION"
                                        motivo = "Revisado sin acción."
                                    },
                                    onRetirar = {
                                        dialogoItem = item
                                        dialogoAccion = "RETIRAR_CONTENIDO"
                                        motivo = ""
                                    },
                                    onSuspender = if (puedeSuspender && item.autor?.suspendido != true) {
                                        {
                                            dialogoItem = item
                                            dialogoAccion = "SUSPENDER_USUARIO"
                                            motivo = ""
                                        }
                                    } else {
                                        null
                                    },
                                )
                            }
                        }
                    }
                    item { Box(Modifier.padding(bottom = 16.dp)) }
                }
            }
        }
    }

    if (dialogoItem != null && dialogoAccion != null) {
        AlertDialog(
            onDismissRequest = {
                dialogoItem = null
                dialogoAccion = null
                errorResolver = null
            },
            title = {
                Text(
                    when (dialogoAccion) {
                        "RETIRAR_CONTENIDO" -> "Retirar contenido"
                        "SUSPENDER_USUARIO" -> "Suspender autor"
                        else -> "Cerrar sin acción"
                    },
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    errorResolver?.let {
                        Text(
                            it,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    OutlinedTextField(
                        value = motivo,
                        onValueChange = { motivo = it },
                        label = { Text("Motivo") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val item = dialogoItem ?: return@Button
                        val accion = dialogoAccion ?: return@Button
                        if (motivo.trim().length < 3) return@Button
                        resolver(item, accion, motivo.trim())
                    },
                    enabled = motivo.trim().length >= 3 && resolviendo == null,
                ) {
                    // El botón dice lo que hace, no «Confirmar».
                    Text(
                        if (resolviendo != null) {
                            gerundioAccion(dialogoAccion)
                        } else {
                            when (dialogoAccion) {
                                "RETIRAR_CONTENIDO" -> "Retirar"
                                "SUSPENDER_USUARIO" -> "Suspender"
                                else -> "Cerrar"
                            }
                        },
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { dialogoItem = null; dialogoAccion = null; errorResolver = null }) {
                    Text("Cancelar")
                }
            },
        )
    }
}

/** «POST»/«COMENTARIO» del API, en palabras. */
private fun etiquetaTipo(tipo: String): String = when (tipo.uppercase()) {
    "POST" -> "Publicación"
    "COMENTARIO" -> "Comentario"
    else -> tipo
}

/** Texto del botón mientras se manda la acción. */
private fun gerundioAccion(accion: String?): String = when (accion) {
    "RETIRAR_CONTENIDO" -> "Retirando…"
    "SUSPENDER_USUARIO" -> "Suspendiendo…"
    else -> "Cerrando…"
}

@Composable
private fun RowAcciones(
    cargando: Boolean,
    onSinAccion: () -> Unit,
    onRetirar: () -> Unit,
    onSuspender: (() -> Unit)? = null,
    /** Acción que se está mandando para este reporte (null si ninguna). */
    accionEnCurso: String? = null,
) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        OutlinedButton(onClick = onSinAccion, enabled = !cargando, modifier = Modifier.weight(1f)) {
            Text(if (accionEnCurso == "SIN_ACCION") gerundioAccion(accionEnCurso) else "Sin acción")
        }
        Button(onClick = onRetirar, enabled = !cargando, modifier = Modifier.weight(1f)) {
            Text(if (accionEnCurso == "RETIRAR_CONTENIDO") gerundioAccion(accionEnCurso) else "Retirar")
        }
    }
    if (onSuspender != null) {
        OutlinedButton(
            onClick = onSuspender,
            enabled = !cargando,
            modifier = Modifier.fillMaxWidth(),
            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error,
            ),
        ) {
            Text(if (accionEnCurso == "SUSPENDER_USUARIO") gerundioAccion(accionEnCurso) else "Suspender autor")
        }
    }
}
