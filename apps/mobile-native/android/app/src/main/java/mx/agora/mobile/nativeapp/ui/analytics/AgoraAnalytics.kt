package mx.agora.mobile.nativeapp.ui.analytics

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.AnalyticsApi
import mx.agora.mobile.nativeapp.data.api.AnalyticsEventoRequest
import mx.agora.mobile.nativeapp.data.api.ApiClient

/**
 * Analytics de producto — singleton fire-and-forget a la API interna.
 * Sin SDK externo; eventos almacenados en Postgres.
 */
object AgoraAnalytics {
    private const val PLATAFORMA = "android"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun track(tokenProvider: () -> String?, nombre: String, propiedades: Map<String, String> = emptyMap()) {
        val token = tokenProvider() ?: return
        scope.launch {
            runCatching {
                val merged = propiedades + mapOf("plataforma" to PLATAFORMA)
                ApiClient.api<AnalyticsApi> { token }.evento(
                    AnalyticsEventoRequest(
                        nombre = nombre,
                        propiedades = merged,
                        timestamp = System.currentTimeMillis(),
                    ),
                )
            }
        }
    }

    fun login(tokenProvider: () -> String?) = track(tokenProvider, "login")

    fun publicar(tokenProvider: () -> String?, props: Map<String, String> = emptyMap()) =
        track(tokenProvider, "publicar", props)

    fun dmEnviado(tokenProvider: () -> String?, props: Map<String, String> = emptyMap()) =
        track(tokenProvider, "dm_enviado", props)

    fun eventoAsistencia(tokenProvider: () -> String?, props: Map<String, String> = emptyMap()) =
        track(tokenProvider, "evento_asistencia", props)
}
