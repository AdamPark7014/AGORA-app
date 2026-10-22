package mx.agora.mobile.nativeapp.ui.components

import android.text.format.DateFormat
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Zona del campus (UDLAP, Puebla). Todo lo que el usuario ve y elige va en esta hora,
 * aunque el teléfono esté en otra; al API se manda en UTC con [isoUtc].
 *
 * Se usa java.util (Calendar/TimeZone) y no java.time porque la app corre desde API 24
 * sin desugaring.
 */
val ZonaCampus: TimeZone = TimeZone.getTimeZone("America/Mexico_City")

private val zonaUtc: TimeZone = TimeZone.getTimeZone("UTC")
private val localeMx = Locale("es", "MX")

/** Instante (epoch ms) de hoy + [dias] a las [hora]:[minuto] en hora del campus. */
fun fechaHoraCampus(dias: Int, hora: Int, minuto: Int = 0): Long =
    Calendar.getInstance(ZonaCampus).apply {
        add(Calendar.DAY_OF_MONTH, dias)
        set(Calendar.HOUR_OF_DAY, hora)
        set(Calendar.MINUTE, minuto)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

/** ISO 8601 en UTC («2026-10-23T13:30:00Z»), el formato que espera el API. */
fun isoUtc(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        .apply { timeZone = zonaUtc }
        .format(Date(millis))

/** «jue 23 oct · 07:30» (o «7:30 a. m.» si el teléfono usa 12 h), en hora del campus. */
fun textoFechaHoraCampus(millis: Long, es24h: Boolean = true): String =
    SimpleDateFormat(if (es24h) "EEE d MMM · HH:mm" else "EEE d MMM · h:mm a", localeMx)
        .apply { timeZone = ZonaCampus }
        .format(Date(millis))

/** Medianoche UTC del día (en hora del campus) de [millis]: así cuenta los días el DatePicker. */
private fun diaCampusComoUtc(millis: Long): Long {
    val campus = Calendar.getInstance(ZonaCampus).apply { timeInMillis = millis }
    return Calendar.getInstance(zonaUtc).apply {
        clear()
        set(campus.get(Calendar.YEAR), campus.get(Calendar.MONTH), campus.get(Calendar.DAY_OF_MONTH))
    }.timeInMillis
}

/** Día elegido en el DatePicker (medianoche UTC) + hora del campus → instante real. */
private fun combinar(diaUtc: Long, hora: Int, minuto: Int): Long {
    val dia = Calendar.getInstance(zonaUtc).apply { timeInMillis = diaUtc }
    return Calendar.getInstance(ZonaCampus).apply {
        clear()
        set(
            dia.get(Calendar.YEAR),
            dia.get(Calendar.MONTH),
            dia.get(Calendar.DAY_OF_MONTH),
            hora,
            minuto,
            0,
        )
    }.timeInMillis
}

private fun anioUtc(millis: Long): Int =
    Calendar.getInstance(zonaUtc).apply { timeInMillis = millis }.get(Calendar.YEAR)

private enum class PasoFechaHora { Cerrado, Dia, Hora }

/**
 * Campo de fecha y hora: un toque abre el calendario y luego el reloj de Material 3.
 * Todo en hora del campus; no deja elegir nada antes de [minimo] (por defecto, ahora).
 *
 * @param valor instante elegido (epoch ms) o null si aún no hay.
 * @param sugerencia de dónde arrancan el calendario y el reloj cuando [valor] es null.
 * @param onQuitar si no es null, el campo es opcional y muestra una «x» para vaciarlo.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SelectorFechaHora(
    etiqueta: String,
    valor: Long?,
    onCambio: (Long) -> Unit,
    modifier: Modifier = Modifier,
    minimo: Long? = null,
    sugerencia: Long? = null,
    onQuitar: (() -> Unit)? = null,
    placeholder: String = "Toca para elegir fecha y hora",
    error: String? = null,
    enabled: Boolean = true,
) {
    val context = LocalContext.current
    val es24h = remember(context) { DateFormat.is24HourFormat(context) }
    var paso by remember { mutableStateOf(PasoFechaHora.Cerrado) }
    var diaElegido by remember { mutableStateOf<Long?>(null) }
    val mostrarQuitar = onQuitar != null && valor != null && enabled

    Box(modifier) {
        OutlinedTextField(
            value = valor?.let { textoFechaHoraCampus(it, es24h) } ?: "",
            onValueChange = {},
            readOnly = true,
            enabled = enabled,
            singleLine = true,
            label = { Text(etiqueta) },
            placeholder = { Text(placeholder) },
            isError = error != null,
            supportingText = if (error != null) {
                { Text(error) }
            } else {
                null
            },
            trailingIcon = {
                if (mostrarQuitar) {
                    IconButton(onClick = { onQuitar?.invoke() }) {
                        Icon(Icons.Outlined.Close, contentDescription = "Quitar $etiqueta")
                    }
                } else {
                    Icon(Icons.Outlined.CalendarMonth, contentDescription = null)
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )
        // El campo es de solo lectura: tocar en cualquier parte abre el calendario
        // (menos la «x», que queda libre para quitar la fecha).
        Box(
            Modifier
                .matchParentSize()
                .padding(end = if (mostrarQuitar) 48.dp else 0.dp)
                .clickable(
                    enabled = enabled,
                    onClickLabel = "Elegir $etiqueta",
                    role = Role.Button,
                ) {
                    diaElegido = null
                    paso = PasoFechaHora.Dia
                },
        )
    }

    val limite = minimo ?: System.currentTimeMillis()
    val arranque = maxOf(valor ?: sugerencia ?: limite, limite)

    if (paso == PasoFechaHora.Dia) {
        val primerDia = diaCampusComoUtc(limite)
        val estadoDia = rememberDatePickerState(
            initialSelectedDateMillis = diaElegido ?: diaCampusComoUtc(arranque),
            selectableDates = object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long): Boolean = utcTimeMillis >= primerDia
                override fun isSelectableYear(year: Int): Boolean = year >= anioUtc(primerDia)
            },
        )
        DatePickerDialog(
            onDismissRequest = { paso = PasoFechaHora.Cerrado },
            confirmButton = {
                TextButton(
                    onClick = {
                        diaElegido = estadoDia.selectedDateMillis
                        paso = PasoFechaHora.Hora
                    },
                    enabled = estadoDia.selectedDateMillis != null,
                ) { Text("Siguiente") }
            },
            dismissButton = {
                TextButton(onClick = { paso = PasoFechaHora.Cerrado }) { Text("Cancelar") }
            },
        ) {
            DatePicker(state = estadoDia)
        }
    }

    if (paso == PasoFechaHora.Hora) {
        val dia = diaElegido ?: diaCampusComoUtc(arranque)
        val base = Calendar.getInstance(ZonaCampus).apply { timeInMillis = valor ?: sugerencia ?: arranque }
        val estadoHora = rememberTimePickerState(
            initialHour = base.get(Calendar.HOUR_OF_DAY),
            initialMinute = base.get(Calendar.MINUTE),
            is24Hour = es24h,
        )
        val candidato = combinar(dia, estadoHora.hour, estadoHora.minute)
        val yaPaso = candidato < limite

        AlertDialog(
            onDismissRequest = { paso = PasoFechaHora.Cerrado },
            title = { Text("¿A qué hora?") },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    TimePicker(state = estadoHora)
                    if (yaPaso) {
                        Text(
                            "Esa hora ya pasó. Elige una más tarde.",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        onCambio(candidato)
                        paso = PasoFechaHora.Cerrado
                    },
                    enabled = !yaPaso,
                ) { Text("Listo") }
            },
            dismissButton = {
                TextButton(onClick = { paso = PasoFechaHora.Dia }) { Text("Cambiar día") }
            },
        )
    }
}
