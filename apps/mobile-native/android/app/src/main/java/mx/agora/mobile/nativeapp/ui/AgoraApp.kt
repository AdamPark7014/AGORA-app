package mx.agora.mobile.nativeapp.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.realtime.RealtimeBus
import mx.agora.mobile.nativeapp.ui.navigation.AgoraNavHost
import mx.agora.mobile.nativeapp.ui.navigation.PendingDeepLink
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
    var session by remember { mutableStateOf(auth.loadSession()) }
    var showWelcome by remember {
        mutableStateOf(session != null && !auth.hasSeenWelcome())
    }

    fun onSessionLost() {
        PendingDeepLink.clear(context)
        auth.logout()
        session = null
        showWelcome = false
    }

    LaunchedEffect(session?.token, session?.handle) {
        val token = session?.token
        if (token.isNullOrBlank()) {
            RealtimeBus.stop()
        } else {
            RealtimeBus.start(token, session?.handle)
        }
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
                )
            }
        }
    }
}
