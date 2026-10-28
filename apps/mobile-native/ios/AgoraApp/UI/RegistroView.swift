import SwiftUI
import UserNotifications

/// Registro de perfil como «Sube a tu campus» (B «Cholula»): la pirámide se llena al avanzar por
/// carrera, colegio y avisos; el último escalón pide el permiso y crea el perfil. Paridad con
/// `RegistroScreen.kt`.
struct RegistroView: View {
    let onCompletado: (SessionUser) -> Void

    @State private var catalogo: CatalogoDto?
    @State private var cargandoCatalogo = true
    @State private var handle = ""
    @State private var nombre = ""
    @State private var apellidos = ""
    @State private var carreraSlug: String?
    /// Buscador sobre las 52 carreras en vez de la lista larga (docs/diseno-d.md §4).
    @State private var busquedaCarrera = ""
    @State private var colegioSlug: String?
    @State private var generacion = Calendar.current.component(.year, from: Date())
    @State private var aceptaTerminos = false
    @State private var documento: DocumentoLegal?
    @State private var enviando = false
    @State private var error: String?
    @State private var paso = Paso.carrera
    @State private var avisosActivos = false

    /// Lo que abren los enlaces de la casilla, en una hoja sobre el registro.
    private enum DocumentoLegal: String, Identifiable {
        case terminos, reglas
        var id: String { rawValue }
    }

    /// `GENERACION_MIN` de `packages/shared` (la API rechaza años anteriores).
    private static let generacionMin = 2015

    /// Como la web: el año que entra y los nueve anteriores, nunca antes de
    /// `generacionMin`. La API acepta hasta el año actual + 1.
    private static var generaciones: [Int] {
        let tope = Calendar.current.component(.year, from: Date()) + 1
        let piso = max(generacionMin, tope - 9)
        return Array(stride(from: tope, through: piso, by: -1))
    }

    private var carreras: [CarreraDto] {
        catalogo?.escuelas?.flatMap { $0.carreras ?? [] } ?? []
    }

    private var consultaCarrera: String {
        Self.normalizar(busquedaCarrera.trimmingCharacters(in: .whitespaces))
    }

    /// Con 2 letras o más, las que coinciden; sin búsqueda, solo la elegida.
    private var carrerasVisibles: [CarreraDto] {
        if consultaCarrera.count >= 2 {
            return carreras.filter { Self.normalizar($0.nombre).contains(consultaCarrera) }
        }
        if let carreraSlug {
            return carreras.filter { $0.slug == carreraSlug }
        }
        return []
    }

    /// Sin acentos ni mayúsculas: «ingenieria» encuentra «Ingeniería».
    private static func normalizar(_ texto: String) -> String {
        texto.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "es_MX"))
    }

    /// El nombre con la parte que coincide en negritas y naranja.
    private func resaltado(_ nombre: String) -> Text {
        let normal = Self.normalizar(nombre)
        guard consultaCarrera.count >= 2, let rango = normal.range(of: consultaCarrera) else {
            return Text(nombre)
        }
        let inicio = normal.distance(from: normal.startIndex, to: rango.lowerBound)
        let largo = normal.distance(from: rango.lowerBound, to: rango.upperBound)
        let letras = Array(nombre)
        guard inicio + largo <= letras.count else { return Text(nombre) }
        return Text(String(letras[..<inicio]))
            + Text(String(letras[inicio..<(inicio + largo)]))
                .bold()
                .foregroundColor(AgoraDesign.Colors.naranjaTinta)
            + Text(String(letras[(inicio + largo)...]))
    }

    private var datosCompletos: Bool {
        handle.count >= 3 &&
            nombre.count >= 2 &&
            apellidos.count >= 2 &&
            carreraSlug != nil
    }

    /// La casilla no viaja a la API: solo habilita el botón.
    private var puedeEnviar: Bool {
        !enviando && datosCompletos && aceptaTerminos
    }

    var body: some View {
        NavigationStack {
            Group {
                if cargandoCatalogo {
                    ProgressView()
                        .tint(AgoraDesign.Colors.naranja)
                } else if catalogo == nil {
                    AgoraErrorState(
                        message: error ?? "No se pudo cargar el catálogo.",
                        onRetry: { Task { await cargarCatalogo() } }
                    )
                } else {
                    formulario
                }
            }
            .agoraScreenBackground()
            .toolbar(.hidden, for: .navigationBar)
            .task { await cargarCatalogo() }
            .task { await revisarAvisos() }
            .sheet(item: $documento) { doc in
                NavigationStack {
                    Group {
                        switch doc {
                        case .terminos: TerminosView()
                        case .reglas: ReglasView()
                        }
                    }
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button(AgoraCopy.cerrar) { documento = nil }
                                .accessibilityIdentifier("legal.cerrar")
                        }
                    }
                }
            }
        }
    }

    // MARK: Pirámide (B «Cholula», docs/diseno-cholula.md §4, artboard WowB-Arranque)

    /// Los tres escalones que se suben aquí; el correo ya quedó abajo al entrar.
    private enum Paso: Int {
        case carrera = 2, colegio = 3, avisos = 4
    }

    private var subtitulo: String {
        switch paso {
        case .carrera: return "Cada escalón te junta con más gente tuya. Primero, tu carrera."
        case .colegio: return "Cada escalón te junta con más gente tuya. Ahora, tu colegio."
        case .avisos: return "Último escalón: te avisamos cuando caiga la pregunta del día y cuando te escriban."
        }
    }

    private var nombreCarrera: String? {
        guard let carreraSlug, let carrera = carreras.first(where: { $0.slug == carreraSlug }) else { return nil }
        return NombreSello.corto(nombre: carrera.nombre, slug: "carrera:")
    }

    private var nombreColegio: String? {
        guard let colegioSlug else { return nil }
        return catalogo?.colegios?.first { $0.slug == colegioSlug }
            .map { NombreSello.corto(nombre: $0.nombre, slug: "colegio:") }
    }

    private var escalones: [EscalonCampus] {
        let correo = SessionStore.shared.currentUser?.email.lowercased() ?? ""
        let carreraLista = paso.rawValue > Paso.carrera.rawValue
        let colegioListo = paso.rawValue > Paso.colegio.rawValue
        return [
            EscalonCampus(texto: correo.hasSuffix("@udlap.mx") ? "Tu correo UDLAP" : "Tu correo",
                          estado: .hecho, color: AgoraDesign.Colors.adobe),
            EscalonCampus(texto: carreraLista ? "Tu carrera · \(nombreCarrera ?? "lista")" : "Tu carrera",
                          estado: carreraLista ? .hecho : .ahora, color: AgoraDesign.Colors.talavera),
            EscalonCampus(texto: colegioListo ? (nombreColegio.map { "Tu colegio · \($0)" } ?? "Sin colegio") : "Tu colegio",
                          estado: colegioListo ? .hecho : (paso == .colegio ? .ahora : .falta),
                          color: nombreColegio == nil ? AgoraDesign.Colors.textoMedio : AgoraDesign.Colors.maiz,
                          tinta: nombreColegio == nil ? .white : AgoraDesign.Colors.sobreMaiz),
            EscalonCampus(texto: "Tus avisos",
                          estado: avisosActivos ? .hecho : (paso == .avisos ? .ahora : .falta),
                          color: AgoraDesign.Colors.jade),
        ]
    }

    private var formulario: some View {
        ScrollViewReader { lector in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    FranjaTalavera(alto: 12)
                        .id("registro.arriba")

                    if paso != .carrera {
                        Button {
                            withAnimation(AgoraDesign.Animation.spring) {
                                paso = paso == .avisos ? .colegio : .carrera
                            }
                        } label: {
                            Label("Atrás", systemImage: "chevron.left")
                                .font(.outfit(.subheadline, .semibold))
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                                .frame(minHeight: 44)
                        }
                        .buttonStyle(.agoraPlain)
                        .padding(.horizontal, 16)
                        .accessibilityIdentifier("registro.atras")
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("PASO \(paso.rawValue) DE 4")
                            .font(.outfit(.caption, .bold))
                            .tracking(1.4)
                            .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
                        Text("Sube a tu campus")
                            .font(.bricolage(36, relativeTo: .largeTitle))
                            .foregroundStyle(AgoraDesign.Colors.texto)
                            .accessibilityAddTraits(.isHeader)
                        Text(subtitulo)
                            .font(.outfit(.body))
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.horizontal, 22)
                    .padding(.top, paso == .carrera ? 24 : 4)

                    PiramideCampus(escalones: escalones)
                        .padding(.horizontal, 12)
                        .padding(.top, 22)

                    VStack(alignment: .leading, spacing: AgoraDesign.Spacing.md) {
                        switch paso {
                        case .carrera: pasoCarrera
                        case .colegio: pasoColegio
                        case .avisos: pasoAvisos
                        }

                        if let error {
                            Text(error)
                                .font(.outfit(.footnote))
                                .foregroundStyle(AgoraDesign.Colors.danger)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 26)
                    .padding(.bottom, 30)
                }
            }
            .onChange(of: paso) { _ in
                withAnimation(AgoraDesign.Animation.spring) {
                    lector.scrollTo("registro.arriba", anchor: .top)
                }
            }
        }
    }

    /// Botón grande «Subir un escalón» (relleno `boton`, como el artboard).
    private func botonEscalon(_ titulo: String, habilitado: Bool, identificador: String,
                              accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Text(titulo)
                .font(.outfit(.body, .bold))
                .foregroundStyle(AgoraDesign.Colors.sobreBoton)
                .frame(maxWidth: .infinity, minHeight: 54)
                .background(AgoraDesign.Colors.boton, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .opacity(habilitado ? 1 : 0.4)
        }
        .buttonStyle(.agoraPlain)
        .disabled(!habilitado)
        .accessibilityIdentifier(identificador)
    }

    // MARK: Paso 2: tu carrera

    @ViewBuilder
    private var pasoCarrera: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs + 2) {
            Text(AgoraCopy.registroHandleLabel)
                .font(.outfit(.caption, .bold))
            HStack(spacing: 0) {
                Text("@")
                    .foregroundStyle(AgoraDesign.Colors.naranja)
                    .padding(.leading, AgoraDesign.Spacing.sm)
                TextField("usuario", text: $handle)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onChange(of: handle) { newValue in
                        let filtered = newValue.filter { $0.isLetter || $0.isNumber || $0 == "_" }
                        if filtered != newValue { handle = filtered }
                    }
            }
            .padding(.vertical, AgoraDesign.Spacing.sm)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                    .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
            }
            Text(AgoraCopy.registroHandleHint)
                .font(.outfit(.caption))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
        }

        // Agrupado: en iOS 16 un ViewBuilder admite como máximo 10 hijos por bloque.
        Group {
            campo("Nombre", text: $nombre)
            campo("Apellidos", text: $apellidos)
            selectorGeneracion
        }

        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
            Text("Carrera")
                .font(.outfit(.subheadline, .bold))
            Text(AgoraCopy.registroCarreraHint)
                .font(.outfit(.caption))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
        }
        Group {
            TextField("Busca tu carrera, p. ej. Sistemas", text: $busquedaCarrera)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(.horizontal, AgoraDesign.Spacing.sm)
                .frame(minHeight: 44)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
                .accessibilityLabel("Busca tu carrera")
                .accessibilityIdentifier("registro.buscarCarrera")

            ForEach(carrerasVisibles) { carrera in
                seleccionChip(
                    resaltado(carrera.nombre),
                    selected: carreraSlug == carrera.slug
                ) {
                    carreraSlug = carrera.slug
                    busquedaCarrera = ""
                }
            }

            if consultaCarrera.count >= 2, carrerasVisibles.isEmpty {
                Text("Ninguna carrera se llama así. Prueba con otra palabra.")
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            } else if consultaCarrera.count < 2, carreraSlug == nil {
                Text("Escribe al menos 2 letras: Sistemas, Derecho, Arquitectura…")
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
        }

        botonEscalon("Subir un escalón", habilitado: datosCompletos, identificador: "registro.aColegio") {
            error = nil
            withAnimation(AgoraDesign.Animation.spring) { paso = .colegio }
        }
        .padding(.top, AgoraDesign.Spacing.xs)
    }

    // MARK: Paso 3: tu colegio

    @ViewBuilder
    private var pasoColegio: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
            ForEach(catalogo?.colegios ?? []) { colegio in
                opcionColegio(NombreSello.corto(nombre: colegio.nombre, slug: "colegio:"),
                              color: AgoraDesign.Colors.maiz, elegido: colegioSlug == colegio.slug) {
                    colegioSlug = colegio.slug
                }
            }
            opcionColegio("No vivo en colegio", color: AgoraDesign.Colors.textoMedio, elegido: colegioSlug == nil) {
                colegioSlug = nil
            }
        }

        botonEscalon("Subir un escalón", habilitado: true, identificador: "registro.aAvisos") {
            error = nil
            withAnimation(AgoraDesign.Animation.spring) { paso = .avisos }
        }
        .padding(.top, AgoraDesign.Spacing.xs)
    }

    private func opcionColegio(_ texto: String, color: Color, elegido: Bool, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(color)
                    .frame(width: 10, height: 10)
                    .accessibilityHidden(true)
                Text(texto)
                    .font(.outfit(.subheadline, .semibold))
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .multilineTextAlignment(.center)
            }
            .foregroundStyle(AgoraDesign.Colors.texto)
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(elegido ? AgoraDesign.Colors.texto : AgoraDesign.Colors.borde, lineWidth: elegido ? 2 : 1)
            }
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.agoraPlain)
        .accessibilityAddTraits(elegido ? .isSelected : [])
    }

    // MARK: Paso 4: tus avisos (y entrar)

    @ViewBuilder
    private var pasoAvisos: some View {
        if avisosActivos {
            Label("Avisos activados", systemImage: "checkmark.circle.fill")
                .font(.outfit(.subheadline, .semibold))
                .foregroundStyle(AgoraDesign.Colors.vivo)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else {
            Button {
                Task { await pedirAvisos() }
            } label: {
                Label("Activar avisos", systemImage: "bell.badge")
                    .font(.outfit(.subheadline, .bold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(AgoraDesign.Colors.texto, lineWidth: 2)
                    }
            }
            .buttonStyle(.agoraPlain)
            .accessibilityIdentifier("registro.avisos")
            Text("Puedes cambiarlo cuando quieras en Ajustes.")
                .font(.outfit(.caption))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
        }

        casillaTerminos
            .padding(.top, AgoraDesign.Spacing.xs)

        AgoraPrimaryButton(
            title: enviando ? AgoraCopy.registroCreating : AgoraCopy.registroSubmit,
            action: { Task { await crearPerfil() } },
            enabled: puedeEnviar,
            loading: enviando
        )
        .accessibilityIdentifier("registro.crear")

        if datosCompletos && !aceptaTerminos {
            Text(AgoraCopy.registroTerminosFalta)
                .font(.outfit(.caption))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
        }
    }

    /// El permiso del sistema; el registro del token con la API lo hace la app al entrar.
    private func pedirAvisos() async {
        let centro = UNUserNotificationCenter.current()
        let concedido = (try? await centro.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        withAnimation(AgoraDesign.Animation.spring) { avisosActivos = concedido }
    }

    private func revisarAvisos() async {
        let ajustes = await UNUserNotificationCenter.current().notificationSettings()
        switch ajustes.authorizationStatus {
        case .authorized, .provisional, .ephemeral: avisosActivos = true
        default: avisosActivos = false
        }
    }

    private func campo(
        _ label: String,
        text: Binding<String>,
        autocap: Bool = true
    ) -> some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs + 2) {
            Text(label)
                .font(.outfit(.caption, .bold))
            TextField(label, text: text)
                .textInputAutocapitalization(autocap ? .words : .never)
                .autocorrectionDisabled()
                .padding(AgoraDesign.Spacing.sm)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
        }
    }

    /// Casilla obligatoria (Apple 1.2). El cuadro y la frase van separados: dentro
    /// de un botón, los enlaces de la frase no recibirían el toque.
    private var casillaTerminos: some View {
        HStack(alignment: .top, spacing: AgoraDesign.Spacing.xs) {
            Button {
                aceptaTerminos.toggle()
            } label: {
                Image(systemName: aceptaTerminos ? "checkmark.square.fill" : "square")
                    .font(.outfit(.title2))
                    .foregroundStyle(aceptaTerminos ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.textoMedio)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.agoraPlain)
            .accessibilityIdentifier("registro.terminos")
            .accessibilityLabel(AgoraCopy.registroTerminosVoz)
            .accessibilityValue(aceptaTerminos ? "Marcada" : "Sin marcar")
            .accessibilityAddTraits(aceptaTerminos ? .isSelected : [])

            Text(Self.textoTerminos)
                .font(.outfit(.footnote))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .tint(AgoraDesign.Colors.naranja)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 11)
                .environment(\.openURL, OpenURLAction { url in
                    documento = url.host == "reglas" ? .reglas : .terminos
                    return .handled
                })
        }
    }

    private static let textoTerminos: AttributedString =
        (try? AttributedString(markdown: AgoraCopy.registroTerminos)) ?? AttributedString(AgoraCopy.registroTerminos)

    /// Año de ingreso con botones (diseño D). `String(ano)` evita «2,026» con separador de miles.
    private var selectorGeneracion: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs + 2) {
            Text("Generación (año en que entraste)")
                .font(.outfit(.caption, .bold))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 5), spacing: 6) {
                ForEach(Self.generaciones, id: \.self) { ano in
                    let elegida = generacion == ano
                    Button {
                        generacion = ano
                    } label: {
                        Text(String(ano))
                            .font(.outfit(.subheadline, .semibold))
                            .monospacedDigit()
                            .foregroundStyle(elegida ? AgoraDesign.Colors.fondo : AgoraDesign.Colors.texto)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(elegida ? AgoraDesign.Colors.texto : AgoraDesign.Colors.superficie)
                            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
                            .overlay {
                                RoundedRectangle(cornerRadius: AgoraDesign.Radii.small)
                                    .stroke(elegida ? AgoraDesign.Colors.texto : AgoraDesign.Colors.borde, lineWidth: 1)
                            }
                    }
                    .buttonStyle(.agoraPlain)
                    .accessibilityLabel("Generación \(String(ano))")
                    .accessibilityAddTraits(elegida ? .isSelected : [])
                }
            }
        }
    }

    private func seleccionChip(_ label: Text, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                label
                    .font(.outfit(.subheadline))
                    .multilineTextAlignment(.leading)
                Spacer()
                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                }
            }
            .padding(AgoraDesign.Spacing.sm)
            .background(selected ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                    .stroke(selected ? AgoraDesign.Colors.naranja.opacity(0.3) : AgoraDesign.Colors.borde, lineWidth: 1)
            }
        }
        .buttonStyle(.agoraPlain)
    }

    private func cargarCatalogo() async {
        cargandoCatalogo = true
        error = nil
        defer { cargandoCatalogo = false }
        do {
            catalogo = try await AgoraApi.catalogo()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func crearPerfil() async {
        guard let carreraSlug, aceptaTerminos else { return }
        enviando = true
        error = nil
        defer { enviando = false }
        do {
            let user = try await AuthRepository.shared.crearPerfil(
                CrearPerfilRequest(
                    handle: handle.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
                    nombre: nombre.trimmingCharacters(in: .whitespacesAndNewlines),
                    apellidos: apellidos.trimmingCharacters(in: .whitespacesAndNewlines),
                    generacion: generacion,
                    carreraSlug: carreraSlug,
                    colegioSlug: colegioSlug
                )
            )
            onCompletado(user)
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

// MARK: - Pirámide «Sube a tu campus»

/// Un escalón de la pirámide: hecho (relleno del color con palomita), ahora (punteado naranja con
/// el punto que late) o falta (punteado en `borde`).
private struct EscalonCampus: Identifiable {
    enum Estado { case hecho, ahora, falta }

    let texto: String
    let estado: Estado
    let color: Color
    var tinta: Color = .white
    var id: String { texto }
}

/// La pirámide del artboard WowB-Arranque: «Tu campus» arriba y los escalones de abajo hacia
/// arriba (correo, carrera, colegio, avisos), cada uno más angosto.
private struct PiramideCampus: View {
    let escalones: [EscalonCampus]

    /// Anchos del artboard (350, 290, 230, 170 de 390) como fracción del ancho disponible.
    private static let anchos: [CGFloat] = [0.9, 0.745, 0.59, 0.435]

    var body: some View {
        GeometryReader { geo in
            VStack(spacing: 6) {
                Text("Tu campus")
                    .font(.bricolage(13, relativeTo: .footnote))
                    .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
                    .frame(width: 96, height: 40)
                    .overlay {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(AgoraDesign.Colors.naranja, lineWidth: 2)
                    }
                ForEach(Array(escalones.enumerated().reversed()), id: \.element.id) { indice, escalon in
                    EscalonVista(escalon: escalon)
                        .frame(width: geo.size.width * Self.anchos[min(indice, Self.anchos.count - 1)])
                }
            }
            .frame(maxWidth: .infinity)
        }
        .frame(height: 40 + CGFloat(escalones.count) * 64)
        .accessibilityElement(children: .combine)
    }
}

private struct EscalonVista: View {
    let escalon: EscalonCampus
    @State private var latido = false

    var body: some View {
        HStack(spacing: 8) {
            switch escalon.estado {
            case .hecho:
                Image(systemName: "checkmark")
                    .font(.system(size: 15, weight: .heavy))
            case .ahora:
                Circle()
                    .fill(AgoraDesign.Colors.naranja)
                    .frame(width: 10, height: 10)
                    .scaleEffect(latido ? 1.25 : 0.8)
                    .opacity(latido ? 1 : 0.6)
                    .onAppear {
                        withAnimation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true)) { latido = true }
                    }
            case .falta:
                EmptyView()
            }
            Text(escalon.texto)
                .font(.outfit(.subheadline, .bold))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .padding(.horizontal, 10)
        .foregroundStyle(tinta)
        .frame(maxWidth: .infinity)
        .frame(height: 58)
        .background(fondo, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay {
            if escalon.estado != .hecho {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(escalon.estado == .ahora ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde,
                                  style: StrokeStyle(lineWidth: 2, dash: [6, 4]))
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(etiquetaVoz)
    }

    private var fondo: Color {
        switch escalon.estado {
        case .hecho: return escalon.color
        case .ahora: return AgoraDesign.Colors.superficie
        case .falta: return .clear
        }
    }

    private var tinta: Color {
        switch escalon.estado {
        case .hecho: return escalon.tinta
        case .ahora: return AgoraDesign.Colors.texto
        case .falta: return AgoraDesign.Colors.textoMedio
        }
    }

    private var etiquetaVoz: String {
        switch escalon.estado {
        case .hecho: return "\(escalon.texto), listo"
        case .ahora: return "\(escalon.texto), ahora"
        case .falta: return "\(escalon.texto), falta"
        }
    }
}
