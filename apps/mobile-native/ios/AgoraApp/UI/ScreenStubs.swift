import SwiftUI
import PhotosUI
import UIKit

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
                        .font(.outfit(.subheadline, .bold))
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
                                .font(.outfit(.subheadline))
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
                    .font(.outfit(.headline))
                    .foregroundStyle(.primary)
                Text(FormatUtils.formatearFecha(evento.inicioAt))
                    .font(.outfit(.subheadline))
                    .foregroundStyle(.secondary)
                if let lugar = evento.lugar, !lugar.isEmpty {
                    Text(lugar)
                        .font(.outfit(.caption))
                        .foregroundStyle(.secondary)
                }
                if let descripcion = evento.descripcion, !descripcion.isEmpty {
                    Text(descripcion)
                        .font(.outfit(.subheadline))
                        .foregroundStyle(.primary)
                        .lineLimit(3)
                }
                Text(resumenAsistencia)
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraTheme.accent)

                Button {
                    onAsistencia(true)
                } label: {
                    Text(yaVoy ? "✓ Vas a ir" : "Voy")
                        .font(.outfit(.subheadline, .bold))
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
                .font(.outfit(.body))
                .fontWeight(notificacion.leida ? .regular : .semibold)
            Text(FormatUtils.formatearFecha(notificacion.createdAt))
                .font(.outfit(.caption))
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
                                    .font(.bricolage(.title2, extra: false))
                                Text(nombreCompleto)
                                    .font(.outfit(.headline))
                                if let bio = perfil?.bio, !bio.isEmpty {
                                    Text(bio)
                                        .font(.outfit(.subheadline))
                                        .foregroundStyle(.secondary)
                                }

                                GamificacionProfileSection(gamificacion: gamificacion)

                                if let miHandle = perfil?.handle ?? session.currentUser?.handle {
                                    HStack(spacing: AgoraDesign.Spacing.md) {
                                        if let onSeguidoresTap {
                                            Button("Seguidores") { onSeguidoresTap(miHandle) }
                                                .font(.outfit(.caption, .bold))
                                        }
                                        if let onSiguiendoTap {
                                            Button("Siguiendo") { onSiguiendoTap(miHandle) }
                                                .font(.outfit(.caption, .bold))
                                        }
                                    }
                                    .foregroundStyle(AgoraDesign.Colors.naranja)
                                }

                                if let email = session.currentUser?.email {
                                    Text(email)
                                        .font(.outfit(.caption))
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
                    .font(.bricolage(.title, extra: false))
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
                    .font(.outfit(.caption))
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
