import SwiftUI

/// Shimmer placeholder — paridad con `AgoraSkeleton.kt`.
struct AgoraSkeletonBox: View {
    var height: CGFloat = 16
    var cornerRadius: CGFloat = AgoraDesign.Radii.small

    @State private var phase: CGFloat = 0

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(AgoraDesign.Colors.skeletonBase)
            .frame(height: height)
            .overlay {
                GeometryReader { geo in
                    LinearGradient(
                        colors: [
                            AgoraDesign.Colors.skeletonBase,
                            AgoraDesign.Colors.skeletonHighlight,
                            AgoraDesign.Colors.skeletonBase,
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 2)
                    .offset(x: -geo.size.width + phase * geo.size.width * 2)
                }
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            }
            .onAppear {
                withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

struct AgoraFeedSkeleton: View {
    var itemCount: Int = 3

    var body: some View {
        ScrollView {
            VStack(spacing: AgoraDesign.Spacing.xs) {
                ForEach(0..<itemCount, id: \.self) { _ in
                    AgoraPostCardSkeleton()
                }
            }
            .padding(AgoraDesign.Spacing.sm)
        }
    }
}

private struct AgoraPostCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            HStack(spacing: AgoraDesign.Spacing.sm) {
                AgoraSkeletonBox(height: 40, cornerRadius: 20)
                    .frame(width: 40)
                VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
                    AgoraSkeletonBox(height: 14)
                        .frame(width: 120)
                    AgoraSkeletonBox(height: 12)
                        .frame(width: 80)
                }
            }
            AgoraSkeletonBox(height: 14)
            AgoraSkeletonBox(height: 14)
                .frame(maxWidth: .infinity)
                .scaleEffect(x: 0.85, anchor: .leading)
            AgoraSkeletonBox(height: 180, cornerRadius: AgoraDesign.Radii.card)
        }
        .padding(AgoraDesign.Spacing.md)
        .background(AgoraDesign.Colors.superficieElevada)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
    }
}
