import SwiftUI

/// Vacío de B «Cholula» (docs/diseno-cholula.md §4, artboard WowB-Ajustes): escalones punteados, el de
/// arriba en naranja, título Bricolage, una línea de qué hacer y, si la pantalla la da, la acción.
/// Paridad con `AgoraEmptyState.kt`.
struct AgoraEmptyState: View {
    /// Ya no se pinta (sin emojis como íconos); se conserva para no tocar a quien lo llama.
    let emoji: String
    let title: String
    let subtitle: String
    var actionLabel: String?
    var onAction: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 6) {
                ForEach(Array([60, 110, 160, 210].enumerated()), id: \.offset) { indice, ancho in
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .strokeBorder(indice == 0 ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde,
                                      style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
                        .frame(width: CGFloat(ancho), height: 26)
                }
            }
            .accessibilityHidden(true)

            Text(title)
                .font(.bricolage(24, relativeTo: .title2))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            Text(subtitle)
                .font(.outfit(.body))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            if let actionLabel, let onAction {
                Button(action: onAction) {
                    Text(actionLabel)
                        .font(.outfit(.body, .bold))
                        .foregroundStyle(AgoraDesign.Colors.sobreBoton)
                        .padding(.horizontal, 22)
                        .frame(minHeight: 52)
                        .background(AgoraDesign.Colors.boton, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.agoraPlain)
            }
        }
        .padding(.horizontal, 30)
        .padding(.vertical, AgoraDesign.Spacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
