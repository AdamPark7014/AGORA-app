import Foundation

/// Evento SSE de mensajes — paridad con `MensajesSseClient.kt`.
struct MensajeStreamEvent: Decodable {
    let tipo: String
    let mensaje: MensajeStreamPayload?
}

struct MensajeStreamPayload: Decodable {
    let id: String
    let texto: String
    let createdAt: String
    let autorId: String?
    let autor: MensajeStreamAutor?
}

struct MensajeStreamAutor: Decodable {
    let handle: String
    let nombre: String
    let fotoUrl: String?
}

/// Lee `GET /mensajes/:id/stream` y notifica mensajes nuevos.
actor MensajesSseClient {
    static let shared = MensajesSseClient()

    private var task: Task<Void, Never>?

    func watch(
        conversacionId: String,
        miHandle: String?,
        onMensaje: @escaping @Sendable (MensajeDto) -> Void
    ) {
        task?.cancel()
        task = Task {
            var intento = 0
            while !Task.isCancelled {
                let ok = await abrirStream(conversacionId: conversacionId, miHandle: miHandle, onMensaje: onMensaje)
                if ok { intento = 0 } else {
                    intento += 1
                    let delay = min(30.0, pow(2.0, Double(min(intento, 5))))
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }
    }

    func stop() {
        task?.cancel()
        task = nil
    }

    private func abrirStream(
        conversacionId: String,
        miHandle: String?,
        onMensaje: @escaping @Sendable (MensajeDto) -> Void
    ) async -> Bool {
        guard let token = SessionStore.shared.token else { return false }
        let url = ApiClient.shared.baseURL.appendingPathComponent("mensajes/\(conversacionId)/stream")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 0

        do {
            let (bytes, response) = try await URLSession.shared.bytes(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                return false
            }

            var dataBuffer = ""
            for try await line in bytes.lines {
                if Task.isCancelled { break }
                if line.hasPrefix("data:") {
                    let payload = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                    if !payload.isEmpty { dataBuffer = payload }
                } else if line.isEmpty, !dataBuffer.isEmpty {
                    if let mensaje = parseMensaje(json: dataBuffer, miHandle: miHandle) {
                        onMensaje(mensaje)
                    }
                    dataBuffer = ""
                }
            }
            return true
        } catch {
            return false
        }
    }

    private func parseMensaje(json: String, miHandle: String?) -> MensajeDto? {
        guard let data = json.data(using: .utf8),
              let evento = try? JSONDecoder().decode(MensajeStreamEvent.self, from: data),
              evento.tipo == "mensaje",
              let payload = evento.mensaje else { return nil }

        let handle = payload.autor?.handle
        return MensajeDto(
            id: payload.id,
            texto: payload.texto,
            createdAt: payload.createdAt,
            mio: miHandle != nil && handle == miHandle,
            autor: payload.autor.map { AutorDto(handle: $0.handle, nombre: $0.nombre, fotoUrl: $0.fotoUrl, verificado: nil) }
        )
    }
}
