package mx.agora.mobile.nativeapp

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.ModoTema
import mx.agora.mobile.nativeapp.data.PreferenciasTema
import mx.agora.mobile.nativeapp.data.PendingPostSync
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.GamificacionApi
import mx.agora.mobile.nativeapp.data.gamificacion.GamificacionEvents
import mx.agora.mobile.nativeapp.push.AgoraNotifications
import mx.agora.mobile.nativeapp.push.PushRegistration
import mx.agora.mobile.nativeapp.ui.AgoraApp
import mx.agora.mobile.nativeapp.ui.analytics.AgoraCrashReporting
import mx.agora.mobile.nativeapp.ui.navigation.DeepLinkParser
import mx.agora.mobile.nativeapp.ui.navigation.PendingDeepLink
import mx.agora.mobile.nativeapp.ui.theme.AgoraTheme

class MainActivity : FragmentActivity() {
    private lateinit var auth: AuthRepository

    private val pedirNotificaciones = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { _ ->
        PushRegistration.registerCurrentDeviceAsync(applicationContext)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val auth = AuthRepository(applicationContext)
        this.auth = auth
        AgoraNotifications.ensureChannels(applicationContext)
        // Al recrearse (rotación o cambio de tema en Ajustes) el intent de
        // arranque es el mismo: volver a procesarlo repetiría la navegación.
        if (savedInstanceState == null) handleDeepLinkIntent(intent)

        if (auth.token() != null) {
            solicitarPermisoNotificacionesSiFalta()
            PushRegistration.registerCurrentDeviceAsync(applicationContext)
            PendingPostSync.start(applicationContext) { auth.token() }
            AgoraCrashReporting.install { auth.token() }
            registrarActividadGamificacion(auth)
        }

        // Cambiar el tema en Ajustes guarda la preferencia y recrea la Activity.
        val modoTema = PreferenciasTema.leer(applicationContext)

        setContent {
            val oscuro = when (modoTema) {
                ModoTema.SISTEMA -> isSystemInDarkTheme()
                ModoTema.CLARO -> false
                ModoTema.OSCURO -> true
            }
            AgoraTheme(oscuro = oscuro) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AgoraApp(
                        auth = auth,
                        onSessionReady = {
                            solicitarPermisoNotificacionesSiFalta()
                            PushRegistration.registerCurrentDeviceAsync(applicationContext)
                            PendingPostSync.start(applicationContext) { auth.token() }
                            AgoraCrashReporting.install { auth.token() }
                            registrarActividadGamificacion(auth)
                        },
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLinkIntent(intent)
    }

    private fun handleDeepLinkIntent(intent: Intent?) {
        val route = DeepLinkParser.parseIntent(intent) ?: return
        PendingDeepLink.enqueue(applicationContext, route, auth.token() != null)
    }

    private fun solicitarPermisoNotificacionesSiFalta() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        pedirNotificaciones.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun registrarActividadGamificacion(auth: AuthRepository) {
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                val resp = ApiClient.api<GamificacionApi> { auth.token() }.ping()
                GamificacionEvents.notifyPingResult(resp.nuevasInsignias)
            }
        }
    }
}
