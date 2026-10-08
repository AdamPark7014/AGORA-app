package mx.agora.mobile.nativeapp.push

import android.content.Context
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ExpoPushTokenRequest
import mx.agora.mobile.nativeapp.data.api.FcmPushTokenRequest
import mx.agora.mobile.nativeapp.data.api.PushApi

/**
 * Registra el token FCM del dispositivo con la API tras login o al abrir la app.
 */
object PushRegistration {
    private const val TAG = "PushRegistration"

    fun registerCurrentDeviceAsync(context: Context) {
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                val auth = AuthRepository(context)
                val token = auth.token()
                if (token.isNullOrBlank()) return@runCatching

                val fcmToken = FirebaseMessaging.getInstance().token.await()
                val api = ApiClient.api<PushApi> { auth.token() }

                val resp = runCatching {
                    api.suscribirFcm(FcmPushTokenRequest(fcmToken))
                }.getOrNull()

                if (resp?.ok != true) {
                    api.suscribirExpo(ExpoPushTokenRequest(fcmToken))
                }

                Log.d(TAG, "Token FCM registrado: …${fcmToken.takeLast(8)}")
            }.onFailure { Log.w(TAG, "Error registrando FCM: ${it.message}") }
        }
    }

    /**
     * Al cerrar sesión: el dispositivo deja de recibir avisos de esta cuenta.
     * Recibe el token de sesión porque se llama justo antes de borrarlo.
     * Nunca lanza; si Firebase o la red no responden, se sigue con el cierre.
     */
    suspend fun desregistrarDispositivo(tokenSesion: String) {
        runCatching {
            val fcmToken = withTimeoutOrNull(4_000) {
                FirebaseMessaging.getInstance().token.await()
            } ?: return
            ApiClient.api<PushApi> { tokenSesion }
                .desuscribirFcm(FcmPushTokenRequest(fcmToken))
            Log.d(TAG, "Token FCM dado de baja: …${fcmToken.takeLast(8)}")
        }.onFailure { Log.w(TAG, "Error dando de baja FCM: ${it.message}") }
    }
}
