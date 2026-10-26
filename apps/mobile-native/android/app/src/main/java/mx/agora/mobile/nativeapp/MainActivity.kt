package mx.agora.mobile.nativeapp

import android.content.Intent
import android.content.res.Configuration
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.view.WindowCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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
    /** Null hasta que las prefs cifradas de la sesión están abiertas (ver onCreate). */
    private var auth: AuthRepository? = null

    /** Deep link que llegó por onNewIntent antes de tener la sesión lista. */
    private var intentSinAtender: Intent? = null

    // El permiso de avisos del sistema no se pide aquí (regla de Adam, docs/diseno-d.md §6):
    // solo en el último paso de la bienvenida (WelcomeScreen) y desde Ajustes.

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        AgoraNotifications.ensureChannels(applicationContext)
        // Al recrearse (rotación o cambio de tema en Ajustes) el intent de
        // arranque es el mismo: volver a procesarlo repetiría la navegación.
        val atenderIntent = savedInstanceState == null
        // Cambiar el tema en Ajustes guarda la preferencia y recrea la Activity.
        val modoTema = PreferenciasTema.leer(applicationContext)
        pintarFondoDeArranque(modoTema)

        // La sesión vive en prefs cifradas: abrirlas la primera vez crea la llave en
        // el Keystore y tarda segundos en un teléfono lento. Hecho aquí, en el hilo
        // principal, la puerta salía con «Ágora no responde». Se abren en segundo
        // plano; mientras, se ve el fondo del tema.
        lifecycleScope.launch {
            val auth = withContext(Dispatchers.IO) {
                AuthRepository(applicationContext).also { it.token() }
            }
            this@MainActivity.auth = auth
            if (atenderIntent) handleDeepLinkIntent(intent)
            intentSinAtender?.let { handleDeepLinkIntent(it) }
            intentSinAtender = null
            arrancar(auth, modoTema)
        }
    }

    /**
     * El tema de la ventana (`Theme.Agora`) es claro y no tiene variante nocturna:
     * el tema por omisión es claro aunque el teléfono esté en oscuro. Quien eligió
     * oscuro (o «Sistema» con el teléfono en oscuro) ve aquí ya el fondo oscuro,
     * porque la ventana se queda a la vista mientras abren las prefs cifradas.
     */
    private fun pintarFondoDeArranque(modoTema: ModoTema) {
        val oscuro = when (modoTema) {
            ModoTema.SISTEMA ->
                (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
            ModoTema.CLARO -> false
            ModoTema.OSCURO -> true
        }
        window.setBackgroundDrawable(ColorDrawable(if (oscuro) 0xFF0F0D0B.toInt() else 0xFFF4F2EF.toInt()))
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = !oscuro
    }

    private fun arrancar(auth: AuthRepository, modoTema: ModoTema) {
        if (auth.token() != null) {
            PushRegistration.registerCurrentDeviceAsync(applicationContext)
            PendingPostSync.start(applicationContext) { auth.token() }
            AgoraCrashReporting.install { auth.token() }
            registrarActividadGamificacion(auth)
        }

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
        if (auth == null) intentSinAtender = intent else handleDeepLinkIntent(intent)
    }

    private fun handleDeepLinkIntent(intent: Intent?) {
        val auth = auth ?: return
        val route = DeepLinkParser.parseIntent(intent) ?: return
        PendingDeepLink.enqueue(applicationContext, route, auth.token() != null)
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
