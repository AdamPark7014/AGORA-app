import Foundation

/// Reporte de crashes a la API interna (sin SDK externo).
enum AgoraCrashReporting {
    private static var installed = false

    static func install() {
        guard !installed else { return }
        installed = true
        NSSetUncaughtExceptionHandler { exception in
            let stack = exception.callStackSymbols.prefix(40).joined(separator: "\n")
            // Calificado: un puntero a función C no puede capturar `self` (el metatipo).
            AgoraCrashReporting.report(
                mensaje: exception.reason ?? "UncaughtException",
                stack: stack
            )
        }
    }

    static func report(mensaje: String, stack: String? = nil) {
        guard let token = SessionStore.shared.token else { return }
        Task {
            do {
                _ = try await ApiClient.shared.postJSON(
                    "analytics/crash",
                    body: AnalyticsCrashRequest(
                        mensaje: String(mensaje.prefix(2000)),
                        stack: stack.map { String($0.prefix(8000)) },
                        plataforma: "ios",
                        version: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                    ),
                    token: token
                )
            } catch {
                // Fire-and-forget.
            }
        }
    }
}

private struct AnalyticsCrashRequest: Encodable {
    let mensaje: String
    let stack: String?
    let plataforma: String
    let version: String?
}
