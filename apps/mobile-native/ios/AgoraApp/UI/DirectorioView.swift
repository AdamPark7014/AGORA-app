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
    /// Filtros del catálogo (`GET catalogo`): slugs; vacío = todos.
    @State private var catalogo: CatalogoDto?
    @State private var escuela = ""
    @State private var carrera = ""
    @State private var colegio = ""

    private var escuelas: [EscuelaDto] { catalogo?.escuelas ?? [] }
    private var colegios: [ColegioDto] { catalogo?.colegios ?? [] }

    /// Con escuela elegida, solo sus carreras; si no, todas.
    private var carrerasDisponibles: [CarreraDto] {
        if !escuela.isEmpty, let elegida = escuelas.first(where: { $0.slug == escuela }) {
            return elegida.carreras ?? []
        }
        return escuelas
            .flatMap { $0.carreras ?? [] }
            .sorted { $0.nombre.localizedCaseInsensitiveCompare($1.nombre) == .orderedAscending }
    }

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

            if catalogo != nil {
                filtrosCatalogo
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
        .onChange(of: escuela) { _ in programarBusqueda() }
        .onChange(of: carrera) { _ in programarBusqueda() }
        .onChange(of: colegio) { _ in programarBusqueda() }
        .task { await buscar(desde: nil) }
        .task { await cargarCatalogo() }
    }

    private var filtrosCatalogo: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filtroMenu(
                    escuelas.first(where: { $0.slug == escuela })?.nombre ?? "Escuela",
                    activo: !escuela.isEmpty
                ) {
                    Button("Todas las escuelas") {
                        escuela = ""
                        carrera = ""
                    }
                    ForEach(escuelas) { e in
                        Button(e.nombre) {
                            escuela = e.slug
                            carrera = ""
                        }
                    }
                }

                filtroMenu(
                    carrerasDisponibles.first(where: { $0.slug == carrera })?.nombre ?? "Carrera",
                    activo: !carrera.isEmpty
                ) {
                    Button("Todas las carreras") { carrera = "" }
                    ForEach(carrerasDisponibles) { c in
                        Button(c.nombre) { carrera = c.slug }
                    }
                }

                filtroMenu(
                    colegios.first(where: { $0.slug == colegio })?.nombre ?? "Colegio",
                    activo: !colegio.isEmpty
                ) {
                    Button("Todos los colegios") { colegio = "" }
                    ForEach(colegios) { c in
                        Button(c.nombre) { colegio = c.slug }
                    }
                }

                if !escuela.isEmpty || !carrera.isEmpty || !colegio.isEmpty {
                    Button("Limpiar") {
                        escuela = ""
                        carrera = ""
                        colegio = ""
                    }
                    .font(.subheadline)
                    .foregroundStyle(AgoraDesign.Colors.naranja)
                }
            }
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.bottom, AgoraDesign.Spacing.xs)
        }
    }

    private func filtroMenu<Opciones: View>(
        _ titulo: String,
        activo: Bool,
        @ViewBuilder opciones: () -> Opciones
    ) -> some View {
        let contenido = opciones()
        return Menu {
            contenido
        } label: {
            HStack(spacing: 4) {
                Text(titulo)
                    .lineLimit(1)
                Image(systemName: "chevron.down")
                    .font(.caption2)
            }
            .font(.subheadline)
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, AgoraDesign.Spacing.xs)
            .background(activo ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
            .foregroundStyle(activo ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
            .clipShape(Capsule())
            .overlay {
                Capsule()
                    .stroke(activo ? AgoraDesign.Colors.naranja.opacity(0.3) : AgoraDesign.Colors.borde, lineWidth: 1)
            }
        }
    }

    private func cargarCatalogo() async {
        guard catalogo == nil else { return }
        catalogo = try? await AgoraApi.catalogo()
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
        .buttonStyle(.agoraPlain)
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
                cursor: desde,
                escuela: escuela.isEmpty ? nil : escuela,
                carrera: carrera.isEmpty ? nil : carrera,
                colegio: colegio.isEmpty ? nil : colegio
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
