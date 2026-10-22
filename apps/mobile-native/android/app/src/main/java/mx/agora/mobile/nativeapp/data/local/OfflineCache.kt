package mx.agora.mobile.nativeapp.data.local

import android.content.Context
import androidx.room.Room
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CrearEncuestaRequest
import mx.agora.mobile.nativeapp.data.api.CrearPostRequest
import mx.agora.mobile.nativeapp.data.api.FeedResponse
import mx.agora.mobile.nativeapp.data.api.PerfilMioDto
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import org.json.JSONArray
import org.json.JSONObject
import retrofit2.HttpException

/** Post de la cola sin conexión que el API rechazó (4xx) y ya salió de la cola. */
data class PostRechazado(
    val texto: String,
    /** Mensaje del servidor, si lo mandó (p. ej. «No perteneces a esa comunidad.»). */
    val motivo: String?,
)

class OfflineCache private constructor(context: Context) {
    /**
     * Serializa los envíos de la cola: `PendingPostSync` vacía al reconectar y
     * también al volver a iniciar sesión; si coinciden, dos vaciados a la vez
     * publicarían el mismo post dos veces.
     */
    private val flushMutex = Mutex()
    private val rechazadosMutex = Mutex()

    private val db = Room.databaseBuilder(
        context.applicationContext,
        AgoraDatabase::class.java,
        "agora_offline.db",
    ).build()

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val feedAdapter = moshi.adapter(FeedResponse::class.java)
    private val perfilAdapter = moshi.adapter(PerfilMioDto::class.java)
    private val postAdapter = moshi.adapter(CrearPostRequest::class.java)
    private val encuestaAdapter = moshi.adapter(CrearEncuestaRequest::class.java)
    private val mediaIdsAdapter = moshi.adapter<List<String>>(
        Types.newParameterizedType(List::class.java, String::class.java),
    )

    suspend fun loadFeed(): FeedResponse? = runCatching {
        db.cacheDao().getJson(KEY_FEED)?.let { feedAdapter.fromJson(it) }
    }.getOrNull()

    suspend fun saveFeed(response: FeedResponse) {
        feedAdapter.toJson(response)?.let { json ->
            db.cacheDao().put(CacheEntry(key = KEY_FEED, json = json))
        }
    }

    suspend fun loadPerfil(): PerfilMioDto? = runCatching {
        db.cacheDao().getJson(KEY_PERFIL)?.let { perfilAdapter.fromJson(it) }
    }.getOrNull()

    suspend fun savePerfil(perfil: PerfilMioDto) {
        perfilAdapter.toJson(perfil)?.let { json ->
            db.cacheDao().put(CacheEntry(key = KEY_PERFIL, json = json))
        }
    }

    suspend fun enqueuePost(request: CrearPostRequest) {
        val encuestaJson = request.encuesta?.let { encuestaAdapter.toJson(it) }
        db.pendingPostDao().insert(
            PendingPostEntity(
                comunidadSlug = request.comunidadSlug,
                texto = request.texto,
                mediaIdsJson = mediaIdsAdapter.toJson(request.mediaIds) ?: "[]",
                encuestaJson = encuestaJson,
            ),
        )
    }

    /**
     * Envía la cola. Lo que el API rechaza con 4xx (salvo 401, 408 y 429) no va
     * a pasar nunca: sale de la cola y queda un aviso para la próxima vez que la
     * persona abra Publicar ([tomarPostsRechazados]). 401 detiene el vaciado y
     * conserva todo para después de volver a iniciar sesión; 5xx, 408, 429 y
     * errores de red se reintentan en la siguiente reconexión.
     */
    suspend fun flushPendingPosts(tokenProvider: () -> String?): Int = flushMutex.withLock {
        val token = tokenProvider() ?: return@withLock 0
        val api = ApiClient.api<PostsApi> { token }
        var enviados = 0
        val rechazados = mutableListOf<PostRechazado>()
        for (pending in db.pendingPostDao().all()) {
            val request = runCatching {
                CrearPostRequest(
                    comunidadSlug = pending.comunidadSlug,
                    texto = pending.texto,
                    mediaIds = mediaIdsAdapter.fromJson(pending.mediaIdsJson) ?: emptyList(),
                    encuesta = pending.encuestaJson?.let { encuestaAdapter.fromJson(it) },
                )
            }.getOrNull()
            if (request == null) {
                // Fila ilegible: nunca se podrá enviar.
                db.pendingPostDao().delete(pending.id)
                rechazados += PostRechazado(pending.texto, motivo = null)
                continue
            }
            try {
                val resp = api.crear(request)
                GamificacionEvents.notifyPingResult(resp.nuevasInsignias ?: emptyList())
                db.pendingPostDao().delete(pending.id)
                enviados++
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                val codigo = e.code()
                if (codigo == 401) break
                if (codigo in 400..499 && codigo != 408 && codigo != 429) {
                    db.pendingPostDao().delete(pending.id)
                    rechazados += PostRechazado(pending.texto, ApiClient.mensajeDelServidor(e))
                }
            } catch (_: Exception) {
                // Red u otro error transitorio: se queda en la cola.
            }
        }
        if (rechazados.isNotEmpty()) guardarRechazados(rechazados)
        enviados
    }

    /** Devuelve los posts rechazados pendientes de avisar y los borra: el aviso sale una sola vez. */
    suspend fun tomarPostsRechazados(): List<PostRechazado> = rechazadosMutex.withLock {
        val lista = leerRechazados()
        if (lista.isNotEmpty()) db.cacheDao().put(CacheEntry(key = KEY_RECHAZADOS, json = "[]"))
        lista
    }

    private suspend fun guardarRechazados(nuevos: List<PostRechazado>) = rechazadosMutex.withLock {
        val arreglo = JSONArray()
        (leerRechazados() + nuevos).takeLast(MAX_RECHAZADOS).forEach { r ->
            arreglo.put(
                JSONObject()
                    .put("texto", r.texto)
                    .put("motivo", r.motivo ?: JSONObject.NULL),
            )
        }
        db.cacheDao().put(CacheEntry(key = KEY_RECHAZADOS, json = arreglo.toString()))
    }

    private suspend fun leerRechazados(): List<PostRechazado> = runCatching {
        val json = db.cacheDao().getJson(KEY_RECHAZADOS) ?: return@runCatching emptyList()
        val arreglo = JSONArray(json)
        (0 until arreglo.length()).map { i ->
            val o = arreglo.getJSONObject(i)
            PostRechazado(
                texto = o.optString("texto"),
                motivo = if (o.isNull("motivo")) null else o.optString("motivo").ifBlank { null },
            )
        }
    }.getOrDefault(emptyList())

    companion object {
        private const val KEY_FEED = "feed"
        private const val KEY_PERFIL = "perfil_mio"
        private const val KEY_RECHAZADOS = "posts_rechazados"
        private const val MAX_RECHAZADOS = 20

        @Volatile
        private var instance: OfflineCache? = null

        fun get(context: Context): OfflineCache =
            instance ?: synchronized(this) {
                instance ?: OfflineCache(context).also { instance = it }
            }
    }
}
