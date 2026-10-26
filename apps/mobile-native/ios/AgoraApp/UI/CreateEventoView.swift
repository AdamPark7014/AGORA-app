import SwiftUI

private let tiposEventoCrear: [(String, String)] = [
    ("FIESTA", "Fiesta"),
    ("ACADEMICO", "Académico"),
    ("DEPORTIVO", "Deportivo"),
    ("CULTURAL", "Cultural"),
    ("ORGANIZACION", "Organización"),
    ("OTRO", "Otro"),
]

/// Crear evento — paridad con `CreateEventoScreen.kt`.
struct CreateEventoView: View {
    var onCreado: (String) -> Void = { _ in }
    var onCancelar: () -> Void = {}

    @State private var titulo = ""
    @State private var descripcion = ""
    @State private var tipo = "FIESTA"
    @State private var lugar = ""
    @State private var inicioAt: Date = mananaNoche()
    /// El fin es opcional en la API (`crearEventoSchema.finAt`).
    @State private var conFin = false
    @State private var finAt: Date = mananaNoche().addingTimeInterval(3 * 60 * 60)
    @State private var costo = ""
    @State private var cupo = ""
    @State private var comunidadSlug: String?
    @State private var comunidades: [ComunidadDto] = []
    @State private var enviando = false
    @State private var error: String?

    private var puedePublicar: Bool {
        titulo.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3
            && !descripcion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && lugar.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
            && (!conFin || finAt > inicioAt)
            && !enviando
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                Group {
                    Text("Nuevo evento")
                        .font(.outfit(.title3, .bold))

                    campo("Título", text: $titulo)
                    campo("Lugar", text: $lugar)

                    Text("Descripción")
                        .font(.outfit(.subheadline, .bold))
                    TextEditor(text: $descripcion)
                        .frame(minHeight: 100)
                        .padding(8)
                        .background(AgoraDesign.Colors.superficie)
                        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
                        .overlay {
                            RoundedRectangle(cornerRadius: AgoraDesign.Radii.small)
                                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                        }
                }

                Text("Tipo")
                    .font(.outfit(.subheadline, .bold))
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(tiposEventoCrear, id: \.0) { valor, etiqueta in
                            Button {
                                tipo = valor
                            } label: {
                                Text(etiqueta)
                                    .font(.outfit(.subheadline))
                                    .padding(.horizontal, AgoraDesign.Spacing.sm)
                                    .padding(.vertical, AgoraDesign.Spacing.xs)
                                    .background(tipo == valor ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                                    .foregroundStyle(tipo == valor ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.agoraPlain)
                        }
                    }
                }

                seccionFechas
                campo("Costo MXN (opcional, 0 = gratis)", text: $costo, digitsOnly: true)
                campo("Cupo (opcional)", text: $cupo, digitsOnly: true)

                if !comunidades.isEmpty {
                    Text("Comunidad (opcional)")
                        .font(.outfit(.subheadline, .bold))
                    Picker("Comunidad", selection: Binding(
                        get: { comunidadSlug ?? "" },
                        set: { comunidadSlug = $0.isEmpty ? nil : $0 }
                    )) {
                        Text("Toda la universidad").tag("")
                        ForEach(comunidades, id: \.slug) { c in
                            Text(c.nombre).tag(c.slug)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Button {
                    Task { await publicar() }
                } label: {
                    HStack {
                        Spacer()
                        if enviando { ProgressView().tint(.white) }
                        else { Text("Publicar evento").fontWeight(.semibold) }
                        Spacer()
                    }
                    .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(AgoraTheme.accent)
                .disabled(!puedePublicar)

                Button("Cancelar", action: onCancelar)
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)

                if let error {
                    Text(error)
                        .font(.outfit(.footnote))
                        .foregroundStyle(.red)
                }
            }
            .padding(AgoraDesign.Spacing.sm)
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Crear evento")
        .navigationBarTitleDisplayMode(.inline)
        .task { await cargarComunidades() }
    }

    /// Inicio y fin con selector; se mandan en ISO 8601 con zona.
    private var seccionFechas: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            DatePicker(
                "Empieza",
                selection: $inicioAt,
                in: Date()...,
                displayedComponents: [.date, .hourAndMinute]
            )

            Toggle("Poner hora de fin", isOn: $conFin)

            if conFin {
                DatePicker(
                    "Termina",
                    selection: $finAt,
                    in: inicioAt.addingTimeInterval(60)...,
                    displayedComponents: [.date, .hourAndMinute]
                )
            }
        }
        .font(.outfit(.subheadline))
        .tint(AgoraDesign.Colors.naranja)
        .onChange(of: inicioAt) { nuevo in
            // El evento no puede terminar antes de empezar (la API lo rechaza).
            if finAt <= nuevo {
                finAt = nuevo.addingTimeInterval(3 * 60 * 60)
            }
        }
    }

    private func campo(_ label: String, text: Binding<String>, digitsOnly: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.outfit(.caption))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
            TextField(label, text: text)
                .textFieldStyle(.roundedBorder)
                .onChange(of: text.wrappedValue) { newValue in
                    if digitsOnly && !newValue.allSatisfy(\.isNumber) {
                        text.wrappedValue = String(newValue.filter(\.isNumber))
                    }
                }
        }
    }

    private func cargarComunidades() async {
        do {
            comunidades = try await AgoraApi.misComunidades()
        } catch {
            comunidades = []
        }
    }

    private func publicar() async {
        enviando = true
        error = nil
        defer { enviando = false }
        do {
            let resp = try await AgoraApi.crearEvento(
                CrearEventoRequest(
                    titulo: titulo.trimmingCharacters(in: .whitespacesAndNewlines),
                    descripcion: descripcion.trimmingCharacters(in: .whitespacesAndNewlines),
                    tipo: tipo,
                    lugar: lugar.trimmingCharacters(in: .whitespacesAndNewlines),
                    inicioAt: FormatUtils.isoConZona(inicioAt),
                    finAt: conFin ? FormatUtils.isoConZona(finAt) : nil,
                    costoMxn: Int(costo),
                    cupo: Int(cupo),
                    comunidadSlug: comunidadSlug
                )
            )
            onCreado(resp.id)
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

/// Inicio sugerido: mañana a las 19:00 (hora del centro de México).
private func mananaNoche() -> Date {
    let respaldo = Date().addingTimeInterval(24 * 60 * 60)
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "America/Mexico_City") ?? .current
    guard let manana = cal.date(byAdding: .day, value: 1, to: Date()) else { return respaldo }
    var components = cal.dateComponents([.year, .month, .day], from: manana)
    components.hour = 19
    components.minute = 0
    components.second = 0
    return cal.date(from: components) ?? respaldo
}
