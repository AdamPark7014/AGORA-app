import XCTest
@testable import AgoraApp

/// `tieneContrasena` llegó a la API el 21-10-2026 (`docs/autenticacion.md`).
/// Debe leerse cuando viene y quedar en `nil` con una API anterior, sin tirar
/// el parseo de la respuesta. Paridad con `DtosContrasenaTest.kt`.
final class AuthModelsTests: XCTestCase {
    private func decode<T: Decodable>(_ json: String) throws -> T {
        try ApiClient.decodeOne(Data(json.utf8))
    }

    func testVerificarOtpLeeTieneContrasena() throws {
        let sin: VerificarOtpResponse = try decode(
            #"{"tienePerfil":true,"tieneContrasena":false,"token":"tok","expiraEn":"2027-04-19T00:00:00.000Z"}"#
        )
        XCTAssertTrue(sin.tienePerfil)
        XCTAssertEqual(sin.tieneContrasena, false)
        XCTAssertEqual(sin.token, "tok")

        let con: VerificarOtpResponse = try decode(#"{"tienePerfil":false,"tieneContrasena":true,"token":"tok"}"#)
        XCTAssertEqual(con.tieneContrasena, true)
    }

    func testApiAnteriorSinTieneContrasenaDejaNil() throws {
        let verificar: VerificarOtpResponse = try decode(#"{"tienePerfil":true,"token":"tok"}"#)
        XCTAssertNil(verificar.tieneContrasena)

        let yo: YoResponse = try decode(#"{"handle":"maria","nombre":"María","tienePerfil":true}"#)
        XCTAssertNil(yo.tieneContrasena)
        XCTAssertEqual(yo.handle, "maria")
    }

    func testEntrarRespondeTokenYExpiraEn() throws {
        let resp: EntrarResponse = try decode(
            #"{"tienePerfil":true,"tieneContrasena":true,"token":"abc","expiraEn":"2027-04-19T12:00:00.000Z"}"#
        )
        XCTAssertTrue(resp.tienePerfil)
        XCTAssertEqual(resp.token, "abc")
        XCTAssertEqual(resp.expiraEn, "2027-04-19T12:00:00.000Z")
    }

    func testEntrarMandaModoTokenYRecordarme() throws {
        let data = try JSONEncoder().encode(
            EntrarRequest(email: "ana@udlap.mx", contrasena: "ocho-888", modo: "token", recordarme: false)
        )
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(json["modo"] as? String, "token")
        XCTAssertEqual(json["recordarme"] as? Bool, false)
        XCTAssertEqual(json["contrasena"] as? String, "ocho-888")
        XCTAssertNil(json["codigo"])
    }
}
