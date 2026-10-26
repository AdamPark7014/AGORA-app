import SwiftUI

/// Toast breve al desbloquear una insignia nueva.
struct InsigniaCelebracionOverlay: ViewModifier {
    @State private var mensaje: String?
    @State private var ocultarTask: Task<Void, Never>?

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .top) {
                if let mensaje {
                    Text(mensaje)
                        .font(.outfit(.subheadline, .semibold))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .padding(.horizontal, AgoraDesign.Spacing.md)
                        .padding(.vertical, 12)
                        .background(AgoraDesign.Colors.superficie)
                        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
                        .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
                        .padding(.horizontal, AgoraDesign.Spacing.md)
                        .padding(.top, 8)
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .accessibilityAddTraits(.isStaticText)
                }
            }
            .animation(.spring(response: 0.35, dampingFraction: 0.82), value: mensaje)
            .onReceive(NotificationCenter.default.publisher(for: .gamificacionNuevaInsignia)) { note in
                guard let codigo = note.userInfo?["codigo"] as? String else { return }
                mostrar(BadgesCampus.mensajeNuevaInsignia(codigo: codigo))
            }
    }

    private func mostrar(_ texto: String) {
        ocultarTask?.cancel()
        mensaje = texto
        ocultarTask = Task {
            try? await Task.sleep(nanoseconds: 4_200_000_000)
            guard !Task.isCancelled else { return }
            await MainActor.run { mensaje = nil }
        }
    }
}

extension View {
    func insigniaCelebracionOverlay() -> some View {
        modifier(InsigniaCelebracionOverlay())
    }
}
