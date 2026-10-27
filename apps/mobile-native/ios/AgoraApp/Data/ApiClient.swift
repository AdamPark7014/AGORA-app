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

    /// Código HTTP si el error vino del servidor.
    var codigoHttp: Int? {
        if case .http(let code, _) = self {
            return code
        }
        return nil
    }

    /// Mensaje legible del cuerpo `{ mensaje, errores? }` que devuelve la API
    /// (mismo criterio que `ErrorApi` en la web: primero el error de campo).
    var mensajeServidor: String? {
        guard case .http(_, let cuerpoCrudo) = self,
              let cuerpo = cuerpoCrudo,
              let data = cuerpo.data(using: .utf8),
              let objeto = try? JSONSerialization.jsonObject(with: data),
              let json = objeto as? [String: Any]
        else { return nil }
        if let errores = json["errores"] as? [[String: Any]],
           let primero = errores.first?["mensaje"] as? String,
           !primero.isEmpty {
            return primero
        }
        if let mensaje = json["mensaje"] as? String, !mensaje.isEmpty {
            return mensaje
        }
        if let mensaje = json["message"] as? String, !mensaje.isEmpty {
            return mensaje
        }
        return nil
    }
}

final class ApiClient {
    static let shared = ApiClient()

    /// URL base del API. Cambia aquí según el entorno.
    /// Dev simulador: http://localhost:4200/api
    /// Dev dispositivo físico: http://<IP-LAN>:4200/api
    let baseURL: URL

    private let session: URLSession
    /// Subidas de fotos y videos: un video de 60 MB con mala señal tarda más que los 60 s de las
    /// demás peticiones y fallaba a medias. Aquí espera hasta 60 s sin datos y 10 min en total.
    private let sesionSubidas: URLSession

    private init() {
        #if DEBUG
        let porDefecto = URL(string: "http://localhost:4200/api")!
        #else
        let porDefecto = URL(string: "https://udlagora.com/api")!
        #endif
        // Las pruebas de interfaz (`AgoraAppUITests`) apuntan la app a una API
        // falsa en el Mac del CI. Solo el ejecutor de pruebas o Xcode pueden
        // poner variables de entorno: una app instalada desde la tienda no.
        if let otra = ProcessInfo.processInfo.environment["AGORA_API_URL"],
           let url = URL(string: otra) {
            self.baseURL = url
        } else {
            self.baseURL = porDefecto
        }

        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 22
        cfg.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: cfg)

        let cfgSubidas = URLSessionConfiguration.default
        cfgSubidas.timeoutIntervalForRequest = 60
        cfgSubidas.timeoutIntervalForResource = 600
        self.sesionSubidas = URLSession(configuration: cfgSubidas)
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

    /// POST JSON que además devuelve la respuesta HTTP, para leer cabeceras
    /// (p. ej. `X-Envio-Id` de `auth/otp/solicitar`).
    func postJSONConRespuesta<T: Encodable>(
        _ path: String,
        body: T,
        token: String? = nil
    ) async throws -> (Data, HTTPURLResponse) {
        let req = try jsonRequest(path, method: "POST", body: body, token: token)
        return try await performConRespuesta(req, avisarSiExpira: true)
    }

    /// POST JSON que no dispara el aviso global de sesión expirada.
    /// Se usa al cerrar sesión, cuando un 401 ya no importa.
    func postJSONSilencioso<T: Encodable>(_ path: String, body: T, token: String? = nil) async throws {
        let req = try jsonRequest(path, method: "POST", body: body, token: token)
        _ = try await performConRespuesta(req, avisarSiExpira: false)
    }

    /// DELETE con cuerpo JSON (p. ej. `DELETE push/suscribir-apns` con `{ token }`).
    func deleteJSON<T: Encodable>(
        _ path: String,
        body: T,
        token: String? = nil,
        avisarSiExpira: Bool = true
    ) async throws {
        let req = try jsonRequest(path, method: "DELETE", body: body, token: token)
        _ = try await performConRespuesta(req, avisarSiExpira: avisarSiExpira)
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
        let (data, _) = try await performConRespuesta(req, avisarSiExpira: true, subida: true)
        return data
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
        let req = try jsonRequest(path, method: method, body: body, token: token)
        return try await perform(req)
    }

    private func jsonRequest<T: Encodable>(
        _ path: String,
        method: String,
        body: T,
        token: String?
    ) throws -> URLRequest {
        var req = try buildRequest(path, method: method, token: token)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            req.httpBody = try JSONEncoder().encode(body)
        } catch {
            throw ApiError.decoding(error)
        }
        return req
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
        let (data, _) = try await performConRespuesta(req, avisarSiExpira: true)
        return data
    }

    /// Ejecuta la petición y devuelve cuerpo + respuesta HTTP (cabeceras incluidas).
    private func performConRespuesta(
        _ req: URLRequest,
        avisarSiExpira: Bool,
        subida: Bool = false
    ) async throws -> (Data, HTTPURLResponse) {
        do {
            let (data, response) = try await (subida ? sesionSubidas : session).data(for: req)
            guard let http = response as? HTTPURLResponse else {
                throw ApiError.http(-1, "Respuesta inválida")
            }
            guard (200..<300).contains(http.statusCode) else {
                let msg = String(data: data, encoding: .utf8)
                if http.statusCode == 401 && avisarSiExpira {
                    let path = req.url?.path ?? ""
                    if !path.contains("/auth/") {
                        SessionEvents.notifyExpired()
                    }
                }
                throw ApiError.http(http.statusCode, msg)
            }
            return (data, http)
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
