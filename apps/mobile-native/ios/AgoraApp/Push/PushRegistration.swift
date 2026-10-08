import Foundation
import UIKit
import UserNotifications

/// Registra el token APNs del dispositivo con la API tras login.
/// Paridad con `PushRegistration.kt` en Android (FCM).
@MainActor
final class PushRegistration {
    static let shared = PushRegistration()

    private init() {}

    /// Pide permiso (si hace falta) y registra el dispositivo con APNs.
    func registerIfNeeded() {
        guard SessionStore.shared.token != nil else { return }

        UNUserNotificationCenter.current().getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .notDetermined:
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                    guard granted else { return }
                    DispatchQueue.main.async {
                        UIApplication.shared.registerForRemoteNotifications()
                    }
                }
            case .authorized, .provisional, .ephemeral:
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            default:
                break
            }
        }
    }

    func handleDeviceToken(_ deviceToken: Data) async {
        guard SessionStore.shared.token != nil else { return }
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        do {
            _ = try await AgoraApi.suscribirApns(token: token)
            ApnsTokenStore.guardar(token)
            print("[Push] token APNs registrado: …\(token.suffix(8))")
        } catch {
            print("[Push] error registrando APNs: \(error.localizedDescription)")
        }
    }
}

/// Último token APNs registrado con la API. Hace falta para darlo de baja
/// (`DELETE push/suscribir-apns`) al cerrar sesión.
enum ApnsTokenStore {
    private static let clave = "agora.push.apnsToken"

    static func guardar(_ token: String) {
        UserDefaults.standard.set(token, forKey: clave)
    }

    static func leer() -> String? {
        UserDefaults.standard.string(forKey: clave)
    }

    static func borrar() {
        UserDefaults.standard.removeObject(forKey: clave)
    }
}
