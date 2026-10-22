import Foundation

/// Convierte rutas web, `agora://` y `https://udlagora.com/…` a rutas de navegación.
/// Paridad con `DeepLinkParser.kt`.
enum DeepLinkParser {
    private static let webHosts: Set<String> = ["udlagora.com", "www.udlagora.com"]

    static func parse(url: URL) -> String? {
        switch url.scheme?.lowercased() {
        case "agora":
            return pathToRoute(agoraUriToPath(url))
        case "http", "https":
            guard let host = url.host?.lowercased(), webHosts.contains(host) else { return nil }
            return pathToRoute(url.path)
        default:
            return nil
        }
    }

    static func parse(_ urlOrPath: String) -> String? {
        let path = extractPath(urlOrPath.trimmingCharacters(in: .whitespacesAndNewlines))
        return pathToRoute(path)
    }

    private static func agoraUriToPath(_ url: URL) -> String {
        let host = url.host
        let segments = url.pathComponents.filter { $0 != "/" }
        if host == nil || host?.isEmpty == true {
            return url.path.isEmpty ? "/" : url.path
        }
        if segments.isEmpty {
            return "/\(host!)"
        }
        return "/\(host!)/\(segments.joined(separator: "/"))"
    }

    private static func extractPath(_ input: String) -> String {
        if input.lowercased().hasPrefix("agora://") {
            let rest = String(input.dropFirst("agora://".count))
            return rest.hasPrefix("/") ? rest : "/\(rest)"
        }
        if input.lowercased().hasPrefix("http://") || input.lowercased().hasPrefix("https://") {
            if let url = URL(string: input) {
                return url.path.isEmpty ? "/" : url.path
            }
        }
        return input.hasPrefix("/") ? input : "/\(input)"
    }

    private static func pathToRoute(_ path: String) -> String? {
        let segments = path
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            .split(separator: "/")
            .map(String.init)
            .filter { !$0.isEmpty }

        if segments.isEmpty { return "main" }

        switch segments[0].lowercased() {
        case "publicacion", "post":
            return segments.indices.contains(1) ? "post/\(segments[1])" : nil
        case "perfil":
            guard segments.indices.contains(1) else { return nil }
            if segments[1].lowercased() == "mio" { return "perfil-yo" }
            return "perfil/\(segments[1])"
        case "mensajes":
            if segments.indices.contains(1) { return "mensaje/\(segments[1])" }
            return "mensajes"
        case "evento", "eventos":
            if segments.indices.contains(1) {
                if segments[1].lowercased() == "crear" { return "eventos/crear" }
                return "evento/\(segments[1])"
            }
            return nil
        case "hashtag":
            return segments.indices.contains(1) ? "hashtag/\(segments[1])" : nil
        case "marketplace":
            return segments.indices.contains(1) ? "marketplace/\(segments[1])" : "marketplace"
        case "ajustes":
            return "ajustes"
        case "notificaciones":
            return "notificaciones"
        case "aventones":
            return "aventones"
        case "anonimo":
            return "anonimo"
        case "guardados":
            return "guardados"
        case "directorio":
            return "directorio"
        case "buscar":
            return "buscar"
        case "mas":
            return "mas"
        case "perfil-yo":
            return "perfil-yo"
        case "moderacion":
            return "moderacion"
        case "terminos":
            return "terminos"
        case "privacidad":
            return "privacidad"
        case "reglas":
            return "reglas"
        case "feed":
            return "main"
        // Nativo muestra retos en el feed (sin pantalla /retos dedicada).
        case "retos":
            return "main"
        default:
            return nil
        }
    }
}
