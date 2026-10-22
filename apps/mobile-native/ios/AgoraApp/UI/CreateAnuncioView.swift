import SwiftUI
import PhotosUI
import UIKit

private struct CategoriaCrearAnuncio: Identifiable {
    var id: String { valor }
    let valor: String
    let etiqueta: String
}

private let categoriasCrearAnuncio: [CategoriaCrearAnuncio] = [
    CategoriaCrearAnuncio(valor: "LIBROS", etiqueta: "Libros"),
    CategoriaCrearAnuncio(valor: "ELECTRONICA", etiqueta: "Electrónica"),
    CategoriaCrearAnuncio(valor: "MUEBLES", etiqueta: "Muebles"),
    CategoriaCrearAnuncio(valor: "ROPA", etiqueta: "Ropa"),
    CategoriaCrearAnuncio(valor: "CUARTO", etiqueta: "Cuarto"),
    CategoriaCrearAnuncio(valor: "SERVICIOS", etiqueta: "Servicios"),
    CategoriaCrearAnuncio(valor: "OTRO", etiqueta: "Otro"),
]

/// Crear anuncio — paridad con `CreateAnuncioScreen.kt`.
struct CreateAnuncioView: View {
    var onCreado: (String) -> Void = { _ in }
    var onCancelar: () -> Void = {}

    @State private var titulo = ""
    @State private var descripcion = ""
    @State private var categoria = "LIBROS"
    @State private var precio = ""
    @State private var imagenId: String?
    @State private var previewImage: UIImage?
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var subiendo = false
    @State private var enviando = false
    @State private var error: String?

    private var puedePublicar: Bool {
        titulo.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3
            && !descripcion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && Int(precio) != nil
            && !enviando
            && !subiendo
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                Group {
                    Text("Nuevo anuncio")
                        .font(.title2.bold())

                    TextField("Título", text: $titulo)
                        .textFieldStyle(.roundedBorder)

                    ZStack(alignment: .topLeading) {
                        TextEditor(text: $descripcion)
                            .frame(minHeight: 120)
                            .padding(4)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
                        if descripcion.isEmpty {
                            Text("Descripción")
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 12)
                                .allowsHitTesting(false)
                        }
                    }

                    TextField("Precio MXN", text: $precio)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.numberPad)
                        .onChange(of: precio) { newValue in
                            precio = newValue.filter(\.isNumber)
                }
                    }

                Text("Categoría")
                    .font(.subheadline.bold())
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)

                MarketplaceFlowLayout(spacing: 8) {
                    ForEach(categoriasCrearAnuncio) { cat in
                        Button {
                            categoria = cat.valor
                        } label: {
                            Text(cat.etiqueta)
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(categoria == cat.valor ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                                .foregroundStyle(categoria == cat.valor ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
                                .clipShape(Capsule())
                                .overlay {
                                    Capsule()
                                        .stroke(categoria == cat.valor ? AgoraDesign.Colors.naranja.opacity(0.3) : AgoraDesign.Colors.borde, lineWidth: 1)
                                }
                        }
                        .buttonStyle(.agoraPlain)
                    }
                }

                if let previewImage {
                    Image(uiImage: previewImage)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 180)
                        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
                }

                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    HStack {
                        Text(subiendo ? "Subiendo foto…" : "📷 Agregar foto")
                        if subiendo { ProgressView().scaleEffect(0.8) }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
                .disabled(subiendo)
                .onChange(of: selectedPhoto) { item in
                    Task { await procesarFoto(item) }
                }

                Button {
                    Task { await publicar() }
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
                .disabled(!puedePublicar)

                Button("Cancelar", action: onCancelar)
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)

                if let error {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(AgoraDesign.Colors.danger)
                }
            }
            .padding(AgoraDesign.Spacing.md)
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Vender")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func procesarFoto(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        subiendo = true
        imagenId = nil
        error = nil
        defer { subiendo = false }
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                throw ApiError.http(-1, "No se pudo leer la imagen.")
            }
            if let image = UIImage(data: data) {
                previewImage = image
            }
            // Siempre JPEG: el servidor rechaza HEIC y así no viajan los metadatos EXIF.
            let subida = try await MediaRepository.subirFoto(data)
            imagenId = subida.id
        } catch {
            previewImage = nil
            selectedPhoto = nil
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func publicar() async {
        guard let precioInt = Int(precio) else { return }
        enviando = true
        error = nil
        defer { enviando = false }
        do {
            let resp = try await AgoraApi.crearAnuncio(
                CrearAnuncioRequest(
                    titulo: titulo.trimmingCharacters(in: .whitespacesAndNewlines),
                    descripcion: descripcion.trimmingCharacters(in: .whitespacesAndNewlines),
                    categoria: categoria,
                    precioMxn: precioInt,
                    imagenIds: imagenId.map { [$0] } ?? []
                )
            )
            onCreado(resp.id)
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

/// Flow layout compartido para chips de categoría.
private struct MarketplaceFlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY),
                proposal: ProposedViewSize(frame.size)
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var frames: [CGRect] = []

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            frames.append(CGRect(origin: CGPoint(x: x, y: y), size: size))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), frames)
    }
}
