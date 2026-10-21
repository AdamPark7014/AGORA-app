package mx.agora.mobile.nativeapp.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

data class SessionUser(
    val token: String,
    val email: String,
    val handle: String?,
    val nombre: String?,
    val tienePerfil: Boolean,
)

/**
 * Lo que [AuthRepository] necesita de la sesión guardada. [SessionStore] es la
 * implementación real (cifrada); las pruebas unitarias usan una en memoria.
 */
interface AlmacenSesion {
    fun load(): SessionUser?
    fun save(user: SessionUser)
    fun clear()
    fun token(): String?
    fun hasSeenWelcome(): Boolean
    fun markWelcomeSeen()
}

class SessionStore(context: Context) : AlmacenSesion {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "agora_session",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    override fun load(): SessionUser? {
        val token = prefs.getString("token", null) ?: return null
        val email = prefs.getString("email", null) ?: return null
        return SessionUser(
            token = token,
            email = email,
            handle = prefs.getString("handle", null),
            nombre = prefs.getString("nombre", null),
            tienePerfil = prefs.getBoolean("tiene_perfil", false),
        )
    }

    override fun save(user: SessionUser) {
        prefs.edit()
            .putString("token", user.token)
            .putString("email", user.email)
            .putString("handle", user.handle)
            .putString("nombre", user.nombre)
            .putBoolean("tiene_perfil", user.tienePerfil)
            .apply()
    }

    override fun clear() {
        prefs.edit().clear().apply()
    }

    override fun token(): String? = prefs.getString("token", null)

    override fun hasSeenWelcome(): Boolean = prefs.getBoolean("seen_welcome", false)

    override fun markWelcomeSeen() {
        prefs.edit().putBoolean("seen_welcome", true).apply()
    }
}
