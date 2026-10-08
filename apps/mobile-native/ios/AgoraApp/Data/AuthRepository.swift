import Foundation

/// Repositorio de autenticación OTP. Paridad con `AuthRepository` de Android.
final class AuthRepository {
    static let shared = AuthRepository()
    private init() {}

    /// Pide el código. Devuelve el id de seguimiento de la entrega (cabecera
    /// `X-Envio-Id` del 204) o `nil` si la API no lo manda (API vieja / modo consola).
    @discardableResult
    func solicitarOtp(email: String) async throws -> String? {
        let normalized = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let (_, http) = try await ApiClient.shared.postJSONConRespuesta(
            "auth/otp/solicitar",
            body: SolicitarOtpRequest(email: normalized)
        )
        let cabecera = http.value(forHTTPHeaderField: "X-Envio-Id")?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard let envioId = cabecera, !envioId.isEmpty else { return nil }
        return envioId
    }

    /// Estado de entrega de un código (`GET auth/otp/entrega/:envioId`, público).
    /// Devuelve `nil` si la API ya no conoce ese envío (404): no hay nada que seguir.
    func estadoEntregaOtp(envioId: String) async throws -> String? {
        do {
            let data = try await ApiClient.shared.get("auth/otp/entrega/\(envioId)")
            let resp: EstadoEntregaOtpResponse = try ApiClient.decodeOne(data)
            return resp.estado
        } catch let api as ApiError where api.codigoHttp == 404 {
            return nil
        }
    }

    func verificarOtp(email: String, codigo: String) async throws -> SessionUser {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedCodigo = codigo.trimmingCharacters(in: .whitespacesAndNewlines)
        let data = try await ApiClient.shared.postJSON(
            "auth/otp/verificar",
            body: VerificarOtpRequest(email: normalizedEmail, codigo: normalizedCodigo, modo: "token")
        )
        let resp: VerificarOtpResponse = try ApiClient.decodeOne(data)
        guard let token = resp.token, !token.isEmpty else {
            throw ApiError.http(401, "La API no devolvió token.")
        }

        var yo: YoResponse?
        do {
            let yoData = try await ApiClient.shared.get("auth/yo", token: token)
            yo = try ApiClient.decodeOne(yoData)
        } catch {
            yo = nil
        }

        let user = SessionUser(
            token: token,
            email: normalizedEmail,
            handle: yo?.handle,
            nombre: yo?.nombre,
            tienePerfil: resp.tienePerfil,
            puedeModerar: yo?.puedeModerar ?? false,
            puedeSuspender: yo?.puedeSuspender ?? false
        )
        await MainActor.run {
            SessionStore.shared.save(user)
        }
        return user
    }

    /// Refresca permisos de staff (`auth/yo`) en sesiones guardadas antes de que
    /// existiera `puedeSuspender`, o cuando cambian los roles del usuario.
    func refrescarPermisos() async {
        guard let actual = SessionStore.shared.currentUser else { return }
        do {
            let data = try await ApiClient.shared.get("auth/yo")
            let yo: YoResponse = try ApiClient.decodeOne(data)
            var nuevo = actual
            nuevo.puedeModerar = yo.puedeModerar ?? actual.puedeModerar
            nuevo.puedeSuspender = yo.puedeSuspender ?? false
            if let handle = yo.handle, !handle.isEmpty {
                nuevo.handle = handle
            }
            guard nuevo != actual else { return }
            // Copia inmutable: un `var` no puede capturarse en el cierre @Sendable.
            let actualizado = nuevo
            await MainActor.run {
                guard SessionStore.shared.currentUser?.token == actualizado.token else { return }
                SessionStore.shared.save(actualizado)
            }
        } catch {
            // Sin red o sesión vencida: se queda lo que había.
        }
    }

    /// Cierra sesión: da de baja el token APNs y la sesión en la API (errores
    /// ignorados, con tope de unos segundos) y después borra la sesión local.
    func logout() {
        let token = SessionStore.shared.token
        let apnsToken = ApnsTokenStore.leer()
        PendingDeepLink.clear()
        Task {
            await AuthRepository.cerrarEnServidor(token: token, apnsToken: apnsToken)
            ApnsTokenStore.borrar()
            await MainActor.run {
                SessionStore.shared.clear()
            }
        }
    }

    private static func cerrarEnServidor(token: String?, apnsToken: String?) async {
        guard let token, !token.isEmpty else { return }
        await withTaskGroup(of: Void.self) { grupo in
            grupo.addTask {
                if let apnsToken, !apnsToken.isEmpty {
                    try? await AgoraApi.desuscribirApns(token: apnsToken, sesion: token)
                }
                try? await AgoraApi.salir(sesion: token)
            }
            grupo.addTask {
                // Sin red no se espera de más: la sesión local se borra igual.
                try? await Task.sleep(nanoseconds: 4_000_000_000)
            }
            _ = await grupo.next()
            grupo.cancelAll()
        }
    }

    func crearPerfil(_ datos: CrearPerfilRequest) async throws -> SessionUser {
        let resp = try await AgoraApi.crearPerfil(datos)
        guard var user = SessionStore.shared.currentUser else {
            throw ApiError.http(401, "Sin sesión.")
        }
        user.handle = resp.handle
        user.nombre = datos.nombre
        user.tienePerfil = true
        let guardado = user
        await MainActor.run {
            SessionStore.shared.save(guardado)
        }
        return guardado
    }
}
