import Foundation

struct BadgeDef {
    let codigo: String
    let etiqueta: String
    let emoji: String
    let subtitulo: String
}

/// Definiciones de insignias — paridad con `@agora/contracts` BADGES_CAMPUS.
enum BadgesCampus {
    private static let badges: [String: BadgeDef] = [
        "PREGUNTA_7": BadgeDef(
            codigo: "PREGUNTA_7",
            etiqueta: "7 días de pregunta",
            emoji: "💬",
            subtitulo: "7 días respondiendo la pregunta del día"
        ),
        "AVENTONERO": BadgeDef(
            codigo: "AVENTONERO",
            etiqueta: "Conductor de confianza",
            emoji: "🚗",
            subtitulo: "3 aventones ofrecidos"
        ),
        "EARLY_BIRD": BadgeDef(
            codigo: "EARLY_BIRD",
            etiqueta: "Madrugador",
            emoji: "🌅",
            subtitulo: "7 días seguidos"
        ),
        "SOCIAL": BadgeDef(
            codigo: "SOCIAL",
            etiqueta: "Voz del campus",
            emoji: "📣",
            subtitulo: "10 publicaciones en el campus"
        ),
    ]

    static func def(codigo: String) -> BadgeDef? {
        badges[codigo]
    }

    static func mensajeNuevaInsignia(codigo: String) -> String {
        guard let def = badges[codigo] else {
            return "¡Nueva insignia! 🏆"
        }
        return "¡Nueva insignia! \(def.emoji) \(def.etiqueta) — \(def.subtitulo)"
    }
}

extension Notification.Name {
    static let gamificacionRefresh = Notification.Name("agora.gamificacion.refresh")
    static let gamificacionNuevaInsignia = Notification.Name("agora.gamificacion.nuevaInsignia")
}

enum GamificacionEvents {
    static func notifyPingResult(nuevas: [String]) {
        NotificationCenter.default.post(name: .gamificacionRefresh, object: nil)
        for codigo in nuevas {
            NotificationCenter.default.post(
                name: .gamificacionNuevaInsignia,
                object: nil,
                userInfo: ["codigo": codigo]
            )
        }
    }
}
