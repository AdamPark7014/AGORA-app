import AVFoundation
import SwiftUI

/// Clips del campus (docs/diseno-d.md §4): videos verticales a pantalla completa, uno tras otro.
/// Solo se muestra lo que la API da (`GET feed?tipo=clips`): sin vistas ni evento ligado.
/// En iOS 16 no hay paginado vertical nativo, así que se pasa de clip deslizando de lado.
struct ClipsView: View {
    /// Clip con el que abre (el que se tocó en el inicio).
    var desde: String?
    var onPostTap: (String) -> Void = { _ in }
    var onAuthorTap: (String) -> Void = { _ in }

    @Environment(\.dismiss) private var dismiss
    @State private var clips: [PostDto] = []
    @State private var actual: String?
    @State private var cargando = true
    @State private var error: String?
    @State private var conSonido = false
    @State private var soloMiCarrera = false
    @State private var miCarrera: String?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if cargando && clips.isEmpty {
                ProgressView().tint(.white)
            } else if let error, clips.isEmpty {
                AgoraErrorState(message: error) {
                    Task { await cargar() }
                }
            } else if clips.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "play.rectangle")
                        .font(.system(size: 44, weight: .light))
                        .foregroundStyle(Color.white.opacity(0.7))
                    Text(soloMiCarrera ? "Tu carrera aún no sube clips" : "Todavía no hay clips")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Un video vertical publicado desde el inicio aparece aquí para todo el campus.")
                        .font(.subheadline)
                        .foregroundStyle(Color.white.opacity(0.75))
                        .multilineTextAlignment(.center)
                }
                .padding(32)
            } else {
                TabView(selection: $actual) {
                    ForEach(clips) { clip in
                        ClipPagina(
                            post: clip,
                            activo: actual == clip.id,
                            conSonido: conSonido,
                            onComentarios: { onPostTap(clip.id) },
                            onAutor: {
                                if let handle = clip.autor?.handle { onAuthorTap(handle) }
                            }
                        )
                        .tag(Optional(clip.id))
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .ignoresSafeArea()
            }

            cabecera
        }
        .toolbar(.hidden, for: .navigationBar)
        .environment(\.colorScheme, .dark)
        .task(id: soloMiCarrera) { await cargar() }
        .task { await cargarCarrera() }
    }

    private var cabecera: some View {
        VStack {
            HStack(spacing: 10) {
                botonRedondo("chevron.left", etiqueta: "Volver") { dismiss() }
                Spacer()
                HStack(spacing: 18) {
                    if miCarrera != nil {
                        pestana("Mi carrera", activa: soloMiCarrera) { soloMiCarrera = true }
                    }
                    pestana("Campus", activa: !soloMiCarrera) { soloMiCarrera = false }
                }
                Spacer()
                botonRedondo(conSonido ? "speaker.wave.2.fill" : "speaker.slash.fill",
                             etiqueta: conSonido ? "Quitar sonido" : "Activar sonido") {
                    conSonido.toggle()
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            Spacer()
        }
    }

    private func botonRedondo(_ icono: String, etiqueta: String, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Image(systemName: icono)
                .font(.body.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(Color.black.opacity(0.35), in: Circle())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityLabel(etiqueta)
    }

    private func pestana(_ texto: String, activa: Bool, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Text(texto)
                .font(.subheadline.weight(activa ? .bold : .medium))
                .foregroundStyle(activa ? .white : Color.white.opacity(0.7))
                .frame(minHeight: 44)
                .overlay(alignment: .bottom) {
                    if activa {
                        Rectangle().fill(.white).frame(height: 2).offset(y: -6)
                    }
                }
        }
        .buttonStyle(.agoraPlain)
        .accessibilityAddTraits(activa ? .isSelected : [])
    }

    private func cargarCarrera() async {
        let comunidades = (try? await AgoraApi.misComunidades()) ?? []
        miCarrera = comunidades.first { $0.slug.hasPrefix("carrera:") }?.slug
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.feed(
                comunidadSlug: soloMiCarrera ? miCarrera : nil,
                tipo: "clips"
            )
            clips = (resp.publicaciones ?? []).filter { post in
                post.media?.contains { $0.esVideo == true } == true
            }
            if let desde, clips.contains(where: { $0.id == desde }), actual == nil {
                actual = desde
            } else if !clips.contains(where: { $0.id == actual }) {
                actual = clips.first?.id
            }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

/// Un clip: el video ocupa todo y encima van la comunidad, el autor, el texto y las acciones.
private struct ClipPagina: View {
    let post: PostDto
    let activo: Bool
    let conSonido: Bool
    let onComentarios: () -> Void
    let onAutor: () -> Void

    @State private var miReaccion: String?
    @State private var conteos: [String: Int] = [:]

    private var url: URL? {
        post.media?.first { $0.esVideo == true }.flatMap { ApiClient.shared.resolveUrl($0.url) }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            if let url {
                ReproductorClip(url: url, activo: activo, conSonido: conSonido)
                    .ignoresSafeArea()
                    .accessibilityLabel("Video de \(post.autor?.nombre ?? "alguien")")
            }

            LinearGradient(colors: [.clear, Color.black.opacity(0.85)], startPoint: .center, endPoint: .bottom)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            HStack(alignment: .bottom, spacing: 12) {
                info
                Spacer(minLength: 0)
                acciones
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 90)
        }
        .onAppear {
            miReaccion = post.miReaccion
            conteos = post.reacciones ?? [:]
        }
    }

    private var info: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(post.comunidad.nombre)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.white.opacity(0.16), in: Capsule())
            if let autor = post.autor {
                Button(action: onAutor) {
                    HStack(spacing: 10) {
                        AvatarD(nombre: autor.nombre ?? autor.handle ?? "?", fotoUrl: autor.fotoUrl, tamano: 40)
                        Text(autor.nombre ?? autor.handle ?? "")
                            .font(.subheadline.bold())
                            .foregroundStyle(.white)
                    }
                }
                .buttonStyle(.agoraPlain)
            }
            if !post.texto.isEmpty {
                Text(post.texto)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .lineLimit(3)
            }
        }
    }

    private var acciones: some View {
        let meLate = miReaccion == "ME_LATE"
        let cuantos = conteos["ME_LATE"] ?? 0
        return VStack(spacing: 16) {
            accion(icono: meLate ? "heart.fill" : "heart",
                   texto: cuantos > 0 ? "\(cuantos)" : "Me late",
                   color: meLate ? AgoraDesign.Colors.naranja : .white) {
                Task { await reaccionar() }
            }
            .accessibilityLabel(cuantos > 0 ? "Me late, \(cuantos)" : "Me late")
            .accessibilityAddTraits(meLate ? .isSelected : [])

            accion(icono: "bubble.left", texto: (post.numComments ?? 0) > 0 ? "\(post.numComments ?? 0)" : "Comentar", color: .white, accion: onComentarios)

            if let enlace = EnlacesWeb.publicacion(post.id) {
                ShareLink(item: enlace) {
                    etiquetaAccion(icono: "paperplane", texto: "Enviar", color: .white)
                }
                .accessibilityLabel("Enviar")
            }
        }
    }

    private func accion(icono: String, texto: String, color: Color, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            etiquetaAccion(icono: icono, texto: texto, color: color)
        }
        .buttonStyle(.agoraPlain)
    }

    private func etiquetaAccion(icono: String, texto: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icono)
                .font(.title2)
                .foregroundStyle(color)
                .frame(width: 48, height: 48)
                .background(Color.black.opacity(0.35), in: Circle())
            Text(texto)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white)
        }
    }

    private func reaccionar() async {
        Haptics.toggle()
        let anterior = miReaccion
        let conteosAnteriores = conteos
        miReaccion = anterior == "ME_LATE" ? nil : "ME_LATE"
        if post.reacciones != nil {
            conteos = moverReaccion(conteos, de: anterior, a: miReaccion)
        }
        do {
            let resp = try await AgoraApi.reaccionar(postId: post.id, tipo: "ME_LATE")
            miReaccion = resp.miReaccion
        } catch {
            miReaccion = anterior
            conteos = conteosAnteriores
        }
    }
}

/// Video sin controles, en bucle, que solo suena y corre cuando su página está a la vista.
private struct ReproductorClip: UIViewRepresentable {
    let url: URL
    let activo: Bool
    let conSonido: Bool

    func makeUIView(context: Context) -> VistaReproductor {
        let vista = VistaReproductor()
        let jugador = AVQueuePlayer()
        context.coordinator.bucle = AVPlayerLooper(player: jugador, templateItem: AVPlayerItem(url: url))
        vista.capa.player = jugador
        vista.capa.videoGravity = .resizeAspectFill
        return vista
    }

    func updateUIView(_ vista: VistaReproductor, context: Context) {
        guard let jugador = vista.capa.player else { return }
        jugador.isMuted = !conSonido
        if activo {
            jugador.play()
        } else {
            jugador.pause()
        }
    }

    static func dismantleUIView(_ vista: VistaReproductor, coordinator: Coordinator) {
        vista.capa.player?.pause()
        coordinator.bucle = nil
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator {
        var bucle: AVPlayerLooper?
    }

    final class VistaReproductor: UIView {
        override class var layerClass: AnyClass { AVPlayerLayer.self }
        var capa: AVPlayerLayer { layer as! AVPlayerLayer }
    }
}

/// Fila «Clips del campus» del inicio: tarjetas verticales que abren el visor. Sin videos, no sale.
struct FilaClips: View {
    var onClipTap: (String?) -> Void = { _ in }

    @State private var clips: [PostDto] = []

    var body: some View {
        VStack(spacing: 0) {
            if !clips.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("Clips del campus")
                            .font(.title3.weight(.heavy))
                            .foregroundStyle(AgoraDesign.Colors.texto)
                            .accessibilityAddTraits(.isHeader)
                        Spacer()
                        Button("Ver todos") { onClipTap(nil) }
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                    }
                    .padding(.horizontal, 4)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(clips.prefix(8)) { clip in
                                tarjeta(clip)
                            }
                        }
                    }
                }
                .padding(.vertical, 6)
            }
        }
        .task { await cargar() }
    }

    private func tarjeta(_ clip: PostDto) -> some View {
        Button {
            onClipTap(clip.id)
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color(red: 47 / 255, green: 42 / 255, blue: 38 / 255))
                Image(systemName: "play.fill")
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .frame(width: 34, height: 34)
                    .background(Color.black.opacity(0.45), in: Circle())
                VStack(alignment: .leading, spacing: 0) {
                    Text(clip.comunidad.nombre)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.white.opacity(0.16), in: Capsule())
                    Spacer(minLength: 0)
                    if !clip.texto.isEmpty {
                        Text(clip.texto)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(3)
                            .multilineTextAlignment(.leading)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(10)
            }
            .frame(width: 132, height: 200)
        }
        .buttonStyle(.agoraPlain)
        .accessibilityLabel("Clip de \(clip.autor?.nombre ?? "alguien") en \(clip.comunidad.nombre)")
    }

    private func cargar() async {
        let resp = try? await AgoraApi.feed(tipo: "clips")
        clips = (resp?.publicaciones ?? []).filter { post in
            post.media?.contains { $0.esVideo == true } == true
        }
    }
}
