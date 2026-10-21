package mx.agora.mobile.nativeapp.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.CambiarContrasenaRequest
import mx.agora.mobile.nativeapp.data.api.CrearContrasenaRequest
import mx.agora.mobile.nativeapp.data.api.CrearPerfilRequest
import mx.agora.mobile.nativeapp.data.api.EntrarRequest
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.SolicitarOtpRequest
import mx.agora.mobile.nativeapp.data.api.VerificarOtpRequest
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.data.realtime.RealtimeBus
import mx.agora.mobile.nativeapp.push.PushRegistration
import retrofit2.HttpException

/**
 * Resultado de entrar por código. `tieneContrasena` decide si la pantalla pide
 * crear una antes de pasar (null: la API aún no lo manda, se sigue como antes).
 */
data class EntradaPorCodigo(
    val user: SessionUser,
    val tieneContrasena: Boolean?,
)

class AuthRepository internal constructor(
    private val store: AlmacenSesion,
    private val authApi: AuthApi,
    /** `AuthApi` con el Bearer de la sesión indicada (para `auth/yo` y contraseñas). */
    private val authApiConToken: (token: String) -> AuthApi,
) {
    constructor(context: Context) : this(
        store = SessionStore(context),
        authApi = ApiClient.auth,
        authApiConToken = { token -> ApiClient.api<AuthApi> { token } },
    )

    fun loadSession(): SessionUser? = store.load()

    fun token(): String? = store.token()

    fun hasSeenWelcome(): Boolean = store.hasSeenWelcome()

    fun markWelcomeSeen() = store.markWelcomeSeen()

    /**
     * Pide el código. Devuelve el id de seguimiento de la entrega (cabecera
     * `X-Envio-Id`) o null si la API no lo manda (API vieja o modo consola).
     */
    suspend fun solicitarOtp(email: String): String? {
        val resp = authApi.solicitarOtp(SolicitarOtpRequest(normalizar(email)))
        if (!resp.isSuccessful) throw HttpException(resp)
        return resp.headers()["X-Envio-Id"]?.trim()?.takeIf { it.isNotEmpty() }
    }

    /**
     * Estado de la entrega del código: enviado, demorado, entregado, rebotado,
     * bloqueado o error. Null si la API ya no conoce ese envío (404): no hay
     * nada que seguir. Cualquier otro fallo lanza y el que pregunta reintenta.
     */
    suspend fun estadoEntrega(envioId: String): String? {
        val resp = authApi.entregaOtp(envioId)
        if (resp.code() == 404) return null
        if (!resp.isSuccessful) throw HttpException(resp)
        return resp.body()?.estado
    }

    /** Entra con el código del correo y guarda la sesión. */
    suspend fun verificarOtp(email: String, codigo: String): EntradaPorCodigo {
        val resp = authApi.verificarOtp(
            VerificarOtpRequest(normalizar(email), codigo.trim(), "token"),
        )
        val token = resp.token ?: throw IllegalStateException("La API no devolvió token.")
        val user = abrirSesion(token, normalizar(email), resp.tienePerfil)
        return EntradaPorCodigo(user, resp.tieneContrasena)
    }

    /**
     * Entra con correo + contraseña (`POST auth/entrar`) y guarda la sesión igual
     * que [verificarOtp]. Sin «recordarme» la API da una sesión de 12 h que no se
     * renueva. Los 401 (correo, contraseña o cuenta sin contraseña) y los 429
     * (cinco fallos) llegan como [HttpException] con el `mensaje` de la API.
     */
    suspend fun entrar(email: String, contrasena: String, recordarme: Boolean): SessionUser {
        val resp = authApi.entrar(
            EntrarRequest(
                email = normalizar(email),
                contrasena = contrasena,
                modo = "token",
                recordarme = recordarme,
            ),
        )
        val token = resp.token ?: throw IllegalStateException("La API no devolvió token.")
        return abrirSesion(token, normalizar(email), resp.tienePerfil)
    }

    /**
     * Fija la contraseña sin pedir la actual. La API lo permite si la cuenta no
     * tiene, o si la sesión se abrió por código hace menos de 30 min («olvidé»).
     */
    suspend fun crearContrasena(contrasena: String) {
        val token = store.token() ?: throw IllegalStateException("Sin sesión.")
        val resp = authApiConToken(token).crearContrasena(CrearContrasenaRequest(contrasena))
        if (!resp.isSuccessful) throw HttpException(resp)
        YoCache.limpiar()
    }

    /** Cambia la contraseña dando la actual. Las otras sesiones se cierran. */
    suspend fun cambiarContrasena(actual: String, nueva: String) {
        val token = store.token() ?: throw IllegalStateException("Sin sesión.")
        val resp = authApiConToken(token).cambiarContrasena(CambiarContrasenaRequest(actual, nueva))
        if (!resp.isSuccessful) throw HttpException(resp)
        YoCache.limpiar()
    }

    /** `GET auth/yo` con la sesión actual, sin caché (p. ej. para saber si ya hay contraseña). */
    suspend fun yo(): YoResponse? {
        val token = store.token() ?: return null
        return authApiConToken(token).yo()
    }

    /**
     * Completa la sesión con `auth/yo` (handle y nombre; si falla se guarda sin
     * ellos, como siempre) y la deja en el almacén.
     */
    private suspend fun abrirSesion(token: String, email: String, tienePerfil: Boolean): SessionUser {
        val yo = runCatching { authApiConToken(token).yo() }.getOrNull()
        val user = SessionUser(
            token = token,
            email = email,
            handle = yo?.handle,
            nombre = yo?.nombre,
            tienePerfil = tienePerfil,
        )
        store.save(user)
        return user
    }

    /** Borra la sesión local. No toca la red; para el cierre completo usa [cerrarSesion]. */
    fun logout() {
        RealtimeBus.stop()
        YoCache.limpiar()
        store.clear()
    }

    /**
     * Cierre de sesión completo: da de baja el push del dispositivo, invalida
     * la sesión en el servidor (`POST auth/salir`) y borra la sesión local.
     * Los fallos de red se ignoran: salir nunca se queda colgado.
     */
    suspend fun cerrarSesion() {
        val token = store.token()
        if (!token.isNullOrBlank()) {
            withContext(Dispatchers.IO) {
                withTimeoutOrNull(8_000) {
                    PushRegistration.desregistrarDispositivo(token)
                    runCatching { authApiConToken(token).salir() }
                }
            }
        }
        logout()
    }

    suspend fun refreshSession(): SessionUser? {
        val current = store.load() ?: return null
        val yo = runCatching {
            authApiConToken(current.token).yo()
        }.getOrNull() ?: return current

        val updated = current.copy(
            handle = yo.handle ?: current.handle,
            nombre = yo.nombre ?: current.nombre,
            tienePerfil = yo.tienePerfil ?: current.tienePerfil,
        )
        store.save(updated)
        return updated
    }

    suspend fun crearPerfil(datos: CrearPerfilRequest): SessionUser {
        val token = store.token() ?: throw IllegalStateException("Sin sesión.")
        val resp = ApiClient.api<PerfilApi> { token }.crear(datos)
        val current = store.load() ?: throw IllegalStateException("Sin sesión.")
        val updated = current.copy(
            handle = resp.handle,
            nombre = datos.nombre,
            tienePerfil = true,
        )
        store.save(updated)
        return updated
    }

    private fun normalizar(email: String) = email.trim().lowercase()
}
