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

    @State private var posts: [PostDto] = []
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
                        PreguntaDelDiaBanner()
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    Section {
                        CampusPulseBanner(
                            onHashtagTap: onHashtagTap,
                            onPerfilTap: onAuthorTap
                        )
                        .listRowInsets(EdgeInsets(
                            top: AgoraDesign.Spacing.xxs,
                            leading: AgoraDesign.Spacing.sm,
                            bottom: AgoraDesign.Spacing.xxs,
                            trailing: AgoraDesign.Spacing.sm
                        ))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }

                    Section {
                        EventosEnVivoBanner(onEventoTap: onEventoTap)
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    Section {
                        RachaBadgeRow()
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    Section {
                        RetoSemanalBanner()
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    Section {
                        RetosAmigosRow()
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    Section {
                        RetosRankingSemanalRow(onPerfilTap: onAuthorTap)
                        RetosHistorialRow(onPerfilTap: onAuthorTap)
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    Section {
                        LeaderboardRachasRow(onPerfilTap: onAuthorTap)
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    Section {
                        CampusTipBanner()
                            .listRowInsets(EdgeInsets(
                                top: AgoraDesign.Spacing.xxs,
                                leading: AgoraDesign.Spacing.sm,
                                bottom: AgoraDesign.Spacing.xxs,
                                trailing: AgoraDesign.Spacing.sm
                            ))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    Section {
                        filtrosFeed
                    }
                    .listRowInsets(EdgeInsets(
                        top: AgoraDesign.Spacing.xs,
                        leading: AgoraDesign.Spacing.sm,
                        bottom: AgoraDesign.Spacing.xxs,
                        trailing: AgoraDesign.Spacing.sm
                    ))
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
                                onHashtagTap: onHashtagTap
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
                .scrollContentBackground(.hidden)
                .background(AgoraDesign.Colors.fondo)
                .animation(AgoraDesign.Animation.spring, value: posts.map(\.id))
            }
        }
        .navigationTitle("Feed")
        .refreshable { await traer(desde: nil, reemplazar: true) }
        .task(id: feedTrigger) { await traer(desde: nil, reemplazar: true) }
        .task { await cargarComunidades() }
    }

    private var filtrosFeed: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filtroChip("Siguiendo", selected: siguiendo) {
                    siguiendo.toggle()
                    if siguiendo { comunidadSlug = nil }
                }
                filtroChip("Todas", selected: comunidadSlug == nil && !siguiendo) {
                    siguiendo = false
                    comunidadSlug = nil
                }
                ForEach(comunidades, id: \.slug) { c in
                    filtroChip(c.nombre, selected: comunidadSlug == c.slug) {
                        siguiendo = false
                        comunidadSlug = c.slug
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    private func filtroChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .lineLimit(1)
                .padding(.horizontal, AgoraDesign.Spacing.sm)
                .padding(.vertical, AgoraDesign.Spacing.xs)
                .background(selected ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                .foregroundStyle(selected ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
                .clipShape(Capsule())
                .overlay {
                    Capsule()
                        .stroke(selected ? AgoraDesign.Colors.naranja.opacity(0.3) : AgoraDesign.Colors.borde, lineWidth: 1)
                }
        }
        .buttonStyle(.plain)
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

struct EventosView: View {
    var onEventoTap: (String) -> Void = { _ in }
    var onCreateTap: () -> Void = {}

    @State private var eventos: [EventoDto] = []
    @State private var cargando = true
    @State private var error: String?

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
        .task { await cargar() }
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.eventosProximos()
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
                Text("\(evento.vanAIr ?? 0) van · \(evento.costoMxn.map { "$\($0) MXN" } ?? "Gratis")")
                    .font(.caption)
                    .foregroundStyle(AgoraTheme.accent)

                Button {
                    onAsistencia(true)
                } label: {
                    Text(yaVoy ? "✓ Voy (tocar para quitar)" : "Voy")
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.borderedProminent)
                .tint(yaVoy ? .clear : AgoraTheme.accent)
                .foregroundStyle(yaVoy ? AgoraTheme.accent : .white)
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
        .buttonStyle(.plain)
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
    var onPrivacidadTap: (() -> Void)?
    var onModeracionTap: (() -> Void)?
    var onMarketplaceTap: (() -> Void)?
    var onAventonesTap: (() -> Void)?
    var onAnonimoTap: (() -> Void)?
    var onMasTap: (() -> Void)?

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

                                if let email = session.currentUser?.email {
                                    Text(email)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

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
                        if let onAjustesTap {
                            enlacePerfil(titulo: "Ajustes", icono: "gearshape", action: onAjustesTap)
                        }
                        if let onTerminosTap {
                            enlacePerfil(titulo: "Términos de uso", icono: "doc.text", action: onTerminosTap)
                        }
                        if let onPrivacidadTap {
                            enlacePerfil(titulo: "Política de privacidad", icono: "hand.raised", action: onPrivacidadTap)
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
        .buttonStyle(.plain)
    }
}

// MARK: - Flow layout (chips)

private struct FlowLayout: Layout {
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
