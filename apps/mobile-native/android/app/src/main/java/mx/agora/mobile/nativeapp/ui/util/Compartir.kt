package mx.agora.mobile.nativeapp.ui.util

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.widget.Toast
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy

/**
 * Enlaces públicos de la web (mismas rutas que `apps/web/app`). Abren la app
 * si está instalada (DeepLinkParser entiende udlagora.com) y la web si no.
 */
object EnlacesWeb {
    const val BASE = "https://udlagora.com"

    fun publicacion(id: String) = "$BASE/publicacion/$id"
    fun evento(id: String) = "$BASE/eventos/$id"
    fun anuncio(id: String) = "$BASE/marketplace/$id"
    fun perfil(handle: String) = "$BASE/perfil/$handle"
}

/** Hoja de compartir de Android (`ACTION_SEND`) con el enlace y, si hay, un título. */
fun compartirEnlace(context: Context, url: String, titulo: String? = null) {
    val texto = if (titulo.isNullOrBlank()) url else "$titulo\n$url"
    val envio = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, texto)
        if (!titulo.isNullOrBlank()) {
            putExtra(Intent.EXTRA_SUBJECT, titulo)
            putExtra(Intent.EXTRA_TITLE, titulo)
        }
    }
    val selector = Intent.createChooser(envio, AgoraCopy.compartir.accion).apply {
        if (context !is Activity) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    runCatching { context.startActivity(selector) }
        .onFailure { Toast.makeText(context, "No se pudo compartir", Toast.LENGTH_SHORT).show() }
}
