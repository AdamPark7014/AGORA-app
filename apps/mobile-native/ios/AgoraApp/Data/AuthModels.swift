import Foundation

struct SolicitarOtpRequest: Encodable {
    let email: String
}

struct VerificarOtpRequest: Encodable {
    let email: String
    let codigo: String
    let modo: String
}

/// Respuesta de `auth/otp/verificar`. `tieneContrasena` llegó con el login por
/// contraseña (21-10-2026): `nil` si la API es anterior.
struct VerificarOtpResponse: Decodable {
    let tienePerfil: Bool
    let token: String?
    let tieneContrasena: Bool?
}

/// `POST auth/entrar`: correo + contraseña. `modo = token` para recibir el Bearer.
struct EntrarRequest: Encodable {
    let email: String
    let contrasena: String
    let modo: String
    let recordarme: Bool
}

struct EntrarResponse: Decodable {
    let tienePerfil: Bool
    let tieneContrasena: Bool?
    let token: String?
    let expiraEn: String?
}

/// `POST auth/contrasena`: fija la contraseña sin pedir la actual (cuenta sin
/// contraseña o sesión recién abierta por código).
struct CrearContrasenaRequest: Encodable {
    let contrasena: String
}

/// `POST auth/contrasena/cambiar`: cambia dando la actual.
struct CambiarContrasenaRequest: Encodable {
    let actual: String
    let nueva: String
}

struct YoResponse: Decodable {
    let handle: String?
    let nombre: String?
    let email: String?
    let tienePerfil: Bool?
    /// Si la cuenta ya tiene contraseña. `nil` con una API anterior al 21-10-2026.
    let tieneContrasena: Bool?
    let puedeModerar: Bool?
    let puedeSuspender: Bool?
}

/// `GET auth/otp/entrega/:envioId` — si el código llegó al buzón.
/// Estados: enviado, demorado, entregado, rebotado, bloqueado, error.
struct EstadoEntregaOtpResponse: Decodable {
    let estado: String
}
