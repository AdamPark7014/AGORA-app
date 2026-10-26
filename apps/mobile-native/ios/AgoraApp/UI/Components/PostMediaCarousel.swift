import AVFoundation
import AVKit
import SwiftUI
import UIKit

/// Foto o video ya resuelto a URL absoluta.
struct ElementoMedia: Hashable {
    let url: URL
    let esVideo: Bool

    static func desde(_ media: [MediaDto]) -> [ElementoMedia] {
        media.compactMap { (m: MediaDto) -> ElementoMedia? in
            guard let url = ApiClient.shared.resolveUrl(m.url) else { return nil }
            let video = m.esVideo ?? (m.mime?.hasPrefix("video/") ?? false)
            return ElementoMedia(url: url, esVideo: video)
        }
    }
}

/// Lo que abre el visor a pantalla completa (`fullScreenCover(item:)`).
struct VisorImagenesItem: Identifiable {
    let id = UUID()
    let urls: [URL]
    let inicial: Int
}

/// Carrusel paginado con todas las fotos y videos de una publicación o anuncio.
/// Las fotos abren el visor con zoom (salvo que se pase `onToque`); los videos
/// se reproducen en línea con `VideoPlayer`.
struct PostMediaCarousel: View {
    let media: [MediaDto]
    var altura: CGFloat = 220
    /// Toque simple en una foto. `nil` → abre el visor a pantalla completa.
    var onToque: (() -> Void)?
    /// Doble toque en una foto (p. ej. reaccionar con 🧡).
    var onDobleToque: (() -> Void)?

    @State private var pagina = 0
    @State private var visor: VisorImagenesItem?

    var body: some View {
        let lista = ElementoMedia.desde(media)
        let fotos = lista.filter { !$0.esVideo }.map(\.url)

        Group {
            if lista.count == 1, let unico = lista.first {
                celda(unico, fotos: fotos)
            } else if lista.count > 1 {
                TabView(selection: $pagina) {
                    ForEach(Array(lista.enumerated()), id: \.offset) { indice, elemento in
                        celda(elemento, fotos: fotos)
                            .tag(indice)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
                .indexViewStyle(.page(backgroundDisplayMode: .always))
                .overlay(alignment: .topTrailing) {
                    Text("\(min(pagina + 1, lista.count))/\(lista.count)")
                        .font(.outfit(.caption2, .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.55))
                        .clipShape(Capsule())
                        .padding(8)
                        .allowsHitTesting(false)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: lista.isEmpty ? 0 : altura)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
        .fullScreenCover(item: $visor) { item in
            VisorImagenes(urls: item.urls, inicial: item.inicial)
        }
    }

    @ViewBuilder
    private func celda(_ elemento: ElementoMedia, fotos: [URL]) -> some View {
        if elemento.esVideo {
            VideoCelda(url: elemento.url)
                .frame(maxWidth: .infinity)
                .frame(height: altura)
        } else {
            AsyncImage(url: elemento.url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    AgoraDesign.Colors.skeletonBase
                        .overlay {
                            Image(systemName: "photo")
                                .foregroundStyle(AgoraDesign.Colors.textoMuted)
                        }
                default:
                    AgoraDesign.Colors.skeletonBase
                        .overlay { ProgressView() }
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: altura)
            .clipped()
            .contentShape(Rectangle())
            .onTapGesture(count: 2) {
                onDobleToque?()
            }
            .onTapGesture(count: 1) {
                if let onToque {
                    onToque()
                } else {
                    let inicial = fotos.firstIndex(of: elemento.url) ?? 0
                    visor = VisorImagenesItem(urls: fotos, inicial: inicial)
                }
            }
            .accessibilityLabel("Foto")
            .accessibilityAddTraits(.isImage)
        }
    }
}

/// Fotos y videos de una publicación en el feed, en cuadrícula (docs/diseno-d.md §3): una ocupa
/// todo; dos van a mitades; tres o más, una grande y dos chicas con «+N» en la última. Las fotos
/// abren el visor; un video lleva ▶ y abre la publicación, donde se reproduce.
struct PostMediaGrid: View {
    let media: [MediaDto]
    var altura: CGFloat = 230
    /// Toque en un video o en «+N»: abre la publicación.
    var onAbrir: (() -> Void)?
    /// Doble toque en una foto (reaccionar con «Me late»).
    var onDobleToque: (() -> Void)?

    @State private var visor: VisorImagenesItem?

    private let separacion: CGFloat = 6

    var body: some View {
        let lista = ElementoMedia.desde(media)
        let fotos = lista.filter { !$0.esVideo }.map(\.url)

        GeometryReader { geo in
            let ancho = geo.size.width
            switch lista.count {
            case 0:
                EmptyView()
            case 1:
                celda(lista[0], fotos: fotos)
            case 2:
                HStack(spacing: separacion) {
                    celda(lista[0], fotos: fotos)
                        .frame(width: (ancho - separacion) / 2)
                    celda(lista[1], fotos: fotos)
                        .frame(width: (ancho - separacion) / 2)
                }
            default:
                HStack(spacing: separacion) {
                    celda(lista[0], fotos: fotos)
                        .frame(width: (ancho - separacion) * 2 / 3)
                    VStack(spacing: separacion) {
                        celda(lista[1], fotos: fotos)
                        celda(lista[2], fotos: fotos, mas: lista.count - 3)
                    }
                    .frame(width: (ancho - separacion) / 3)
                }
            }
        }
        .frame(height: lista.isEmpty ? 0 : altura)
        .fullScreenCover(item: $visor) { item in
            VisorImagenes(urls: item.urls, inicial: item.inicial)
        }
    }

    @ViewBuilder
    private func celda(_ elemento: ElementoMedia, fotos: [URL], mas: Int = 0) -> some View {
        ZStack(alignment: .bottomTrailing) {
            if elemento.esVideo {
                MiniaturaVideo(url: elemento.url)
                    .overlay {
                        Image(systemName: "play.fill")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 34, height: 34)
                            .background(Color.black.opacity(0.6), in: Circle())
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { onAbrir?() }
                    .accessibilityElement()
                    .accessibilityLabel("Video")
                    .accessibilityAddTraits(.isButton)
            } else {
                AsyncImage(url: elemento.url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure:
                        AgoraDesign.Colors.skeletonBase
                            .overlay {
                                Image(systemName: "photo")
                                    .foregroundStyle(AgoraDesign.Colors.textoMuted)
                            }
                    default:
                        AgoraDesign.Colors.skeletonBase
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()
                .contentShape(Rectangle())
                .onTapGesture(count: 2) { onDobleToque?() }
                .onTapGesture(count: 1) {
                    if mas > 0 {
                        onAbrir?()
                    } else {
                        let inicial = fotos.firstIndex(of: elemento.url) ?? 0
                        visor = VisorImagenesItem(urls: fotos, inicial: inicial)
                    }
                }
                .accessibilityLabel("Foto")
                .accessibilityAddTraits([.isImage, .isButton])
            }

            if mas > 0 {
                Text("+\(mas)")
                    .font(.outfit(.caption, .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .allowsHitTesting(false)
                    .accessibilityLabel("\(mas) más")
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.foto, style: .continuous))
    }
}

/// Primer cuadro de un video remoto como portada (la API no da miniatura). Se guarda en memoria.
struct MiniaturaVideo: View {
    let url: URL

    @State private var imagen: UIImage?

    private static let cache = NSCache<NSURL, UIImage>()

    var body: some View {
        ZStack {
            Color(red: 47 / 255, green: 42 / 255, blue: 38 / 255)
            if let imagen {
                Image(uiImage: imagen)
                    .resizable()
                    .scaledToFill()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
        .task(id: url) { await cargar() }
    }

    private func cargar() async {
        if let guardada = Self.cache.object(forKey: url as NSURL) {
            imagen = guardada
            return
        }
        let generador = AVAssetImageGenerator(asset: AVURLAsset(url: url))
        generador.appliesPreferredTrackTransform = true
        generador.maximumSize = CGSize(width: 480, height: 480)
        guard let cuadro = try? await generador.image(at: CMTime(seconds: 0.5, preferredTimescale: 600)).image else {
            return
        }
        let nueva = UIImage(cgImage: cuadro)
        Self.cache.setObject(nueva, forKey: url as NSURL)
        imagen = nueva
    }
}

/// Video en línea: el `AVPlayer` se crea al aparecer y se pausa al salir de pantalla.
private struct VideoCelda: View {
    let url: URL

    @State private var player: AVPlayer?

    var body: some View {
        ZStack {
            Color.black
            if let player {
                VideoPlayer(player: player)
            } else {
                ProgressView()
                    .tint(.white)
            }
        }
        .onAppear {
            if player == nil {
                player = AVPlayer(url: url)
            }
        }
        .onDisappear {
            player?.pause()
        }
        .accessibilityLabel("Video")
    }
}

/// Visor a pantalla completa con paginado, pellizco para zoom y doble toque.
struct VisorImagenes: View {
    let urls: [URL]
    let inicial: Int

    @Environment(\.dismiss) private var dismiss
    @State private var pagina: Int

    init(urls: [URL], inicial: Int) {
        self.urls = urls
        self.inicial = inicial
        _pagina = State(initialValue: inicial)
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()

            TabView(selection: $pagina) {
                ForEach(Array(urls.enumerated()), id: \.offset) { indice, url in
                    ImagenConZoom(url: url)
                        .tag(indice)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: urls.count > 1 ? .always : .never))
            .ignoresSafeArea()

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.outfit(.title))
                    .foregroundStyle(.white, Color.black.opacity(0.5))
            }
            .padding(AgoraDesign.Spacing.md)
            .accessibilityLabel("Cerrar")
        }
        .preferredColorScheme(.dark)
    }
}

private struct ImagenConZoom: View {
    let url: URL

    @State private var escala: CGFloat = 1
    @State private var escalaBase: CGFloat = 1
    @State private var desplazamiento: CGSize = .zero
    @State private var desplazamientoBase: CGSize = .zero

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFit()
                    .scaleEffect(escala)
                    .offset(desplazamiento)
                    .gesture(pellizco)
                    // Arrastrar solo con zoom: sin zoom, el gesto pasa al paginado.
                    .simultaneousGesture(arrastre, including: escala > 1 ? .all : .subviews)
                    .onTapGesture(count: 2) {
                        withAnimation(AgoraDesign.Animation.spring) {
                            if escala > 1 {
                                reiniciar()
                            } else {
                                escala = 2.5
                                escalaBase = 2.5
                            }
                        }
                    }
            case .failure:
                Image(systemName: "photo")
                    .font(.outfit(.largeTitle))
                    .foregroundStyle(Color.white.opacity(0.6))
            default:
                ProgressView()
                    .tint(.white)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityLabel("Foto")
    }

    private var pellizco: some Gesture {
        MagnificationGesture()
            .onChanged { valor in
                escala = min(max(escalaBase * valor, 1), 5)
            }
            .onEnded { _ in
                if escala <= 1.01 {
                    withAnimation(AgoraDesign.Animation.spring) { reiniciar() }
                } else {
                    escalaBase = escala
                }
            }
    }

    private var arrastre: some Gesture {
        DragGesture()
            .onChanged { valor in
                desplazamiento = CGSize(
                    width: desplazamientoBase.width + valor.translation.width,
                    height: desplazamientoBase.height + valor.translation.height
                )
            }
            .onEnded { _ in
                desplazamientoBase = desplazamiento
            }
    }

    private func reiniciar() {
        escala = 1
        escalaBase = 1
        desplazamiento = .zero
        desplazamientoBase = .zero
    }
}
