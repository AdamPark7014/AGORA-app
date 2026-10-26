import SwiftUI

struct OfflineBanner: View {
    var body: some View {
        Text("Sin conexión")
            .font(.outfit(.subheadline, .semibold))
            .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, AgoraDesign.Spacing.xs)
            .background(AgoraDesign.Colors.naranjaSuave)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
    }
}
