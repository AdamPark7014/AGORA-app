import SwiftUI

/// Formulario de registro de perfil — paridad con `RegistroScreen.kt`.
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
            .navigationTitle("Registro")
            .task { await cargarCatalogo() }
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

    private var formulario: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.md) {
                VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
                    Text(AgoraCopy.registroTitle)
                        .font(.title.bold())
                        .foregroundStyle(AgoraDesign.Colors.texto)
                    Text(AgoraCopy.registroSubtitle)
                        .font(.subheadline)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }
                .padding(.bottom, AgoraDesign.Spacing.xxs)

                VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs + 2) {
                    Text(AgoraCopy.registroHandleLabel)
                        .font(.caption.bold())
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
                        .font(.caption)
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
                        .font(.subheadline.bold())
                    Text(AgoraCopy.registroCarreraHint)
                        .font(.caption)
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
                            .font(.caption)
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    } else if consultaCarrera.count < 2, carreraSlug == nil {
                        Text("Escribe al menos 2 letras: Sistemas, Derecho, Arquitectura…")
                            .font(.caption)
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    }
                }

                Text("Colegio (opcional)")
                    .font(.subheadline.bold())
                    .padding(.top, AgoraDesign.Spacing.xxs)
                ForEach(catalogo?.colegios ?? []) { colegio in
                    seleccionChip(
                        Text(colegio.nombre),
                        selected: colegioSlug == colegio.slug
                    ) {
                        colegioSlug = colegioSlug == colegio.slug ? nil : colegio.slug
                    }
                }

                // Agrupado por el mismo tope de 10 hijos.
                Group {
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
                            .font(.caption)
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    }

                    if let error {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(AgoraDesign.Colors.danger)
                    }
                }
            }
            .padding(AgoraDesign.Spacing.lg - 4)
        }
    }

    private func campo(
        _ label: String,
        text: Binding<String>,
        autocap: Bool = true
    ) -> some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs + 2) {
            Text(label)
                .font(.caption.bold())
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
                    .font(.title2)
                    .foregroundStyle(aceptaTerminos ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.textoMedio)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.agoraPlain)
            .accessibilityIdentifier("registro.terminos")
            .accessibilityLabel(AgoraCopy.registroTerminosVoz)
            .accessibilityValue(aceptaTerminos ? "Marcada" : "Sin marcar")
            .accessibilityAddTraits(aceptaTerminos ? .isSelected : [])

            Text(Self.textoTerminos)
                .font(.footnote)
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
                .font(.caption.bold())
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 5), spacing: 6) {
                ForEach(Self.generaciones, id: \.self) { ano in
                    let elegida = generacion == ano
                    Button {
                        generacion = ano
                    } label: {
                        Text(String(ano))
                            .font(.subheadline.weight(.semibold))
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
                    .font(.subheadline)
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
