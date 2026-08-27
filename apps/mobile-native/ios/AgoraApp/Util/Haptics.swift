import UIKit

/// Feedback táctil — paridad con `Haptics.kt` en Android.
enum Haptics {
    static func light() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func toggle() {
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred(intensity: 0.65)
    }

    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
