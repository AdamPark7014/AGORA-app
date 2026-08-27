package mx.agora.mobile.nativeapp.data.realtime

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Punto único de conexión SSE para mensajes directos.
 */
object RealtimeBus {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val client = MensajesSseClient()
    private val mutex = Mutex()

    private var activeToken: String? = null
    private var miHandle: String? = null
    private val suscripciones = mutableSetOf<String>()

    val mensajes: SharedFlow<ConversacionMensajeEvent> = client.mensajes

    fun start(token: String, handle: String? = null) {
        if (token.isBlank()) return
        scope.launch {
            mutex.withLock {
                val reiniciar = activeToken != token
                activeToken = token
                miHandle = handle
                if (reiniciar) {
                    client.stopAll()
                    suscripciones.toList().forEach { id ->
                        client.watch(id, token, handle)
                    }
                }
            }
        }
    }

    fun stop() {
        scope.launch {
            mutex.withLock {
                activeToken = null
                miHandle = null
                suscripciones.clear()
                client.stopAll()
            }
        }
    }

    fun watchConversacion(conversacionId: String) {
        if (conversacionId.isBlank()) return
        scope.launch {
            mutex.withLock {
                suscripciones.add(conversacionId)
                val token = activeToken ?: return@withLock
                client.watch(conversacionId, token, miHandle)
            }
        }
    }

    fun unwatchConversacion(conversacionId: String) {
        if (conversacionId.isBlank()) return
        scope.launch {
            mutex.withLock {
                suscripciones.remove(conversacionId)
                client.unwatch(conversacionId)
            }
        }
    }
}
