package mx.agora.mobile.nativeapp.ui.util

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

fun mensajeDe(error: Throwable): String = when (error) {
    is IOException -> AgoraCopy.errors.network
    is HttpException -> when (error.code()) {
        401 -> AgoraCopy.errors.session
        403 -> "No tienes permiso para esto."
        404 -> AgoraCopy.errors.notFound
        else -> AgoraCopy.errors.generic
    }
    else -> error.message ?: AgoraCopy.errors.generic
}
