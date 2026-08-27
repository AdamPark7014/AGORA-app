import SwiftUI

private struct FiltroSentido: Identifiable {
    var id: String { valor }
    let valor: String
    let etiqueta: String
}

private let filtrosSentido: [FiltroSentido] = [
    FiltroSentido(valor: "", etiqueta: "Todos"),
    FiltroSentido(valor: "A_CAMPUS", etiqueta: "→ Campus"),
    FiltroSentido(valor: "DESDE_CAMPUS", etiqueta: "← Desde campus"),
]

private struct NuevoAventonForm {
    var sentido = "A_CAMPUS"
    var origen = ""
    var destino = "Campus UDLAP"
    var salidaAt = mananaTempranoIso()
    var lugares = "3"
    var cuotaMxn = "25"
    var nota = ""
}

/// Aventones compartidos — paridad con `AventonesScreen.kt`.
struct AventonesView: View {
    var onPerfil: (String) -> Void = { _ in }

    @State private var aventones: [AventonDto] = []
    @State private var sentido = ""
    @State private var cargando = true
    @State private var error: String?
    @State private var mostrarModal = false
    @State private var enviando = false
    @State private var nuevo = NuevoAventonForm()

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(filtrosSentido) { filtro in
                            filtroChip(filtro.etiqueta, selected: sentido == filtro.valor) {
                                sentido = filtro.valor
                            }
                        }
                    }
                }
                Button("+ Ofrecer") { mostrarModal = true }
                    .buttonStyle(.borderedProminent)
                    .tint(AgoraDesign.Colors.naranja)
            }
            .padding(AgoraDesign.Spacing.sm)

            Group {
                if cargando && aventones.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if aventones.isEmpty {
                    if let error {
                        AgoraErrorState(message: error) {
                            Task { await cargar() }
                        }
                    } else {
                        AgoraEmptyState(
                            emoji: "🚗",
                            title: AgoraCopy.aventonesEmptyTitle,
                            subtitle: AgoraCopy.aventonesEmptySubtitle,
                            actionLabel: AgoraCopy.ctaPublicarAlgo,
                            onAction: { mostrarModal = true }
                        )
                    }
                } else {
                    List(aventones) { aventon in
                        AventonCardView(
                            aventon: aventon,
                            onApartar: { Task { await apartar(aventon) } },
                            onCancelar: { Task { await cancelar(aventon) } },
                            onPerfil: onPerfil
                        )
                        .listRowInsets(EdgeInsets(
                            top: AgoraDesign.Spacing.xxs,
                            leading: AgoraDesign.Spacing.sm,
                            bottom: AgoraDesign.Spacing.xxs,
                            trailing: AgoraDesign.Spacing.sm
                        ))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Aventones")
        .refreshable { await cargar() }
        .onChange(of: sentido) { _ in Task { await cargar() } }
        .task { await cargar() }
        .sheet(isPresented: $mostrarModal) {
            NavigationStack {
                formularioNuevoAventon
            }
            .presentationDetents([.medium, .large])
        }
    }

    private var formularioNuevoAventon: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                Text("Nuevo aventón")
                    .font(.title2.bold())

                TextField("Origen", text: $nuevo.origen)
                    .textFieldStyle(.roundedBorder)
                TextField("Destino", text: $nuevo.destino)
                    .textFieldStyle(.roundedBorder)
                TextField("Lugares", text: Binding(
                    get: { nuevo.lugares },
                    set: { nuevo.lugares = $0.filter(\.isNumber) }
                ))
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.numberPad)
                TextField("Cuota MXN", text: Binding(
                    get: { nuevo.cuotaMxn },
                    set: { nuevo.cuotaMxn = $0.filter(\.isNumber) }
                ))
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.numberPad)
                TextField("Nota (opcional)", text: $nuevo.nota)
                    .textFieldStyle(.roundedBorder)

                if let error {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(AgoraDesign.Colors.danger)
                }

                Button {
                    Task { await crear() }
                } label: {
                    HStack {
                        Spacer()
                        if enviando { ProgressView().tint(.white) }
                        else { Text("Publicar").fontWeight(.semibold) }
                        Spacer()
                    }
                    .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(AgoraDesign.Colors.naranja)
                .disabled(
                    enviando
                        || nuevo.origen.trimmingCharacters(in: .whitespacesAndNewlines).count < 2
                        || nuevo.destino.trimmingCharacters(in: .whitespacesAndNewlines).count < 2
                )

                Button("Cancelar") { mostrarModal = false }
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)
            }
            .padding(AgoraDesign.Spacing.md)
        }
        .navigationTitle("Ofrecer ride")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func filtroChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .padding(.horizontal, AgoraDesign.Spacing.sm)
                .padding(.vertical, AgoraDesign.Spacing.xs)
                .background(selected ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                .foregroundStyle(selected ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
                .clipShape(Capsule())
                .overlay {
                    Capsule()
                        .stroke(selected ? AgoraDesign.Colors.naranja.opacity(0.3) : AgoraDesign.Colors.borde, lineWidth: 1)
                }
        }
        .buttonStyle(.plain)
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.aventones(sentido: sentido.isEmpty ? nil : sentido)
            aventones = resp.aventones ?? []
        } catch {
            self.error = FormatUtils.mensajeDe(error)
            aventones = []
        }
    }

    private func crear() async {
        guard let lugares = Int(nuevo.lugares), let cuota = Int(nuevo.cuotaMxn) else { return }
        enviando = true
        error = nil
        defer { enviando = false }
        do {
            let resp = try await AgoraApi.crearAventon(
                CrearAventonRequest(
                    sentido: nuevo.sentido,
                    origen: nuevo.origen.trimmingCharacters(in: .whitespacesAndNewlines),
                    destino: nuevo.destino.trimmingCharacters(in: .whitespacesAndNewlines),
                    salidaAt: nuevo.salidaAt,
                    lugares: lugares,
                    cuotaMxn: cuota,
                    nota: nuevo.nota.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : nuevo.nota.trimmingCharacters(in: .whitespacesAndNewlines)
                )
            )
            GamificacionEvents.notifyPingResult(nuevas: resp.nuevasInsignias ?? [])
            mostrarModal = false
            nuevo = NuevoAventonForm()
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func apartar(_ aventon: AventonDto) async {
        do {
            _ = try await AgoraApi.apartarAsiento(aventonId: aventon.id)
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func cancelar(_ aventon: AventonDto) async {
        do {
            try await AgoraApi.cancelarAventon(id: aventon.id)
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

private struct AventonCardView: View {
    let aventon: AventonDto
    let onApartar: () -> Void
    let onCancelar: () -> Void
    let onPerfil: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(aventon.origen) → \(aventon.destino)")
                .font(.headline)
            Text("\(FormatUtils.formatearFecha(aventon.salidaAt)) · $\(aventon.cuotaMxn) · \(aventon.ocupados)/\(aventon.lugares) lugares")
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
            if let nota = aventon.nota, !nota.isEmpty {
                Text(nota)
                    .font(.subheadline)
            }
            if let conductor = aventon.conductor {
                Button(conductor.nombre ?? conductor.handle ?? "Conductor") {
                    if let handle = conductor.handle { onPerfil(handle) }
                }
                .font(.subheadline)
                .foregroundStyle(AgoraDesign.Colors.naranja)
            }
            if aventon.esMio == true {
                Button("Cancelar aventón", role: .destructive, action: onCancelar)
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)
            } else if aventon.ocupados < aventon.lugares {
                if aventon.voyYo == true {
                    Button("✓ Voy en este (tocar para quitar)", action: onApartar)
                        .frame(maxWidth: .infinity)
                        .buttonStyle(.bordered)
                } else {
                    Button("Apartar lugar", action: onApartar)
                        .frame(maxWidth: .infinity)
                        .buttonStyle(.borderedProminent)
                        .tint(AgoraDesign.Colors.naranja)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
        }
    }
}

private func mananaTempranoIso() -> String {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "America/Mexico_City") ?? .current
    guard let manana = cal.date(byAdding: .day, value: 1, to: Date()) else { return "" }
    var components = cal.dateComponents([.year, .month, .day], from: manana)
    components.hour = 7
    components.minute = 30
    components.second = 0
    components.timeZone = TimeZone(identifier: "America/Mexico_City")
    guard let date = cal.date(from: components) else { return "" }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    formatter.timeZone = TimeZone(identifier: "America/Mexico_City")
    return formatter.string(from: date)
}
