package mx.agora.mobile.nativeapp.data

import android.content.Context

/** Tema elegido en Ajustes. SISTEMA sigue el modo claro/oscuro del teléfono. */
enum class ModoTema(val clave: String, val etiqueta: String) {
    SISTEMA("sistema", "Sistema"),
    CLARO("claro", "Claro"),
    OSCURO("oscuro", "Oscuro"),
    ;

    companion object {
        fun deClave(clave: String?): ModoTema = entries.firstOrNull { it.clave == clave } ?: SISTEMA
    }
}

/**
 * Preferencia de tema en SharedPreferences normales: no es un dato sensible,
 * así que no va con la sesión cifrada, y sobrevive al cerrar sesión.
 *
 * `AgoraColors` lee un flag simple (no estado de Compose), así que cambiar el
 * tema recrea la Activity; [leer] se consulta en `MainActivity.onCreate`.
 */
object PreferenciasTema {
    private const val ARCHIVO = "agora_prefs"
    private const val CLAVE = "tema"

    fun leer(context: Context): ModoTema =
        ModoTema.deClave(
            context.applicationContext
                .getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)
                .getString(CLAVE, null),
        )

    fun guardar(context: Context, modo: ModoTema) {
        context.applicationContext
            .getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)
            .edit()
            .putString(CLAVE, modo.clave)
            .commit()
    }
}
