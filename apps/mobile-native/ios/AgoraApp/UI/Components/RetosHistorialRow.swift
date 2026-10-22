import SwiftUI

/// Historial de duelos — paridad con `RetosHistorialRow.kt` y web `/retos`.
struct RetosHistorialRow: View {
    var onPerfilTap: (String) -> Void = { _ in }

    @State private var items: [RetoHistorialDto] = []
    @State private var cursor: String?
    @State private var cargando = false
    @State private var miHandle: String?

    var body: some View {
        // VStack y no Group: los modificadores de un Group se aplican a cada hijo,
        // y con el contenido vacío `.task` nunca se disparaba (el banner no cargaba).
        VStack(spacing: 0) {
            if !items.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("📜 Historial de duelos")
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)

                    Text("Retos rechazados y duelos de semanas pasadas.")
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)

                    ForEach(items) { reto in
                        historialCard(reto)
                    }

                    if let cursor, !cursor.isEmpty {
                        Button(cargando ? "Cargando…" : "Ver más") {
                            Task { await cargar(reset: false) }
                        }
                        .font(.caption.bold())
                        .frame(maxWidth: .infinity)
                        .disabled(cargando)
                    }
                }
                .padding(AgoraDesign.Spacing.sm + 2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
            }
        }
        .task { await cargar(reset: true) }
        .onReceive(NotificationCenter.default.publisher(for: .gamificacionRefresh)) { _ in
            Task { await cargar(reset: true) }
        }
    }

    private func historialCard(_ reto: RetoHistorialDto) -> some View {
        let rival = (miHandle != nil && reto.retador.handle == miHandle) ? reto.retado : reto.retador
        return Button {
            onPerfilTap(rival.handle)
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(etiquetaTipo(reto.tipo))
                    .font(.caption.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
                Text("@\(rival.handle)")
                    .font(.caption.weight(.semibold))
                Text(etiquetaResultado(reto.resultado))
                    .font(.subheadline.bold())
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(AgoraDesign.Colors.fondo)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
        }
        .buttonStyle(.agoraPlain)
    }

    private func etiquetaTipo(_ tipo: String) -> String {
        tipo == "RACHA" ? "🔥 Racha" : "🧠 Preguntas"
    }

    private func etiquetaResultado(_ resultado: String?) -> String {
        switch resultado {
        case "ganaste": return "🏆 Ganaste"
        case "perdiste": return "😬 Perdiste"
        case "empate": return "🤝 Empate"
        case "rechazado": return "🚫 Rechazado"
        default: return "Duelo"
        }
    }

    private func cargar(reset: Bool) async {
        cargando = true
        defer { cargando = false }
        do {
            if miHandle == nil {
                miHandle = try await AgoraApi.perfilMio().handle
            }
            let resp = try await AgoraApi.retosHistorial(
                cursor: reset ? nil : cursor,
                limite: 8
            )
            let nuevos = resp.items ?? []
            items = reset ? nuevos : items + nuevos
            cursor = resp.siguienteCursor
        } catch {
            if reset { items = [] }
        }
    }
}
