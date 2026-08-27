import Foundation

/// Cola de publicaciones sin red — paridad con `PendingPostSync` + Room en Android.
enum PendingPostQueue {
    private static let key = "offline.pending_posts"

    struct PendingPost: Codable, Identifiable {
        let id: String
        let comunidadSlug: String
        let texto: String
        let mediaIds: [String]
        let createdAt: Date
    }

    static func enqueue(comunidadSlug: String, texto: String, mediaIds: [String]) {
        var items = load()
        items.append(
            PendingPost(
                id: UUID().uuidString,
                comunidadSlug: comunidadSlug,
                texto: texto,
                mediaIds: mediaIds,
                createdAt: Date()
            )
        )
        save(items)
    }

    static func flush() async -> Int {
        guard SessionStore.shared.token != nil else { return 0 }
        var items = load()
        guard !items.isEmpty else { return 0 }

        var enviados = 0
        var restantes: [PendingPost] = []

        for item in items {
            do {
                let resp = try await AgoraApi.crearPost(
                    CrearPostRequest(
                        comunidadSlug: item.comunidadSlug,
                        texto: item.texto,
                        mediaIds: item.mediaIds,
                        encuesta: nil
                    )
                )
                GamificacionEvents.notifyPingResult(nuevas: resp.nuevasInsignias ?? [])
                enviados += 1
            } catch {
                restantes.append(item)
            }
        }

        save(restantes)
        return enviados
    }

    static var count: Int { load().count }

    private static func load() -> [PendingPost] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let items = try? JSONDecoder().decode([PendingPost].self, from: data) else {
            return []
        }
        return items
    }

    private static func save(_ items: [PendingPost]) {
        guard let data = try? JSONEncoder().encode(items) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}
