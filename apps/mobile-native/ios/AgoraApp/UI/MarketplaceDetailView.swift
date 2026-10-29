import SwiftUI

/// Detalle de anuncio de B «Cholula» — paridad con `MarketplaceDetailScreen.kt`.
struct MarketplaceDetailView: View {
    let anuncioId: String
    var onPerfil: (String) -> Void = { _ in }
    var onMensaje: (String) -> Void = { _ in }

    @State private var anuncio: AnuncioDetalleDto?
    @State private var cargando = true
    @State private var error: String?
    @State private var accionando = false

    var body: some View {
        Group {
            if cargando && anuncio == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error, anuncio == nil {
                AgoraErrorState(message: error) {
                    Task { await cargar() }
                }
            } else if let item = anuncio {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // B «Cholula» (artboard WowB-Mercado, derecha): la foto de orilla a orilla con la
                        // etiqueta de precio adobe girada montada en su borde.
                        ZStack(alignment: .bottomLeading) {
                            if let imagenes = item.imagenes, !imagenes.isEmpty {
                                // Todas las fotos; tocar una abre el visor con zoom.
                                PostMediaCarousel(media: imagenes, altura: 320, radio: 0)
                            } else {
                                ZStack {
                                    AgoraDesign.Colors.superficie2
                                    Image(systemName: "shippingbox")
                                        .font(.system(size: 40, weight: .light))
                                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                                        .accessibilityHidden(true)
                                }
                                .frame(height: 200)
                            }
                            EtiquetaPrecio(texto: Self.precio(item.precioMxn), giro: -4, tamano: 30)
                                .padding(.leading, 16)
                                .offset(y: 22)
                                .accessibilityLabel("Precio: \(Self.precio(item.precioMxn))")
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            Text(item.titulo)
                                .font(.bricolage(24, relativeTo: .title2))
                                .foregroundStyle(AgoraDesign.Colors.texto)
                                .fixedSize(horizontal: false, vertical: true)
                                .accessibilityAddTraits(.isHeader)

                            HStack(spacing: 6) {
                                let estado = Self.selloEstado(item.estadoVenta)
                                Sello(texto: estado.texto, fondo: estado.fondo, tinta: estado.tinta)
                                Sello(texto: Self.categoria(item.categoria).uppercased(), fondo: AgoraDesign.Colors.talavera)
                            }

                            if let vendedor = item.vendedor {
                                Button {
                                    if let handle = vendedor.handle { onPerfil(handle) }
                                } label: {
                                    HStack(spacing: 12) {
                                        AvatarD(nombre: vendedor.nombre ?? vendedor.handle ?? "?", fotoUrl: vendedor.fotoUrl, tamano: 44)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(vendedor.handle ?? vendedor.nombre ?? "Alguien")
                                                .font(.outfit(.subheadline, .semibold))
                                                .foregroundStyle(AgoraDesign.Colors.texto)
                                            Text("Lo publicó \(FormatUtils.haceCuanto(item.createdAt))")
                                                .font(.outfit(.caption))
                                                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                                        }
                                        Spacer(minLength: 0)
                                        Image(systemName: "chevron.right")
                                            .font(.outfit(.caption, .semibold))
                                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                                    }
                                }
                                .buttonStyle(.agoraPlain)
                                .accessibilityHint("Abre su perfil")
                            }

                            Text(item.descripcion)
                                .font(.outfit(.body))
                                .foregroundStyle(AgoraDesign.Colors.texto)
                                .fixedSize(horizontal: false, vertical: true)

                            if item.estadoVenta != "DISPONIBLE" {
                                Text("Este artículo ya no está disponible.")
                                    .font(.outfit(.subheadline))
                                    .foregroundStyle(AgoraDesign.Colors.danger)
                            }

                            acciones(item)
                                .padding(.top, 6)

                            if let error {
                                Text(error)
                                    .font(.outfit(.footnote))
                                    .foregroundStyle(AgoraDesign.Colors.danger)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 38)
                        .padding(.bottom, 24)
                    }
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Anuncio")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if let url = EnlacesWeb.anuncio(anuncioId) {
                    ShareLink(item: url, subject: Text(anuncio?.titulo ?? "Anuncio en Ágora")) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Compartir anuncio")
                }
            }
        }
        .task(id: anuncioId) { await cargar() }
    }

    /// Ver su perfil (secundario) y escribir al vendedor (`boton`); si es tuyo, marcarlo como vendido.
    @ViewBuilder
    private func acciones(_ item: AnuncioDetalleDto) -> some View {
        if item.esMio == true {
            Button {
                Task { await marcarVendido() }
            } label: {
                ZStack {
                    if accionando { ProgressView() } else { Text("Marcar como vendido") }
                }
                .font(.outfit(.body, .bold))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
            }
            .buttonStyle(.agoraPlain)
            .disabled(accionando || item.estadoVenta != "DISPONIBLE")
        } else if item.estadoVenta == "DISPONIBLE", let handle = item.vendedor?.handle {
            HStack(spacing: 10) {
                Button {
                    onPerfil(handle)
                } label: {
                    Text("Ver perfil")
                        .font(.outfit(.body, .bold))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                        }
                }
                .buttonStyle(.agoraPlain)

                Button {
                    Task { await escribirAlVendedor(handle: handle) }
                } label: {
                    ZStack {
                        if accionando {
                            ProgressView().tint(AgoraDesign.Colors.sobreBoton)
                        } else {
                            Text("Escribir a \(Self.nombreDePila(item.vendedor))")
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                    }
                    .font(.outfit(.body, .bold))
                    .foregroundStyle(AgoraDesign.Colors.sobreBoton)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(AgoraDesign.Colors.boton, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.agoraPlain)
                .disabled(accionando)
                .layoutPriority(1)
            }
        }
    }

    private static func precio(_ monto: Int) -> String {
        monto == 0 ? "Gratis" : "$\(FormatUtils.formatearPrecio(monto))"
    }

    private static func nombreDePila(_ autor: AutorDto?) -> String {
        autor?.nombre?.split(separator: " ").first.map(String.init) ?? "quien vende"
    }

    private static func categoria(_ valor: String) -> String {
        [
            "LIBROS": "Libros", "ELECTRONICA": "Electrónica", "MUEBLES": "Muebles", "ROPA": "Ropa",
            "CUARTO": "Cuarto", "SERVICIOS": "Servicios",
        ][valor] ?? "Otro"
    }

    /// Disponible en jade, apartado en maíz, vendido en tinta.
    private static func selloEstado(_ estado: String) -> (texto: String, fondo: Color, tinta: Color) {
        switch estado {
        case "APARTADO": return ("APARTADO", AgoraDesign.Colors.maiz, AgoraDesign.Colors.sobreMaiz)
        case "VENDIDO": return ("VENDIDO", AgoraDesign.Colors.texto, AgoraDesign.Colors.fondo)
        default: return ("DISPONIBLE", AgoraDesign.Colors.jade, .white)
        }
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            anuncio = try await AgoraApi.anuncioDetalle(id: anuncioId)
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func marcarVendido() async {
        accionando = true
        error = nil
        defer { accionando = false }
        do {
            _ = try await AgoraApi.actualizarAnuncio(id: anuncioId, estadoVenta: "VENDIDO")
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func escribirAlVendedor(handle: String) async {
        accionando = true
        error = nil
        defer { accionando = false }
        do {
            let chat = try await AgoraApi.abrirConversacion(handle: handle)
            onMensaje(chat.id)
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}
