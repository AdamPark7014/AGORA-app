import SwiftUI

/// Sin conexión (B «Cholula»): talón maíz con el rayo y el corte punteado, y la frase al lado.
struct OfflineBanner: View {
    var body: some View {
        HStack(spacing: 0) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(AgoraDesign.Colors.sobreMaiz)
                .frame(width: 70)
                .frame(maxHeight: .infinity)
                .background(AgoraDesign.Colors.maiz)
                .overlay(alignment: .trailing) {
                    Rectangle()
                        .fill(.clear)
                        .frame(width: 2)
                        .overlay {
                            GeometryReader { geo in
                                Path { p in
                                    p.move(to: CGPoint(x: 1, y: 0))
                                    p.addLine(to: CGPoint(x: 1, y: geo.size.height))
                                }
                                .stroke(AgoraDesign.Colors.fondo, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
                            }
                        }
                }
                .accessibilityHidden(true)
            (Text("Sin conexión. ").bold() + Text("Lo que ves es lo último que se guardó; se pone al día en cuanto vuelva la señal."))
                .font(.outfit(.footnote, .medium))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .fixedSize(horizontal: false, vertical: true)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.updatesFrequently)
    }
}
