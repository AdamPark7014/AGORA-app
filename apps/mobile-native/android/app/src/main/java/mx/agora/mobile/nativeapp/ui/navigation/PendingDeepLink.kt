package mx.agora.mobile.nativeapp.ui.navigation

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Cola de deep links recibidos antes de login (patrón NEXARA).
 * Persiste en prefs cifradas para cold-start.
 */
object PendingDeepLink {
    private const val PREFS = "agora_pending"
    private const val KEY_ROUTE = "route"

    private fun prefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        PREFS,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun enqueue(context: Context, route: String, isLoggedIn: Boolean) {
        if (isLoggedIn) {
            DeepLinkBus.emit(route)
        } else {
            prefs(context).edit().putString(KEY_ROUTE, route).apply()
        }
    }

    fun flush(context: Context) {
        val route = prefs(context).getString(KEY_ROUTE, null) ?: return
        prefs(context).edit().remove(KEY_ROUTE).apply()
        DeepLinkBus.emit(route)
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_ROUTE).apply()
    }
}
