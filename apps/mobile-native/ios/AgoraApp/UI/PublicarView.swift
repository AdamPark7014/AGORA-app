import SwiftUI
import PhotosUI

private let limiteTextoPublicar = 2000
private let maxAdjuntos = 4

private struct AdjuntoLocal: Identifiable {
    let id = UUID()
    var item: PhotosPickerItem?
    var preview: UIImage?
    var mediaId: String?
    var subiendo = false
}

/// Publicar con hasta 4 fotos y encuesta opcional — paridad con `PublicarScreen.kt`.
struct PublicarView: View {
    let onPublicado: () -> Void

    @ObservedObject private var network = NetworkMonitor.shared

    @State private var comunidades: [ComunidadDto] = []
    @State private var slug: String?
    @State private var texto = ""
    @State private var adjuntos: [AdjuntoLocal] = []
    @State private var pickerItem: PhotosPickerItem?
    @State private var cargandoComunidades = true
    @State private var enviando = false
    @State private var error: String?
    @State private var mensajeCola: String?

    @State private var conEncuesta = false
    @State private var preguntaEncuesta = ""
    @State private var opcionesEncuesta = ["", ""]

    private var mediaIds: [String] {
        adjuntos.compactMap(\.mediaId)
    }

    private var subiendoAlguno: Bool {
        adjuntos.contains { $0.subiendo }
    }

    private var restantes: Int { limiteTextoPublicar - texto.count }

    private var puedePublicar: Bool {
        slug != nil
            && (!texto.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !mediaIds.isEmpty)
            && !enviando
            && !subiendoAlguno
            && (!conEncuesta || encuestaValida)
    }

    private var encuestaValida: Bool {
        let pregunta = preguntaEncuesta.trimmingCharacters(in: .whitespacesAndNewlines)
        let opts = opcionesEncuesta.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        return pregunta.count >= 3 && opts.count >= 2 && Set(opts).count == opts.count
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if !network.isOnline {
                    OfflineBanner()
                }
                if let mensajeCola {
                    Text(mensajeCola)
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                }

                Text("Publicar en").font(.subheadline.bold())

                if cargandoComunidades {
                    ProgressView()
                } else if comunidades.isEmpty {
                    Text("No tienes comunidades asignadas.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    comunidadPicker
                }

                TextEditor(text: $texto)
                    .frame(minHeight: 140)
                    .padding(8)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(alignment: .topLeading) {
                        if texto.isEmpty {
                            Text("¿Qué está pasando en el campus?")
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 16)
                                .allowsHitTesting(false)
                        }
                    }
                    .onChange(of: texto) { v in
                        if v.count > limiteTextoPublicar { texto = String(v.prefix(limiteTextoPublicar)) }
                    }

                if !adjuntos.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach($adjuntos) { $adj in
                                ZStack(alignment: .topTrailing) {
                                    if let img = adj.preview {
                                        Image(uiImage: img)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 88, height: 88)
                                            .clipShape(RoundedRectangle(cornerRadius: 10))
                                    }
                                    if adj.subiendo {
                                        ProgressView()
                                            .frame(width: 88, height: 88)
                                            .background(.ultraThinMaterial)
                                            .clipShape(RoundedRectangle(cornerRadius: 10))
                                    }
                                    Button {
                                        adjuntos.removeAll { $0.id == adj.id }
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundStyle(.white, .black.opacity(0.6))
                                    }
                                    .padding(4)
                                }
                            }
                        }
                    }
                }

                if adjuntos.count < maxAdjuntos {
                    PhotosPicker(selection: $pickerItem, matching: .any(of: [.images, .videos])) {
                        Label("Añadir foto o video (\(adjuntos.count)/\(maxAdjuntos))", systemImage: "photo.on.rectangle")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.bordered)
                    .onChange(of: pickerItem) { item in
                        Task { await agregarAdjunto(item) }
                    }
                }

                Toggle("Añadir encuesta", isOn: $conEncuesta)
                if conEncuesta {
                    TextField("Pregunta de la encuesta", text: $preguntaEncuesta)
                        .textFieldStyle(.roundedBorder)
                    ForEach(opcionesEncuesta.indices, id: \.self) { i in
                        TextField("Opción \(i + 1)", text: $opcionesEncuesta[i])
                            .textFieldStyle(.roundedBorder)
                    }
                    if opcionesEncuesta.count < 6 {
                        Button("+ Opción") {
                            opcionesEncuesta.append("")
                        }
                        .font(.caption)
                    }
                }

                if restantes < 200 {
                    Text("\(restantes)")
                        .font(.caption)
                        .foregroundStyle(restantes < 0 ? .red : .secondary)
                }

                Button {
                    Task { await publicar() }
                } label: {
                    HStack {
                        Spacer()
                        if enviando { ProgressView().tint(.white) }
                        else { Text(network.isOnline ? "Publicar" : "Guardar para enviar").fontWeight(.semibold) }
                        Spacer()
                    }
                    .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(AgoraDesign.Colors.naranja)
                .disabled(!puedePublicar)

                if let error {
                    Text(error).font(.footnote).foregroundStyle(.red)
                }
            }
            .padding(16)
        }
        .agoraScreenBackground()
        .navigationTitle("Publicar")
        .task { await cargarComunidades() }
    }

    private var comunidadPicker: some View {
        FlowLayout(spacing: 8) {
            ForEach(comunidades, id: \.slug) { c in
                Button { slug = c.slug } label: {
                    Text(c.nombre)
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(slug == c.slug ? AgoraDesign.Colors.naranjaSuave : Color(.secondarySystemGroupedBackground))
                        .foregroundStyle(slug == c.slug ? AgoraDesign.Colors.naranja : .primary)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func cargarComunidades() async {
        cargandoComunidades = true
        defer { cargandoComunidades = false }
        do {
            comunidades = try await AgoraApi.misComunidades()
            slug = comunidades.first?.slug
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func agregarAdjunto(_ item: PhotosPickerItem?) async {
        guard let item, adjuntos.count < maxAdjuntos else { return }
        pickerItem = nil
        var adj = AdjuntoLocal(item: item)
        adjuntos.append(adj)
        guard let idx = adjuntos.firstIndex(where: { $0.id == adj.id }) else { return }
        adjuntos[idx].subiendo = true
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                throw ApiError.http(-1, "No se pudo leer el archivo.")
            }
            if let image = UIImage(data: data) {
                adjuntos[idx].preview = image
            }
            let subida = try await MediaRepository.subir(imageData: data)
            adjuntos[idx].mediaId = subida.id
            adjuntos[idx].subiendo = false
        } catch {
            adjuntos.removeAll { $0.id == adj.id }
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func publicar() async {
        guard let slug else { return }
        let limpio = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        let ids = mediaIds
        let encuesta: CrearEncuestaRequest? = conEncuesta && encuestaValida
            ? CrearEncuestaRequest(
                pregunta: preguntaEncuesta.trimmingCharacters(in: .whitespacesAndNewlines),
                opciones: opcionesEncuesta
                    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
            )
            : nil

        if !network.isOnline {
            PendingPostQueue.enqueue(comunidadSlug: slug, texto: limpio, mediaIds: ids)
            mensajeCola = "Sin conexión — tu publicación se enviará al reconectar."
            texto = ""
            adjuntos = []
            conEncuesta = false
            return
        }

        enviando = true
        error = nil
        defer { enviando = false }
        do {
            let resp = try await AgoraApi.crearPost(
                CrearPostRequest(comunidadSlug: slug, texto: limpio, mediaIds: ids, encuesta: encuesta)
            )
            GamificacionEvents.notifyPingResult(nuevas: resp.nuevasInsignias ?? [])
            AgoraAnalytics.publicar(["comunidadSlug": slug])
            texto = ""
            adjuntos = []
            conEncuesta = false
            mensajeCola = nil
            onPublicado()
        } catch let err {
            if let urlErr = err as? URLError, urlErr.code == .notConnectedToInternet {
                PendingPostQueue.enqueue(comunidadSlug: slug, texto: limpio, mediaIds: ids)
                mensajeCola = "Guardado en cola — se enviará al reconectar."
                texto = ""
                adjuntos = []
            } else {
                self.error = FormatUtils.mensajeDe(err)
            }
        }
    }
}
