import SwiftUI

/// Estado de error con reintento — paridad con `AgoraErrorState.kt`.
struct AgoraErrorState: View {
    let message: String
    let onRetry: () -> Void
    var title: String = AgoraCopy.errorTitle

    var body: some View {
        VStack(spacing: AgoraDesign.Spacing.md) {
            Text("😕")
                .font(.system(size: 48))
            Text(title)
                .font(.title3.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
                .multilineTextAlignment(.center)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(AgoraDesign.Colors.danger)
                .multilineTextAlignment(.center)
            AgoraOutlinedButton(title: AgoraCopy.retry, action: onRetry)
                .frame(maxWidth: 220)
        }
        .padding(AgoraDesign.Spacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
