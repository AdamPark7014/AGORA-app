package mx.agora.mobile.nativeapp.ui

import android.widget.Toast
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.SessionUser
import mx.agora.mobile.nativeapp.data.YoCache
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.YoResponse
import mx.agora.mobile.nativeapp.data.realtime.RealtimeBus
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.navigation.AgoraNavHost
import mx.agora.mobile.nativeapp.ui.navigation.PendingDeepLink
import mx.agora.mobile.nativeapp.ui.screens.BloqueoUdlapScreen
import mx.agora.mobile.nativeapp.ui.screens.LoginScreen
import mx.agora.mobile.nativeapp.ui.screens.RegistroScreen
import mx.agora.mobile.nativeapp.ui.screens.WelcomeScreen
import mx.agora.mobile.nativeapp.ui.session.SessionExpiredHost

@Composable
fun AgoraApp(
    auth: AuthRepository,
    onSessionReady: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var session by remember { mutableStateOf(auth.loadSession()) }
    var showWelcome by remember {
        mutableStateOf(session != null && !auth.hasSeenWelcome())
    }
    /**
     * `auth/yo` de la sesión abierta: dice si la cuenta (registrada con el correo
     * personal) aún debe confirmar la UDLAP (aviso del feed) o si ya se le pasó
     * el plazo (bloqueo). Null mientras no responde: no se bloquea a ciegas.
     */
    var yo by remember { mutableStateOf<YoResponse?>(null) }
    var revisarYo by remember { mutableIntStateOf(0) }
    var cerrandoSesion by remember { mutableStateOf(false) }

    fun onSessionLost() {
        PendingDeepLink.clear(context)
        auth.logout()
        session = null
        yo = null
        showWelcome = false
        cerrandoSesion = false
    }

    /** Cierre completo desde el bloqueo (push + `auth/salir`, que sí responde con el plazo vencido). */
    fun cerrarSesionCompleta() {
        if (cerrandoSesion) return
        cerrandoSesion = true
        scope.launch {
            auth.cerrarSesion()
            onSessionLost()
        }
    }

    /**
     * Se confirmó la UDLAP: la API cerró todas las sesiones y dio una nueva (ya
     * guardada), y se eligió la contraseña otra vez.
     */
    fun onUdlapConfirmada(user: SessionUser) {
        session = user
        yo = yo?.copy(
            udlapPendiente = false,
            udlapVencida = false,
            udlapVenceEn = null,
            udlapDiasRestantes = null,
            tieneContrasena = true,
        )
        YoCache.limpiar()
        onSessionReady()
        Toast.makeText(context, AgoraCopy.login.udlap.confirmada, Toast.LENGTH_LONG).show()
    }

    LaunchedEffect(session?.token, session?.handle) {
        val token = session?.token
        if (token.isNullOrBlank()) {
            RealtimeBus.stop()
        } else {
            RealtimeBus.start(token, session?.handle)
        }
    }

    LaunchedEffect(session?.token, revisarYo) {
        val token = session?.token
        if (token.isNullOrBlank()) {
            yo = null
            return@LaunchedEffect
        }
        // Con el token de esta sesión y no el del almacén: al confirmar la UDLAP
        // la sesión nueva se guarda antes de elegir la contraseña, y el bloqueo
        // debe seguir en pantalla hasta terminar. `auth/yo` no da 403 por el
        // plazo, y un 401 en `/auth/` no dispara «sesión expirada».
        val nuevo = try {
            ApiClient.api<AuthApi> { token }.yo()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            null
        }
        if (nuevo != null) yo = nuevo
    }

    // Una cuenta pendiente puede vencer con la app abierta: se vuelve a mirar al regresar a ella.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observador = LifecycleEventObserver { _, evento ->
            if (evento == Lifecycle.Event.ON_RESUME && yo?.udlapPendiente == true) revisarYo++
        }
        lifecycleOwner.lifecycle.addObserver(observador)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observador) }
    }

    SessionExpiredHost(onSessionExpired = ::onSessionLost) {
        when {
            session == null -> {
                LoginScreen(
                    auth = auth,
                    onLoggedIn = { user ->
                        session = user
                        showWelcome = !auth.hasSeenWelcome()
                        onSessionReady()
                        PendingDeepLink.flush(context)
                    },
                )
            }
            yo?.udlapVencida == true -> {
                BloqueoUdlapScreen(
                    auth = auth,
                    email = yo?.email ?: session!!.email,
                    onConfirmada = ::onUdlapConfirmada,
                    onCerrarSesion = ::cerrarSesionCompleta,
                    cerrandoSesion = cerrandoSesion,
                )
            }
            showWelcome -> {
                WelcomeScreen(
                    onFinished = {
                        auth.markWelcomeSeen()
                        showWelcome = false
                    },
                )
            }
            !session!!.tienePerfil -> {
                RegistroScreen(
                    auth = auth,
                    onCompletado = { user ->
                        session = user
                        onSessionReady()
                        PendingDeepLink.flush(context)
                    },
                )
            }
            else -> {
                LaunchedEffect(Unit) {
                    PendingDeepLink.flush(context)
                }
                AgoraNavHost(
                    auth = auth,
                    onLogout = ::onSessionLost,
                    yo = yo,
                    onUdlapConfirmada = ::onUdlapConfirmada,
                )
            }
        }
    }
}
