import SwiftUI

func textoCompartirRacha(dias: Int) -> String {
    "Llevo 🔥 \(dias) días seguidos en Ágora — ¿te sumas? https://udlagora.com"
}

/// Fila compacta de racha + badges — paridad con `RachaBadgeRow.kt`.
struct RachaBadgeRow: View {
    var compact: Bool = true

    @State private var gamificacion: GamificacionDto?

    var body: some View {
        Group {
            if let data = gamificacion, data.rachaActual > 0 || !data.badges.isEmpty || data.comparacionCampus != nil || (data.duelosGanados ?? 0) > 0 {
                VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
                    HStack(spacing: AgoraDesign.Spacing.sm) {
                        if data.rachaActual > 0 {
                            rachaChip(dias: data.rachaActual)
                        }

                        if !data.badges.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(data.badges) { badge in
                                        BadgeEmojiTap(badge: badge, compact: compact)
                                    }
                                }
                            }
                        }

                        if data.rachaActual >= 2 {
                            ShareLink(item: textoCompartirRacha(dias: data.rachaActual)) {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(AgoraDesign.Colors.naranja)
                            }
                            .accessibilityLabel("Compartir racha")
                        }
                    }

                    if let comparacion = data.comparacionCampus {
                        comparacionCampusChip(comparacion)
                    }

                    if let ganados = data.duelosGanados, ganados > 0 {
                        Text("🏆 \(ganados) \(ganados == 1 ? "duelo ganando" : "duelos ganando")")
                            .font(.caption.bold())
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                            .padding(.horizontal, AgoraDesign.Spacing.sm)
                            .padding(.vertical, 6)
                            .background(AgoraDesign.Colors.naranjaSuave)
                            .clipShape(Capsule())
                    }
                }
                .padding(.horizontal, AgoraDesign.Spacing.sm + 2)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
            }
        }
        .task { await cargar() }
        .onReceive(NotificationCenter.default.publisher(for: .gamificacionRefresh)) { _ in
            Task { await cargar() }
        }
    }

    private func rachaChip(dias: Int) -> some View {
        Text("🔥 \(dias) \(dias == 1 ? "día" : "días")")
            .font(.caption.bold())
            .foregroundStyle(AgoraDesign.Colors.naranja)
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, 6)
            .background(AgoraDesign.Colors.naranjaSuave)
            .clipShape(Capsule())
    }

    private func comparacionCampusChip(_ comparacion: ComparacionCampusDto) -> some View {
        let promedio = Int(comparacion.promedioRacha.rounded())
        return Text("Tu racha vs campus: 🔥 \(comparacion.tuRacha) vs promedio \(promedio)")
            .font(.caption2)
            .foregroundStyle(comparacion.porEncimaDelPromedio ? AgoraDesign.Colors.success : AgoraDesign.Colors.textoMedio)
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, 6)
            .background(AgoraDesign.Colors.fondo)
            .clipShape(Capsule())
            .accessibilityLabel(
                comparacion.porEncimaDelPromedio
                    ? "Tu racha de \(comparacion.tuRacha) días está por encima del promedio del campus de \(promedio) días"
                    : "Tu racha de \(comparacion.tuRacha) días, promedio del campus \(promedio) días"
            )
    }

    private func cargar() async {
        do {
            gamificacion = try await AgoraApi.gamificacionMio()
        } catch {
            gamificacion = nil
        }
    }
}

/// Sección de racha y logros en perfil — paridad con `GamificacionProfileSection.kt`.
struct GamificacionProfileSection: View {
    let gamificacion: GamificacionDto?

    var body: some View {
        if let data = gamificacion, data.rachaActual > 0 || !data.badges.isEmpty {
            HStack(alignment: .top, spacing: AgoraDesign.Spacing.sm) {
                VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
                    if data.rachaActual > 0 {
                        HStack(spacing: 6) {
                            Text("🔥 \(data.rachaActual) \(data.rachaActual == 1 ? "día" : "días")")
                                .font(.subheadline.bold())
                                .foregroundStyle(AgoraDesign.Colors.naranja)
                                .padding(.horizontal, AgoraDesign.Spacing.sm)
                                .padding(.vertical, 6)
                                .background(AgoraDesign.Colors.naranjaSuave)
                                .clipShape(Capsule())

                            if data.rachaActual >= 2 {
                                ShareLink(item: textoCompartirRacha(dias: data.rachaActual)) {
                                    Image(systemName: "square.and.arrow.up")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(AgoraDesign.Colors.naranja)
                                }
                                .accessibilityLabel("Compartir racha")
                            }
                        }

                        if data.rachaMaxima > data.rachaActual {
                            Text("Mejor: \(data.rachaMaxima) días")
                                .font(.caption)
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        }
                    }
                }

                if !data.badges.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Logros")
                            .font(.caption.bold())
                            .foregroundStyle(AgoraDesign.Colors.naranja)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: AgoraDesign.Spacing.xs) {
                                ForEach(data.badges) { badge in
                                    BadgeEmojiTap(badge: badge, compact: false)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }
}

/// Rachas e insignias públicas en perfil ajeno (solo lectura).
struct GamificacionPublicSection: View {
    let gamificacion: GamificacionDto?

    var body: some View {
        if let data = gamificacion, data.rachaActual > 0 || !data.badges.isEmpty || (data.duelosGanados ?? 0) > 0 {
            VStack(alignment: .leading, spacing: 10) {
                Text("Racha")
                    .font(.caption.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)

                HStack(spacing: AgoraDesign.Spacing.sm) {
                    if data.rachaActual > 0 {
                        Text("🔥 \(data.rachaActual) \(data.rachaActual == 1 ? "día" : "días")")
                            .font(.caption.bold())
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                            .padding(.horizontal, AgoraDesign.Spacing.sm)
                            .padding(.vertical, 6)
                            .background(AgoraDesign.Colors.naranjaSuave)
                            .clipShape(Capsule())
                    }

                    if !data.badges.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(data.badges) { badge in
                                    BadgeEmojiTap(badge: badge, compact: true)
                                }
                            }
                        }
                    }
                }

                if let ganados = data.duelosGanados, ganados > 0 {
                    Text("🏆 \(ganados) \(ganados == 1 ? "duelo ganando" : "duelos ganando")")
                        .font(.caption.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                }
            }
            .padding(.horizontal, AgoraDesign.Spacing.sm + 2)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
        }
    }
}

private struct BadgeEmojiTap: View {
    let badge: GamificacionBadgeDto
    var compact: Bool = true

    @State private var mostrarInfo = false

    private var etiqueta: String {
        BadgesCampus.def(codigo: badge.codigo)?.etiqueta ?? badge.etiqueta
    }

    private var subtitulo: String {
        BadgesCampus.def(codigo: badge.codigo)?.subtitulo ?? ""
    }

    var body: some View {
        Text(badge.emoji)
            .font(compact ? .title3 : .title2)
            .padding(.horizontal, compact ? AgoraDesign.Spacing.xs : 10)
            .padding(.vertical, compact ? 6 : AgoraDesign.Spacing.xs)
            .background(AgoraDesign.Colors.fondo)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
            .accessibilityLabel(etiqueta)
            .onTapGesture { mostrarInfo = true }
            .alert(etiqueta, isPresented: $mostrarInfo) {
                Button("OK", role: .cancel) {}
            } message: {
                if !subtitulo.isEmpty {
                    Text(subtitulo)
                }
            }
    }
}
