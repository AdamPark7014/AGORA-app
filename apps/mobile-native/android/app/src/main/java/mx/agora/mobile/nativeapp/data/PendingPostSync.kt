package mx.agora.mobile.nativeapp.data

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import mx.agora.mobile.nativeapp.data.local.OfflineCache

object PendingPostSync {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun start(context: Context, tokenProvider: () -> String?) {
        val appContext = context.applicationContext
        NetworkMonitor.connectivityFlow(appContext)
            .onEach { online ->
                if (online && tokenProvider() != null) {
                    OfflineCache.get(appContext).flushPendingPosts(tokenProvider)
                }
            }
            .launchIn(scope)
    }
}
