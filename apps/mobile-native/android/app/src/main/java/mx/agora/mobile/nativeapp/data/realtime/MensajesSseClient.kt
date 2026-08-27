package mx.agora.mobile.nativeapp.data.realtime

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import mx.agora.mobile.nativeapp.BuildConfig
import mx.agora.mobile.nativeapp.data.api.AutorDto
import mx.agora.mobile.nativeapp.data.api.MensajeDto
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import kotlin.math.min

data class ConversacionMensajeEvent(
    val conversacionId: String,
    val mensaje: MensajeDto,
)

/**
 * Lee un canal SSE de mensajes (`GET /mensajes/:id/stream`) con OkHttp.
 */
class MensajesSseClient {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()
    private val eventAdapter = moshi.adapter(MensajeStreamEventDto::class.java)

    private val http = OkHttpClient.Builder()
        .connectTimeout(18, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .writeTimeout(18, TimeUnit.SECONDS)
        .build()

    private val _mensajes = MutableSharedFlow<ConversacionMensajeEvent>(extraBufferCapacity = 64)
    val mensajes: SharedFlow<ConversacionMensajeEvent> = _mensajes

    private val conexiones = mutableMapOf<String, Job>()
    private val mutex = Mutex()

    fun watch(conversacionId: String, token: String, miHandle: String?) {
        if (conversacionId.isBlank() || token.isBlank()) return
        scope.launch {
            mutex.withLock {
                conexiones[conversacionId]?.cancel()
                conexiones[conversacionId] = scope.launch {
                    escuchar(conversacionId, token, miHandle)
                }
            }
        }
    }

    fun unwatch(conversacionId: String) {
        scope.launch {
            mutex.withLock {
                conexiones.remove(conversacionId)?.cancel()
            }
        }
    }

    fun stopAll() {
        scope.launch {
            mutex.withLock {
                conexiones.values.forEach { it.cancel() }
                conexiones.clear()
            }
        }
    }

    private suspend fun escuchar(conversacionId: String, token: String, miHandle: String?) {
        var intento = 0
        while (scope.coroutineContext.isActive) {
            val leyoAlgo = runCatching {
                abrirStream(conversacionId, token, miHandle)
            }.isSuccess
            if (leyoAlgo) intento = 0 else {
                intento += 1
                delay(min(30_000L, 1_000L shl intento.coerceAtMost(5)))
            }
        }
    }

    private fun abrirStream(conversacionId: String, token: String, miHandle: String?) {
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        val url = "$base/mensajes/$conversacionId/stream"
        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $token")
            .header("Accept", "text/event-stream")
            .get()
            .build()

        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return
            val body = response.body ?: return
            val source = body.source()
            val buffer = StringBuilder()

            while (!source.exhausted()) {
                val line = source.readUtf8Line() ?: break
                when {
                    line.startsWith("data:") -> {
                        val payload = line.removePrefix("data:").trim()
                        if (payload.isNotEmpty()) buffer.append(payload)
                    }
                    line.isEmpty() && buffer.isNotEmpty() -> {
                        procesarEvento(conversacionId, buffer.toString(), miHandle)
                        buffer.clear()
                    }
                }
            }
        }
    }

    private fun procesarEvento(conversacionId: String, json: String, miHandle: String?) {
        val evento = eventAdapter.fromJson(json) ?: return
        if (evento.tipo != "mensaje") return
        val payload = evento.mensaje ?: return
        val mensaje = MensajeDto(
            id = payload.id,
            texto = payload.texto,
            createdAt = payload.createdAt,
            mio = miHandle != null && payload.autor?.handle == miHandle,
            autor = payload.autor?.let {
                AutorDto(handle = it.handle, nombre = it.nombre, fotoUrl = it.fotoUrl)
            },
        )
        _mensajes.tryEmit(ConversacionMensajeEvent(conversacionId, mensaje))
    }
}
