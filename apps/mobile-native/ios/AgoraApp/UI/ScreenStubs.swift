import SwiftUI
import PhotosUI
import UIKit

// MARK: - Eventos (ver `CarteleraView.swift`)

// MARK: - Publicar (ver `PublicarView.swift`)

// MARK: - Notificaciones

/// Avisos de B «Cholula» (artboard WowB-Avisos): sello por tipo a la izquierda y los avisos del mismo
/// tipo sobre lo mismo agrupados aquí en el cliente («A Diego, Isa y 3 más les gustó tu publicación»).
struct NotificacionesView: View {
    @State private var notificaciones: [NotificacionDto] = []
    @State private var cargando = true
    @State private var error: String?

    private var grupos: [GrupoAvisos] { GrupoAvisos.agrupar(notificaciones) }

    var body: some View {
        VStack(spacing: 0) {
            CabezaCholula(titulo: "Avisos")
            Group {
                if cargando && notificaciones.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error, notificaciones.isEmpty {
                    AgoraErrorState(message: error) {
                        Task { await cargar() }
                    }
                } else if notificaciones.isEmpty {
                    AgoraEmptyState(
                        emoji: "",
                        title: AgoraCopy.avisosEmptyTitle,
                        subtitle: AgoraCopy.avisosEmptySubtitle
                    )
                } else {
                    List(grupos) { grupo in
                        FilaAviso(grupo: grupo)
                            .listRowInsets(EdgeInsets())
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .animation(AgoraDesign.Animation.spring, value: grupos.map(\.id))
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
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

/// Avisos del mismo tipo sobre la misma cosa (misma publicación, conversación o, para seguidores, el
/// mismo día), con quiénes fueron. Uno solo se queda con su texto original.
private struct GrupoAvisos: Identifiable {
    let id: String
    let tipo: String
    let avisos: [NotificacionDto]

    private var principal: NotificacionDto { avisos[0] }
    var createdAt: String { principal.createdAt }
    var leida: Bool { avisos.allSatisfy(\.leida) }

    /// Nombres de pila distintos, del más reciente al más viejo.
    private var nombres: [String] {
        var vistos = Set<String>()
        return avisos.compactMap { aviso -> String? in
            guard let nombre = aviso.actor?.nombre?.split(separator: " ").first.map(String.init),
                  vistos.insert(nombre).inserted else { return nil }
            return nombre
        }
    }

    /// «Diego», «Diego e Isa», «Diego, Isa y 3 más».
    private var quienes: String? {
        let lista = nombres
        guard let primero = lista.first else { return nil }
        if lista.count == 1 { return primero }
        let segundo = lista[1]
        if lista.count == 2 {
            let y = segundo.lowercased().hasPrefix("i") || segundo.lowercased().hasPrefix("hi") ? "e" : "y"
            return "\(primero) \(y) \(segundo)"
        }
        return "\(primero), \(segundo) y \(lista.count - 2) más"
    }

    /// Texto del grupo; si no hay varias personas, el del aviso tal cual llegó.
    var texto: String {
        guard nombres.count > 1, let quienes else { return principal.texto }
        switch tipo {
        case "REACCION": return "A \(quienes) les gustó tu publicación"
        case "COMENTARIO": return "\(quienes) comentaron tu publicación"
        case "MENCION": return "\(quienes) te mencionaron"
        case "SEGUIDOR": return "\(quienes) empezaron a seguirte"
        case "MENSAJE": return "\(quienes) te escribieron"
        default: return principal.texto
        }
    }

    /// Sello por tipo: texto corto en mayúsculas y su color.
    var sello: (texto: String, fondo: Color, tinta: Color) {
        switch tipo {
        case "REACCION": return ("LATE", AgoraDesign.Colors.adobe, .white)
        case "COMENTARIO": return ("COMENTA", AgoraDesign.Colors.talavera, .white)
        case "MENCION": return ("TE NOMBRA", AgoraDesign.Colors.talavera, .white)
        case "MENSAJE": return ("MENSAJE", AgoraDesign.Colors.jade, .white)
        case "EVENTO_NUEVO", "EVENTO_RECORDATORIO": return ("EVENTO", AgoraDesign.Colors.jade, .white)
        case "AVENTON_APARTADO", "AVENTON_CANCELADO", "AVENTON_RECORDATORIO":
            return ("AVENTÓN", AgoraDesign.Colors.maiz, AgoraDesign.Colors.sobreMaiz)
        case "SEGUIDOR": return ("TE SIGUE", AgoraDesign.Colors.adobe, .white)
        case "INSIGNIA": return ("SELLO", AgoraDesign.Colors.maiz, AgoraDesign.Colors.sobreMaiz)
        case "RETO": return ("RETO", AgoraDesign.Colors.adobe, .white)
        default: return ("AVISO", AgoraDesign.Colors.texto, AgoraDesign.Colors.fondo)
        }
    }

    private static let agrupables: Set<String> = ["REACCION", "COMENTARIO", "MENCION", "SEGUIDOR", "MENSAJE"]

    /// Conserva el orden de llegada (el grupo va donde está su aviso más reciente).
    static func agrupar(_ avisos: [NotificacionDto]) -> [GrupoAvisos] {
        var orden: [String] = []
        var porLlave: [String: [NotificacionDto]] = [:]
        for aviso in avisos {
            let llave: String
            if agrupables.contains(aviso.tipo) {
                let sobre = aviso.tipo == "SEGUIDOR" ? String(aviso.createdAt.prefix(10)) : (aviso.url ?? aviso.id)
                llave = "\(aviso.tipo)|\(sobre)"
            } else {
                llave = aviso.id
            }
            if porLlave[llave] == nil { orden.append(llave) }
            porLlave[llave, default: []].append(aviso)
        }
        return orden.compactMap { llave in
            guard let lista = porLlave[llave], let primero = lista.first else { return nil }
            return GrupoAvisos(id: primero.id, tipo: primero.tipo, avisos: lista)
        }
    }
}

private struct FilaAviso: View {
    let grupo: GrupoAvisos

    var body: some View {
        let sello = grupo.sello
        HStack(alignment: .center, spacing: 12) {
            Sello(texto: sello.texto, fondo: sello.fondo, tinta: sello.tinta, alto: 22)
                .frame(width: 84, alignment: .leading)
            (Text(grupo.texto)
                .fontWeight(grupo.leida ? .regular : .semibold)
                .foregroundColor(AgoraDesign.Colors.texto)
                + Text(" · \(FormatUtils.haceCuanto(grupo.createdAt))")
                .foregroundColor(AgoraDesign.Colors.textoMedio))
                .font(.outfit(.subheadline))
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(grupo.leida ? Color.clear : AgoraDesign.Colors.naranjaSuave.opacity(0.45))
        .overlay(alignment: .bottom) {
            AgoraDesign.Colors.borde.frame(height: 1)
        }
        .accessibilityElement(children: .combine)
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
