package mx.agora.mobile.nativeapp.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import mx.agora.mobile.nativeapp.BuildConfig
import mx.agora.mobile.nativeapp.data.session.SessionEvents
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    /**
     * Un solo cliente para toda la app: cada `api(...)` deriva de este con
     * `newBuilder()`, que comparte pool de conexiones y dispatcher. Antes cada
     * llamada creaba su propio cliente y no se reutilizaba ninguna conexión TLS.
     */
    private val base: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor()
        logging.level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BASIC
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
        OkHttpClient.Builder()
            .connectTimeout(18, TimeUnit.SECONDS)
            .readTimeout(22, TimeUnit.SECONDS)
            .writeTimeout(22, TimeUnit.SECONDS)
            .addNetworkInterceptor(logging)
            .build()
    }

    private fun httpClient(tokenProvider: (() -> String?)? = null): OkHttpClient {
        return base.newBuilder()
            .addInterceptor { chain ->
                val original = chain.request()
                val token = tokenProvider?.invoke()
                val next: Request = if (token.isNullOrBlank()) {
                    original
                } else {
                    original.newBuilder()
                        .header("Authorization", "Bearer $token")
                        .build()
                }
                val response = chain.proceed(next)
                if (response.code == 401) {
                    val path = original.url.encodedPath
                    if (!path.contains("/auth/")) {
                        SessionEvents.notifyExpired()
                    }
                }
                response
            }
            .build()
    }

    private fun retrofit(client: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    val auth: AuthApi = retrofit(httpClient(null)).create(AuthApi::class.java)

    val catalogo: CatalogoApi = retrofit(httpClient(null)).create(CatalogoApi::class.java)

    fun authed(tokenProvider: () -> String?): Retrofit =
        retrofit(httpClient(tokenProvider))

    inline fun <reified T> api(noinline tokenProvider: () -> String?): T =
        authed(tokenProvider).create(T::class.java)

    fun feedApi(tokenProvider: () -> String?): FeedApi = api(tokenProvider)

    /** Convierte `/api/media/archivo/...` en URL absoluta para Coil. */
    fun resolveUrl(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val origin = BuildConfig.API_BASE_URL.trimEnd('/').removeSuffix("/api")
        return origin + if (path.startsWith("/")) path else "/$path"
    }
}
