import Foundation
import Network

final class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()

    @Published private(set) var isOnline = true

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "mx.agora.network")

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                let online = path.status == .satisfied
                let wasOffline = self?.isOnline == false
                self?.isOnline = online
                if online && wasOffline {
                    Task { _ = await PendingPostQueue.flush() }
                }
            }
        }
        monitor.start(queue: queue)
    }
}
