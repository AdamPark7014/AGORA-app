package mx.agora.mobile.nativeapp.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.ExpoPushTokenRequest
import mx.agora.mobile.nativeapp.data.api.FcmPushTokenRequest
import mx.agora.mobile.nativeapp.data.api.PushApi

class AgoraFirebaseService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        Log.d(TAG, "Nuevo token FCM: ${token.take(12)}…")
        val ctx = applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                val auth = AuthRepository(ctx)
                if (auth.token().isNullOrBlank()) return@runCatching
                val api = ApiClient.api<PushApi> { auth.token() }
                val resp = runCatching {
                    api.suscribirFcm(FcmPushTokenRequest(token))
                }.getOrNull()
                if (resp?.ok != true) {
                    api.suscribirExpo(ExpoPushTokenRequest(token))
                }
            }.onFailure { Log.w(TAG, "No se pudo registrar token: ${it.message}") }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: message.data["titulo"] ?: message.data["title"]
        val body = message.notification?.body ?: message.data["cuerpo"] ?: message.data["body"]
        AgoraNotifications.show(
            context = applicationContext,
            title = title,
            body = body,
            data = message.data,
        )
    }

    companion object {
        private const val TAG = "AgoraFirebaseService"
    }
}
