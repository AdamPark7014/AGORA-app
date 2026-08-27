package mx.agora.mobile.nativeapp.data.local

import android.content.Context
import androidx.room.Room
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.CrearEncuestaRequest
import mx.agora.mobile.nativeapp.data.api.CrearPostRequest
import mx.agora.mobile.nativeapp.data.api.FeedResponse
import mx.agora.mobile.nativeapp.data.api.PerfilMioDto
import mx.agora.mobile.nativeapp.data.api.PostsApi
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents

class OfflineCache private constructor(context: Context) {
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

    suspend fun flushPendingPosts(tokenProvider: () -> String?): Int {
        val token = tokenProvider() ?: return 0
        val api = ApiClient.api<PostsApi> { token }
        var enviados = 0
        for (pending in db.pendingPostDao().all()) {
            val request = CrearPostRequest(
                comunidadSlug = pending.comunidadSlug,
                texto = pending.texto,
                mediaIds = mediaIdsAdapter.fromJson(pending.mediaIdsJson) ?: emptyList(),
                encuesta = pending.encuestaJson?.let { encuestaAdapter.fromJson(it) },
            )
            runCatching {
                val resp = api.crear(request)
                GamificacionEvents.notifyPingResult(resp.nuevasInsignias ?: emptyList())
                db.pendingPostDao().delete(pending.id)
                enviados++
            }
        }
        return enviados
    }

    companion object {
        private const val KEY_FEED = "feed"
        private const val KEY_PERFIL = "perfil_mio"

        @Volatile
        private var instance: OfflineCache? = null

        fun get(context: Context): OfflineCache =
            instance ?: synchronized(this) {
                instance ?: OfflineCache(context).also { instance = it }
            }
    }
}
