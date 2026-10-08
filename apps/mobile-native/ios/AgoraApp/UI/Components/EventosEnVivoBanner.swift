import SwiftUI

/// Eventos en curso o que empiezan pronto — paridad con `EventosEnVivoBanner.kt`.
struct EventosEnVivoBanner: View {
    var onEventoTap: (String) -> Void = { _ in }

    @State private var eventos: [EventoEnVivoDto] = []

    var body: some View {
        // VStack y no Group: los modificadores de un Group se aplican a cada hijo,
        // y con el contenido vacío `.task` nunca se disparaba (el banner no cargaba).
        VStack(spacing: 0) {
            if !eventos.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("🔴 En vivo / pronto")
                        .font(.caption.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)

                    Text("Pasa por el campus antes de que se acabe el hype.")
                        .font(.caption2)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(eventos) { evento in
                                eventoCard(evento)
                            }
                        }
                    }
                }
                .padding(AgoraDesign.Spacing.sm + 2)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
            }
        }
        .task { await cargar() }
    }

    private func eventoCard(_ evento: EventoEnVivoDto) -> some View {
        Button {
            onEventoTap(evento.id)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                Text(badgeText(for: evento))
                    .font(.caption2.bold())
                    .foregroundStyle(evento.enCurso ? AgoraDesign.Colors.danger : AgoraDesign.Colors.naranja)

                Text(evento.titulo)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: 8) {
                    if let lugar = evento.lugar, !lugar.isEmpty {
                        Text("📍 \(lugar)")
                            .font(.caption2)
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            .lineLimit(1)
                    }
                    if (evento.vanAIr ?? 0) > 0 {
                        Text("👋 \(evento.vanAIr ?? 0)")
                            .font(.caption2.bold())
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(AgoraDesign.Colors.fondo)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
        }
        .buttonStyle(.plain)
    }

    private func badgeText(for evento: EventoEnVivoDto) -> String {
        if evento.enCurso { return "🔴 En vivo" }
        guard let min = evento.empiezaEnMinutos else { return "⏳ Pronto" }
        switch min {
        case ...0: return "⚡ Ahorita"
        case ..<60: return "⏱ En \(min) min"
        default: return "📅 En \(min / 60)h"
        }
    }

    private func cargar() async {
        do {
            let resp = try await AgoraApi.eventosEnVivo()
            eventos = resp.eventos ?? []
        } catch {
            eventos = []
        }
    }
}
