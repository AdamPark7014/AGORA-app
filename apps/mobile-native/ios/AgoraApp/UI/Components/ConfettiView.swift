import SwiftUI

/// Burst de confeti — paridad con `ConfettiOverlay.kt` (~60 partículas, 600 ms).
struct ConfettiView: View {
    let trigger: Int

    @State private var particles: [ConfettiParticle] = []
    @State private var progress: CGFloat = 0

    private static let colors: [Color] = [
        AgoraDesign.Colors.naranja,
        Color(red: 212 / 255, green: 175 / 255, blue: 55 / 255),
        AgoraDesign.Colors.success,
    ]

    var body: some View {
        Canvas { context, size in
            guard progress > 0 else { return }
            let fallDistance = size.height * 0.45
            let pieceSize: CGFloat = 7

            for particle in particles {
                let t: CGFloat
                if progress <= particle.delayFraction {
                    t = 0
                } else {
                    t = min(1, (progress - particle.delayFraction) / (1 - particle.delayFraction))
                }
                guard t > 0 else { continue }

                let alpha = 1 - t
                let x = size.width * particle.startXFraction + particle.drift * t
                let y = size.height * particle.startYFraction + fallDistance * t
                let rotation = Angle.degrees(particle.rotation + Double(t) * 360)

                context.drawLayer { layer in
                    layer.translateBy(x: x, y: y)
                    layer.rotate(by: rotation)
                    layer.fill(
                        Path(CGRect(x: -pieceSize / 2, y: -pieceSize / 2, width: pieceSize, height: pieceSize)),
                        with: .color(particle.color.opacity(alpha))
                    )
                }
            }
        }
        .allowsHitTesting(false)
        .onChange(of: trigger) { newValue in
            guard newValue > 0 else { return }
            particles = Self.makeParticles(for: newValue)
            progress = 0
            withAnimation(.linear(duration: 0.6)) {
                progress = 1
            }
        }
    }

    private static func makeParticles(for trigger: Int) -> [ConfettiParticle] {
        var rng = SeededGenerator(seed: UInt64(trigger))
        return (0..<60).map { index in
            ConfettiParticle(
                startXFraction: CGFloat.random(in: 0.05...0.95, using: &rng),
                startYFraction: CGFloat.random(in: 0.05...0.35, using: &rng),
                color: colors[index % colors.count],
                delayFraction: CGFloat.random(in: 0...0.35, using: &rng),
                drift: CGFloat.random(in: -36...36, using: &rng),
                rotation: Double.random(in: 0...360, using: &rng)
            )
        }
    }
}

private struct ConfettiParticle {
    let startXFraction: CGFloat
    let startYFraction: CGFloat
    let color: Color
    let delayFraction: CGFloat
    let drift: CGFloat
    let rotation: Double
}

private struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed == 0 ? 1 : seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}
