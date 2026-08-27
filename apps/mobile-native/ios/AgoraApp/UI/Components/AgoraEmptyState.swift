import SwiftUI

/// Empty state con emoji y personalidad — paridad con `AgoraEmptyState.kt`.
struct AgoraEmptyState: View {
    let emoji: String
    let title: String
    let subtitle: String
    var actionLabel: String?
    var onAction: (() -> Void)?

    var body: some View {
        VStack(spacing: AgoraDesign.Spacing.md) {
            Text(emoji)
                .font(.system(size: 48))
            Text(title)
                .font(.title3.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
                .multilineTextAlignment(.center)
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(AgoraDesign.Colors.textoMuted)
                .multilineTextAlignment(.center)
            if let actionLabel, let onAction {
                AgoraPrimaryButton(title: actionLabel, action: onAction)
                    .frame(maxWidth: 260)
                    .padding(.top, AgoraDesign.Spacing.xs)
            }
        }
        .padding(.horizontal, AgoraDesign.Spacing.lg)
        .padding(.vertical, AgoraDesign.Spacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
