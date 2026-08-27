import Foundation

enum OfflineCache {
    private static let feedKey = "offline.feed"
    private static let perfilKey = "offline.perfil_mio"

    static func saveFeed(_ response: FeedResponse) {
        guard let data = try? JSONEncoder().encode(CachedFeed(response: response)) else { return }
        UserDefaults.standard.set(data, forKey: feedKey)
    }

    static func loadFeed() -> FeedResponse? {
        guard let data = UserDefaults.standard.data(forKey: feedKey),
              let cached = try? JSONDecoder().decode(CachedFeed.self, from: data) else {
            return nil
        }
        return cached.response
    }

    static func savePerfil(_ perfil: PerfilMioDto) {
        guard let data = try? JSONEncoder().encode(perfil) else { return }
        UserDefaults.standard.set(data, forKey: perfilKey)
    }

    static func loadPerfil() -> PerfilMioDto? {
        guard let data = UserDefaults.standard.data(forKey: perfilKey) else { return nil }
        return try? JSONDecoder().decode(PerfilMioDto.self, from: data)
    }
}

private struct CachedFeed: Codable {
    let publicaciones: [PostDto]
    let siguienteCursor: String?

    init(response: FeedResponse) {
        publicaciones = response.publicaciones ?? []
        siguienteCursor = response.siguienteCursor
    }

    var response: FeedResponse {
        FeedResponse(publicaciones: publicaciones, siguienteCursor: siguienteCursor)
    }
}
