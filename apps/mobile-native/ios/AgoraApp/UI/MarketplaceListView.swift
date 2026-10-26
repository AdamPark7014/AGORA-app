import SwiftUI

private struct CategoriaAnuncio: Identifiable {
    var id: String { valor }
    let valor: String
    let etiqueta: String
    /// Sin foto, el ícono de la categoría y no un gris vacío (docs/diseno-d.md §4).
    let icono: String
}

private let categoriasAnuncio: [CategoriaAnuncio] = [
    CategoriaAnuncio(valor: "", etiqueta: "Todo", icono: "shippingbox"),
    CategoriaAnuncio(valor: "LIBROS", etiqueta: "Libros", icono: "book"),
    CategoriaAnuncio(valor: "ELECTRONICA", etiqueta: "Electrónica", icono: "laptopcomputer"),
    CategoriaAnuncio(valor: "MUEBLES", etiqueta: "Muebles", icono: "sofa"),
    CategoriaAnuncio(valor: "ROPA", etiqueta: "Ropa", icono: "tshirt"),
    CategoriaAnuncio(valor: "CUARTO", etiqueta: "Cuarto", icono: "bed.double"),
    CategoriaAnuncio(valor: "SERVICIOS", etiqueta: "Servicios", icono: "wrench.and.screwdriver"),
    CategoriaAnuncio(valor: "OTRO", etiqueta: "Otro", icono: "shippingbox"),
]

/// Mercado del diseño D: buscador, chips de categoría y cuadrícula de 2 columnas con foto,
/// precio sobre la foto y «Apartado» como etiqueta — paridad con `MarketplaceListScreen.kt`.
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

    private let columnas = [
        GridItem(.flexible(), spacing: 10, alignment: .top),
        GridItem(.flexible(), spacing: 10, alignment: .top),
    ]

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: AgoraDesign.Spacing.xs) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .accessibilityHidden(true)
                    TextField("Libro de cálculo, monitor, bici…", text: $busqueda)
                        .submitLabel(.search)
                }
                .padding(.horizontal, 12)
                .frame(minHeight: 44)
                .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }

                Button(action: onCrear) {
                    Label("Vender", systemImage: "plus")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 44)
                        .background(AgoraDesign.Colors.naranja, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
                }
                .buttonStyle(.agoraPlain)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, AgoraDesign.Spacing.xs)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categoriasAnuncio) { cat in
                        filtroChip(cat.etiqueta, selected: categoria == cat.valor) {
                            categoria = cat.valor
                        }
                    }
                }
                .padding(.horizontal, 14)
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
                    ScrollView {
                        LazyVGrid(columns: columnas, spacing: 14) {
                            ForEach(anuncios) { anuncio in
                                AnuncioCardView(anuncio: anuncio) {
                                    onAnuncio(anuncio.id)
                                }
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.top, 4)

                        if cursor != nil {
                            Button("Cargar más") {
                                Task { await cargar(desde: cursor) }
                            }
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .padding(.vertical, 8)
                        }
                    }
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Mercado")
        .refreshable { await cargar(desde: nil) }
        .onChange(of: categoria) { _ in programarBusqueda() }
        .onChange(of: busqueda) { _ in programarBusqueda() }
        .task { await cargar(desde: nil) }
    }

    private func filtroChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .padding(.horizontal, 14)
                .frame(minHeight: 36)
                .background(selected ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                .foregroundStyle(selected ? AgoraDesign.Colors.naranjaTinta : AgoraDesign.Colors.texto)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous)
                        .stroke(selected ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde, lineWidth: 1)
                }
        }
        .buttonStyle(.agoraPlain)
        .accessibilityAddTraits(selected ? .isSelected : [])
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

    private var iconoCategoria: String {
        categoriasAnuncio.first { $0.valor == anuncio.categoria }?.icono ?? "shippingbox"
    }

    private var precio: String {
        anuncio.precioMxn == 0 ? "Gratis" : "$\(FormatUtils.formatearPrecio(anuncio.precioMxn))"
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                ZStack(alignment: .bottomLeading) {
                    foto
                        .frame(maxWidth: .infinity)
                        .aspectRatio(1, contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                    Text(precio)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.78), in: Capsule())
                        .padding(8)
                }
                .overlay(alignment: .topLeading) {
                    if let etiqueta = etiquetaEstado {
                        Text(etiqueta.uppercased())
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Color.black)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.white, in: Capsule())
                            .padding(8)
                    }
                }

                Text(anuncio.titulo)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text(anuncio.vendedor?.nombre?.split(separator: " ").first.map(String.init) ?? "Alguien")
                    .font(.caption)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .lineLimit(1)
            }
        }
        .buttonStyle(.agoraPlain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(anuncio.titulo), \(precio)\(etiquetaEstado.map { ", \($0)" } ?? "")")
    }

    private var etiquetaEstado: String? {
        switch anuncio.estadoVenta {
        case "APARTADO": return "Apartado"
        case "VENDIDO": return "Vendido"
        default: return nil
        }
    }

    @ViewBuilder
    private var foto: some View {
        if let url = ApiClient.shared.resolveUrl(anuncio.imagenes?.first) {
            Color.clear.overlay {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        AgoraDesign.Colors.skeletonBase
                    }
                }
            }
        } else {
            ZStack {
                AgoraDesign.Colors.superficie2
                Image(systemName: iconoCategoria)
                    .font(.system(size: 34, weight: .light))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
        }
    }
}
