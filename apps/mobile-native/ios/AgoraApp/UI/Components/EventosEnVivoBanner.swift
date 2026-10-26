import SwiftUI

/// «Ahora en el campus» del diseño D (docs/diseno-d.md §3): eventos en curso o que empiezan
/// pronto, como tarjetas chicas desplazables con un punto verde de «en vivo».
struct EventosEnVivoBanner: View {
    var onEventoTap: (String) -> Void = { _ in }

    @State private var eventos: [EventoEnVivoDto] = []

    var body: some View {
        // VStack y no Group: los modificadores de un Group se aplican a cada hijo,
        // y con el contenido vacío `.task` nunca se disparaba (el banner no cargaba).
        VStack(spacing: 0) {
            if !eventos.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(AgoraDesign.Colors.vivo)
                            .frame(width: 8, height: 8)
                            .background(
                                Circle()
                                    .fill(AgoraDesign.Colors.vivo.opacity(0.2))
                                    .frame(width: 16, height: 16)
                            )
                            .accessibilityHidden(true)
                        Text("AHORA EN EL CAMPUS")
                            .font(.footnote.weight(.bold))
                            .tracking(0.5)
                            .foregroundStyle(AgoraDesign.Colors.texto)
                    }
                    .padding(.leading, 4)
                    .accessibilityElement(children: .combine)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityLabel("Ahora en el campus")

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(eventos) { evento in
                                eventoCard(evento)
                            }
                        }
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .task { await cargar() }
    }

    private func eventoCard(_ evento: EventoEnVivoDto) -> some View {
        Button {
            onEventoTap(evento.id)
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text(evento.titulo)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .lineLimit(1)
                Text(detalle(evento))
                    .font(.caption)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .lineLimit(1)
            }
            .frame(minWidth: 150, maxWidth: 240, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                    .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
            }
        }
        .buttonStyle(.agoraPlain)
    }

    /// «Biblioteca · en curso · 12 van»: solo lo que la API manda.
    private func detalle(_ evento: EventoEnVivoDto) -> String {
        var partes: [String] = []
        if let lugar = evento.lugar, !lugar.isEmpty { partes.append(lugar) }
        partes.append(cuando(evento))
        if let van = evento.vanAIr, van > 0 { partes.append("\(van) \(van == 1 ? "va" : "van")") }
        return partes.joined(separator: " · ")
    }

    private func cuando(_ evento: EventoEnVivoDto) -> String {
        if evento.enCurso { return "en curso" }
        guard let min = evento.empiezaEnMinutos else { return "pronto" }
        switch min {
        case ...0: return "ya empieza"
        case ..<60: return "en \(min) min"
        default: return "en \(min / 60) h"
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
