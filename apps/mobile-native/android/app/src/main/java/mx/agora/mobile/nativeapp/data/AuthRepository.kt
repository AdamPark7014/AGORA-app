package mx.agora.mobile.nativeapp.data

import android.content.Context
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.realtime.RealtimeBus
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.CrearPerfilRequest
import mx.agora.mobile.nativeapp.data.api.PerfilApi
import mx.agora.mobile.nativeapp.data.api.SolicitarOtpRequest
import mx.agora.mobile.nativeapp.data.api.VerificarOtpRequest
import retrofit2.HttpException

class AuthRepository(private val context: Context) {
    private val store = SessionStore(context)

    fun loadSession(): SessionUser? = store.load()

    fun token(): String? = store.token()

    fun hasSeenWelcome(): Boolean = store.hasSeenWelcome()

    fun markWelcomeSeen() = store.markWelcomeSeen()

    suspend fun solicitarOtp(email: String) {
        val resp = ApiClient.auth.solicitarOtp(SolicitarOtpRequest(email.trim().lowercase()))
        if (!resp.isSuccessful) throw HttpException(resp)
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

    fun logout() {
        RealtimeBus.stop()
        store.clear()
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
