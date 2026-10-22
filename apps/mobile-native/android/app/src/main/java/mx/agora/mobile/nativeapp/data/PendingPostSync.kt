package mx.agora.mobile.nativeapp.data

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.local.OfflineCache
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Vacía la cola de posts sin conexión cada vez que vuelve la red.
 *
 * `start` se llama en cada `onCreate` de MainActivity (rotar o cambiar el tema
 * la recrea) y al iniciar sesión. Antes cada llamada sumaba otro collector de
 * red que nunca se cancelaba: tras unas cuantas recreaciones, cada reconexión
 * lanzaba N vaciados. Ahora se escucha la red una sola vez por proceso.
 */
object PendingPostSync {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val iniciado = AtomicBoolean(false)

    /** El de la última llamada: tras recrear la Activity o volver a entrar es el de la sesión vigente. */
    @Volatile
    private var tokenProvider: () -> String? = { null }

    fun start(context: Context, tokenProvider: () -> String?) {
        this.tokenProvider = tokenProvider
        val appContext = context.applicationContext
        if (!iniciado.compareAndSet(false, true)) {
            // Ya se escucha la red. El collector original vació al arrancar;
            // aquí se hace lo mismo por si es una sesión nueva con cola pendiente.
            scope.launch { vaciarSiSePuede(appContext, online = NetworkMonitor.isOnline(appContext)) }
            return
        }
        NetworkMonitor.connectivityFlow(appContext)
            .onEach { online -> vaciarSiSePuede(appContext, online) }
            .launchIn(scope)
    }

    private suspend fun vaciarSiSePuede(appContext: Context, online: Boolean) {
        val tokens = tokenProvider
        if (online && tokens() != null) {
            OfflineCache.get(appContext).flushPendingPosts(tokens)
        }
    }
}
