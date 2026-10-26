import SwiftUI

/// «Ahora en el campus» del diseño D (docs/diseno-d.md §3): eventos en curso o que empiezan
/// en las próximas 3 h y aventones que salen pronto, como tarjetas chicas desplazables con un
/// punto verde de «en vivo».
struct EventosEnVivoBanner: View {
    var onEventoTap: (String) -> Void = { _ in }
    var onAventonesTap: () -> Void = {}

    @State private var eventos: [EventoEnVivoDto] = []
    @State private var aventones: [AventonDto] = []

    var body: some View {
        // VStack y no Group: los modificadores de un Group se aplican a cada hijo,
        // y con el contenido vacío `.task` nunca se disparaba (el banner no cargaba).
        VStack(spacing: 0) {
            if !eventos.isEmpty || !aventones.isEmpty {
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
                            .font(.outfit(.footnote, .bold))
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
                            ForEach(aventones) { aventon in
                                aventonCard(aventon)
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
                    .font(.outfit(.subheadline, .semibold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .lineLimit(1)
                Text(detalle(evento))
                    .font(.outfit(.caption))
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

    private func aventonCard(_ aventon: AventonDto) -> some View {
        Button(action: onAventonesTap) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(aventon.origen) → \(aventon.destino)")
                    .font(.outfit(.subheadline, .semibold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .lineLimit(1)
                Text(detalleAventon(aventon))
                    .font(.outfit(.caption))
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
        .accessibilityLabel("Aventón de \(aventon.origen) a \(aventon.destino), \(detalleAventon(aventon))")
    }

    /// «Aventón · sale 18:00 · 2 lugares».
    private func detalleAventon(_ aventon: AventonDto) -> String {
        let libres = max(0, aventon.lugares - aventon.ocupados)
        var partes = ["Aventón"]
        if let hora = FormatUtils.partesFecha(aventon.salidaAt)?.hora { partes.append("sale \(hora)") }
        partes.append("\(libres) \(libres == 1 ? "lugar" : "lugares")")
        return partes.joined(separator: " · ")
    }

    private func cargar() async {
        eventos = (try? await AgoraApi.eventosEnVivo(horas: 3))?.eventos ?? []
        // Aventones con lugar que salen en las próximas 3 h (la API no tiene filtro por hora).
        let ahora = Date()
        let limite = ahora.addingTimeInterval(3 * 3600)
        let todos = (try? await AgoraApi.aventones())?.aventones ?? []
        aventones = Array(todos.filter { a in
            guard let salida = FormatUtils.parseISO(a.salidaAt) else { return false }
            return salida > ahora && salida <= limite && a.lugares > a.ocupados && a.esMio != true
        }.prefix(3))
    }
}
