import AVFoundation
import SwiftUI
import UIKit

/// Clips del campus (docs/diseno-d.md §4, artboard Reels): videos verticales a pantalla completa,
/// uno tras otro. Es la segunda pestaña y también se abre desde la fila del inicio.
/// Solo se muestra lo que la API da (`GET feed?tipo=clips`): sin vistas, «Seguir» ni evento ligado.
/// En iOS 17 se pasa de clip deslizando hacia arriba; en iOS 16, de lado.
struct ClipsView: View {
    /// Clip con el que abre (el que se tocó en el inicio).
    var desde: String?
    /// Raíz de la pestaña Clips: sin «Volver».
    var enPestana = false
    /// La pestaña está a la vista: si no, ningún video corre ni suena.
    var visible = true
    var onPostTap: (String) -> Void = { _ in }
    var onAuthorTap: (String) -> Void = { _ in }
    /// «Grabar un clip»: lleva a Publicar.
    var onGrabar: () -> Void = {}

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
                vacio
            } else {
                paginas
            }

            cabecera
        }
        .toolbar(.hidden, for: .navigationBar)
        .environment(\.colorScheme, .dark)
        .task(id: soloMiCarrera) { await cargar() }
        .task { await cargarCarrera() }
    }

    @ViewBuilder
    private var paginas: some View {
        if #available(iOS 17.0, *) {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 0) {
                    ForEach(clips) { clip in
                        pagina(clip)
                            .containerRelativeFrame([.horizontal, .vertical])
                            .id(clip.id)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollPosition(id: $actual)
            .ignoresSafeArea()
        } else {
            TabView(selection: $actual) {
                ForEach(clips) { clip in
                    pagina(clip)
                        .tag(Optional(clip.id))
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea()
        }
    }

    private func pagina(_ clip: PostDto) -> some View {
        ClipPagina(
            post: clip,
            activo: visible && actual == clip.id,
            conSonido: conSonido,
            onComentarios: { onPostTap(clip.id) },
            onAutor: {
                if let handle = clip.autor?.handle { onAuthorTap(handle) }
            },
            onAlternarSonido: { conSonido.toggle() }
        )
    }

    private var vacio: some View {
        VStack(spacing: 12) {
            Image(systemName: "play.rectangle")
                .font(.system(size: 44, weight: .light))
                .foregroundStyle(Color.white.opacity(0.7))
            Text(soloMiCarrera ? "Tu carrera aún no sube clips" : "Todavía no hay clips")
                .font(.bricolage(22, relativeTo: .title2))
                .foregroundStyle(.white)
            Text("Un video vertical que publiques aparece aquí para todo el campus.")
                .font(.outfit(.subheadline))
                .foregroundStyle(Color.white.opacity(0.75))
                .multilineTextAlignment(.center)
            Button(action: onGrabar) {
                Label("Subir un clip", systemImage: "video")
                    .font(.outfit(.subheadline, .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .frame(minHeight: 46)
                    .background(AgoraDesign.Colors.naranja, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
            }
            .buttonStyle(.agoraPlain)
            .padding(.top, 4)
        }
        .padding(32)
    }

    private var cabecera: some View {
        VStack {
            HStack(spacing: 10) {
                if enPestana {
                    botonRedondo(conSonido ? "speaker.wave.2.fill" : "speaker.slash.fill",
                                 etiqueta: conSonido ? "Quitar sonido" : "Activar sonido") {
                        conSonido.toggle()
                    }
                } else {
                    botonRedondo("chevron.left", etiqueta: "Volver") { dismiss() }
                }
                Spacer()
                HStack(spacing: 18) {
                    if miCarrera != nil {
                        pestana("Mi carrera", activa: soloMiCarrera) { soloMiCarrera = true }
                    }
                    pestana("Campus", activa: !soloMiCarrera) { soloMiCarrera = false }
                }
                Spacer()
                botonRedondo("video", etiqueta: "Grabar un clip", accion: onGrabar)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            Spacer()
        }
    }

    private func botonRedondo(_ icono: String, etiqueta: String, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Image(systemName: icono)
                .font(.system(size: 17, weight: .semibold))
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
                .font(.outfit(.callout, activa ? .bold : .medium))
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

/// Un clip: el video ocupa todo y encima van la comunidad, el autor, el texto, las acciones
/// a la derecha y la barra de progreso abajo.
private struct ClipPagina: View {
    let post: PostDto
    let activo: Bool
    let conSonido: Bool
    let onComentarios: () -> Void
    let onAutor: () -> Void
    let onAlternarSonido: () -> Void

    @State private var miReaccion: String?
    @State private var conteos: [String: Int] = [:]
    @State private var guardado = false
    @State private var progreso: Double = 0

    private var url: URL? {
        post.media?.first { $0.esVideo == true }.flatMap { ApiClient.shared.resolveUrl($0.url) }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            if let url {
                ReproductorClip(url: url, activo: activo, conSonido: conSonido, progreso: $progreso)
                    .ignoresSafeArea()
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onAlternarSonido)
                    .accessibilityLabel("Video de \(post.autor?.nombre ?? "alguien")")
                    .accessibilityHint(conSonido ? "Toca para quitar el sonido" : "Toca para activar el sonido")
            }

            LinearGradient(colors: [.clear, Color.black.opacity(0.85)], startPoint: .center, endPoint: .bottom)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            VStack(spacing: 14) {
                HStack(alignment: .bottom, spacing: 12) {
                    info
                    Spacer(minLength: 0)
                    acciones
                }
                // Avance del clip (docs/diseno-d.md §4).
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.25))
                        Capsule().fill(.white).frame(width: geo.size.width * progreso)
                    }
                }
                .frame(height: 3)
                .accessibilityHidden(true)
            }
            .padding(.horizontal, 16)
            // Por encima de la barra flotante (64 pt) y del indicador de inicio (34 pt).
            .padding(.bottom, 112)
        }
        .onAppear {
            miReaccion = post.miReaccion
            conteos = post.reacciones ?? [:]
            guardado = post.miGuardado ?? false
        }
    }

    private var info: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(post.comunidad.nombre, systemImage: "building.columns")
                .font(.outfit(.caption, .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.white.opacity(0.16), in: Capsule())
            if let autor = post.autor {
                Button(action: onAutor) {
                    HStack(spacing: 10) {
                        AvatarD(nombre: autor.nombre ?? autor.handle ?? "?", fotoUrl: autor.fotoUrl, tamano: 40)
                            .overlay {
                                RoundedRectangle(cornerRadius: AgoraDesign.Radii.avatar, style: .continuous)
                                    .stroke(.white, lineWidth: 2)
                            }
                        VStack(alignment: .leading, spacing: 1) {
                            Text(autor.nombre ?? autor.handle ?? "")
                                .font(.outfit(.subheadline, .bold))
                                .foregroundStyle(.white)
                            Text(FormatUtils.haceCuanto(post.createdAt))
                                .font(.outfit(.caption))
                                .foregroundStyle(Color.white.opacity(0.75))
                        }
                    }
                }
                .buttonStyle(.agoraPlain)
            }
            if !post.texto.isEmpty {
                Text(post.texto)
                    .font(.outfit(.subheadline))
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

            accion(icono: guardado ? "bookmark.fill" : "bookmark", texto: "Guardar", color: .white) {
                Task { await guardar() }
            }
            .accessibilityLabel(guardado ? "Guardado" : "Guardar")
            .accessibilityAddTraits(guardado ? .isSelected : [])
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
                .font(.system(size: 22, weight: .regular))
                .foregroundStyle(color)
                .frame(width: 48, height: 48)
                .background(Color.black.opacity(0.35), in: Circle())
            Text(texto)
                .font(.outfit(.caption, .semibold))
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

    private func guardar() async {
        Haptics.toggle()
        let anterior = guardado
        guardado.toggle()
        do {
            let resp = try await AgoraApi.guardarPost(id: post.id)
            guardado = resp.guardado
        } catch {
            guardado = anterior
        }
    }
}

/// Video sin controles, en bucle, que solo suena y corre cuando su página está a la vista.
private struct ReproductorClip: UIViewRepresentable {
    let url: URL
    let activo: Bool
    let conSonido: Bool
    @Binding var progreso: Double

    func makeUIView(context: Context) -> VistaReproductor {
        let vista = VistaReproductor()
        let jugador = AVQueuePlayer()
        context.coordinator.bucle = AVPlayerLooper(player: jugador, templateItem: AVPlayerItem(url: url))
        let progreso = $progreso
        context.coordinator.observador = jugador.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.25, preferredTimescale: 600),
            queue: .main
        ) { [weak jugador] tiempo in
            guard let duracion = jugador?.currentItem?.duration.seconds, duracion.isFinite, duracion > 0 else { return }
            progreso.wrappedValue = min(1, max(0, tiempo.seconds / duracion))
        }
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
        if let observador = coordinator.observador {
            vista.capa.player?.removeTimeObserver(observador)
        }
        vista.capa.player?.pause()
        coordinator.bucle = nil
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator {
        var bucle: AVPlayerLooper?
        var observador: Any?
    }

    final class VistaReproductor: UIView {
        override class var layerClass: AnyClass { AVPlayerLayer.self }
        var capa: AVPlayerLayer { layer as! AVPlayerLayer }
    }
}
