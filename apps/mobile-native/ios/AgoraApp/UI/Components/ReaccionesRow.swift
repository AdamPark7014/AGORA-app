import SwiftUI

struct ReaccionInfo: Identifiable {
    var id: String { tipo }
    let tipo: String
    let emoji: String
    let etiqueta: String
}

let reaccionesPost: [ReaccionInfo] = [
    ReaccionInfo(tipo: "ME_LATE", emoji: "🧡", etiqueta: "Me late"),
    ReaccionInfo(tipo: "ME_RIO", emoji: "😂", etiqueta: "Me rió"),
    ReaccionInfo(tipo: "APOYO", emoji: "🤝", etiqueta: "Apoyo"),
    ReaccionInfo(tipo: "NO_MAMES", emoji: "😮", etiqueta: "No mames"),
]

/// Fila de reacciones UDLAP — paridad con `ReaccionesRow` en `PostCard.kt`.
struct ReaccionesRow: View {
    let miReaccion: String?
    let totalReacciones: Int
    let numComments: Int
    let onReaccionar: (String) -> Void
    var onCommentsTap: (() -> Void)?

    var body: some View {
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(reaccionesPost) { reaccion in
                ReaccionButton(
                    reaccion: reaccion,
                    selected: miReaccion == reaccion.tipo,
                    onTap: { onReaccionar(reaccion.tipo) }
                )
            }
            Text("\(totalReacciones)")
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .padding(.leading, 4)
                .padding(.bottom, 6)

            Button {
                onCommentsTap?()
            } label: {
                Text("💬 \(numComments)")
                    .font(.subheadline)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
            .buttonStyle(.agoraPlain)
            .disabled(onCommentsTap == nil)
            .padding(.horizontal, 4)
            .padding(.bottom, 4)
        }
    }
}

private struct ReaccionButton: View {
    let reaccion: ReaccionInfo
    let selected: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            Haptics.toggle()
            onTap()
        } label: {
            Text(reaccion.emoji)
                .font(.title3)
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(selected ? AgoraDesign.Colors.naranjaSuave : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay {
                    if selected {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AgoraDesign.Colors.naranja.opacity(0.4), lineWidth: 1)
                    }
                }
        }
        .buttonStyle(.agoraPlain)
        .accessibilityLabel(reaccion.etiqueta)
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
                .font(.title3)
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
