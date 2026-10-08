import Foundation

/// Analytics de producto — singleton fire-and-forget a la API interna.
/// Sin SDK externo; eventos almacenados en Postgres.
enum AgoraAnalytics {
    private static let plataforma = "ios"

    static func track(nombre: String, propiedades: [String: String] = [:]) {
        guard let token = SessionStore.shared.token else { return }
        let merged = propiedades.merging(["plataforma": plataforma]) { _, new in new }
        Task {
            do {
                _ = try await ApiClient.shared.postJSON(
                    "analytics/evento",
                    body: AnalyticsEventoRequest(
                        nombre: nombre,
                        propiedades: merged,
                        timestamp: ISO8601DateFormatter().string(from: Date())
                    ),
                    token: token
                )
            } catch {
                // Fire-and-forget.
            }
        }
    }

    // Sin etiqueta: los llamadores usan `AgoraAnalytics.publicar([...])`.
    static func login() { track(nombre: "login") }

    static func publicar(_ props: [String: String] = [:]) { track(nombre: "publicar", propiedades: props) }

    static func dmEnviado(_ props: [String: String] = [:]) { track(nombre: "dm_enviado", propiedades: props) }

    static func eventoAsistencia(_ props: [String: String] = [:]) {
        track(nombre: "evento_asistencia", propiedades: props)
    }
}

private struct AnalyticsEventoRequest: Encodable {
    let nombre: String
    let propiedades: [String: String]?
    let timestamp: String
}
