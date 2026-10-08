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
            error = null
            try {
                ApiClient.api<ModeracionApi>(tokenProvider).resolver(
                    item.reporteId,
                    ResolverReporteRequest(accion = accion, motivo = motivoTexto),
                )
                items = items.filter { it.reporteId != item.reporteId }
                dialogoItem = null
                dialogoAccion = null
                motivo = ""
            } catch (e: Exception) {
                error = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
            } finally {
                resolviendo = null
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
                    item {
                        if (error != null) {
                            Text(error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(vertical = 8.dp))
                        }
                    }
                    items(items, key = { it.reporteId }) { item ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    "${item.tipo} · ${item.numReportes} reporte(s)",
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
                OutlinedTextField(
                    value = motivo,
                    onValueChange = { motivo = it },
                    label = { Text("Motivo") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                )
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
                    Text("Confirmar")
                }
            },
            dismissButton = {
                TextButton(onClick = { dialogoItem = null; dialogoAccion = null }) {
                    Text("Cancelar")
                }
            },
        )
    }
}

@Composable
private fun RowAcciones(
    cargando: Boolean,
    onSinAccion: () -> Unit,
    onRetirar: () -> Unit,
    onSuspender: (() -> Unit)? = null,
) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        OutlinedButton(onClick = onSinAccion, enabled = !cargando, modifier = Modifier.weight(1f)) {
            Text("Sin acción")
        }
        Button(onClick = onRetirar, enabled = !cargando, modifier = Modifier.weight(1f)) {
            Text(if (cargando) "…" else "Retirar")
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
            Text("Suspender autor")
        }
    }
}
