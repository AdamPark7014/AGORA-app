import XCTest

/// La puerta de Ágora en el simulador, contra la API falsa del CI
/// (`.github/scripts/api-falsa.py`, puerto 8765). Cada botón se toca cerca de
/// su borde derecho: ahí es donde TestFlight 1.0.0 (2) no respondía.
final class LoginUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchEnvironment["AGORA_API_URL"] = "http://127.0.0.1:8765/api"
        app.launch()
    }

    /// Toca el elemento al 92 % de su ancho, lejos del texto.
    private func tocarEnElBorde(_ elemento: XCUIElement, archivo: StaticString = #filePath, linea: UInt = #line) {
        XCTAssertTrue(elemento.waitForExistence(timeout: 10), "No apareció \(elemento)", file: archivo, line: linea)
        elemento.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.5)).tap()
    }

    private func escribir(_ texto: String, en id: String) {
        let campo = app.textFields[id]
        XCTAssertTrue(campo.waitForExistence(timeout: 10), "No apareció el campo \(id)")
        campo.tap()
        campo.typeText(texto)
    }

    /// Baja el teclado con «Listo» (la barra encima del teclado): con él arriba,
    /// el botón de abajo queda tapado en un iPhone normal.
    private func bajarTeclado() {
        let listo = app.buttons["teclado.listo"]
        if listo.waitForExistence(timeout: 3) { listo.tap() }
    }

    private func irAlCodigoUdlap() {
        tocarEnElBorde(app.buttons["login.crearCuenta"])
        escribir("prueba.ui@udlap.mx", en: "login.correo")
        tocarEnElBorde(app.buttons["pedir.enviar"])
        XCTAssertTrue(app.textFields["codigo.campo"].waitForExistence(timeout: 15), "No se pasó al paso del código")
    }

    func testCrearCuentaPideElCodigoAunqueSeToqueElBordeDelBoton() {
        irAlCodigoUdlap()
        let entradilla = app.staticTexts["login.entradilla"]
        XCTAssertTrue(entradilla.label.contains("prueba.ui@udlap.mx"), entradilla.label)
    }

    func testSiNoLlegaSePuedeRegistrarConElCorreoPersonal() {
        irAlCodigoUdlap()
        tocarEnElBorde(app.buttons["codigo.noLlego"])
        // La tarjeta «Vamos a confirmar <UDLAP>» empuja el botón: con el teclado arriba queda tapado.
        XCTAssertTrue(app.buttons["personal.cambiarUdlap"].waitForExistence(timeout: 5), "No se ve el correo UDLAP a confirmar")
        escribir("prueba.ui@gmail.com", en: "personal.correo")
        bajarTeclado()
        tocarEnElBorde(app.buttons["personal.enviar"])

        let entradilla = app.staticTexts["login.entradilla"]
        let llego = NSPredicate(format: "label CONTAINS %@", "prueba.ui@gmail.com")
        expectation(for: llego, evaluatedWith: entradilla)
        waitForExpectations(timeout: 15)
        XCTAssertTrue(app.textFields["codigo.campo"].exists)
    }

    func testUnCodigoMaloMuestraElMensajeDelServidor() {
        irAlCodigoUdlap()
        escribir("123456", en: "codigo.campo")
        // El teclado numérico no tiene «Enviar»: se baja con «Listo».
        bajarTeclado()
        tocarEnElBorde(app.buttons["codigo.entrar"])
        let error = app.staticTexts["login.error"]
        XCTAssertTrue(error.waitForExistence(timeout: 15), "No apareció el error del servidor")
        XCTAssertTrue(error.label.localizedCaseInsensitiveContains("invalido"), error.label)
    }

    func testEntrarConContrasenaMalaMuestraElMensajeDelServidor() {
        escribir("prueba.ui@udlap.mx", en: "login.correo")
        let contrasena = app.secureTextFields["login.contrasena"]
        XCTAssertTrue(contrasena.waitForExistence(timeout: 10))
        contrasena.tap()
        contrasena.typeText("no-es-la-buena")
        bajarTeclado()
        let entrar = app.buttons["login.entrar"]
        XCTAssertTrue(entrar.waitForExistence(timeout: 5))
        XCTAssertTrue(entrar.isEnabled, "«Entrar» sigue desactivado: no se escribió la contraseña")
        tocarEnElBorde(entrar)
        let error = app.staticTexts["login.error"]
        XCTAssertTrue(error.waitForExistence(timeout: 15), "No apareció el error del servidor")
        XCTAssertTrue(error.label.contains("Correo o contraseña incorrectos"), error.label)
    }
}
