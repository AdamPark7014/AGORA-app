import SwiftUI

/// Botón primario naranja — paridad con `AgoraPrimaryButton.kt`.
struct AgoraPrimaryButton: View {
    let title: String
    let action: () -> Void
    var enabled: Bool = true
    var loading: Bool = false

    var body: some View {
        Button(action: action) {
            HStack {
                Spacer()
                if loading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(title)
                        .fontWeight(.semibold)
                }
                Spacer()
            }
            .padding(.vertical, AgoraDesign.Spacing.sm + 2)
            .frame(minHeight: 48)
        }
        .buttonStyle(AgoraScaleButtonStyle())
        .background(
            (enabled && !loading ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.naranja.opacity(0.4))
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
        )
        .foregroundStyle(.white)
        .disabled(!enabled || loading)
    }
}

struct AgoraOutlinedButton: View {
    let title: String
    let action: () -> Void
    var enabled: Bool = true

    var body: some View {
        Button(action: action) {
            Text(title)
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AgoraDesign.Spacing.sm + 2)
                .frame(minHeight: 48)
        }
        .buttonStyle(AgoraScaleButtonStyle())
        .foregroundStyle(enabled ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.textoMuted)
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                .stroke(enabled ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde, lineWidth: 1)
        }
        .disabled(!enabled)
    }
}

struct AgoraScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(AgoraDesign.Animation.press, value: configuration.isPressed)
    }
}
