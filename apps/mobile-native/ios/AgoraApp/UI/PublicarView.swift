import SwiftUI
import PhotosUI
import UIKit
import UniformTypeIdentifiers

private let limiteTextoPublicar = 2000
private let maxAdjuntos = 4

/// Lo que respondió la API cuando la publicación no pasó limpia.
private struct AvisoPublicacion {
    let titulo: String
    let mensaje: String
    /// false = `RETIRADO`: nadie la ve, así que no se manda al feed.
    let visible: Bool
}

private struct AdjuntoLocal: Identifiable {
    let id = UUID()
    var item: PhotosPickerItem?
    var preview: UIImage?
    var mediaId: String?
    var subiendo = false
    var esVideo = false
}

/// Publicar como «Postal nueva» (B «Cholula», artboard WowB-Publicar): destinos en sellos y, si es solo
/// texto, la postal en el color de la comunidad tal como saldrá en el inicio. Hasta 4 fotos y encuesta
/// opcional — paridad con `PublicarScreen.kt`.
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
    @State private var avisoPublicacion: AvisoPublicacion?

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

    /// Solo texto: se ve (y se publica) como la tarjeta tipográfica del inicio.
    private var esPostal: Bool { adjuntos.isEmpty && !conEncuesta }

    private var comunidadElegida: ComunidadDto? { comunidades.first { $0.slug == slug } }

    var body: some View {
        ScrollView {
            CabezaCholula(titulo: "Postal nueva", subtitulo: "Lo que publiques lo ve tu gente")
            VStack(alignment: .leading, spacing: 14) {
                Group {
                    if !network.isOnline {
                        OfflineBanner()
                    }
                    if let mensajeCola {
                        Text(mensajeCola)
                            .font(.outfit(.caption))
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                    }

                    Text("PARA")
                        .font(.outfit(.caption, .bold))
                        .tracking(1.2)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .accessibilityAddTraits(.isHeader)

                    if cargandoComunidades {
                        ProgressView()
                    } else if comunidades.isEmpty {
                        Text("No tienes comunidades asignadas.")
                            .font(.outfit(.subheadline))
                            .foregroundStyle(.secondary)
                    } else {
                        comunidadPicker
                    }
                }

                editor
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
                                    } else if adj.esVideo {
                                        RoundedRectangle(cornerRadius: 10)
                                            .fill(Color.black.opacity(0.85))
                                            .frame(width: 88, height: 88)
                                            .overlay {
                                                Image(systemName: "video.fill")
                                                    .foregroundStyle(.white)
                                            }
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

                // Modos del artboard que esta pantalla sí hace: foto o clip, y pregunta (encuesta).
                HStack(spacing: 8) {
                    if adjuntos.count < maxAdjuntos {
                        PhotosPicker(selection: $pickerItem, matching: .any(of: [.images, .videos])) {
                            modo("Foto o clip (\(adjuntos.count)/\(maxAdjuntos))", icono: "camera", activo: !adjuntos.isEmpty)
                        }
                        .buttonStyle(.agoraPlain)
                        .onChange(of: pickerItem) { item in
                            Task { await agregarAdjunto(item) }
                        }
                    }
                    Button {
                        withAnimation(AgoraDesign.Animation.spring) { conEncuesta.toggle() }
                    } label: {
                        modo(conEncuesta ? "Quitar pregunta" : "Pregunta", icono: "chart.bar", activo: conEncuesta)
                    }
                    .buttonStyle(.agoraPlain)
                    .accessibilityAddTraits(conEncuesta ? .isSelected : [])
                }

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
                        .font(.outfit(.caption))
                    }
                }

                if restantes < 200 {
                    Text("\(restantes)")
                        .font(.outfit(.caption))
                        .foregroundStyle(restantes < 0 ? .red : .secondary)
                }

                AgoraPrimaryButton(
                    title: network.isOnline ? "Publicar" : "Guardar para enviar",
                    action: { Task { await publicar() } },
                    enabled: puedePublicar,
                    loading: enviando
                )

                Text("Un filtro revisa cada publicación antes de que salga.")
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)

                if let error {
                    Text(error).font(.outfit(.footnote)).foregroundStyle(AgoraDesign.Colors.danger)
                }
            }
            .padding(16)
        }
        .agoraScreenBackground()
        .barraDeEstadoOpaca(AgoraDesign.Colors.fondo)
        .toolbar(.hidden, for: .navigationBar)
        .task { await cargarComunidades() }
        .alert(
            avisoPublicacion?.titulo ?? "",
            isPresented: Binding(
                get: { avisoPublicacion != nil },
                set: { presentado in
                    guard !presentado, let aviso = avisoPublicacion else { return }
                    avisoPublicacion = nil
                    if aviso.visible { onPublicado() }
                }
            ),
            presenting: avisoPublicacion
        ) { _ in
            Button("Entendido", role: .cancel) {}
        } message: { aviso in
            Text(aviso.mensaje)
        }
    }

    /// nil = pasó limpia (`PUBLICADO` sin aviso): se va directo al feed.
    private static func avisoDe(_ resp: CrearPostResponse) -> AvisoPublicacion? {
        let aviso = resp.aviso?.trimmingCharacters(in: .whitespacesAndNewlines)
        let tieneAviso = !(aviso ?? "").isEmpty
        switch resp.estado ?? "PUBLICADO" {
        case "RETIRADO":
            return AvisoPublicacion(
                titulo: "No se publicó",
                mensaje: tieneAviso ? (aviso ?? "") : "Tu publicación no cumple las reglas de Ágora, así que nadie la verá.",
                visible: false
            )
        case "EN_REVISION":
            return AvisoPublicacion(
                titulo: "Quedó en revisión",
                mensaje: tieneAviso ? (aviso ?? "") : "Ya se ve en el feed, pero un moderador la va a revisar.",
                visible: true
            )
        default:
            guard tieneAviso else { return nil }
            return AvisoPublicacion(titulo: "Publicado con aviso", mensaje: aviso ?? "", visible: true)
        }
    }

    /// Destinos como sellos: el elegido relleno de su color; los demás en `superficie` con su cuadrito.
    private var comunidadPicker: some View {
        FlowLayout(spacing: 8) {
            ForEach(comunidades, id: \.slug) { c in
                let elegida = slug == c.slug
                let color = ColorComunidad.de(slug: c.slug)
                Button { slug = c.slug } label: {
                    HStack(spacing: 6) {
                        if !elegida {
                            RoundedRectangle(cornerRadius: 2, style: .continuous)
                                .fill(color.fondo)
                                .frame(width: 8, height: 8)
                                .accessibilityHidden(true)
                        }
                        Text(NombreSello.de(nombre: c.nombre, slug: c.slug))
                            .font(.outfit(.caption, .bold))
                            .tracking(0.5)
                            .lineLimit(1)
                    }
                    .foregroundStyle(elegida ? color.tinta : AgoraDesign.Colors.texto)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 34)
                    .background(elegida ? color.fondo : AgoraDesign.Colors.superficie,
                                in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(elegida ? Color.clear : AgoraDesign.Colors.borde, lineWidth: 1)
                    }
                }
                .buttonStyle(.agoraPlain)
                .accessibilityLabel(c.nombre)
                .accessibilityAddTraits(elegida ? .isSelected : [])
            }
        }
    }

    /// Solo texto: la postal en el color de la comunidad, con azulejo arriba y abajo, como saldrá en el
    /// inicio. Con fotos o encuesta, el campo normal.
    @ViewBuilder
    private var editor: some View {
        if esPostal {
            let color = ColorComunidad.de(slug: comunidadElegida?.slug)
            VStack(spacing: 0) {
                Talavera().frame(height: 22).clipped()
                ZStack(alignment: .topLeading) {
                    TextEditor(text: $texto)
                        .font(.bricolage(26, relativeTo: .title2))
                        .foregroundStyle(color.tinta)
                        .tint(color.tinta)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 190)
                    if texto.isEmpty {
                        Text("¿Qué está pasando en el campus?")
                            .font(.bricolage(26, relativeTo: .title2))
                            .foregroundStyle(color.tinta.opacity(0.6))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 8)
                            .allowsHitTesting(false)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                if let comunidad = comunidadElegida {
                    Text("Para \(NombreSello.corto(nombre: comunidad.nombre, slug: comunidad.slug))")
                        .font(.outfit(.footnote, .semibold))
                        .foregroundStyle(color.tinta == .white ? AgoraDesign.Colors.sobreColorSuave : color.tinta.opacity(0.8))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 12)
                }
                Talavera().frame(height: 22).clipped()
            }
            .background(color.fondo)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .animation(AgoraDesign.Animation.spring, value: slug)
        } else {
            TextEditor(text: $texto)
                .font(.outfit(.body))
                .frame(minHeight: 140)
                .padding(8)
                .scrollContentBackground(.hidden)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
                .overlay(alignment: .topLeading) {
                    if texto.isEmpty {
                        Text("¿Qué está pasando en el campus?")
                            .font(.outfit(.body))
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            .padding(.horizontal, 13)
                            .padding(.vertical, 16)
                            .allowsHitTesting(false)
                    }
                }
        }
    }

    /// Botón de modo (72 de alto): ícono y nombre; activo con borde en `tinta`.
    private func modo(_ titulo: String, icono: String, activo: Bool) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icono)
                .font(.system(size: 20, weight: .medium))
                .accessibilityHidden(true)
            Text(titulo)
                .font(.outfit(.caption, .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .foregroundStyle(AgoraDesign.Colors.texto)
        .frame(maxWidth: .infinity, minHeight: 72)
        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(activo ? AgoraDesign.Colors.texto : AgoraDesign.Colors.borde, lineWidth: activo ? 2 : 1)
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
        let tipoVideo = item.supportedContentTypes.first { $0.conforms(to: .movie) }
        let adj = AdjuntoLocal(item: item, esVideo: tipoVideo != nil)
        adjuntos.append(adj)
        guard let idx = adjuntos.firstIndex(where: { $0.id == adj.id }) else { return }
        adjuntos[idx].subiendo = true
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                throw ApiError.http(-1, "No se pudo leer el archivo.")
            }
            let subida: MediaUploadResponse
            if let tipoVideo {
                // Videos tal cual; el servidor detecta mp4/mov por los bytes.
                let mime = tipoVideo.preferredMIMEType ?? "video/quicktime"
                subida = try await MediaRepository.subirVideo(data, mimeType: mime)
            } else {
                if let image = UIImage(data: data), let i = adjuntos.firstIndex(where: { $0.id == adj.id }) {
                    adjuntos[i].preview = image
                }
                // Siempre JPEG: el servidor rechaza HEIC y así no viajan los metadatos EXIF.
                subida = try await MediaRepository.subirFoto(data)
            }
            if let i = adjuntos.firstIndex(where: { $0.id == adj.id }) {
                adjuntos[i].mediaId = subida.id
                adjuntos[i].subiendo = false
            }
        } catch {
            adjuntos.removeAll { $0.id == adj.id }
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    /// `ApiClient` envuelve los errores de red en `ApiError.transport`; antes se
    /// buscaba un `URLError` directo y la cola sin conexión nunca se activaba.
    static func esSinConexion(_ error: Error) -> Bool {
        var base: Error = error
        if case .transport(let interno)? = error as? ApiError {
            base = interno
        }
        guard let urlError = base as? URLError else { return false }
        return urlError.code == .notConnectedToInternet || urlError.code == .networkConnectionLost
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
            if let aviso = PublicarView.avisoDe(resp) {
                // Retirada o en revisión: se explica en vez de darla por publicada.
                avisoPublicacion = aviso
            } else {
                onPublicado()
            }
        } catch let err {
            if PublicarView.esSinConexion(err) {
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
