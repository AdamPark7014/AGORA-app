import Foundation

/// Resultado de entrar por código. `tieneContrasena` decide si la pantalla pide
/// crear una antes de pasar (`nil`: la API aún no lo manda, se sigue como antes).
struct EntradaPorCodigo {
    let user: SessionUser
    let tieneContrasena: Bool?
}

/// Repositorio de autenticación (código al correo y contraseña). Paridad con
/// `AuthRepository` de Android.
final class AuthRepository {
    static let shared = AuthRepository()
    private init() {}

    /// Pide el código. Devuelve el id de seguimiento de la entrega (cabecera
    /// `X-Envio-Id` del 204) o `nil` si la API no lo manda (API vieja / modo consola).
    @discardableResult
    func solicitarOtp(email: String) async throws -> String? {
        let (_, http) = try await ApiClient.shared.postJSONConRespuesta(
            "auth/otp/solicitar",
            body: SolicitarOtpRequest(email: normalizar(email))
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

    /// Entra con el código del correo y guarda la sesión.
    func verificarOtp(email: String, codigo: String) async throws -> EntradaPorCodigo {
        let normalizedEmail = normalizar(email)
        let normalizedCodigo = codigo.trimmingCharacters(in: .whitespacesAndNewlines)
        let data = try await ApiClient.shared.postJSON(
            "auth/otp/verificar",
            body: VerificarOtpRequest(email: normalizedEmail, codigo: normalizedCodigo, modo: "token")
        )
        let resp: VerificarOtpResponse = try ApiClient.decodeOne(data)
        guard let token = resp.token, !token.isEmpty else {
            throw ApiError.http(-1, "La API no devolvió token.")
        }
        let user = await abrirSesion(token: token, email: normalizedEmail, tienePerfil: resp.tienePerfil)
        return EntradaPorCodigo(user: user, tieneContrasena: resp.tieneContrasena)
    }

    /// Entra con correo + contraseña (`POST auth/entrar`) y guarda la sesión igual
    /// que `verificarOtp`. Sin «recordarme» la API da una sesión de 12 h que no se
    /// renueva. Los 401 (correo, contraseña o cuenta sin contraseña) y los 429
    /// (cinco fallos) llegan como `ApiError.http` con el `mensaje` de la API.
    func entrar(email: String, contrasena: String, recordarme: Bool) async throws -> SessionUser {
        let normalizedEmail = normalizar(email)
        let data = try await ApiClient.shared.postJSON(
            "auth/entrar",
            body: EntrarRequest(
                email: normalizedEmail,
                contrasena: contrasena,
                modo: "token",
                recordarme: recordarme
            )
        )
        let resp: EntrarResponse = try ApiClient.decodeOne(data)
        guard let token = resp.token, !token.isEmpty else {
            throw ApiError.http(-1, "La API no devolvió token.")
        }
        return await abrirSesion(token: token, email: normalizedEmail, tienePerfil: resp.tienePerfil)
    }

    /// Fija la contraseña sin pedir la actual. La API lo permite si la cuenta no
    /// tiene, o si la sesión se abrió por código hace menos de 30 min («olvidé»).
    func crearContrasena(_ contrasena: String) async throws {
        _ = try await ApiClient.shared.postJSON(
            "auth/contrasena",
            body: CrearContrasenaRequest(contrasena: contrasena)
        )
    }

    /// Cambia la contraseña dando la actual. Las otras sesiones se cierran.
    func cambiarContrasena(actual: String, nueva: String) async throws {
        _ = try await ApiClient.shared.postJSON(
            "auth/contrasena/cambiar",
            body: CambiarContrasenaRequest(actual: actual, nueva: nueva)
        )
    }

    /// `GET auth/yo` con la sesión actual (p. ej. para saber si ya hay contraseña).
    func yo() async throws -> YoResponse {
        let data = try await ApiClient.shared.get("auth/yo")
        return try ApiClient.decodeOne(data)
    }

    /// Completa la sesión con `auth/yo` (handle, nombre y permisos; si falla se
    /// guarda sin ellos, como siempre) y la deja en el Keychain.
    private func abrirSesion(token: String, email: String, tienePerfil: Bool) async -> SessionUser {
        var yo: YoResponse?
        do {
            let yoData = try await ApiClient.shared.get("auth/yo", token: token)
            yo = try ApiClient.decodeOne(yoData)
        } catch {
            yo = nil
        }

        let user = SessionUser(
            token: token,
            email: email,
            handle: yo?.handle,
            nombre: yo?.nombre,
            tienePerfil: tienePerfil,
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

    private func normalizar(_ email: String) -> String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}
