import UIKit
import UserNotifications

/// Delegate de UIKit para registro APNs y taps en notificaciones.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task {
            await PushRegistration.shared.handleDeviceToken(deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[Push] registro APNs fallido: \(error.localizedDescription)")
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        if let url = Self.resolveDeepLinkUrl(userInfo) {
            NotificationCenter.default.post(name: .agoraPushDeepLink, object: url)
        }
        completionHandler()
    }
}

extension Notification.Name {
    static let agoraPushDeepLink = Notification.Name("agora.push.deepLink")
}

private extension AppDelegate {
    /// Respeta `url` del payload (p. ej. RETO → `/retos`).
    /// INSIGNIA y `/perfil/mio` abren la pestaña «Yo», no un handle literal «mio».
    static func resolveDeepLinkUrl(_ userInfo: [AnyHashable: Any]) -> String? {
        guard let raw = userInfo["url"] as? String, !raw.isEmpty else { return nil }
        if userInfo["tipo"] as? String == "INSIGNIA" { return "agora://perfil-yo" }
        let lower = raw.lowercased()
        if lower.contains("/perfil/mio") || lower == "agora://perfil/mio" || lower == "agora://perfil-yo" {
            return "agora://perfil-yo"
        }
        return raw
    }
}
