package mx.agora.mobile.nativeapp.data

import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.YoResponse

/**
 * `GET auth/yo` una vez por sesión. Varias pantallas solo necesitan saber si
 * quien mira puede moderar o suspender (acciones de staff); sin esto cada
 * cambio de pestaña repetía la llamada.
 */
object YoCache {
    @Volatile
    private var tokenCacheado: String? = null

    @Volatile
    private var yo: YoResponse? = null

    suspend fun obtener(tokenProvider: () -> String?): YoResponse? {
        val token = tokenProvider() ?: return null
        if (token == tokenCacheado) yo?.let { return it }
        val nuevo = runCatching { ApiClient.api<AuthApi>(tokenProvider).yo() }.getOrNull()
            ?: return null
        tokenCacheado = token
        yo = nuevo
        return nuevo
    }

    fun limpiar() {
        tokenCacheado = null
        yo = null
    }
}
