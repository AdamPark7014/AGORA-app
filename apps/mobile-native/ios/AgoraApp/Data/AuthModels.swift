import Foundation

struct SolicitarOtpRequest: Encodable {
    let email: String
}

struct VerificarOtpRequest: Encodable {
    let email: String
    let codigo: String
    let modo: String
}

struct VerificarOtpResponse: Decodable {
    let tienePerfil: Bool
    let token: String?
}

struct YoResponse: Decodable {
    let handle: String?
    let nombre: String?
    let email: String?
    let tienePerfil: Bool?
    let puedeModerar: Bool?
    let puedeSuspender: Bool?
}

/// `GET auth/otp/entrega/:envioId` — si el código llegó al buzón.
/// Estados: enviado, demorado, entregado, rebotado, bloqueado, error.
struct EstadoEntregaOtpResponse: Decodable {
    let estado: String
}
