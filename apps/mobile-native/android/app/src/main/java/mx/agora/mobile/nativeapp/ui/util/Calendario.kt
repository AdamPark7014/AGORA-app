package mx.agora.mobile.nativeapp.ui.util

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.provider.CalendarContract
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** Sin hora de fin, el evento dura dos horas, igual que el .ics de la web. */
private const val DURACION_POR_OMISION_MS = 2 * 60 * 60_000L

/**
 * ISO de la API (`2026-10-24T04:00:00.000Z`) a milisegundos. Con java.util y no
 * java.time: minSdk es 24 y no hay desugaring.
 */
fun isoAMilis(iso: String): Long? {
    val formatos = listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'")
    for (patron in formatos) {
        val f = SimpleDateFormat(patron, Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
            isLenient = false
        }
        runCatching { f.parse(iso)?.time }.getOrNull()?.let { return it }
    }
    return null
}

/**
 * «Agregar a mi calendario»: abre la pantalla de evento nuevo del calendario
 * del teléfono (Google Calendar, Samsung…) ya llena. Sin permisos de calendario:
 * la persona confirma ahí mismo.
 */
fun agregarACalendario(
    context: Context,
    titulo: String,
    descripcion: String?,
    lugar: String?,
    inicioIso: String,
    finIso: String?,
    enlace: String,
) {
    val inicio = isoAMilis(inicioIso) ?: run {
        Toast.makeText(context, "No pudimos leer la fecha del evento.", Toast.LENGTH_SHORT).show()
        return
    }
    val fin = finIso?.let(::isoAMilis) ?: (inicio + DURACION_POR_OMISION_MS)
    val intent = Intent(Intent.ACTION_INSERT)
        .setData(CalendarContract.Events.CONTENT_URI)
        .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, inicio)
        .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, fin)
        .putExtra(CalendarContract.Events.TITLE, titulo)
        .putExtra(CalendarContract.Events.EVENT_LOCATION, lugar.orEmpty())
        .putExtra(CalendarContract.Events.DESCRIPTION, listOfNotNull(descripcion, enlace).joinToString("\n\n"))
    try {
        context.startActivity(intent)
    } catch (_: ActivityNotFoundException) {
        Toast.makeText(context, "No encontramos una app de calendario en tu teléfono.", Toast.LENGTH_SHORT).show()
    }
}
