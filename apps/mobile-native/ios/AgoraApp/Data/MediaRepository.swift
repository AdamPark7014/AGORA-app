import Foundation

/// Subida de fotos al API. Paridad con `MediaRepository.kt` en Android.
enum MediaRepository {
    static func subir(imageData: Data, mimeType: String = "image/jpeg") async throws -> MediaUploadResponse {
        let ext = mimeType == "image/png" ? "png" : "jpg"
        return try await AgoraApi.subirMedia(
            fileData: imageData,
            fileName: "foto.\(ext)",
            mimeType: mimeType
        )
    }
}
