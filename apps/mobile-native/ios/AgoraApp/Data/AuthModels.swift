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
    /// Registrada con correo personal: falta confirmar el buzón UDLAP (22-10-2026).
    let udlapPendiente: Bool?
}

/// `POST auth/otp/personal/solicitar`: cuando el código a la UDLAP no llega.
struct SolicitarOtpPersonalRequest: Encodable {
    let email: String
    let correoPersonal: String
}

/// `POST auth/otp/personal/verificar`: canjea el código del correo personal.
struct VerificarOtpPersonalRequest: Encodable {
    let email: String
    let correoPersonal: String
    let codigo: String
    let modo: String
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
    let udlapPendiente: Bool?
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
    /// Registro con correo personal: falta confirmar el buzón UDLAP antes del plazo.
    let udlapPendiente: Bool?
    let udlapVenceEn: String?
    /// Pasó el plazo: la API solo deja usar las rutas de la cuenta hasta confirmar.
    let udlapVencida: Bool?
    let udlapDiasRestantes: Int?
}

/// `GET auth/otp/entrega/:envioId` — si el código llegó al buzón.
/// Estados: enviado, demorado, entregado, rebotado, bloqueado, error.
struct EstadoEntregaOtpResponse: Decodable {
    let estado: String
}
