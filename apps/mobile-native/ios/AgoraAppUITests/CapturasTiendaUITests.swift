import XCTest

/// Capturas de App Store (6.9", 1320×2868) y la casilla de términos del registro,
/// contra la API real con el seed de demo en el Mac del CI
/// (`.github/workflows/ios-capturas.yml`). Nunca contra producción: sin
/// `AGORA_CAPTURAS` (por ejemplo en `pruebas-ui`) las dos pruebas se saltan.
///
/// El orden importa (XCTest las corre por nombre): primero las capturas con la
/// cuenta de demo, que al final cierra sesión; luego el registro de una cuenta
/// nueva.
final class CapturasTiendaUITests: XCTestCase {
    private var app: XCUIApplication!
    private let entorno = ProcessInfo.processInfo.environment
    private var faltantes: [String] = []

    private var carpeta: String { entorno["AGORA_CAPTURAS"] ?? "" }

    override func setUpWithError() throws {
        try XCTSkipIf(carpeta.isEmpty, "Solo en ios-capturas.yml, contra la API de demo del CI.")
        continueAfterFailure = true
        app = XCUIApplication()
        app.launchEnvironment["AGORA_API_URL"] = entorno["AGORA_API_URL"] ?? "http://127.0.0.1:4200/api"
        app.launchArguments += ["-AppleLanguages", "(es-MX)", "-AppleLocale", "es_MX"]
        if #available(iOS 17.0, *) { XCUIDevice.shared.appearance = .light }
        app.launch()
    }

    // MARK: Capturas

    func test1_capturasDeLaTienda() throws {
        entrarComoDemo()
        saltarBienvenida()
        cerrarAlertasDelSistema()
        XCTAssertTrue(pestanaFeed.waitForExistence(timeout: 30), "No llegó al feed después de entrar")

        recorrido(tema: "claro")

        // Oscuro: la app lee el tema de `agora.apariencia` (Ajustes → Apariencia);
        // cambiar la apariencia del simulador desde la prueba no le llegaba. La
        // sesión sigue en el Keychain, así que relanzar entra directo al feed.
        app.terminate()
        app.launchArguments += ["-agora.apariencia", "oscuro"]
        app.launch()
        XCTAssertTrue(pestanaFeed.waitForExistence(timeout: 30), "No volvió al feed en oscuro")
        recorrido(tema: "oscuro")

        cerrarSesion()
        XCTAssertTrue(faltantes.isEmpty, "Pantallas sin el contenido del seed: \(faltantes.joined(separator: ", "))")
    }

    /// Las seis pantallas de la ficha, tocando como una persona (los enlaces
    /// profundos con `XCUIApplication.open` relanzaban la app y no navegaban).
    /// La segunda vuelta reusa las pilas: Eventos ya tiene el detalle abierto y
    /// Más se regresa a su inicio antes de cada fila.
    private func recorrido(tema: String) {
        cerrarAlertasDelSistema()
        tocar(app.buttons["tab.0"])
        // El Feed B muestra el @ de cada quien, no el nombre.
        let autores = ["renata.mv", "diego.tr", "sofia.mtz", "ximena.oc", "paula.ort", "isa.ruiz"]
        _ = esperarAlguno(autores, timeout: 25)
        // Lo primero que se ve al abrir (Feed B): encabezado, historias, filtros y la pregunta.
        capturar("inicio", tema: tema, esperando: ["Para ti", "Siguiendo"])
        bajarALasPublicaciones()
        capturar("feed", tema: tema, esperando: autores)

        // Clips: se abren desde la fila de historias del inicio.
        let inicio = app.buttons["tab.0"]
        inicio.tap()
        let historia = app.buttons["inicio.historia.0"]
        XCTAssertTrue(historia.waitForExistence(timeout: 15), "No hay historias (clips) en el inicio")
        sleep(1)
        historia.tap()
        capturar("clips", tema: tema, esperando: ["Recta", "cascarita", "brazo robótico"])

        // Cartelera (B «Cholula»): la pestaña dos veces para volver a su raíz en la segunda vuelta.
        let eventos = app.buttons["tab.1"]
        tocar(eventos)
        eventos.tap()
        capturar("cartelera", tema: tema, esperando: ["Cartelera"])
        tocarTexto("Fiesta de fin de parciales")
        capturar("evento", tema: tema, esperando: ["quedar a dormir", "bocinas y alberca"])

        irAMas("aventones")
        capturar("aventones", tema: tema, esperando: ["Angelópolis", "Cholula centro", "Plaza Crystal"])

        tocar(app.buttons["tab.3"])
        capturar("mercado", tema: tema, esperando: ["Laptop", "Stewart", "Escritorio"])

        // Tu perfil con sus sellos (B «Cholula»): la pestaña dos veces para volver a su raíz.
        let perfilPropio = app.buttons["tab.4"]
        tocar(perfilPropio)
        perfilPropio.tap()
        capturar("perfil-yo", tema: tema, esperando: ["Editar perfil"])

        // Campus: accesos, «Tu día» y tu cuenta (artboard por aprobar del 26-10).
        irAMas(nil)
        capturar("campus", tema: tema, esperando: ["Tu día", "Mercado"])

        irAMensajes()
        tocarTexto("Diego")
        capturar("mensajes", tema: tema, esperando: ["biblio", "Arquitecturas"])

        irAMas("directorio")
        escribir("Diego", en: app.textFields["Nombre o @handle"])
        bajarTeclado()
        tocarTexto("Diego")
        capturar("perfil", tema: tema, esperando: ["Conmuto"])
    }

    /// El feed abre con la pregunta del día, la racha y el reto: se baja hasta los
    /// filtros para que la captura muestre publicaciones. Quedarse quieto al final
    /// evita que el desplazamiento siga de largo.
    private func bajarALasPublicaciones() {
        let inicio = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.85))
        let fin = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15))
        inicio.press(forDuration: 0.1, thenDragTo: fin, withVelocity: .default, thenHoldForDuration: 0.4)
    }

    /// Mensajes cuelga del encabezado del inicio (diseño D): Inicio, de vuelta a su raíz, y el botón.
    private func irAMensajes() {
        // El encabezado es la primera fila de la lista. Inicio de nuevo estando en Inicio vuelve
        // a la raíz y sube; tocar directo (no `tocar`): deslizar buscándolo lo alejaría.
        let inicio = app.buttons["tab.0"]
        tocar(inicio)
        inicio.tap()
        inicio.tap()
        let boton = app.buttons["inicio.mensajes"]
        XCTAssertTrue(boton.waitForExistence(timeout: 10), "El inicio no subió al encabezado")
        sleep(1)
        boton.tap()
    }

    /// Campus se abre desde el menú de «Tu perfil» (Feed B): la pestaña, otra vez para volver a su
    /// raíz, el menú y, si se pide, la fila `mas.<ruta>`.
    private func irAMas(_ ruta: String?) {
        let perfil = app.buttons["tab.4"]
        tocar(perfil)
        perfil.tap()
        tocar(app.buttons["perfil.campus"])
        if let ruta {
            tocar(app.buttons["mas.\(ruta)"])
        }
    }

    /// Toca el texto o, si SwiftUI lo fundió en la etiqueta de un botón, el botón.
    private func tocarTexto(_ texto: String) {
        let predicado = NSPredicate(format: "label CONTAINS %@", texto)
        let suelto = app.staticTexts.matching(predicado).firstMatch
        let boton = app.buttons.matching(predicado).firstMatch
        let limite = Date().addingTimeInterval(20)
        while Date() < limite {
            if suelto.exists { return tocar(suelto) }
            if boton.exists { return tocar(boton) }
            usleep(500_000)
        }
        XCTFail("No apareció «\(texto)»")
    }

    /// Espera a que aparezca algo del seed, deja asentar las animaciones y
    /// guarda la pantalla completa en `$AGORA_CAPTURAS/<tema>/<nombre>.png`.
    private func capturar(_ nombre: String, tema: String, esperando textos: [String]) {
        // La puerta también dice «Puebla» y «@udlap.mx»: si se ve, no cuenta.
        if !esperarAlguno(textos, timeout: 25) || app.textFields["login.correo"].exists {
            faltantes.append("\(nombre)-\(tema)")
        }
        sleep(2)
        let captura = XCUIScreen.main.screenshot()
        let adjunto = XCTAttachment(screenshot: captura)
        adjunto.name = "\(nombre)-\(tema)"
        adjunto.lifetime = .keepAlways
        add(adjunto)

        let dir = URL(fileURLWithPath: carpeta).appendingPathComponent(tema)
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try captura.pngRepresentation.write(to: dir.appendingPathComponent("\(nombre).png"))
        } catch {
            XCTFail("No se pudo guardar \(nombre)-\(tema): \(error)")
        }
    }

    private func esperarAlguno(_ textos: [String], timeout: TimeInterval) -> Bool {
        let limite = Date().addingTimeInterval(timeout)
        repeat {
            for texto in textos {
                // Cualquier elemento: dentro de un botón el texto vive en su etiqueta.
                let predicado = NSPredicate(format: "label CONTAINS %@", texto)
                if app.descendants(matching: .any).matching(predicado).firstMatch.exists {
                    return true
                }
            }
            usleep(500_000)
        } while Date() < limite
        return false
    }

    // MARK: Registro

    func test2_registroPideAceptarLosTerminos() throws {
        let correo = entorno["AGORA_REGISTRO_CORREO"] ?? "prueba.registro@udlap.mx"
        let maestro = entorno["AGORA_DEMO_MAESTRO"] ?? "123456"

        tocar(app.buttons["login.crearCuenta"])
        escribir(correo, en: app.textFields["login.correo"])
        tocar(app.buttons["pedir.enviar"])
        escribir(maestro, en: app.textFields["codigo.campo"])
        bajarTeclado()
        tocar(app.buttons["codigo.entrar"])

        // Cuenta nueva sin contraseña: primero la crea.
        let nueva = app.secureTextFields["Contraseña nueva"]
        XCTAssertTrue(nueva.waitForExistence(timeout: 20), "No pidió crear la contraseña")
        let clave = "Registro-\(UUID().uuidString.prefix(8))"
        escribir(clave, en: nueva)
        escribir(clave, en: app.secureTextFields["Repítela"])
        bajarTeclado()
        tocar(app.buttons["Guardar contraseña"])
        saltarBienvenida()

        // Perfil.
        escribir("registro_ui", en: app.textFields["usuario"])
        escribir("Prueba", en: app.textFields["Nombre"])
        escribir("Registro", en: app.textFields["Apellidos"])
        bajarTeclado()
        // La carrera se busca (diseño D): sin escribir no aparece la lista de las 52.
        escribir("Ingenier", en: app.textFields["registro.buscarCarrera"])
        bajarTeclado()
        let carrera = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", "Ingenier")).firstMatch
        XCTAssertTrue(carrera.waitForExistence(timeout: 10), "No aparecieron las carreras")
        tocar(carrera)

        let casilla = app.buttons["registro.terminos"]
        let crear = app.buttons["registro.crear"]
        hastaVer(casilla)
        XCTAssertTrue(casilla.exists, "No está la casilla de términos")
        XCTAssertFalse(crear.isEnabled, "«Entrar a Ágora» se puede tocar sin aceptar los términos")
        guardar(nombre: "registro-sin-aceptar")

        // Los dos enlaces de la frase abren su documento sin salir del registro.
        tocarEnlace("Términos", enX: 0.27)
        XCTAssertTrue(app.staticTexts["Cero tolerancia"].waitForExistence(timeout: 5), "Términos sin «Cero tolerancia»")
        tocar(app.buttons["legal.cerrar"])
        tocarEnlace("Reglas de la comunidad", enX: 0.66)
        XCTAssertTrue(app.staticTexts["Las cinco líneas rojas"].waitForExistence(timeout: 5), "No abrió las Reglas")
        tocar(app.buttons["legal.cerrar"])

        tocar(casilla)
        XCTAssertTrue(crear.isEnabled, "La casilla marcada no habilitó el botón")
        guardar(nombre: "registro-aceptado")
        tocar(crear)
        cerrarAlertasDelSistema()
        XCTAssertTrue(pestanaFeed.waitForExistence(timeout: 30), "El perfil no se creó")
    }

    // MARK: Inicio sin contenido

    /// Lo que ve cualquiera en un campus sin publicaciones (como producción el 26-10). Corre en una
    /// segunda pasada de ios-capturas.yml, después de vaciar publicaciones, eventos y anuncios.
    func test3_inicioVacio() throws {
        try XCTSkipIf(entorno["AGORA_INICIO_VACIO"] != "1", "Solo en la segunda pasada, con la base vacía.")
        entrarComoDemo()
        saltarBienvenida()
        cerrarAlertasDelSistema()
        XCTAssertTrue(pestanaFeed.waitForExistence(timeout: 30), "No llegó al inicio")
        tocar(app.buttons["tab.0"])
        capturar("inicio-vacio", tema: "claro", esperando: ["Tu campus apenas empieza"])

        app.terminate()
        app.launchArguments += ["-agora.apariencia", "oscuro"]
        app.launch()
        XCTAssertTrue(pestanaFeed.waitForExistence(timeout: 30), "No volvió al inicio en oscuro")
        capturar("inicio-vacio", tema: "oscuro", esperando: ["Tu campus apenas empieza"])
        XCTAssertTrue(faltantes.isEmpty, "Sin el estado vacío: \(faltantes.joined(separator: ", "))")
    }

    /// Tercera pasada: la base sin contenido más la bienvenida de la cuenta oficial @agora
    /// (scripts/bienvenida), que es lo que ve una cuenta nueva en producción desde el 28-10-2026.
    func test4_inicioBienvenida() throws {
        try XCTSkipIf(entorno["AGORA_INICIO_BIENVENIDA"] != "1", "Solo en la tercera pasada, con la bienvenida publicada.")
        entrarComoDemo()
        saltarBienvenida()
        cerrarAlertasDelSistema()
        XCTAssertTrue(pestanaFeed.waitForExistence(timeout: 30), "No llegó al inicio")
        tocar(app.buttons["tab.0"])
        capturar("inicio-bienvenida", tema: "claro", esperando: ["agora"])
        app.swipeUp()
        capturar("inicio-bienvenida-2", tema: "claro", esperando: ["agora"])

        app.terminate()
        app.launchArguments += ["-agora.apariencia", "oscuro"]
        app.launch()
        XCTAssertTrue(pestanaFeed.waitForExistence(timeout: 30), "No volvió al inicio en oscuro")
        capturar("inicio-bienvenida", tema: "oscuro", esperando: ["agora"])
        app.swipeUp()
        capturar("inicio-bienvenida-2", tema: "oscuro", esperando: ["agora"])
        XCTAssertTrue(faltantes.isEmpty, "Sin la bienvenida de @agora: \(faltantes.joined(separator: ", "))")
    }

    // MARK: Piezas

    /// Los enlaces de un `Text` no salen como elementos propios: se toca la
    /// palabra sobre la frase (posición medida en el iPhone de 6.9" del CI,
    /// primera línea).
    private func tocarEnlace(_ nombre: String, enX dx: CGFloat) {
        let enlace = app.links[nombre]
        if enlace.exists { return enlace.tap() }
        let frase = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Acepto los")).firstMatch
        XCTAssertTrue(frase.waitForExistence(timeout: 5), "No está la frase de los términos")
        frase.coordinate(withNormalizedOffset: CGVector(dx: dx, dy: 0.16)).tap()
    }

    /// Pestaña Feed de la barra propia (`tab.<n>` en `MainTabView`).
    private var pestanaFeed: XCUIElement { app.buttons["tab.0"] }

    private func entrarComoDemo() {
        let correo = app.textFields["login.correo"]
        guard correo.waitForExistence(timeout: 15) else { return }
        escribir(entorno["AGORA_DEMO_CORREO"] ?? "", en: correo)
        escribir(entorno["AGORA_DEMO_CONTRASENA"] ?? "", en: app.secureTextFields["login.contrasena"])
        bajarTeclado()
        tocar(app.buttons["login.entrar"])
    }

    /// La primera vez que se entra en el teléfono sale la bienvenida de tres
    /// pantallas antes del feed (o del registro).
    private func saltarBienvenida() {
        let saltar = app.buttons["Saltar"]
        if saltar.waitForExistence(timeout: 10) { saltar.tap() }
    }

    /// Campus → «Cerrar sesión», para que el registro empiece en la puerta.
    private func cerrarSesion() {
        irAMas(nil)
        let salir = app.buttons["Cerrar sesión"]
        hastaVer(salir)
        if salir.exists { salir.tap() }
        XCTAssertTrue(app.buttons["login.crearCuenta"].waitForExistence(timeout: 15), "No volvió a la puerta")
    }

    /// El aviso de notificaciones (y cualquier otro del sistema) taparía las capturas.
    private func cerrarAlertasDelSistema() {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for boton in ["Permitir", "Allow"] {
            let candidato = springboard.alerts.buttons[boton]
            if candidato.waitForExistence(timeout: 2) {
                candidato.tap()
                return
            }
        }
    }

    private func hastaVer(_ elemento: XCUIElement) {
        var intentos = 0
        while (!elemento.isHittable || tapadoPorLaBarra(elemento)) && intentos < 15 {
            app.swipeUp()
            intentos += 1
        }
    }

    /// La barra de pestañas flota encima del contenido: `isHittable` no sabe que una fila queda
    /// debajo de ella y el toque le caía a la barra.
    private func tapadoPorLaBarra(_ elemento: XCUIElement) -> Bool {
        let barra = app.buttons["tab.0"]
        guard barra.exists, !elemento.identifier.hasPrefix("tab.") else { return false }
        return elemento.frame.maxY > barra.frame.minY - 8
    }

    private func tocar(_ elemento: XCUIElement, archivo: StaticString = #filePath, linea: UInt = #line) {
        XCTAssertTrue(elemento.waitForExistence(timeout: 15), "No apareció \(elemento)", file: archivo, line: linea)
        hastaVer(elemento)
        elemento.tap()
    }

    private func escribir(_ texto: String, en campo: XCUIElement) {
        XCTAssertTrue(campo.waitForExistence(timeout: 15), "No apareció el campo \(campo)")
        hastaVer(campo)
        campo.tap()
        campo.typeText(texto)
    }

    private func bajarTeclado() {
        let listo = app.buttons["teclado.listo"]
        if listo.waitForExistence(timeout: 2) {
            listo.tap()
        } else if app.keyboards.count > 0 {
            // Sin barra «Listo» (el registro): Intro termina la edición del campo.
            app.typeText(XCUIKeyboardKey.return.rawValue)
        }
    }

    private func guardar(nombre: String) {
        let adjunto = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        adjunto.name = nombre
        adjunto.lifetime = .keepAlways
        add(adjunto)
        let dir = URL(fileURLWithPath: carpeta).appendingPathComponent("registro")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: dir.appendingPathComponent("\(nombre).png"))
    }
}
