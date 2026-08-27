package mx.agora.mobile.nativeapp.data.gamificacion

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** Señales globales tras el ping de gamificación (insignias nuevas y refresh de UI). */
object GamificacionEvents {
    private val _nuevasInsignias = MutableSharedFlow<List<String>>(extraBufferCapacity = 4)
    val nuevasInsignias: SharedFlow<List<String>> = _nuevasInsignias.asSharedFlow()

    private val _refresh = MutableSharedFlow<Unit>(extraBufferCapacity = 4)
    val refresh: SharedFlow<Unit> = _refresh.asSharedFlow()

    fun notifyPingResult(nuevas: List<String>) {
        if (nuevas.isNotEmpty()) {
            _nuevasInsignias.tryEmit(nuevas)
        }
        _refresh.tryEmit(Unit)
    }
}
