package mx.agora.mobile.nativeapp.ui.navigation

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Canal entre MainActivity / notificaciones y AgoraNavHost. */
object DeepLinkBus {
    private val _pendingRoute = MutableStateFlow<String?>(null)
    val pendingRoute: StateFlow<String?> = _pendingRoute.asStateFlow()

    fun emit(route: String) {
        _pendingRoute.value = route
    }

    fun consume() {
        _pendingRoute.value = null
    }
}

/**
 * Pestaña de MainShell pedida desde fuera (deep link `/eventos`). MainShell la
 * aplica y llama a [consumir]; si MainShell aún no existe, la toma al aparecer.
 */
object PestanaBus {
    /** Índices de las pestañas de MainShell (barra del diseño D). */
    const val FEED = 0
    const val CLIPS = 1
    const val PUBLICAR = 2
    const val EVENTOS = 3
    const val CAMPUS = 4

    private val _solicitada = MutableStateFlow<Int?>(null)
    val solicitada: StateFlow<Int?> = _solicitada.asStateFlow()

    fun solicitar(pestana: Int) {
        _solicitada.value = pestana
    }

    fun consumir() {
        _solicitada.value = null
    }
}
