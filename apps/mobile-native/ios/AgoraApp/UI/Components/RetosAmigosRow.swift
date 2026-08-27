import SwiftUI

/// Retos entre amigos — pendientes y duelos activos en el feed. Paridad con `RetosAmigosRow.kt`.
struct RetosAmigosRow: View {
    @EnvironmentObject private var session: SessionStore

    @State private var pendientes: [RetoAmigoDto] = []
    @State private var activos: [RetoAmigoDto] = []
    @State private var respondiendo: String?

    private var miHandle: String? { session.currentUser?.handle }

    var body: some View {
        Group {
            if !pendientes.isEmpty || !activos.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("⚔️ Retos con amigos")
                        .font(.caption.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)

                    Text("Acepta el reto o quédate viendo cómo te ganan.")
                        .font(.caption2)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(pendientes) { reto in
                                retoPendienteCard(reto)
                            }
                            ForEach(activos) { reto in
                                retoActivoCard(reto)
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
        .onReceive(NotificationCenter.default.publisher(for: .gamificacionRefresh)) { _ in
            Task { await cargar() }
        }
    }

    private func retoPendienteCard(_ reto: RetoAmigoDto) -> some View {
        let cargando = respondiendo == reto.id

        return VStack(alignment: .leading, spacing: 8) {
            Text("Te retaron")
                .font(.caption2.bold())
                .foregroundStyle(AgoraDesign.Colors.naranja)

            Text("@\(reto.retador.handle) te desafía a \(tipoLabelLargo(reto.tipo))")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            HStack(spacing: 8) {
                Button {
                    Task { await responder(reto: reto, aceptar: true) }
                } label: {
                    Text("¡Va!")
                        .font(.caption.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .tint(AgoraDesign.Colors.naranja)
                .disabled(cargando)

                Button {
                    Task { await responder(reto: reto, aceptar: false) }
                } label: {
                    Text("Nel")
                        .font(.caption.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.bordered)
                .disabled(cargando)
            }
        }
        .padding(12)
        .background(AgoraDesign.Colors.fondo)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
    }

    private func retoActivoCard(_ reto: RetoAmigoDto) -> some View {
        let soyRetador = miHandle != nil && reto.retador.handle == miHandle
        let rival = soyRetador ? reto.retado : reto.retador
        let miPuntaje = soyRetador ? (reto.puntajeRetador ?? 0) : (reto.puntajeRetado ?? 0)
        let suPuntaje = soyRetador ? (reto.puntajeRetado ?? 0) : (reto.puntajeRetador ?? 0)

        return VStack(spacing: 6) {
            Text("\(tipoLabelCorto(reto.tipo)) \(estadoEmoji(reto: reto, soyRetador: soyRetador))")
                .font(.caption2.bold())
                .foregroundStyle(AgoraDesign.Colors.naranja)

            Text("Tú \(miPuntaje) vs @\(rival.handle) \(suPuntaje)")
                .font(.subheadline.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
                .lineLimit(1)

            Text(estadoCopy(reto: reto, soyRetador: soyRetador))
                .font(.caption2)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(AgoraDesign.Colors.fondo)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
    }

    private func tipoLabelLargo(_ tipo: String) -> String {
        switch tipo {
        case "RACHA": return "🔥 racha diaria"
        case "SEMANA_PREGUNTA": return "🧠 semana de preguntas"
        default: return tipo
        }
    }

    private func tipoLabelCorto(_ tipo: String) -> String {
        switch tipo {
        case "RACHA": return "🔥 Racha"
        case "SEMANA_PREGUNTA": return "🧠 Preguntas"
        default: return tipo
        }
    }

    private func estadoEmoji(reto: RetoAmigoDto, soyRetador: Bool) -> String {
        switch reto.ganando {
        case "retador": return soyRetador ? "😎" : "😬"
        case "retado": return soyRetador ? "😬" : "😎"
        case "empate": return "🤝"
        default: return "⚔️"
        }
    }

    private func estadoCopy(reto: RetoAmigoDto, soyRetador: Bool) -> String {
        switch reto.ganando {
        case "retador":
            return soyRetador ? "Vas ganando, no te confíes" : "Te están ganando, despierta"
        case "retado":
            return soyRetador ? "Te están ganando, despierta" : "Vas ganando, no te confíes"
        case "empate":
            return "Empate técnico — drama puro"
        default:
            return "Duelo en curso"
        }
    }

    private func cargar() async {
        do {
            let resp = try await AgoraApi.retosActivos()
            pendientes = resp.pendientes ?? []
            activos = resp.activos ?? []
        } catch {
            pendientes = []
            activos = []
        }
    }

    private func responder(reto: RetoAmigoDto, aceptar: Bool) async {
        respondiendo = reto.id
        defer { respondiendo = nil }
        do {
            _ = try await AgoraApi.responderReto(id: reto.id, aceptar: aceptar)
            if aceptar { Haptics.success() }
            await cargar()
        } catch {
            // Silencioso; el usuario puede reintentar.
        }
    }
}
