import Foundation
import Security

/// Usuario en sesión (espejo de `SessionUser` en Android).
struct SessionUser: Codable, Equatable {
    var token: String
    var email: String
    var handle: String?
    var nombre: String?
    var tienePerfil: Bool
    var puedeModerar: Bool
    /// Solo administradores: habilita «Suspender» en la cola de moderación.
    var puedeSuspender: Bool

    init(
        token: String,
        email: String,
        handle: String?,
        nombre: String?,
        tienePerfil: Bool,
        puedeModerar: Bool = false,
        puedeSuspender: Bool = false
    ) {
        self.token = token
        self.email = email
        self.handle = handle
        self.nombre = nombre
        self.tienePerfil = tienePerfil
        self.puedeModerar = puedeModerar
        self.puedeSuspender = puedeSuspender
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        token = try c.decode(String.self, forKey: .token)
        email = try c.decode(String.self, forKey: .email)
        handle = try c.decodeIfPresent(String.self, forKey: .handle)
        nombre = try c.decodeIfPresent(String.self, forKey: .nombre)
        tienePerfil = try c.decode(Bool.self, forKey: .tienePerfil)
        puedeModerar = try c.decodeIfPresent(Bool.self, forKey: .puedeModerar) ?? false
        puedeSuspender = try c.decodeIfPresent(Bool.self, forKey: .puedeSuspender) ?? false
    }
}

/// Almacén seguro en Keychain. Paridad con `EncryptedSharedPreferences` en Android.
final class SessionStore: ObservableObject {
    static let shared = SessionStore()

    private let service = "mx.agora.mobile.AgoraApp.session"
    private let account = "currentUser"

    @Published private(set) var currentUser: SessionUser?

    private init() {
        currentUser = load()
    }

    var token: String? { currentUser?.token }

    func save(_ user: SessionUser) {
        currentUser = user
        guard let data = try? JSONEncoder().encode(user) else { return }
        writeKeychain(data)
    }

    func clear() {
        currentUser = nil
        deleteKeychain()
    }

    // MARK: Welcome (paridad con `seen_welcome` en Android)

    private let welcomeAccount = "seen_welcome"

    var hasSeenWelcome: Bool {
        loadWelcomeFlag()
    }

    func markWelcomeSeen() {
        writeWelcomeFlag(true)
    }

    // MARK: Keychain

    private func writeKeychain(_ data: Data) {
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

    private func load() -> SessionUser? {
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
        return try? JSONDecoder().decode(SessionUser.self, from: data)
    }

    private func deleteKeychain() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }

    private func writeWelcomeFlag(_ seen: Bool) {
        let data = Data(seen ? [1] : [0])
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: welcomeAccount,
        ]
        let attrs: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, attrs as CFDictionary)
        if status == errSecItemNotFound {
            var new = query
            new[kSecValueData as String] = data
            SecItemAdd(new as CFDictionary, nil)
        }
    }

    private func loadWelcomeFlag() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: welcomeAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data, let byte = data.first else { return false }
        return byte == 1
    }
}
