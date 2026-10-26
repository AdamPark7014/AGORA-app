import SwiftUI

// MARK: - Inicio (diseño D)

/// Inicio del diseño D (docs/diseno-d.md §3–§4, artboard FeedD): encabezado con la marca, segmento,
/// «Ahora en el campus», pregunta relámpago y publicaciones. La fila de clips va tras la primera
/// publicación y el mini evento tras la cuarta. La racha y los retos viven en Campus, no aquí.
struct FeedView: View {
    var reloadKey: Int = 0
    var avisosSinLeer: Int = 0
    var mensajesSinLeer: Int = 0
    var onPostTap: (String) -> Void = { _ in }
    var onAuthorTap: (String) -> Void = { _ in }
    var onHashtagTap: (String) -> Void = { _ in }
    var onEventoTap: (String) -> Void = { _ in }
    var onClipsTap: (String?) -> Void = { _ in }
    var onAvisosTap: () -> Void = {}
    var onMensajesTap: () -> Void = {}
    var onPerfilTap: () -> Void = {}
    var onPublicarTap: () -> Void = {}
    var onCrearEventoTap: () -> Void = {}
    var onAventonesTap: () -> Void = {}

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

    /// Después de cuál publicación va el mini evento: la cuarta, o la última si hay menos.
    private var indiceMiniEvento: Int { min(3, posts.count - 1) }

    var body: some View {
        List {
            if !network.isOnline {
                fila(OfflineBanner(), arriba: 4, abajo: 0)
            }

            fila(
                EncabezadoInicio(
                    avisosSinLeer: avisosSinLeer,
                    mensajesSinLeer: mensajesSinLeer,
                    onAvisos: onAvisosTap,
                    onMensajes: onMensajesTap,
                    onPerfil: onPerfilTap
                ),
                lados: 18, arriba: 8, abajo: 8
            )

            // Registro con correo personal: recordatorio de confirmar la UDLAP, en una línea.
            fila(AvisoUdlapView(), lados: 18, arriba: 0, abajo: 0)

            fila(segmento, lados: 18, arriba: 4, abajo: 6)

            fila(
                EventosEnVivoBanner(onEventoTap: onEventoTap, onAventonesTap: onAventonesTap),
                lados: 14, arriba: 6, abajo: 0
            )

            fila(PreguntaDelDiaBanner(), lados: 14, arriba: 6, abajo: 6)

            contenido
        }
        .listStyle(.plain)
        // Las filas sin datos quedan en 0 pt en vez del alto mínimo de fila.
        .environment(\.defaultMinListRowHeight, 0)
        .scrollContentBackground(.hidden)
        .background(AgoraDesign.Colors.fondo)
        .animation(AgoraDesign.Animation.spring, value: posts.map(\.id))
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await traer(desde: nil, reemplazar: true) }
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
                        title: "Tu carrera aún no publica",
                        subtitle: "Lo que publiques aquí lo ve toda tu carrera."
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
                    lados: 14, arriba: 6, abajo: 6
                )
            }
        } else {
            ForEach(Array(posts.enumerated()), id: \.element.id) { indice, post in
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
                        }
                    )
                    .onAppear {
                        if post.id == posts.last?.id {
                            Task { await cargarMas() }
                        }
                    },
                    lados: 14, arriba: 6, abajo: 6
                )

                if indice == 0 && !clips.isEmpty {
                    fila(FilaClips(clips: clips, onClipTap: onClipsTap), lados: 14, arriba: 12, abajo: 6)
                }
                if indice == indiceMiniEvento {
                    fila(MiniEventoInicio(onEventoTap: onEventoTap), lados: 14, arriba: 12, abajo: 6)
                }
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

    /// Fila de la lista sin separador ni fondo, con los márgenes del diseño D.
    private func fila<V: View>(_ vista: V, lados: CGFloat = 14, arriba: CGFloat, abajo: CGFloat) -> some View {
        vista
            .listRowInsets(EdgeInsets(top: arriba, leading: lados, bottom: abajo, trailing: lados))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }

    private var miCarrera: ComunidadDto? {
        comunidades.first { $0.slug.hasPrefix("carrera:") && !$0.estaSilenciada }
    }

    /// Campus / Mi carrera / Siguiendo: fondo `superficie-2`, el activo en `superficie` con sombra leve.
    private var segmento: some View {
        HStack(spacing: 0) {
            opcionSegmento("Campus", activo: !siguiendo && comunidadSlug == nil) {
                siguiendo = false
                comunidadSlug = nil
            }
            if let carrera = miCarrera {
                opcionSegmento("Mi carrera", activo: !siguiendo && comunidadSlug == carrera.slug) {
                    siguiendo = false
                    comunidadSlug = carrera.slug
                }
            }
            opcionSegmento("Siguiendo", activo: siguiendo) {
                siguiendo = true
                comunidadSlug = nil
            }
        }
        .padding(4)
        .background(
            AgoraDesign.Colors.superficie2,
            in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
        )
    }

    private func opcionSegmento(_ texto: String, activo: Bool, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Text(texto)
                .font(.outfit(.subheadline, activo ? .bold : .medium))
                .foregroundStyle(activo ? AgoraDesign.Colors.texto : AgoraDesign.Colors.textoMedio)
                .frame(maxWidth: .infinity, minHeight: 38)
                .background {
                    if activo {
                        RoundedRectangle(cornerRadius: 11, style: .continuous)
                            .fill(AgoraDesign.Colors.superficie)
                            .shadow(color: .black.opacity(0.12), radius: 1, y: 1)
                    }
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityAddTraits(activo ? .isSelected : [])
    }

    /// «Lunes 26 de octubre», con la hora del campus. Sin semana del semestre: la API no la da.
    static func fechaDeHoy(_ ahora: Date = Date()) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.timeZone = TimeZone(identifier: "America/Mexico_City")
        f.dateFormat = "EEEE d 'de' MMMM"
        let texto = f.string(from: ahora)
        return texto.prefix(1).uppercased() + texto.dropFirst()
    }

    private func cargarComunidades() async {
        do {
            comunidades = try await AgoraApi.misComunidades()
        } catch {
            // El segmento sigue funcionando sin «Mi carrera».
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

/// «Ágora» y la fecha; a la derecha Avisos, Mensajes y tu avatar con la racha
/// (artboard «Inicio · encabezado con Avisos y aviso UDLAP en una línea»).
struct EncabezadoInicio: View {
    var avisosSinLeer: Int
    var mensajesSinLeer: Int
    var onAvisos: () -> Void
    var onMensajes: () -> Void
    var onPerfil: () -> Void

    @ObservedObject private var session = SessionStore.shared
    @State private var racha = 0
    @State private var fotoUrl: String?

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Ágora")
                    .font(.bricolage(30, relativeTo: .largeTitle))
                    .tracking(-0.6)
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .accessibilityAddTraits(.isHeader)
                Text(FeedView.fechaDeHoy())
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
            Spacer(minLength: 8)
            HStack(spacing: 6) {
                botonIcono(
                    "bell",
                    etiqueta: avisosSinLeer > 0 ? "Avisos, \(avisosSinLeer) sin leer" : "Avisos",
                    cuenta: avisosSinLeer,
                    id: "inicio.avisos",
                    accion: onAvisos
                )
                botonIcono(
                    "paperplane",
                    etiqueta: mensajesSinLeer > 0 ? "Mensajes, \(mensajesSinLeer) sin leer" : "Mensajes",
                    cuenta: mensajesSinLeer,
                    id: "inicio.mensajes",
                    accion: onMensajes
                )
                Button(action: onPerfil) {
                    AvatarD(nombre: nombre, fotoUrl: fotoUrl, tamano: 44)
                        .overlay(alignment: .bottomTrailing) {
                            if racha > 0 {
                                HStack(spacing: 1) {
                                    Image(systemName: "flame.fill")
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundStyle(Color(red: 1, green: 138 / 255, blue: 76 / 255))
                                    Text("\(racha)")
                                        .font(.outfit(.caption2, .bold))
                                        .foregroundStyle(.white)
                                }
                                .padding(.leading, 3)
                                .padding(.trailing, 5)
                                .padding(.vertical, 1)
                                .background(Color(red: 20 / 255, green: 17 / 255, blue: 15 / 255), in: Capsule())
                                .overlay(Capsule().stroke(AgoraDesign.Colors.fondo, lineWidth: 2))
                                .offset(x: 6, y: 6)
                            }
                        }
                }
                .buttonStyle(.agoraPlain)
                .accessibilityLabel(racha > 0 ? "Tu perfil, racha de \(racha) días" : "Tu perfil")
                .accessibilityIdentifier("inicio.perfil")
            }
        }
        .task { await cargar() }
    }

    private var nombre: String {
        session.currentUser?.nombre ?? session.currentUser?.handle ?? "?"
    }

    private func botonIcono(_ icono: String, etiqueta: String, cuenta: Int, id: String, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Image(systemName: icono)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .frame(width: 44, height: 44)
                .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
                .overlay(alignment: .topTrailing) {
                    if cuenta > 0 {
                        Text(cuenta > 9 ? "9+" : "\(cuenta)")
                            .font(.outfit(.caption2, .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .frame(minWidth: 18, minHeight: 18)
                            .background(AgoraDesign.Colors.naranja, in: Capsule())
                            .overlay(Capsule().stroke(AgoraDesign.Colors.fondo, lineWidth: 2))
                            .offset(x: 5, y: -5)
                    }
                }
        }
        .buttonStyle(.agoraPlain)
        .accessibilityLabel(etiqueta)
        .accessibilityIdentifier(id)
    }

    private func cargar() async {
        if let perfil = try? await AgoraApi.perfilMio() {
            fotoUrl = perfil.fotoUrl
        }
        if let gamificacion = try? await AgoraApi.gamificacionMio() {
            racha = gamificacion.rachaActual
        }
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
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .accessibilityAddTraits(.isHeader)
                Text("Todavía no hay publicaciones aquí. Lo primero que subas lo ve toda la UDLAP.")
                    .font(.outfit(.body))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
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
        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous))
    }

    private func botonSecundario(_ texto: String, icono: String, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Label(texto, systemImage: icono)
                .font(.outfit(.subheadline, .semibold))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
        }
        .buttonStyle(.agoraPlain)
    }
}

// MARK: - Mini evento

/// «Tu generación va» / «Van N» (docs/diseno-d.md §3): el próximo evento al que aún no vas,
/// con bloque de fecha naranja y «Voy». Sin evento próximo no sale.
struct MiniEventoInicio: View {
    var onEventoTap: (String) -> Void

    @State private var evento: EventoDto?
    @State private var voy = false
    @State private var enviando = false

    var body: some View {
        VStack(spacing: 0) {
            if let evento {
                tarjeta(evento)
            }
        }
        .task { await cargar() }
    }

    private func tarjeta(_ evento: EventoDto) -> some View {
        let partes = FormatUtils.partesFecha(evento.inicioAt)
        return HStack(spacing: 12) {
            Button {
                onEventoTap(evento.id)
            } label: {
                HStack(spacing: 12) {
                    VStack(spacing: 0) {
                        Text(partes?.dia ?? "")
                            .font(.outfit(.caption2, .bold))
                            .tracking(0.6)
                        Text(partes?.numero ?? "")
                            .font(.bricolage(30, relativeTo: .title))
                    }
                    .foregroundStyle(.white)
                    .frame(width: 64, height: 72)
                    .background(AgoraDesign.Colors.naranja, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                    VStack(alignment: .leading, spacing: 3) {
                        Text(Self.etiqueta(evento).uppercased())
                            .font(.outfit(.caption2, .bold))
                            .tracking(0.5)
                            .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                            .lineLimit(1)
                        Text(evento.titulo)
                            .font(.outfit(.callout, .semibold))
                            .foregroundStyle(AgoraDesign.Colors.texto)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Text([partes?.hora, evento.lugar].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.outfit(.caption))
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.agoraPlain)

            Button {
                Task { await irAlEvento(evento) }
            } label: {
                Text(voy ? "Vas" : "Voy")
                    .font(.outfit(.subheadline, .bold))
                    .foregroundStyle(voy ? AgoraDesign.Colors.texto : AgoraDesign.Colors.fondo)
                    .padding(.horizontal, 16)
                    .frame(minHeight: 44)
                    .background(
                        voy ? AgoraDesign.Colors.superficie2 : AgoraDesign.Colors.texto,
                        in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                    )
            }
            .buttonStyle(.agoraPlain)
            .disabled(voy || enviando)
            .accessibilityLabel(voy ? "Vas a \(evento.titulo)" : "Voy a \(evento.titulo)")
        }
        .padding(14)
        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous))
    }

    /// Solo lo que la API dice (`GET /eventos` ya filtra por tus comunidades), como en Android.
    static func etiqueta(_ evento: EventoDto) -> String {
        let van = evento.vanAIr ?? 0
        if evento.comunidad?.slug.hasPrefix("generacion:") == true && van > 0 {
            return "Tu generación va · \(van)"
        }
        let primero = evento.asistentes?.first?.nombre?
            .split(separator: " ").first.map(String.init)
        if let primero, van > 1 { return "Van \(primero) y \(van - 1) más" }
        if let primero { return "Va \(primero)" }
        if van == 1 { return "Va 1 persona" }
        if van > 1 { return "Van \(van)" }
        return evento.comunidad?.nombre ?? "Próximo evento"
    }

    private func cargar() async {
        guard evento == nil else { return }
        let ahora = Date()
        let resp = try? await AgoraApi.eventosProximos()
        evento = resp?.eventos?.first { e in
            e.miRespuesta != "VOY" && (FormatUtils.parseISO(e.inicioAt) ?? .distantPast) > ahora
        }
    }

    private func irAlEvento(_ evento: EventoDto) async {
        enviando = true
        defer { enviando = false }
        do {
            try await AgoraApi.responderEvento(id: evento.id, respuesta: "VOY")
            Haptics.success()
            voy = true
        } catch {
            // Sin red o el evento se llenó: el botón se queda en «Voy» para reintentar.
        }
    }
}
