import Foundation

/// Cliente HTTP basado en URLSession. Paridad con `ApiClient` de Android (Retrofit).
/// La base URL termina en `/api` y cada request adjunta `Authorization: Bearer <token>`
/// si hay sesión activa.
enum ApiError: Error, LocalizedError {
    case invalidURL
    case http(Int, String?)
    case transport(Error)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "URL inválida"
        case .http(let code, let msg): return "HTTP \(code)\(msg.map { ": \($0)" } ?? "")"
        case .transport(let e): return e.localizedDescription
        case .decoding(let e): return "Decodificación: \(e.localizedDescription)"
        }
    }
}

final class ApiClient {
    static let shared = ApiClient()

    /// URL base del API. Cambia aquí según el entorno.
    /// Dev simulador: http://localhost:4200/api
    /// Dev dispositivo físico: http://<IP-LAN>:4200/api
    let baseURL: URL

    private let session: URLSession

    private init() {
        #if DEBUG
        self.baseURL = URL(string: "http://localhost:4200/api")!
        #else
        self.baseURL = URL(string: "https://udlagora.com/api")!
        #endif

        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 22
        cfg.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: cfg)
    }

    // MARK: Requests

    func get(_ path: String, query: [String: String] = [:], token: String? = nil) async throws -> Data {
        var req = try buildRequest(path, method: "GET", query: query, token: token)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await perform(req)
    }

    func postJSON<T: Encodable>(_ path: String, body: T, token: String? = nil) async throws -> Data {
        try await sendJSON(path, method: "POST", body: body, token: token)
    }

    func patchJSON<T: Encodable>(_ path: String, body: T, token: String? = nil) async throws -> Data {
        try await sendJSON(path, method: "PATCH", body: body, token: token)
    }

    func delete(_ path: String, token: String? = nil) async throws {
        _ = try await request(path, method: "DELETE", token: token)
    }

    /// Sube un archivo multipart (`archivo` por defecto). Paridad con `MediaApi.subir`.
    func uploadMultipart(
        _ path: String,
        fileData: Data,
        fileName: String,
        mimeType: String,
        fieldName: String = "archivo",
        token: String? = nil
    ) async throws -> Data {
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = try buildRequest(path, method: "POST", token: token)
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        return try await perform(req)
    }

    /// Convierte `/api/media/archivo/...` en URL absoluta para AsyncImage.
    func resolveUrl(_ path: String?) -> URL? {
        guard let path, !path.isEmpty else { return nil }
        if path.hasPrefix("http://") || path.hasPrefix("https://") {
            return URL(string: path)
        }
        let origin = baseURL.absoluteString
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            .replacingOccurrences(of: "/api", with: "")
        let suffix = path.hasPrefix("/") ? path : "/\(path)"
        return URL(string: origin + suffix)
    }

    // MARK: Helpers

    private func sendJSON<T: Encodable>(
        _ path: String,
        method: String,
        body: T,
        token: String?
    ) async throws -> Data {
        var req = try buildRequest(path, method: method, token: token)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            req.httpBody = try JSONEncoder().encode(body)
        } catch {
            throw ApiError.decoding(error)
        }
        return try await perform(req)
    }

    private func request(_ path: String, method: String, query: [String: String] = [:], token: String? = nil) async throws -> Data {
        var req = try buildRequest(path, method: method, query: query, token: token)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await perform(req)
    }

    private func buildRequest(
        _ path: String,
        method: String,
        query: [String: String] = [:],
        token: String? = nil
    ) throws -> URLRequest {
        var comps = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)
        if !query.isEmpty {
            comps?.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = comps?.url else { throw ApiError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = method
        let bearer = token ?? SessionStore.shared.token
        if let bearer, !bearer.isEmpty {
            req.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
        }
        return req
    }

    private func perform(_ req: URLRequest) async throws -> Data {
        do {
            let (data, response) = try await session.data(for: req)
            guard let http = response as? HTTPURLResponse else {
                throw ApiError.http(-1, "Respuesta inválida")
            }
            guard (200..<300).contains(http.statusCode) else {
                let msg = String(data: data, encoding: .utf8)
                throw ApiError.http(http.statusCode, msg)
            }
            return data
        } catch let e as ApiError {
            throw e
        } catch {
            throw ApiError.transport(error)
        }
    }

    static let jsonDecoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .useDefaultKeys
        return d
    }()

    static func decodeOne<T: Decodable>(_ data: Data) throws -> T {
        do {
            return try jsonDecoder.decode(T.self, from: data)
        } catch {
            throw ApiError.decoding(error)
        }
    }
}
