package mx.agora.mobile.nativeapp.ui.util

import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalView

enum class HapticType {
    /** Light tap — buttons, chips, general taps */
    Light,
    /** Toggle — reactions, bookmarks, switches */
    Toggle,
    /** Success — publish, answer submitted */
    Success,
}

class HapticsController(private val view: View) {
    fun perform(type: HapticType) {
        val constant = when (type) {
            HapticType.Light -> HapticFeedbackConstants.CONTEXT_CLICK
            HapticType.Toggle -> HapticFeedbackConstants.CLOCK_TICK
            HapticType.Success -> HapticFeedbackConstants.CONFIRM
        }
        view.performHapticFeedback(constant)
    }
}

@Composable
fun rememberHaptics(): HapticsController {
    val view = LocalView.current
    return remember(view) { HapticsController(view) }
}
