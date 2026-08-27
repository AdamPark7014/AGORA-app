package mx.agora.mobile.nativeapp.ui.analytics

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.BuildConfig
import mx.agora.mobile.nativeapp.data.api.AnalyticsApi
import mx.agora.mobile.nativeapp.data.api.AnalyticsCrashRequest
import mx.agora.mobile.nativeapp.data.api.ApiClient

private const val TAG = "AgoraCrash"

object AgoraCrashReporting {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var defaultHandler: Thread.UncaughtExceptionHandler? = null

    fun install(tokenProvider: () -> String?) {
        if (defaultHandler != null) return
        defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            report(tokenProvider, throwable.message ?: "Uncaught", Log.getStackTraceString(throwable))
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    fun report(tokenProvider: () -> String?, mensaje: String, stack: String? = null) {
        val token = tokenProvider() ?: return
        scope.launch {
            runCatching {
                ApiClient.api<AnalyticsApi> { token }.crash(
                    AnalyticsCrashRequest(
                        mensaje = mensaje.take(2000),
                        stack = stack?.take(8000),
                        plataforma = "android",
                        version = BuildConfig.VERSION_NAME,
                    ),
                )
            }.onFailure { Log.w(TAG, "No se pudo enviar crash: ${it.message}") }
        }
    }
}
