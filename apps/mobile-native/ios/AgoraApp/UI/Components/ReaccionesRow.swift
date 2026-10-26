import SwiftUI

struct ReaccionInfo: Identifiable {
    var id: String { tipo }
    let tipo: String
    let etiqueta: String
}

let reaccionesPost: [ReaccionInfo] = [
    ReaccionInfo(tipo: "ME_LATE", etiqueta: "Me late"),
    ReaccionInfo(tipo: "ME_RIO", etiqueta: "Me río"),
    ReaccionInfo(tipo: "APOYO", etiqueta: "Apoyo"),
    ReaccionInfo(tipo: "NO_MAMES", etiqueta: "No mames"),
]

/// Mueve una reacción de tipo en los conteos (la mía pasa de `vieja` a `nueva`).
func moverReaccion(_ conteos: [String: Int], de vieja: String?, a nueva: String?) -> [String: Int] {
    var r = conteos
    if let vieja { r[vieja] = max(0, (r[vieja] ?? 0) - 1) }
    if let nueva { r[nueva] = (r[nueva] ?? 0) + 1 }
    return r
}

/// Reacciones del diseño D: chips con su nombre y su número, sin emojis (docs/diseno-d.md §3).
/// Si la ruta no manda los conteos por tipo, los chips van sin número y se dice el total.
struct ReaccionesRow: View {
    let miReaccion: String?
    let totalReacciones: Int
    let numComments: Int
    var conteos: [String: Int] = [:]
    let onReaccionar: (String) -> Void
    var onCommentsTap: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(reaccionesPost) { reaccion in
                        ReaccionButton(
                            reaccion: reaccion,
                            cuantas: conteos[reaccion.tipo] ?? 0,
                            selected: miReaccion == reaccion.tipo,
                            onTap: { onReaccionar(reaccion.tipo) }
                        )
                    }
                }
            }
            if conteos.isEmpty, totalReacciones > 0 {
                Text("\(totalReacciones) \(totalReacciones == 1 ? "reacción" : "reacciones")")
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
        }
    }
}

private struct ReaccionButton: View {
    let reaccion: ReaccionInfo
    let cuantas: Int
    let selected: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            Haptics.toggle()
            onTap()
        } label: {
            HStack(spacing: 5) {
                Text(reaccion.etiqueta)
                if cuantas > 0 {
                    Text("\(cuantas)")
                        .monospacedDigit()
                        .fontWeight(.semibold)
                }
            }
            .font(.outfit(.footnote, selected ? .semibold : .medium))
            .foregroundStyle(selected ? AgoraDesign.Colors.naranjaTinta : AgoraDesign.Colors.texto)
            .padding(.horizontal, 12)
            .frame(minHeight: 36)
            .background(selected ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.small)
                    .stroke(
                        selected ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde,
                        lineWidth: selected ? 1.5 : 1
                    )
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityLabel(cuantas > 0 ? "\(reaccion.etiqueta), \(cuantas)" : reaccion.etiqueta)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// Botón guardar post — paridad con `GuardarButton.kt`.
struct GuardarButton: View {
    let postId: String
    let guardado: Bool
    var onChanged: ((Bool) -> Void)?

    @State private var estado: Bool
    @State private var cargando = false

    init(postId: String, guardado: Bool, onChanged: ((Bool) -> Void)? = nil) {
        self.postId = postId
        self.guardado = guardado
        self.onChanged = onChanged
        _estado = State(initialValue: guardado)
    }

    var body: some View {
        Button {
            Task { await alternar() }
        } label: {
            Image(systemName: estado ? "bookmark.fill" : "bookmark")
                .font(.outfit(.title3))
                .foregroundStyle(estado ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.textoMedio)
        }
        .buttonStyle(.agoraPlain)
        .disabled(cargando)
        .onChange(of: guardado) { nuevo in estado = nuevo }
    }

    private func alternar() async {
        cargando = true
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.guardarPost(id: postId)
            estado = resp.guardado
            onChanged?(resp.guardado)
            Haptics.toggle()
        } catch {
            // Silencioso — el icono queda como estaba.
        }
    }
}
