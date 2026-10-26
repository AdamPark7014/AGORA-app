package mx.agora.mobile.nativeapp.ui.navigation

import android.content.Context
import mx.agora.mobile.nativeapp.data.SessionStore

/**
 * Cola de deep links recibidos antes de login (patrón NEXARA).
 * Persiste en las prefs cifradas de la sesión para cold-start: antes abría unas
 * propias (otra llave y otro keyset de Tink, dos veces por llamada y en el hilo
 * principal). Cerrar sesión las vacía, y con ellas la ruta pendiente.
 */
object PendingDeepLink {
    private const val KEY_ROUTE = "pending_route"

    private fun prefs(context: Context) = SessionStore.prefsCifradas(context)

    fun enqueue(context: Context, route: String, isLoggedIn: Boolean) {
        if (isLoggedIn) {
            DeepLinkBus.emit(route)
        } else {
            prefs(context).edit().putString(KEY_ROUTE, route).apply()
        }
    }

    fun flush(context: Context) {
        val prefs = prefs(context)
        val route = prefs.getString(KEY_ROUTE, null) ?: return
        prefs.edit().remove(KEY_ROUTE).apply()
        DeepLinkBus.emit(route)
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_ROUTE).apply()
    }
}
