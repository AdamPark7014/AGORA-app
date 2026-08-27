import SwiftUI

private struct CategoriaAnuncio: Identifiable {
    var id: String { valor }
    let valor: String
    let etiqueta: String
}

private let categoriasAnuncio: [CategoriaAnuncio] = [
    CategoriaAnuncio(valor: "", etiqueta: "Todas"),
    CategoriaAnuncio(valor: "LIBROS", etiqueta: "Libros"),
    CategoriaAnuncio(valor: "ELECTRONICA", etiqueta: "Electrónica"),
    CategoriaAnuncio(valor: "ROPA", etiqueta: "Ropa"),
    CategoriaAnuncio(valor: "OTRO", etiqueta: "Otro"),
]

/// Lista de anuncios — paridad con `MarketplaceListScreen.kt`.
struct MarketplaceListView: View {
    var onAnuncio: (String) -> Void = { _ in }
    var onCrear: () -> Void = {}

    @State private var anuncios: [AnuncioDto] = []
    @State private var cursor: String?
    @State private var categoria = ""
    @State private var busqueda = ""
    @State private var cargando = true
    @State private var error: String?
    @State private var busquedaTask: Task<Void, Never>?

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: AgoraDesign.Spacing.xs) {
                TextField("Buscar anuncios…", text: $busqueda)
                    .textFieldStyle(.roundedBorder)
                Button("+ Vender", action: onCrear)
                    .buttonStyle(.borderedProminent)
                    .tint(AgoraDesign.Colors.naranja)
            }
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, AgoraDesign.Spacing.xs)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categoriasAnuncio) { cat in
                        filtroChip(cat.etiqueta, selected: categoria == cat.valor) {
                            categoria = cat.valor
                        }
                    }
                }
                .padding(.horizontal, AgoraDesign.Spacing.sm)
                .padding(.bottom, AgoraDesign.Spacing.xs)
            }

            Group {
                if cargando && anuncios.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error, anuncios.isEmpty {
                    AgoraErrorState(message: error) {
                        Task { await cargar(desde: nil) }
                    }
                } else if anuncios.isEmpty {
                    AgoraEmptyState(
                        emoji: "🛍",
                        title: AgoraCopy.marketplaceEmptyTitle,
                        subtitle: AgoraCopy.marketplaceEmptySubtitle,
                        actionLabel: AgoraCopy.ctaPublicarAlgo,
                        onAction: onCrear
                    )
                } else {
                    List {
                        ForEach(anuncios) { anuncio in
                            AnuncioCardView(anuncio: anuncio) {
                                onAnuncio(anuncio.id)
                            }
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                        }
                        if cursor != nil {
                            Button("Cargar más") {
                                Task { await cargar(desde: cursor) }
                            }
                            .frame(maxWidth: .infinity)
                            .listRowBackground(Color.clear)
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Marketplace")
        .refreshable { await cargar(desde: nil) }
        .onChange(of: categoria) { _ in programarBusqueda() }
        .onChange(of: busqueda) { _ in programarBusqueda() }
        .task { await cargar(desde: nil) }
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
            try? await Task.sleep(nanoseconds: 250_000_000)
            guard !Task.isCancelled else { return }
            await cargar(desde: nil)
        }
    }

    private func cargar(desde: String?) async {
        if desde == nil {
            cargando = true
        }
        error = nil
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.anuncios(
                categoria: categoria.isEmpty ? nil : categoria,
                q: busqueda.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : busqueda,
                cursor: desde
            )
            let nuevos = resp.anuncios ?? []
            anuncios = desde != nil ? anuncios + nuevos : nuevos
            cursor = resp.siguienteCursor
        } catch {
            self.error = FormatUtils.mensajeDe(error)
            if desde == nil { anuncios = [] }
        }
    }
}

private struct AnuncioCardView: View {
    let anuncio: AnuncioDto
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: AgoraDesign.Spacing.sm) {
                if let url = ApiClient.shared.resolveUrl(anuncio.imagenes?.first) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                        default:
                            AgoraDesign.Colors.skeletonBase
                        }
                    }
                    .frame(width: 72, height: 72)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("$\(FormatUtils.formatearPrecio(anuncio.precioMxn))")
                        .font(.headline)
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                    Text(anuncio.titulo)
                        .font(.subheadline.bold())
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                    Text("\(anuncio.vendedor?.nombre ?? "Alguien") · \(FormatUtils.haceCuanto(anuncio.createdAt))")
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    if anuncio.estadoVenta != "DISPONIBLE" {
                        Text("Vendido")
                            .font(.caption.bold())
                            .foregroundStyle(AgoraDesign.Colors.danger)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(AgoraDesign.Spacing.sm)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                    .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }
}
