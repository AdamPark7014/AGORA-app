import SwiftUI

// MARK: - Inicio (Feed B)

/// Inicio con el Feed B que eligió Adam (artboard FeedB, 26-10-2026): «Ágora» en naranja con Avisos
/// y Mensajes, la fila de historias (aquí, los clips del campus), y publicaciones a todo lo ancho
/// con la foto de borde a borde. Lo que FeedB no define sale del artboard Main: los filtros en
/// píldora (Para ti, Siguiendo, tu carrera, tu generación) y la pregunta del día.
struct FeedView: View {
    var reloadKey: Int = 0
    /// Cambia cuando se vuelve a tocar Inicio: la lista sube al encabezado.
    var irArriba: Int = 0
    var avisosSinLeer: Int = 0
    var mensajesSinLeer: Int = 0
    var onPostTap: (String) -> Void = { _ in }
    var onAuthorTap: (String) -> Void = { _ in }
    var onHashtagTap: (String) -> Void = { _ in }
    var onClipsTap: (String?) -> Void = { _ in }
    var onAvisosTap: () -> Void = {}
    var onMensajesTap: () -> Void = {}
    var onPublicarTap: () -> Void = {}
    var onCrearEventoTap: () -> Void = {}

    @State private var posts: [PostDto] = []
    @State private var clips: [PostDto] = []
    @State private var cursor: String?
    @State private var comunidades: [ComunidadDto] = []
    @State private var comunidadSlug: String?
    @State private var siguiendo = false
    @State private var cargando = true
    @State private var cargandoMas = false
    @State private var error: String?
    @ObservedObject private var network = NetworkMonitor.shared

    private var feedTrigger: String {
        "\(reloadKey)|\(comunidadSlug ?? "")|\(siguiendo)"
    }

    var body: some View {
        ScrollViewReader { lector in
            lista
                .onChange(of: irArriba) { _ in
                    withAnimation(AgoraDesign.Animation.spring) {
                        lector.scrollTo(Self.idEncabezado, anchor: .top)
                    }
                }
        }
    }

    private static let idEncabezado = "inicio.encabezado"

    private var lista: some View {
        List {
            if !network.isOnline {
                fila(OfflineBanner(), lados: 16, arriba: 4, abajo: 0)
            }

            fila(
                EncabezadoInicio(
                    avisosSinLeer: avisosSinLeer,
                    mensajesSinLeer: mensajesSinLeer,
                    onAvisos: onAvisosTap,
                    onMensajes: onMensajesTap
                ),
                lados: 16, arriba: 4, abajo: 2
            )
            .id(Self.idEncabezado)

            // Registro con correo personal: recordatorio de confirmar la UDLAP, en una línea.
            fila(AvisoUdlapView(), lados: 16, arriba: 4, abajo: 0)

            fila(
                HistoriasClips(clips: clips, onTuHistoria: onPublicarTap, onClip: { id in onClipsTap(id) }),
                lados: 0, arriba: 0, abajo: 0
            )

            fila(filtros, lados: 0, arriba: 0, abajo: 0)

            fila(PreguntaDelDiaBanner(), lados: 12, arriba: 10, abajo: 6)

            contenido
        }
        .listStyle(.plain)
        // Las filas sin datos quedan en 0 pt en vez del alto mínimo de fila.
        .environment(\.defaultMinListRowHeight, 0)
        .scrollContentBackground(.hidden)
        .background(AgoraDesign.Colors.fondoFeed)
        .animation(AgoraDesign.Animation.spring, value: posts.map(\.id))
        .toolbar(.hidden, for: .navigationBar)
        .barraDeEstadoOpaca(AgoraDesign.Colors.fondoFeed)
        .refreshable {
            await traer(desde: nil, reemplazar: true)
            await cargarClips()
        }
        .task(id: feedTrigger) { await traer(desde: nil, reemplazar: true) }
        .task { await cargarComunidades() }
        .task(id: reloadKey) { await cargarClips() }
    }

    @ViewBuilder
    private var contenido: some View {
        if cargando && posts.isEmpty {
            fila(
                ProgressView()
                    .tint(AgoraDesign.Colors.naranja)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40),
                arriba: 6, abajo: 6
            )
        } else if let error, posts.isEmpty {
            fila(
                AgoraErrorState(message: error) {
                    Task { await traer(desde: nil, reemplazar: true) }
                },
                arriba: 6, abajo: 6
            )
        } else if posts.isEmpty {
            if siguiendo {
                fila(
                    AgoraEmptyState(
                        emoji: "",
                        title: "Nadie de los que sigues ha publicado",
                        subtitle: "Busca gente de tu carrera en el directorio y síguela."
                    ),
                    arriba: 6, abajo: 6
                )
            } else if comunidadSlug != nil {
                fila(
                    AgoraEmptyState(
                        emoji: "",
                        title: "Todavía no hay nada aquí",
                        subtitle: "Lo que publiques en esta comunidad lo ve toda tu gente."
                    ),
                    arriba: 6, abajo: 6
                )
            } else {
                fila(
                    InicioVacioTarjeta(
                        onPublicar: onPublicarTap,
                        onClip: onPublicarTap,
                        onEvento: onCrearEventoTap
                    ),
                    lados: 12, arriba: 4, abajo: 6
                )
            }
        } else {
            ForEach(posts) { post in
                fila(
                    PostCardView(
                        post: post,
                        onTap: { onPostTap(post.id) },
                        onAuthorTap: post.autor?.handle.map { handle in
                            { onAuthorTap(handle) }
                        },
                        onHashtagTap: onHashtagTap,
                        onMencionTap: onAuthorTap,
                        onEliminado: { id in
                            posts.removeAll { $0.id == id }
                        },
                        estilo: .feedB
                    )
                    .onAppear {
                        if post.id == posts.last?.id {
                            Task { await cargarMas() }
                        }
                    },
                    lados: 0, arriba: 0, abajo: 8
                )
            }
            if cargandoMas {
                fila(
                    ProgressView()
                        .tint(AgoraDesign.Colors.naranja)
                        .frame(maxWidth: .infinity),
                    arriba: 8, abajo: 8
                )
            }
        }
    }

    /// Fila de la lista sin separador ni fondo, con los márgenes del diseño.
    private func fila<V: View>(_ vista: V, lados: CGFloat = 16, arriba: CGFloat, abajo: CGFloat) -> some View {
        vista
            .listRowInsets(EdgeInsets(top: arriba, leading: lados, bottom: abajo, trailing: lados))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }

    // MARK: Filtros (artboard Main)

    private var miCarrera: ComunidadDto? {
        comunidades.first { $0.slug.hasPrefix("carrera:") && !$0.estaSilenciada }
    }

    private var miGeneracion: ComunidadDto? {
        comunidades.first { $0.slug.hasPrefix("generacion:") && !$0.estaSilenciada }
    }

    /// Para ti / Siguiendo / tu carrera / tu generación, en píldoras como el artboard Main.
    private var filtros: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                pildora("Para ti", activa: !siguiendo && comunidadSlug == nil) {
                    siguiendo = false
                    comunidadSlug = nil
                }
                pildora("Siguiendo", activa: siguiendo) {
                    siguiendo = true
                    comunidadSlug = nil
                }
                if let carrera = miCarrera {
                    pildora(carrera.nombre, activa: !siguiendo && comunidadSlug == carrera.slug) {
                        siguiendo = false
                        comunidadSlug = carrera.slug
                    }
                }
                if let generacion = miGeneracion {
                    pildora(generacion.nombre.replacingOccurrences(of: "Generación ", with: "Gen "),
                            activa: !siguiendo && comunidadSlug == generacion.slug) {
                        siguiendo = false
                        comunidadSlug = generacion.slug
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .overlay(alignment: .top) {
            AgoraDesign.Colors.bordeFeed.frame(height: 1)
        }
        .overlay(alignment: .bottom) {
            AgoraDesign.Colors.bordeFeed.frame(height: 1)
        }
    }

    private func pildora(_ texto: String, activa: Bool, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Text(texto)
                .font(.outfit(.footnote, activa ? .semibold : .medium))
                .foregroundStyle(activa ? AgoraDesign.Colors.fondoFeed : AgoraDesign.Colors.tintaFeed)
                .lineLimit(1)
                .padding(.horizontal, 14)
                .frame(minHeight: 34)
                .background(activa ? AgoraDesign.Colors.tintaFeed : AgoraDesign.Colors.bordeFeed, in: Capsule())
                .contentShape(Capsule())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityAddTraits(activa ? .isSelected : [])
    }

    // MARK: Datos

    private func cargarComunidades() async {
        do {
            comunidades = try await AgoraApi.misComunidades()
        } catch {
            // Los filtros siguen funcionando sin tu carrera ni tu generación.
        }
    }

    private func cargarClips() async {
        let resp = try? await AgoraApi.feed(tipo: "clips")
        clips = (resp?.publicaciones ?? []).filter { post in
            post.media?.contains { $0.esVideo == true } == true
        }
    }

    private func traer(desde: String?, reemplazar: Bool) async {
        if reemplazar {
            cargando = true
        } else {
            guard cursor != nil, !cargandoMas else { return }
            cargandoMas = true
        }
        error = nil
        defer {
            cargando = false
            cargandoMas = false
        }

        if reemplazar && !network.isOnline {
            if let cached = OfflineCache.loadFeed() {
                posts = cached.publicaciones ?? []
                cursor = cached.siguienteCursor
            }
            return
        }

        do {
            let resp = try await AgoraApi.feed(
                cursor: desde,
                comunidadSlug: comunidadSlug,
                siguiendo: siguiendo ? true : nil
            )
            let nuevos = resp.publicaciones ?? []
            posts = reemplazar ? nuevos : posts + nuevos
            cursor = resp.siguienteCursor
            if reemplazar && desde == nil {
                OfflineCache.saveFeed(resp)
            }
        } catch {
            if reemplazar {
                if let cached = OfflineCache.loadFeed() {
                    posts = cached.publicaciones ?? []
                    cursor = cached.siguienteCursor
                } else {
                    self.error = FormatUtils.mensajeDe(error)
                }
            }
        }
    }

    private func cargarMas() async {
        guard let cursor, !cargando, !cargandoMas else { return }
        await traer(desde: cursor, reemplazar: false)
    }
}

// MARK: - Encabezado

/// «Ágora» en naranja y, a la derecha, Avisos (punto si hay nuevos) y Mensajes (artboard FeedB;
/// el número de mensajes sin leer, del artboard Main).
struct EncabezadoInicio: View {
    var avisosSinLeer: Int
    var mensajesSinLeer: Int
    var onAvisos: () -> Void
    var onMensajes: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text("Ágora")
                .font(.bricolage(26, relativeTo: .largeTitle, extra: false))
                .foregroundStyle(AgoraDesign.Colors.naranja)
                .accessibilityAddTraits(.isHeader)
            Spacer(minLength: 8)
            Button(action: onAvisos) {
                Image(systemName: "bell")
                    .font(.system(size: 21, weight: .regular))
                    .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                    .frame(width: 44, height: 44)
                    .overlay(alignment: .topTrailing) {
                        if avisosSinLeer > 0 {
                            Circle()
                                .fill(AgoraDesign.Colors.naranja)
                                .frame(width: 8, height: 8)
                                .offset(x: -10, y: 10)
                        }
                    }
                    .contentShape(Rectangle())
            }
            .buttonStyle(.agoraPlain)
            .accessibilityLabel(avisosSinLeer > 0 ? "Avisos, \(avisosSinLeer) nuevos" : "Avisos")
            .accessibilityIdentifier("inicio.avisos")

            Button(action: onMensajes) {
                Image(systemName: "paperplane")
                    .font(.system(size: 21, weight: .regular))
                    .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                    .frame(width: 44, height: 44)
                    .overlay(alignment: .topTrailing) {
                        if mensajesSinLeer > 0 {
                            Text(mensajesSinLeer > 9 ? "9+" : "\(mensajesSinLeer)")
                                .font(.outfit(.caption2, .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 4)
                                .frame(minWidth: 16, minHeight: 16)
                                .background(AgoraDesign.Colors.naranja, in: Capsule())
                                .offset(x: -4, y: 6)
                        }
                    }
                    .contentShape(Rectangle())
            }
            .buttonStyle(.agoraPlain)
            .accessibilityLabel(mensajesSinLeer > 0 ? "Mensajes, \(mensajesSinLeer) sin leer" : "Mensajes")
            .accessibilityIdentifier("inicio.mensajes")
        }
    }
}

// MARK: - Historias

/// Fila de historias del artboard FeedB. Ágora no tiene historias que caduquen: cada círculo es un
/// clip reciente del campus (anillo naranja si no lo has visto) y «Tu historia» lleva a publicar.
struct HistoriasClips: View {
    let clips: [PostDto]
    var onTuHistoria: () -> Void
    var onClip: (String) -> Void

    /// Ids de clips ya vistos en este teléfono, separados por coma (solo para el anillo).
    @AppStorage("agora.clipsVistos") private var vistosTexto = ""

    private var vistos: Set<String> {
        Set(vistosTexto.split(separator: ",").map(String.init))
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 14) {
                Button(action: onTuHistoria) {
                    VStack(spacing: 4) {
                        Circle()
                            .strokeBorder(Color(red: 207 / 255, green: 210 / 255, blue: 214 / 255),
                                          style: StrokeStyle(lineWidth: 2, dash: [4, 3]))
                            .frame(width: 60, height: 60)
                            .overlay {
                                Image(systemName: "plus")
                                    .font(.system(size: 22, weight: .regular))
                                    .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
                            }
                        Text("Tu historia")
                            .font(.outfit(.caption2))
                            .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
                            .lineLimit(1)
                    }
                    .frame(width: 64)
                }
                .buttonStyle(.agoraPlain)
                .accessibilityLabel("Subir un clip")
                .accessibilityIdentifier("inicio.historia.nueva")

                ForEach(Array(clips.prefix(12).enumerated()), id: \.element.id) { indice, clip in
                    Button {
                        marcarVisto(clip.id)
                        onClip(clip.id)
                    } label: {
                        VStack(spacing: 4) {
                            circulo(clip, visto: vistos.contains(clip.id))
                            Text(etiqueta(clip))
                                .font(.outfit(.caption2))
                                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                                .lineLimit(1)
                        }
                        .frame(width: 64)
                    }
                    .buttonStyle(.agoraPlain)
                    .accessibilityLabel("Clip de \(clip.autor?.nombre ?? "alguien") en \(clip.comunidad.nombre)")
                    .accessibilityIdentifier("inicio.historia.\(indice)")
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 6)
            .padding(.bottom, 12)
        }
    }

    private func circulo(_ clip: PostDto, visto: Bool) -> some View {
        let video = clip.media?.first { $0.esVideo == true }.flatMap { ApiClient.shared.resolveUrl($0.url) }
        return ZStack {
            if visto {
                Circle().fill(Color(red: 207 / 255, green: 210 / 255, blue: 214 / 255))
            } else {
                Circle().fill(AngularGradient(
                    colors: [AgoraDesign.Colors.naranja, Color(red: 1, green: 179 / 255, blue: 133 / 255), AgoraDesign.Colors.naranja],
                    center: .center
                ))
            }
            Group {
                if let video {
                    MiniaturaVideo(url: video)
                } else {
                    AgoraDesign.Colors.bordeFeed
                }
            }
            .frame(width: 52, height: 52)
            .clipShape(Circle())
            .overlay { Circle().stroke(AgoraDesign.Colors.fondoFeed, lineWidth: 2) }
        }
        .frame(width: 60, height: 60)
    }

    /// El nombre de pila de quien lo subió (como el artboard, una palabra bajo el círculo).
    private func etiqueta(_ clip: PostDto) -> String {
        clip.autor?.nombre?.split(separator: " ").first.map(String.init) ?? clip.comunidad.nombre
    }

    private func marcarVisto(_ id: String) {
        guard !vistos.contains(id) else { return }
        let lista = ([id] + vistosTexto.split(separator: ",").map(String.init)).prefix(100)
        vistosTexto = lista.joined(separator: ",")
    }
}

// MARK: - Inicio sin contenido

/// Campus sin publicaciones todavía (artboard «Inicio · campus sin publicaciones todavía»):
/// nada inventado, solo lo que la persona puede hacer para empezar.
struct InicioVacioTarjeta: View {
    var onPublicar: () -> Void
    var onClip: () -> Void
    var onEvento: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: "megaphone")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
                .frame(width: 48, height: 48)
                .background(AgoraDesign.Colors.naranjaSuave, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 6) {
                Text("Tu campus apenas empieza")
                    .font(.bricolage(24, relativeTo: .title2))
                    .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                    .accessibilityAddTraits(.isHeader)
                Text("Todavía no hay publicaciones aquí. Lo primero que subas lo ve toda la UDLAP.")
                    .font(.outfit(.body))
                    .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Button(action: onPublicar) {
                Label("Publicar algo", systemImage: "plus")
                    .font(.outfit(.body, .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(AgoraDesign.Colors.naranja, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
            }
            .buttonStyle(.agoraPlain)
            .accessibilityIdentifier("inicio.vacio.publicar")

            HStack(spacing: 8) {
                botonSecundario("Subir un clip", icono: "play.rectangle", accion: onClip)
                botonSecundario("Crear un evento", icono: "calendar", accion: onEvento)
            }

            if let enlace = URL(string: AgoraCopy.webBase) {
                ShareLink(item: enlace, message: Text("Estoy en Ágora, la red del campus de la UDLAP. Únete:")) {
                    Label("Invitar a alguien de tu generación", systemImage: "square.and.arrow.up")
                        .font(.outfit(.subheadline, .semibold))
                        .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 22)
        .padding(.bottom, 18)
        .background(AgoraDesign.Colors.fondoFeed, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous)
                .stroke(AgoraDesign.Colors.bordeFeed, lineWidth: 1)
        }
    }

    private func botonSecundario(_ texto: String, icono: String, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Label(texto, systemImage: icono)
                .font(.outfit(.subheadline, .semibold))
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(AgoraDesign.Colors.fondoFeed, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                        .stroke(AgoraDesign.Colors.bordeFeed, lineWidth: 1)
                }
        }
        .buttonStyle(.agoraPlain)
    }
}
