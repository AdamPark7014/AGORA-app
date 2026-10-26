import SwiftUI

/// Detalle de anuncio — paridad con `MarketplaceDetailScreen.kt`.
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
                    VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                        if let imagenes = item.imagenes, !imagenes.isEmpty {
                            // Todas las fotos; tocar una abre el visor con zoom.
                            PostMediaCarousel(media: imagenes, altura: 260)
                        }

                        Text("$\(FormatUtils.formatearPrecio(item.precioMxn)) MXN")
                            .font(.bricolage(.title, extra: false))
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                        Text(item.titulo)
                            .font(.bricolage(.title2, extra: false))
                        Text("\(item.vendedor?.nombre ?? "Alguien") · \(FormatUtils.haceCuanto(item.createdAt))")
                            .font(.outfit(.subheadline))
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        Text(item.descripcion)
                            .font(.outfit(.body))

                        if item.estadoVenta != "DISPONIBLE" {
                            Text("Este artículo ya no está disponible.")
                                .font(.outfit(.subheadline))
                                .foregroundStyle(AgoraDesign.Colors.danger)
                        }

                        acciones(item)

                        if let error {
                            Text(error)
                                .font(.outfit(.footnote))
                                .foregroundStyle(AgoraDesign.Colors.danger)
                        }
                    }
                    .padding(AgoraDesign.Spacing.md)
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

    @ViewBuilder
    private func acciones(_ item: AnuncioDetalleDto) -> some View {
        if item.esMio == true {
            Button {
                Task { await marcarVendido() }
            } label: {
                HStack {
                    Spacer()
                    if accionando { ProgressView() }
                    else { Text("Marcar como vendido") }
                    Spacer()
                }
                .padding(.vertical, 12)
            }
            .buttonStyle(.bordered)
            .disabled(accionando || item.estadoVenta != "DISPONIBLE")
        } else if item.estadoVenta == "DISPONIBLE", let handle = item.vendedor?.handle {
            Button {
                Task { await escribirAlVendedor(handle: handle) }
            } label: {
                HStack {
                    Spacer()
                    if accionando { ProgressView().tint(.white) }
                    else { Text("Escribir al vendedor") }
                    Spacer()
                }
                .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(AgoraDesign.Colors.naranja)
            .disabled(accionando)

            Button("Ver perfil del vendedor") {
                onPerfil(handle)
            }
            .frame(maxWidth: .infinity)
            .buttonStyle(.bordered)
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
