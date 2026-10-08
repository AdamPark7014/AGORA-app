package mx.agora.mobile.nativeapp.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.realtime.RealtimeBus
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.CrearPerfilRequest
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.SolicitarOtpRequest
import mx.agora.mobile.nativeapp.data.api.VerificarOtpRequest
import mx.agora.mobile.nativeapp.push.PushRegistration
import retrofit2.HttpException

class AuthRepository(private val context: Context) {
    private val store = SessionStore(context)

    fun loadSession(): SessionUser? = store.load()

    fun token(): String? = store.token()

    fun hasSeenWelcome(): Boolean = store.hasSeenWelcome()

    fun markWelcomeSeen() = store.markWelcomeSeen()

    /**
     * Pide el código. Devuelve el id de seguimiento de la entrega (cabecera
     * `X-Envio-Id`) o null si la API no lo manda (API vieja o modo consola).
     */
    suspend fun solicitarOtp(email: String): String? {
        val resp = ApiClient.auth.solicitarOtp(SolicitarOtpRequest(email.trim().lowercase()))
        if (!resp.isSuccessful) throw HttpException(resp)
        return resp.headers()["X-Envio-Id"]?.trim()?.takeIf { it.isNotEmpty() }
    }

    /**
     * Estado de la entrega del código: enviado, demorado, entregado, rebotado,
     * bloqueado o error. Null si la API ya no conoce ese envío (404): no hay
     * nada que seguir. Cualquier otro fallo lanza y el que pregunta reintenta.
     */
    suspend fun estadoEntrega(envioId: String): String? {
        val resp = ApiClient.auth.entregaOtp(envioId)
        if (resp.code() == 404) return null
        if (!resp.isSuccessful) throw HttpException(resp)
        return resp.body()?.estado
    }

    suspend fun verificarOtp(email: String, codigo: String): SessionUser {
        val resp = ApiClient.auth.verificarOtp(
            VerificarOtpRequest(email.trim().lowercase(), codigo.trim(), "token"),
        )
        val token = resp.token ?: throw IllegalStateException("La API no devolvió token.")
        val yo = runCatching {
            val authed = ApiClient.authed { token }
            authed.create(mx.agora.mobile.nativeapp.data.api.AuthApi::class.java).yo()
        }.getOrNull()

        val user = SessionUser(
            token = token,
            email = email.trim().lowercase(),
            handle = yo?.handle,
            nombre = yo?.nombre,
            tienePerfil = resp.tienePerfil,
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
                    runCatching { ApiClient.api<AuthApi> { token }.salir() }
                }
            }
        }
        logout()
    }

    suspend fun refreshSession(): SessionUser? {
        val current = store.load() ?: return null
        val yo = runCatching {
            ApiClient.api<AuthApi> { current.token }.yo()
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
}
