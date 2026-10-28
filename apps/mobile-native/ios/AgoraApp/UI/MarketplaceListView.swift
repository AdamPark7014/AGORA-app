import SwiftUI

private struct CategoriaAnuncio: Identifiable {
    var id: String { valor }
    let valor: String
    let etiqueta: String
    /// Sin foto, el ícono de la categoría y no un gris vacío (docs/diseno-d.md §4).
    let icono: String
    /// Color del sello de la categoría (B «Cholula»).
    var color: Color = AgoraDesign.Colors.superficie2
    var tinta: Color = .white
}

private let categoriasAnuncio: [CategoriaAnuncio] = [
    CategoriaAnuncio(valor: "", etiqueta: "Todo", icono: "shippingbox", color: AgoraDesign.Colors.texto, tinta: AgoraDesign.Colors.fondo),
    CategoriaAnuncio(valor: "LIBROS", etiqueta: "Libros", icono: "book", color: AgoraDesign.Colors.talavera),
    CategoriaAnuncio(valor: "ELECTRONICA", etiqueta: "Electrónica", icono: "laptopcomputer", color: AgoraDesign.Colors.jade),
    CategoriaAnuncio(valor: "MUEBLES", etiqueta: "Muebles", icono: "sofa", color: AgoraDesign.Colors.maiz, tinta: AgoraDesign.Colors.sobreMaiz),
    CategoriaAnuncio(valor: "ROPA", etiqueta: "Ropa", icono: "tshirt", color: AgoraDesign.Colors.adobe),
    CategoriaAnuncio(valor: "CUARTO", etiqueta: "Cuarto", icono: "bed.double", color: AgoraDesign.Colors.talavera),
    CategoriaAnuncio(valor: "SERVICIOS", etiqueta: "Servicios", icono: "wrench.and.screwdriver", color: AgoraDesign.Colors.jade),
    CategoriaAnuncio(valor: "OTRO", etiqueta: "Otro", icono: "shippingbox", color: AgoraDesign.Colors.adobe),
]

/// Mercado de B «Cholula» (artboard WowB-Mercado): «El tianguis del campus» con la franja de Talavera,
/// sellos de categoría y la etiqueta de precio adobe girada sobre cada foto — paridad con
/// `MarketplaceListScreen.kt`.
struct MarketplaceListView: View {
    var onAnuncio: (String) -> Void = { _ in }
    var onCrear: () -> Void = {}
    /// En la pestaña Mercado no hay barra; desde Campus se conserva para poder volver.
    var esRaiz = true

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
            CabezaCholula(titulo: "Mercado", subtitulo: "El tianguis del campus") {
                BotonCabeza(titulo: "Vender", accion: onCrear)
                    .accessibilityLabel("Vender algo")
            }

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
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categoriasAnuncio) { cat in
                        selloCategoria(cat, elegido: categoria == cat.valor) {
                            categoria = cat.valor
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
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
                        .padding(.horizontal, 16)
                        .padding(.top, 2)

                        if cursor != nil {
                            Button("Cargar más") {
                                Task { await cargar(desde: cursor) }
                            }
                            .font(.outfit(.subheadline, .semibold))
                            .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .padding(.vertical, 8)
                        }
                    }
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .barraDeEstadoOpaca(AgoraDesign.Colors.fondo)
        .toolbar(esRaiz ? .hidden : .visible, for: .navigationBar)
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await cargar(desde: nil) }
        .onChange(of: categoria) { _ in programarBusqueda() }
        .onChange(of: busqueda) { _ in programarBusqueda() }
        .task { await cargar(desde: nil) }
    }

    /// Sello de categoría: relleno de su color si está elegida; si no, en `superficie` con el cuadrito.
    private func selloCategoria(_ cat: CategoriaAnuncio, elegido: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if !elegido {
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(cat.color)
                        .frame(width: 8, height: 8)
                        .accessibilityHidden(true)
                }
                Text(cat.etiqueta.uppercased())
                    .font(.outfit(.caption, .bold))
                    .tracking(0.5)
            }
            .foregroundStyle(elegido ? cat.tinta : AgoraDesign.Colors.texto)
            .padding(.horizontal, 12)
            .frame(minHeight: 32)
            .background(elegido ? cat.color : AgoraDesign.Colors.superficie,
                        in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(elegido ? Color.clear : AgoraDesign.Colors.borde, lineWidth: 1)
            }
        }
        .buttonStyle(.agoraPlain)
        .accessibilityLabel(cat.etiqueta)
        .accessibilityAddTraits(elegido ? .isSelected : [])
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
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .overlay(alignment: .bottomTrailing) {
                    EtiquetaPrecio(texto: precio)
                        .padding(.trailing, 8)
                        .padding(.bottom, 10)
                }
                .overlay(alignment: .topLeading) {
                    if let etiqueta = etiquetaEstado {
                        Sello(texto: etiqueta.uppercased(),
                              fondo: anuncio.estadoVenta == "VENDIDO" ? AgoraDesign.Colors.texto : AgoraDesign.Colors.maiz,
                              tinta: anuncio.estadoVenta == "VENDIDO" ? AgoraDesign.Colors.fondo : AgoraDesign.Colors.sobreMaiz,
                              alto: 24)
                            .padding(8)
                    }
                }

                Text(anuncio.titulo)
                    .font(.outfit(.subheadline, .semibold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text(anuncio.vendedor?.nombre?.split(separator: " ").first.map(String.init) ?? "Alguien")
                    .font(.outfit(.caption))
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
