import Foundation

/// Repositorio de autenticación OTP. Paridad con `AuthRepository` de Android.
final class AuthRepository {
    static let shared = AuthRepository()
    private init() {}

    func solicitarOtp(email: String) async throws {
        let normalized = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        _ = try await ApiClient.shared.postJSON(
            "auth/otp/solicitar",
            body: SolicitarOtpRequest(email: normalized)
        )
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
            puedeModerar: yo?.puedeModerar ?? false
        )
        SessionStore.shared.save(user)
        return user
    }

    func logout() {
        PendingDeepLink.clear()
        SessionStore.shared.clear()
    }

    func crearPerfil(_ datos: CrearPerfilRequest) async throws -> SessionUser {
        let resp = try await AgoraApi.crearPerfil(datos)
        guard var user = SessionStore.shared.currentUser else {
            throw ApiError.http(401, "Sin sesión.")
        }
        user.handle = resp.handle
        user.nombre = datos.nombre
        user.tienePerfil = true
        SessionStore.shared.save(user)
        return user
    }
}
