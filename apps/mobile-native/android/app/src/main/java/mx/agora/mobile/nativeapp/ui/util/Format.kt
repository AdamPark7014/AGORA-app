package mx.agora.mobile.nativeapp.ui.util

import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import retrofit2.HttpException
import java.io.IOException
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val zona = ZoneId.of("America/Mexico_City")
private val fechaCorta = DateTimeFormatter.ofPattern("EEE d MMM · HH:mm", Locale("es", "MX"))

fun formatearFecha(iso: String): String = runCatching {
    fechaCorta.format(Instant.parse(iso).atZone(zona))
}.getOrElse { iso }

fun haceCuanto(iso: String): String = runCatching {
    val min = ((System.currentTimeMillis() - Instant.parse(iso).toEpochMilli()) / 60_000).toInt()
    when {
        min < 1 -> "ahora"
        min < 60 -> "hace $min min"
        min < 60 * 24 -> "hace ${min / 60} h"
        min < 60 * 24 * 7 -> "hace ${min / (60 * 24)} d"
        else -> fechaCorta.format(Instant.parse(iso).atZone(zona))
    }
}.getOrElse { iso }

fun formatearPrecio(mxn: Int): String = "$${"%,d".format(mxn)}"

private val horaCorta = DateTimeFormatter.ofPattern("HH:mm")

/** Hora corta (`14:05`) en hora de México. Si no se puede leer, cadena vacía. */
fun formatearHora(iso: String): String = runCatching {
    horaCorta.format(Instant.parse(iso).atZone(zona))
}.getOrElse { "" }

/**
 * Textos por omisión de Nest y del limitador, en inglés. Si el servidor no
 * puso un mensaje propio, llegan estos y no sirven para el usuario.
 */
private val mensajeGenericoEnIngles = Regex(
    "^(Bad Request|Unauthorized|Forbidden( resource)?|Not Found|Conflict|Gone|Payload Too Large|" +
        "Unprocessable Entity|Too Many Requests|Internal Server Error|Service Unavailable|" +
        "ThrottlerException.*|Cannot (GET|POST|PUT|PATCH|DELETE) .*|Http failure.*)$",
    RegexOption.IGNORE_CASE,
)

/**
 * Lo que se le dice al usuario cuando algo falla.
 *
 * Primero el mensaje que manda la API en el cuerpo (`{ mensaje }`): ahí vienen
 * «Ya no hay lugares», «Esa encuesta ya cerró» o el motivo de moderación, que
 * antes se perdían detrás de «Algo salió mal». Si no hay, uno en español según
 * el código. Nunca el texto de la excepción: suele venir en inglés.
 *
 * Ojo: lee el cuerpo del error, que solo se puede leer una vez. Las pantallas
 * que ya hacen `ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)` siguen igual.
 */
fun mensajeDe(error: Throwable): String = when (error) {
    is IOException -> AgoraCopy.errors.network
    is HttpException -> {
        val codigo = error.code()
        val delServidor = if (codigo == 401 || (codigo >= 500 && codigo != 503)) {
            // 401: la sesión se renueva aparte. 5xx: el detalle no le sirve al usuario.
            null
        } else {
            ApiClient.mensajeDelServidor(error)?.trim()?.takeUnless { mensajeGenericoEnIngles.matches(it) }
        }
        delServidor ?: when (codigo) {
            400, 422 -> "Revisa lo que escribiste e intenta de nuevo."
            401 -> AgoraCopy.errors.session
            403 -> "No tienes permiso para esto."
            404 -> AgoraCopy.errors.notFound
            409 -> "Eso ya cambió mientras tanto. Recarga e intenta de nuevo."
            410 -> "Esto ya no está disponible."
            413 -> "Lo que mandaste pesa demasiado."
            429 -> "Vas muy rápido. Espera un momento y vuelve a intentar."
            503 -> "Ágora está en mantenimiento. Vuelve a intentar en un rato."
            in 500..599 -> "Algo se rompió de nuestro lado. Intenta de nuevo en un momento."
            else -> AgoraCopy.errors.generic
        }
    }
    else -> AgoraCopy.errors.generic
}
