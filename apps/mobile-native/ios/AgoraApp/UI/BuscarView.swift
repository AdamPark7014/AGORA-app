import SwiftUI

private struct TipoBusqueda: Identifiable {
    var id: String { valor }
    let valor: String
    let etiqueta: String
}

private let tiposBusqueda: [TipoBusqueda] = [
    TipoBusqueda(valor: "todo", etiqueta: "Todo"),
    TipoBusqueda(valor: "personas", etiqueta: "Personas"),
    TipoBusqueda(valor: "publicaciones", etiqueta: "Posts"),
    TipoBusqueda(valor: "eventos", etiqueta: "Eventos"),
    TipoBusqueda(valor: "marketplace", etiqueta: "Market"),
]

/// Búsqueda global — paridad con `BuscarScreen.kt`.
struct BuscarView: View {
    var onPerfil: (String) -> Void = { _ in }
    var onPublicacion: (String) -> Void = { _ in }
    var onEvento: (String) -> Void = { _ in }
    var onAnuncio: (String) -> Void = { _ in }

    @State private var q = ""
    @State private var tipo = "todo"
    @State private var personas: [BuscarPersonaDto] = []
    @State private var publicaciones: [BuscarPublicacionDto] = []
    @State private var eventos: [BuscarEventoDto] = []
    @State private var anuncios: [BuscarAnuncioDto] = []
    @State private var cargando = false
    @State private var busquedaTask: Task<Void, Never>?

    private var consultaValida: Bool { q.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 }
    private var vacio: Bool {
        consultaValida && !cargando
            && personas.isEmpty && publicaciones.isEmpty && eventos.isEmpty && anuncios.isEmpty
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                TextField("Buscar personas, posts, eventos…", text: $q)
                    .textFieldStyle(.roundedBorder)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(tiposBusqueda) { t in
                            Button {
                                tipo = t.valor
                            } label: {
                                Text(t.etiqueta)
                                    .font(.subheadline)
                                    .padding(.horizontal, AgoraDesign.Spacing.sm)
                                    .padding(.vertical, AgoraDesign.Spacing.xs)
                                    .background(tipo == t.valor ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                                    .foregroundStyle(tipo == t.valor ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                if cargando {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(.vertical, AgoraDesign.Spacing.lg)
                }

                if !consultaValida && !cargando {
                    AgoraEmptyState(
                        emoji: "🔍",
                        title: AgoraCopy.buscarHintsTitle,
                        subtitle: AgoraCopy.buscarHintsSubtitle
                    )
                    Text("Prueba con:")
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .padding(.top, AgoraDesign.Spacing.xs)
                    ForEach(AgoraCopy.buscarEjemplos, id: \.self) { ejemplo in
                        Text("«\(ejemplo)»")
                            .font(.body)
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                    }
                }

                if vacio {
                    AgoraEmptyState(
                        emoji: "🔍",
                        title: AgoraCopy.buscarEmptyTitle,
                        subtitle: "No encontramos nada con «\(q.trimmingCharacters(in: .whitespacesAndNewlines))». Prueba «\(AgoraCopy.buscarEjemplos[0])» o «\(AgoraCopy.buscarEjemplos[1])»."
                    )
                }

                if !personas.isEmpty {
                    bloqueTitulo("Personas")
                    ForEach(personas) { p in
                        filaPersona(
                            iniciales: inicialesDe(nombre: p.nombre),
                            titulo: p.nombre,
                            subtitulo: "@\(p.handle)\(p.carrera.map { " · \($0)" } ?? "")"
                        ) { onPerfil(p.handle) }
                    }
                }

                if !publicaciones.isEmpty {
                    bloqueTitulo("Publicaciones")
                    ForEach(publicaciones) { p in
                        tarjetaResultado(
                            meta: "\(p.autor?.nombre ?? "Alguien") · \(p.comunidad) · \(FormatUtils.haceCuanto(p.createdAt))",
                            texto: p.texto
                        ) { onPublicacion(p.id) }
                    }
                }

                if !eventos.isEmpty {
                    bloqueTitulo("Eventos")
                    ForEach(eventos) { ev in
                        tarjetaResultado(
                            titulo: ev.titulo,
                            meta: "\(ev.lugar ?? "") · \(FormatUtils.formatearFecha(ev.inicioAt))"
                        ) { onEvento(ev.id) }
                    }
                }

                if !anuncios.isEmpty {
                    bloqueTitulo("Marketplace")
                    ForEach(anuncios) { a in
                        tarjetaResultado(
                            titulo: a.titulo,
                            meta: "\(FormatUtils.formatearPrecio(a.precioMxn)) MXN"
                        ) { onAnuncio(a.id) }
                    }
                }
            }
            .padding(AgoraDesign.Spacing.sm)
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Buscar")
        .onChange(of: q) { _ in programarBusqueda() }
        .onChange(of: tipo) { _ in programarBusqueda() }
    }

    private func bloqueTitulo(_ texto: String) -> some View {
        Text(texto)
            .font(.subheadline.bold())
            .foregroundStyle(AgoraDesign.Colors.textoMedio)
            .padding(.top, AgoraDesign.Spacing.xs)
    }

    private func filaPersona(iniciales: String, titulo: String, subtitulo: String, onTap: @escaping () -> Void) -> some View {
        Button(action: onTap) {
            HStack(spacing: 10) {
                Text(iniciales)
                    .font(.subheadline.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
                    .frame(width: 44, height: 44)
                    .background(AgoraDesign.Colors.naranjaSuave)
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(titulo).font(.subheadline.bold()).foregroundStyle(.primary)
                    Text(subtitulo).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding(AgoraDesign.Spacing.sm)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        }
        .buttonStyle(.plain)
    }

    private func tarjetaResultado(titulo: String? = nil, meta: String, texto: String? = nil, onTap: @escaping () -> Void) -> some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                if let titulo {
                    Text(titulo).font(.subheadline.bold()).foregroundStyle(.primary)
                }
                Text(meta).font(.caption).foregroundStyle(.secondary)
                if let texto {
                    Text(texto)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .lineLimit(3)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(AgoraDesign.Spacing.sm)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        }
        .buttonStyle(.plain)
    }

    private func programarBusqueda() {
        busquedaTask?.cancel()
        busquedaTask = Task {
            let trimmed = q.trimmingCharacters(in: .whitespacesAndNewlines)
            guard trimmed.count >= 2 else {
                personas = []
                publicaciones = []
                eventos = []
                anuncios = []
                return
            }
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            cargando = true
            defer { cargando = false }
            do {
                let datos = try await AgoraApi.buscar(q: trimmed, tipo: tipo)
                personas = datos.personas ?? []
                publicaciones = datos.publicaciones ?? []
                eventos = datos.eventos ?? []
                anuncios = datos.anuncios ?? []
            } catch {
                personas = []
                publicaciones = []
                eventos = []
                anuncios = []
            }
        }
    }
}

private func inicialesDe(nombre: String) -> String {
    nombre.split(separator: " ")
        .prefix(2)
        .compactMap { $0.first.map { String($0).uppercased() } }
        .joined()
}
