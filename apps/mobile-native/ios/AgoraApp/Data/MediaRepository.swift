import Foundation
import UIKit

/// Subida de fotos y videos al API. Paridad con `MediaRepository.kt` en Android.
enum MediaRepository {
    /// Tope del servidor para video (`MAX_BYTES_VIDEO` en `apps/api/src/media/almacen.ts`).
    static let maxBytesVideo = 60 * 1024 * 1024

    static func subir(imageData: Data, mimeType: String = "image/jpeg") async throws -> MediaUploadResponse {
        let ext = mimeType == "image/png" ? "png" : "jpg"
        return try await AgoraApi.subirMedia(
            fileData: imageData,
            fileName: "foto.\(ext)",
            mimeType: mimeType
        )
    }

    /// Sube una foto elegida por el usuario **siempre como JPEG**: el servidor
    /// rechaza HEIC y, al re-codificar, tampoco viajan los metadatos EXIF
    /// (ubicación GPS, modelo del teléfono) de la foto original.
    static func subirFoto(_ data: Data) async throws -> MediaUploadResponse {
        guard let jpeg = await jpegEnSegundoPlano(data) else {
            throw ApiError.http(-1, "No pudimos leer esa foto. Prueba con otra.")
        }
        return try await subir(imageData: jpeg, mimeType: "image/jpeg")
    }

    /// Videos tal cual (mp4 / mov); el servidor detecta el formato real por los bytes.
    static func subirVideo(_ data: Data, mimeType: String) async throws -> MediaUploadResponse {
        guard data.count <= maxBytesVideo else {
            throw ApiError.http(-1, "Ese video pesa más de 60 MB. Recórtalo e inténtalo de nuevo.")
        }
        let ext: String
        switch mimeType {
        case "video/quicktime": ext = "mov"
        case "video/webm": ext = "webm"
        default: ext = "mp4"
        }
        return try await AgoraApi.subirMedia(
            fileData: data,
            fileName: "video.\(ext)",
            mimeType: mimeType
        )
    }

    /// `UIImage(data:)` → `jpegData(compressionQuality: 0.85)`. Además endereza la
    /// orientación y limita el lado mayor para no pasar del tope de 8 MB.
    static func jpeg(desde data: Data, calidad: CGFloat = 0.85, ladoMaximo: CGFloat = 2560) -> Data? {
        guard let imagen = UIImage(data: data) else { return nil }
        return redibujar(imagen, ladoMaximo: ladoMaximo).jpegData(compressionQuality: calidad)
    }

    static func jpegEnSegundoPlano(_ data: Data) async -> Data? {
        await Task.detached(priority: .userInitiated) {
            MediaRepository.jpeg(desde: data)
        }.value
    }

    private static func redibujar(_ imagen: UIImage, ladoMaximo: CGFloat) -> UIImage {
        let tamano = imagen.size
        let mayor = max(tamano.width, tamano.height)
        guard mayor > 0 else { return imagen }
        let escala: CGFloat = mayor > ladoMaximo ? ladoMaximo / mayor : 1
        if escala == 1 && imagen.imageOrientation == .up {
            return imagen
        }
        let destino = CGSize(
            width: max(1, floor(tamano.width * escala)),
            height: max(1, floor(tamano.height * escala))
        )
        let formato = UIGraphicsImageRendererFormat.default()
        formato.scale = 1
        let renderer = UIGraphicsImageRenderer(size: destino, format: formato)
        return renderer.image { _ in
            imagen.draw(in: CGRect(origin: .zero, size: destino))
        }
    }
}
