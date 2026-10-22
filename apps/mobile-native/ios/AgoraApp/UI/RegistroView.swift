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
                ForEach(carreras) { carrera in
                    seleccionChip(
                        carrera.nombre,
                        selected: carreraSlug == carrera.slug
                    ) {
                        carreraSlug = carrera.slug
                    }
                }

                Text("Colegio (opcional)")
                    .font(.subheadline.bold())
                    .padding(.top, AgoraDesign.Spacing.xxs)
                ForEach(catalogo?.colegios ?? []) { colegio in
                    seleccionChip(
                        colegio.nombre,
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

    /// Año de ingreso. `String(ano)` evita que salga «2,026» con separador de miles.
    private var selectorGeneracion: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs + 2) {
            Text("Generación (año en que entraste)")
                .font(.caption.bold())
            HStack {
                Text("Generación")
                    .font(.subheadline)
                    .foregroundStyle(AgoraDesign.Colors.texto)
                Spacer()
                Picker("Generación", selection: $generacion) {
                    ForEach(Self.generaciones, id: \.self) { ano in
                        Text(String(ano)).tag(ano)
                    }
                }
                .pickerStyle(.menu)
                .tint(AgoraDesign.Colors.naranja)
                .labelsHidden()
            }
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, AgoraDesign.Spacing.xxs)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                    .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
            }
        }
    }

    private func seleccionChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(label)
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
