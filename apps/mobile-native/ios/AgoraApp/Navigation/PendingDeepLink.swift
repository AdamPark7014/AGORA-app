import Foundation
import Security

/// Cola de deep links recibidos antes de login. Paridad con `PendingDeepLink.kt`.
enum PendingDeepLink {
    private static let service = "mx.agora.mobile.AgoraApp.session"
    private static let account = "pending_deep_link_route"

    static func enqueue(route: String, isLoggedIn: Bool) {
        if isLoggedIn {
            DeepLinkBus.shared.emit(route)
        } else {
            writeKeychain(route)
        }
    }

    static func flush() {
        guard let route = readKeychain() else { return }
        clear()
        DeepLinkBus.shared.emit(route)
    }

    static func clear() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }

    private static func writeKeychain(_ route: String) {
        guard let data = route.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let attrs: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, attrs as CFDictionary)
        if status == errSecItemNotFound {
            var new = query
            new[kSecValueData as String] = data
            SecItemAdd(new as CFDictionary, nil)
        }
    }

    private static func readKeychain() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
