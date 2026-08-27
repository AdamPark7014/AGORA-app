import SwiftUI

/// Directorio de personas — paridad con `DirectorioScreen.kt`.
struct DirectorioView: View {
    var onPerfil: (String) -> Void = { _ in }

    @State private var q = ""
    @State private var generacion: Int?
    @State private var resultados: [DirectorioPersonaDto] = []
    @State private var cursor: String?
    @State private var cargando = true
    @State private var cargandoMas = false
    @State private var busquedaTask: Task<Void, Never>?

    private var generaciones: [Int] {
        let ano = Calendar.current.component(.year, from: Date())
        return (0..<8).map { ano + 1 - $0 }
    }

    var body: some View {
        VStack(spacing: 0) {
            TextField("Nombre o @handle", text: $q)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal, AgoraDesign.Spacing.sm)
                .padding(.vertical, AgoraDesign.Spacing.sm)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    filtroChip("Todas", selected: generacion == nil) { generacion = nil }
                    ForEach(generaciones, id: \.self) { gen in
                        filtroChip("Gen \(gen)", selected: generacion == gen) { generacion = gen }
                    }
                }
                .padding(.horizontal, AgoraDesign.Spacing.sm)
                .padding(.bottom, AgoraDesign.Spacing.xs)
            }

            Group {
                if cargando && resultados.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if resultados.isEmpty {
                    AgoraEmptyState(
                        emoji: "📇",
                        title: AgoraCopy.directorioEmptyTitle,
                        subtitle: AgoraCopy.directorioEmptySubtitle
                    )
                } else {
                    List {
                        ForEach(resultados) { persona in
                            Button {
                                onPerfil(persona.handle)
                            } label: {
                                HStack(spacing: 10) {
                                    Circle()
                                        .fill(AgoraDesign.Colors.naranjaSuave)
                                        .frame(width: 44, height: 44)
                                        .overlay {
                                            Text(inicialesDe(persona))
                                                .font(.subheadline.bold())
                                                .foregroundStyle(AgoraDesign.Colors.naranja)
                                        }
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("\(persona.nombre) \(persona.apellidos)")
                                            .font(.subheadline.bold())
                                            .foregroundStyle(.primary)
                                        Text(subtitulo(persona))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                            .onAppear {
                                if persona.id == resultados.last?.id {
                                    Task { await cargarMas() }
                                }
                            }
                        }
                        if cargandoMas {
                            HStack {
                                Spacer()
                                ProgressView()
                                Spacer()
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Directorio")
        .onChange(of: q) { _ in programarBusqueda() }
        .onChange(of: generacion) { _ in programarBusqueda() }
        .task { await buscar(desde: nil) }
    }

    private func subtitulo(_ persona: DirectorioPersonaDto) -> String {
        var partes = ["@\(persona.handle)"]
        if let carrera = persona.carrera { partes.append(carrera) }
        if let gen = persona.generacion { partes.append("Gen \(gen)") }
        return partes.joined(separator: " · ")
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

    private func programarBusqueda() {
        busquedaTask?.cancel()
        busquedaTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            await buscar(desde: nil)
        }
    }

    private func buscar(desde: String?) async {
        if desde == nil {
            cargando = true
        } else {
            guard !cargandoMas else { return }
            cargandoMas = true
        }
        defer {
            cargando = false
            cargandoMas = false
        }
        do {
            let resp = try await AgoraApi.directorio(
                q: q.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : q,
                generacion: generacion,
                cursor: desde
            )
            let nuevos = resp.resultados ?? []
            resultados = desde != nil ? resultados + nuevos : nuevos
            cursor = resp.siguienteCursor
        } catch {
            if desde == nil { resultados = [] }
        }
    }

    private func cargarMas() async {
        guard let cursor, !cargando, !cargandoMas else { return }
        await buscar(desde: cursor)
    }
}

private func inicialesDe(_ persona: DirectorioPersonaDto) -> String {
    "\(persona.nombre) \(persona.apellidos)"
        .split(separator: " ")
        .prefix(2)
        .compactMap { $0.first.map { String($0).uppercased() } }
        .joined()
}
