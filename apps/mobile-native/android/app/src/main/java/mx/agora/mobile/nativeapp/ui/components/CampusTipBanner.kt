package mx.agora.mobile.nativeapp.ui.components

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlin.math.sqrt
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.util.HapticType
import mx.agora.mobile.nativeapp.ui.util.rememberHaptics

private object CampusTips {
    val tips = listOf(
        "Tip: La biblioteca cierra tarde los jueves — aprovecha para estudiar en silencio.",
        "Tip: Doble toque en una foto = 🧡 Me late.",
        "Tip: Responde la pregunta del día 7 veces y ganas insignia.",
        "Tip: Filtra por tu carrera en el feed para ver lo más relevante.",
        "Tip: Mantén tu racha activa entrando un ratito cada día.",
        "Tip: Los jueves hay más movimiento en el feed — buen momento para publicar.",
        "Tip: Desliza en Trending para descubrir hashtags del campus.",
        "Tip: Saluda a quien cumple años hoy — aparecen arriba en el feed.",
        "Tip: Guarda las publicaciones que te sirvan para encontrarlas después.",
        "Tip: Usa # para conectar tu publicación con el resto del campus.",
        "Tip: El Centro Estudiantil tiene WiFi estable si tu señal falla.",
        "Tip: Agita el teléfono aquí para otro tip del campus. 📱",
    )

    fun randomIndex(excluding: Int? = null): Int {
        if (tips.size <= 1) return 0
        var next = tips.indices.random()
        while (next == excluding) {
            next = tips.indices.random()
        }
        return next
    }
}

@Composable
fun CampusTipBanner(
    modifier: Modifier = Modifier,
) {
    var dismissed by rememberSaveable { mutableStateOf(false) }
    var tipIndex by rememberSaveable { mutableIntStateOf(CampusTips.randomIndex()) }
    var pulse by rememberSaveable { mutableIntStateOf(0) }
    val haptics = rememberHaptics()

    fun rotateTip() {
        tipIndex = CampusTips.randomIndex(excluding = tipIndex)
        pulse++
        haptics.perform(HapticType.Light)
    }

    ShakeDetector(enabled = !dismissed, onShake = ::rotateTip)

    val scale by animateFloatAsState(
        targetValue = if (pulse > 0) 1.02f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "tipScale",
        finishedListener = { if (pulse > 0) pulse = 0 },
    )

    AnimatedVisibility(
        visible = !dismissed,
        enter = fadeIn(),
        exit = fadeOut() + shrinkVertically(),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .scale(scale)
                .clip(RoundedCornerShape(12.dp))
                .background(AgoraColors.NaranjaSuave)
                .clickable(onClickLabel = "Ver otro consejo", role = Role.Button, onClick = ::rotateTip)
                .padding(start = 14.dp, top = 10.dp, bottom = 10.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "💡",
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = CampusTips.tips[tipIndex],
                // Al cambiar de tip, TalkBack lee el nuevo.
                modifier = Modifier
                    .weight(1f)
                    .semantics { liveRegion = LiveRegionMode.Polite },
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                color = AgoraColors.Texto,
            )
            IconButton(
                onClick = { dismissed = true },
                modifier = Modifier.padding(0.dp),
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Cerrar tip",
                    tint = AgoraColors.TextoMedio,
                )
            }
        }
    }
}

@Composable
private fun ShakeDetector(
    enabled: Boolean,
    onShake: () -> Unit,
) {
    val context = LocalContext.current
    DisposableEffect(enabled, context) {
        if (!enabled) {
            onDispose {}
        } else {
            val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            if (accelerometer == null) {
                onDispose {}
            } else {
                var lastShakeAt = 0L
                val listener = object : SensorEventListener {
                    override fun onSensorChanged(event: SensorEvent) {
                        val x = event.values[0]
                        val y = event.values[1]
                        val z = event.values[2]
                        val gForce = sqrt(x * x + y * y + z * z) / SensorManager.GRAVITY_EARTH - 1.0
                        if (gForce > 2.5) {
                            val now = System.currentTimeMillis()
                            if (now - lastShakeAt > 900) {
                                lastShakeAt = now
                                onShake()
                            }
                        }
                    }

                    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
                }
                sensorManager.registerListener(
                    listener,
                    accelerometer,
                    SensorManager.SENSOR_DELAY_UI,
                )
                onDispose {
                    sensorManager.unregisterListener(listener)
                }
            }
        }
    }
}
