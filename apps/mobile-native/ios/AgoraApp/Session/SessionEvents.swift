import Combine
import Foundation

/// Señal global cuando una llamada autenticada devuelve 401.
/// Paridad con `SessionEvents` de Android.
enum SessionEvents {
    static let expired = PassthroughSubject<Void, Never>()

    static func notifyExpired() {
        expired.send(())
    }
}
