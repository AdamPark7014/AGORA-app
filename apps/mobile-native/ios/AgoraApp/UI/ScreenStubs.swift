import SwiftUI
import PhotosUI
import UIKit

// MARK: - Feed

struct FeedView: View {
    var reloadKey: Int = 0
    var onPostTap: (String) -> Void = { _ in }
    var onAuthorTap: (String) -> Void = { _ in }
    var onHashtagTap: (String) -> Void = { _ in }
    var onEventoTap: (String) -> Void = { _ in }
    var onClipsTap: (String?) -> Void = { _ in }

    @State private var posts: [PostDto] = []
    @State private var cursor: String?
    @State private var comunidades: [ComunidadDto] = []
    @State private var comunidadSlug: String?
    @State private var siguiendo = false
    @State private var cargando = true
    @State private var cargandoMas = false
    @State private var error: String?
    @ObservedObject private var network = NetworkMonitor.shared
    /// «Tu día» plegado o abierto, como lo dejó la persona (igual que la tira de la web).
    @AppStorage("agora.tuDiaAbierto") private var tuDiaAbierto = false

    private var feedTrigger: String {
        "\(reloadKey)|\(comunidadSlug ?? "")|\(siguiendo)"
    }

    var body: some View {
        Group {
            if cargando && posts.isEmpty {
                AgoraFeedSkeleton()
            } else if let error, posts.isEmpty {
                AgoraErrorState(message: error) {
                    Task { await traer(desde: nil, reemplazar: true) }
                }
            } else {
                List {
                    if !network.isOnline {
                        Section {
                            OfflineBanner()
                                .listRowInsets(EdgeInsets(
                                    top: AgoraDesign.Spacing.xs,
                                    leading: AgoraDesign.Spacing.sm,
                                    bottom: AgoraDesign.Spacing.xxs,
                                    trailing: AgoraDesign.Spacing.sm
                                ))
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                        }
                    }

                    Section {
                        cabeceraInicio
                    }
                    .listRowInsets(EdgeInsets(top: 4, leading: 18, bottom: 6, trailing: 18))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)

                    // Diseño D (docs/diseno-d.md §4): lo del campus arriba y la gamificación
                    // plegada en «Tu día», para que la primera publicación se vea sin bajar tanto.
                    Group {
                        Section {
                            EventosEnVivoBanner(onEventoTap: onEventoTap)
                        }
                        Section {
                            PreguntaDelDiaBanner()
                        }
                        Section {
                            tuDia
                        }
                        Section {
                            FilaClips(onClipTap: onClipsTap)
                        }
                    }
                    .listRowInsets(EdgeInsets(top: 4, leading: 14, bottom: 4, trailing: 14))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)

                    if posts.isEmpty {
                        AgoraEmptyState(
                            emoji: "🌱",
                            title: AgoraCopy.feedEmptyTitle,
                            subtitle: error ?? AgoraCopy.feedEmptySubtitle
                        )
                        .listRowBackground(Color.clear)
                    } else {
                        ForEach(posts) { post in
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
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                            .onAppear {
                                if post.id == posts.last?.id {
                                    Task { await cargarMas() }
                                }
                            }
                        }
                        if cargandoMas {
                            HStack {
                                Spacer()
                                ProgressView()
                                    .tint(AgoraDesign.Colors.naranja)
                                Spacer()
                            }
                            .listRowBackground(Color.clear)
                        }
                    }
                }
                .listStyle(.plain)
                // Banners sin datos quedan en 0 pt en vez del alto mínimo de fila.
                .environment(\.defaultMinListRowHeight, 0)
                .scrollContentBackground(.hidden)
                .background(AgoraDesign.Colors.fondo)
                .animation(AgoraDesign.Animation.spring, value: posts.map(\.id))
            }
        }
        .navigationTitle("Inicio")
        .refreshable { await traer(desde: nil, reemplazar: true) }
        .task(id: feedTrigger) { await traer(desde: nil, reemplazar: true) }
        .task { await cargarComunidades() }
    }

    private var miCarrera: ComunidadDto? {
        comunidades.first { $0.slug.hasPrefix("carrera:") && !$0.estaSilenciada }
    }

    /// Las que no cubre el segmento (generación, colegio, escuela…) van como chips.
    private var otrasComunidades: [ComunidadDto] {
        comunidades.filter {
            !$0.estaSilenciada && $0.slug != "universidad:udlap" && $0.slug != miCarrera?.slug
        }
    }

    private var cabeceraInicio: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(Self.fechaDeHoy())
                .font(.footnote)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)

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

            if !otrasComunidades.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(otrasComunidades, id: \.slug) { c in
                            filtroChip(c.nombre, selected: !siguiendo && comunidadSlug == c.slug) {
                                siguiendo = false
                                comunidadSlug = c.slug
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    private func opcionSegmento(_ texto: String, activo: Bool, accion: @escaping () -> Void) -> some View {
        Button(action: accion) {
            Text(texto)
                .font(.subheadline.weight(activo ? .bold : .medium))
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

    /// «Lunes 26 de octubre», con la hora del campus.
    static func fechaDeHoy(_ ahora: Date = Date()) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.timeZone = TimeZone(identifier: "America/Mexico_City")
        f.dateFormat = "EEEE d 'de' MMMM"
        let texto = f.string(from: ahora)
        return texto.prefix(1).uppercased() + texto.dropFirst()
    }

    /// Racha, retos, ranking y tips: a un toque, sin empujar las publicaciones hacia abajo.
    private var tuDia: some View {
        DisclosureGroup(isExpanded: $tuDiaAbierto) {
            VStack(spacing: 8) {
                RachaBadgeRow()
                RetoSemanalBanner()
                RetosAmigosRow()
                RetosRankingSemanalRow(onPerfilTap: onAuthorTap)
                RetosHistorialRow(onPerfilTap: onAuthorTap)
                LeaderboardRachasRow(onPerfilTap: onAuthorTap)
                CampusPulseBanner(onHashtagTap: onHashtagTap, onPerfilTap: onAuthorTap)
                CampusTipBanner()
            }
            .padding(.top, 10)
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text("Tu día")
                    .font(.subheadline.bold())
                    .foregroundStyle(AgoraDesign.Colors.texto)
                Text("Racha, retos y lo que se mueve en el campus")
                    .font(.caption)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
        }
        .tint(AgoraDesign.Colors.textoMedio)
        .padding(14)
        .background(
            AgoraDesign.Colors.superficie,
            in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous)
                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
        }
    }

    private func filtroChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .lineLimit(1)
                .padding(.horizontal, 14)
                .frame(minHeight: 36)
                .background(selected ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                .foregroundStyle(selected ? AgoraDesign.Colors.naranjaTinta : AgoraDesign.Colors.texto)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous)
                        .stroke(selected ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde, lineWidth: 1)
                }
        }
        .buttonStyle(.agoraPlain)
    }

    private func cargarComunidades() async {
        do {
            comunidades = try await AgoraApi.misComunidades()
        } catch {
            // Filtros opcionales; el feed sigue funcionando sin comunidades.
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

// MARK: - Eventos

private let iconoTipoEvento: [String: String] = [
    "FIESTA": "🎉",
    "ACADEMICO": "📚",
    "DEPORTIVO": "⚽",
    "CULTURAL": "🎭",
    "ORGANIZACION": "🏛️",
    "OTRO": "📌",
]

private let filtrosTipoEvento: [(valor: String, etiqueta: String)] = [
    ("", "Todos"),
    ("FIESTA", "🎉 Fiesta"),
    ("ACADEMICO", "📚 Académico"),
    ("DEPORTIVO", "⚽ Deportivo"),
    ("CULTURAL", "🎭 Cultural"),
    ("ORGANIZACION", "🏛️ Organización"),
    ("OTRO", "📌 Otro"),
]

struct EventosView: View {
    var onEventoTap: (String) -> Void = { _ in }
    var onCreateTap: () -> Void = {}

    @State private var eventos: [EventoDto] = []
    @State private var cargando = true
    @State private var error: String?
    /// Filtro por tipo (`GET eventos?tipo=`), igual que el select de la web.
    @State private var tipo = ""

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button(action: onCreateTap) {
                    Text("+ Crear evento")
                        .font(.subheadline.bold())
                }
                .buttonStyle(.borderedProminent)
                .tint(AgoraTheme.accent)
            }
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, AgoraDesign.Spacing.xs)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(filtrosTipoEvento, id: \.valor) { filtro in
                        Button {
                            tipo = filtro.valor
                        } label: {
                            Text(filtro.etiqueta)
                                .font(.subheadline)
                                .lineLimit(1)
                                .padding(.horizontal, AgoraDesign.Spacing.sm)
                                .padding(.vertical, AgoraDesign.Spacing.xs)
                                .background(tipo == filtro.valor ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                                .foregroundStyle(tipo == filtro.valor ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
                                .clipShape(Capsule())
                                .overlay {
                                    Capsule()
                                        .stroke(
                                            tipo == filtro.valor ? AgoraDesign.Colors.naranja.opacity(0.3) : AgoraDesign.Colors.borde,
                                            lineWidth: 1
                                        )
                                }
                        }
                        .buttonStyle(.agoraPlain)
                    }
                }
                .padding(.horizontal, AgoraDesign.Spacing.sm)
                .padding(.bottom, AgoraDesign.Spacing.xs)
            }

            Group {
                if cargando && eventos.isEmpty {
                    AgoraFeedSkeleton(itemCount: 2)
                } else if let error, eventos.isEmpty {
                    AgoraErrorState(message: error) {
                        Task { await cargar() }
                    }
                } else if eventos.isEmpty {
                    AgoraEmptyState(
                        emoji: "📅",
                        title: AgoraCopy.eventosEmptyTitle,
                        subtitle: AgoraCopy.eventosEmptySubtitle
                    )
                } else {
                    List(eventos) { evento in
                        EventoCardView(evento: evento) {
                            onEventoTap(evento.id)
                        } onAsistencia: { voy in
                            Task { await marcarAsistencia(evento: evento, voy: voy) }
                        }
                        .listRowInsets(EdgeInsets(
                            top: AgoraDesign.Spacing.xxs,
                            leading: AgoraDesign.Spacing.sm,
                            bottom: AgoraDesign.Spacing.xxs,
                            trailing: AgoraDesign.Spacing.sm
                        ))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .background(AgoraDesign.Colors.fondo)
                    .animation(AgoraDesign.Animation.spring, value: eventos.map(\.id))
                }
            }
        }
        .navigationTitle("Eventos")
        .refreshable { await cargar() }
        .task(id: tipo) { await cargar() }
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.eventosProximos(tipo: tipo.isEmpty ? nil : tipo)
            eventos = resp.eventos ?? []
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func marcarAsistencia(evento: EventoDto, voy: Bool) async {
        do {
            try await AgoraApi.responderEvento(id: evento.id, respuesta: voy ? "VOY" : "ME_INTERESA")
            AgoraAnalytics.eventoAsistencia([
                "eventoId": evento.id,
                "respuesta": voy ? "VOY" : "ME_INTERESA",
            ])
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

private struct EventoCardView: View {
    let evento: EventoDto
    let onTap: () -> Void
    let onAsistencia: (Bool) -> Void

    private var icono: String { iconoTipoEvento[evento.tipo] ?? "📌" }
    private var yaVoy: Bool { evento.miRespuesta == "VOY" }

    /// «12 van · cupo 40 (28 libres) · Gratis».
    private var resumenAsistencia: String {
        let van = evento.vanAIr ?? 0
        var partes = ["\(van) van"]
        if let cupo = evento.cupo {
            let libres = max(0, cupo - van)
            partes.append(libres == 0 ? "cupo lleno (\(cupo))" : "cupo \(cupo) (\(libres) libres)")
        }
        if let costo = evento.costoMxn, costo > 0 {
            partes.append("$\(costo) MXN")
        } else {
            partes.append("Gratis")
        }
        return partes.joined(separator: " · ")
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                Text("\(icono) \(evento.titulo)")
                    .font(.headline)
                    .foregroundStyle(.primary)
                Text(FormatUtils.formatearFecha(evento.inicioAt))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let lugar = evento.lugar, !lugar.isEmpty {
                    Text(lugar)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let descripcion = evento.descripcion, !descripcion.isEmpty {
                    Text(descripcion)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .lineLimit(3)
                }
                Text(resumenAsistencia)
                    .font(.caption)
                    .foregroundStyle(AgoraTheme.accent)

                Button {
                    onAsistencia(true)
                } label: {
                    Text(yaVoy ? "✓ Vas a ir" : "Voy")
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.borderedProminent)
                .tint(yaVoy ? .clear : AgoraTheme.accent)
                .foregroundStyle(yaVoy ? AgoraTheme.accent : .white)
                .accessibilityHint(yaVoy ? "Toca para quitar tu respuesta" : "")
                .overlay {
                    if yaVoy {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AgoraTheme.accent, lineWidth: 1)
                    }
                }
            }
            .padding(AgoraDesign.Spacing.sm + 2)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                    .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
            }
        }
        .buttonStyle(.agoraPlain)
    }
}

// MARK: - Publicar (ver `PublicarView.swift`)

// MARK: - Notificaciones

struct NotificacionesView: View {
    @State private var notificaciones: [NotificacionDto] = []
    @State private var cargando = true
    @State private var error: String?

    var body: some View {
        Group {
            if cargando && notificaciones.isEmpty {
                AgoraFeedSkeleton(itemCount: 2)
            } else if let error, notificaciones.isEmpty {
                AgoraErrorState(message: error) {
                    Task { await cargar() }
                }
            } else if notificaciones.isEmpty {
                AgoraEmptyState(
                    emoji: "🔔",
                    title: AgoraCopy.avisosEmptyTitle,
                    subtitle: AgoraCopy.avisosEmptySubtitle
                )
            } else {
                List(notificaciones) { n in
                    NotificacionCardView(notificacion: n)
                        .listRowInsets(EdgeInsets(
                            top: AgoraDesign.Spacing.xxs,
                            leading: AgoraDesign.Spacing.sm,
                            bottom: AgoraDesign.Spacing.xxs,
                            trailing: AgoraDesign.Spacing.sm
                        ))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(AgoraDesign.Colors.fondo)
                .animation(AgoraDesign.Animation.spring, value: notificaciones.map(\.id))
            }
        }
        .navigationTitle("Avisos")
        .refreshable { await cargar() }
        .task { await cargar() }
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.notificaciones()
            notificaciones = resp.notificaciones ?? []
            try? await AgoraApi.marcarLeidas()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

private struct NotificacionCardView: View {
    let notificacion: NotificacionDto

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(notificacion.texto)
                .font(.body)
                .fontWeight(notificacion.leida ? .regular : .semibold)
            Text(FormatUtils.formatearFecha(notificacion.createdAt))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(notificacion.leida ? AgoraDesign.Colors.superficie : AgoraDesign.Colors.naranjaSuave)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
    }
}

// MARK: - Perfil

struct ProfileView: View {
    let onLogout: () -> Void
    var onMensajesTap: (() -> Void)?
    var onAjustesTap: (() -> Void)?
    var onTerminosTap: (() -> Void)?
    var onReglasTap: (() -> Void)?
    var onPrivacidadTap: (() -> Void)?
    var onModeracionTap: (() -> Void)?
    var onMarketplaceTap: (() -> Void)?
    var onAventonesTap: (() -> Void)?
    var onAnonimoTap: (() -> Void)?
    var onMasTap: (() -> Void)?
    /// Listas de seguidores / seguidos del propio perfil (reciben el @).
    var onSeguidoresTap: ((String) -> Void)?
    var onSiguiendoTap: ((String) -> Void)?

    @EnvironmentObject var session: SessionStore

    @State private var perfil: PerfilMioDto?
    @State private var gamificacion: GamificacionDto?
    @State private var cargando = true
    @State private var error: String?

    var body: some View {
        Group {
            if cargando {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error {
                VStack(spacing: 16) {
                    Text(error)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                    Button("Cerrar sesión", role: .destructive, action: onLogout)
                }
                .padding(24)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 16) {
                            fotoPerfil
                            VStack(alignment: .leading, spacing: 4) {
                                Text("@\(perfil?.handle ?? session.currentUser?.handle ?? "tu")")
                                    .font(.title2.bold())
                                Text(nombreCompleto)
                                    .font(.headline)
                                if let bio = perfil?.bio, !bio.isEmpty {
                                    Text(bio)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }

                                GamificacionProfileSection(gamificacion: gamificacion)

                                if let miHandle = perfil?.handle ?? session.currentUser?.handle {
                                    HStack(spacing: AgoraDesign.Spacing.md) {
                                        if let onSeguidoresTap {
                                            Button("Seguidores") { onSeguidoresTap(miHandle) }
                                                .font(.caption.bold())
                                        }
                                        if let onSiguiendoTap {
                                            Button("Siguiendo") { onSiguiendoTap(miHandle) }
                                                .font(.caption.bold())
                                        }
                                    }
                                    .foregroundStyle(AgoraDesign.Colors.naranja)
                                }

                                if let email = session.currentUser?.email {
                                    Text(email)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        Group {
                            if let onMensajesTap {
                                enlacePerfil(titulo: "Mensajes", icono: "bubble.left.and.bubble.right", action: onMensajesTap)
                            }
                            if let onMarketplaceTap {
                                enlacePerfil(titulo: "Marketplace", icono: "bag", action: onMarketplaceTap)
                            }
                            if let onAventonesTap {
                                enlacePerfil(titulo: "Aventones", icono: "car", action: onAventonesTap)
                            }
                            if let onAnonimoTap {
                                enlacePerfil(titulo: "Sin nombre", icono: "theatermasks", action: onAnonimoTap)
                            }
                            if let onMasTap {
                                enlacePerfil(titulo: "Más opciones", icono: "line.3.horizontal", action: onMasTap)
                            }
                        }
                        if let onAjustesTap {
                            enlacePerfil(titulo: "Ajustes", icono: "gearshape", action: onAjustesTap)
                        }
                        Group {
                            if let onTerminosTap {
                                enlacePerfil(titulo: "Términos de uso", icono: "doc.text", action: onTerminosTap)
                            }
                            if let onReglasTap {
                                enlacePerfil(titulo: "Reglas de la comunidad", icono: "checkmark.shield", action: onReglasTap)
                            }
                            if let onPrivacidadTap {
                                enlacePerfil(titulo: "Aviso de privacidad", icono: "hand.raised", action: onPrivacidadTap)
                            }
                        }
                        if session.currentUser?.puedeModerar == true, let onModeracionTap {
                            enlacePerfil(titulo: "Moderación", icono: "shield.lefthalf.filled", action: onModeracionTap)
                        }

                        Button("Cerrar sesión", role: .destructive, action: onLogout)
                            .frame(maxWidth: .infinity)
                    }
                    .padding(24)
                }
            }
        }
        .navigationTitle("Yo")
        .refreshable { await cargar() }
        .task { await cargar() }
    }

    private var nombreCompleto: String {
        let n = perfil?.nombre ?? session.currentUser?.nombre ?? ""
        let a = perfil?.apellidos ?? ""
        return "\(n) \(a)".trimmingCharacters(in: .whitespaces)
    }

    @ViewBuilder
    private var fotoPerfil: some View {
        if let url = ApiClient.shared.resolveUrl(perfil?.fotoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    avatarPlaceholder
                }
            }
            .frame(width: 72, height: 72)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(AgoraTheme.accent.opacity(0.15))
            .frame(width: 72, height: 72)
            .overlay {
                Text(String(nombreCompleto.prefix(1)).uppercased())
                    .font(.title.bold())
                    .foregroundStyle(AgoraTheme.accent)
            }
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            async let perfilTask = AgoraApi.perfilMio()
            async let gamificacionTask = AgoraApi.gamificacionMio()
            let loaded = try await perfilTask
            perfil = loaded
            OfflineCache.savePerfil(loaded)
            gamificacion = try? await gamificacionTask
        } catch {
            if let cached = OfflineCache.loadPerfil() {
                perfil = cached
            } else {
                self.error = FormatUtils.mensajeDe(error)
            }
        }
    }

    private func enlacePerfil(titulo: String, icono: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icono)
                Text(titulo)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(AgoraDesign.Spacing.sm)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        }
        .buttonStyle(.agoraPlain)
    }
}

// MARK: - Flow layout (chips)

/// Interno (no `private`): también lo usa `PublicarView.swift`.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
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
