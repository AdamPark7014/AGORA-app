import Foundation
import Combine

/// Canal entre `AgoraApp` / notificaciones y `MainTabView`. Paridad con `DeepLinkBus.kt`.
final class DeepLinkBus: ObservableObject {
    static let shared = DeepLinkBus()

    @Published private(set) var pendingRoute: String?

    private init() {}

    func emit(_ route: String) {
        pendingRoute = route
    }

    func consume() {
        pendingRoute = nil
    }
}
