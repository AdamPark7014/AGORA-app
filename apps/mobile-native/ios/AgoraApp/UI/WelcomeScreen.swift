import SwiftUI

/// Bienvenida de 3 páginas con B «Cholula»: franja de Talavera, cada página con su color (Talavera, jade,
/// adobe) y las terrazas, y el botón `boton` — paridad con `WelcomeScreen.kt`.
struct WelcomeScreen: View {
    let onFinished: () -> Void

    @State private var page = 0

    private struct WelcomePage {
        let icon: String
        let title: String
        let description: String
        let color: Color
    }

    private let pages: [WelcomePage] = [
        WelcomePage(
            icon: "rectangle.stack",
            title: "Tu feed del campus",
            description: "Descubre lo que pasa en la UDLAP: posts, encuestas y conversaciones de tu comunidad verificada.",
            color: AgoraDesign.Colors.talavera
        ),
        WelcomePage(
            icon: "checkmark.seal",
            title: "Comunidades verificadas",
            description: "Carreras, colegios y grupos oficiales con badge verificado. Solo gente real de la UDLAP.",
            color: AgoraDesign.Colors.jade
        ),
        WelcomePage(
            icon: "calendar",
            title: "Eventos en vivo",
            description: "Fiestas, charlas, torneos y más. Di que vas y no te pierdas nada del campus.",
            color: AgoraDesign.Colors.adobe
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
            FranjaTalavera(alto: 12)
            HStack(spacing: AgoraDesign.Spacing.xs) {
                AgoraIsotipo(tamano: 32)
                Text(AgoraCopy.appName)
                    .font(.outfit(.headline, .bold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                Spacer()
                Button("Saltar", action: onFinished)
                    .font(.outfit(.subheadline))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
            .padding(.horizontal, AgoraDesign.Spacing.lg)
            .padding(.top, AgoraDesign.Spacing.sm)

            TabView(selection: $page) {
                ForEach(Array(pages.enumerated()), id: \.offset) { index, item in
                    VStack(spacing: AgoraDesign.Spacing.lg) {
                        Spacer()
                        VStack(spacing: -4) {
                            Image(systemName: item.icon)
                                .font(.system(size: 40, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 104, height: 104)
                                .background(item.color, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
                            Terrazas(niveles: 3)
                                .fill(item.color)
                                .frame(width: 84, height: 16)
                        }
                        .accessibilityHidden(true)
                        Text(item.title)
                            .font(.bricolage(28, relativeTo: .title))
                            .foregroundStyle(AgoraDesign.Colors.texto)
                            .multilineTextAlignment(.center)
                        Text(item.description)
                            .font(.outfit(.body))
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, AgoraDesign.Spacing.md)
                        Spacer()
                    }
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(AgoraDesign.Animation.spring, value: page)

            AgoraProgressDots(pageCount: pages.count, currentPage: page)
                .padding(.vertical, AgoraDesign.Spacing.lg)

            AgoraPrimaryButton(title: page == pages.count - 1 ? "¡Empezar!" : "Siguiente") {
                if page == pages.count - 1 {
                    onFinished()
                } else {
                    withAnimation(AgoraDesign.Animation.spring) {
                        page += 1
                    }
                }
            }
            .padding(.horizontal, AgoraDesign.Spacing.lg)
            .padding(.bottom, AgoraDesign.Spacing.lg)
        }
        .agoraScreenBackground()
    }
}

/// Indicador de página — paridad con `AgoraProgressDots.kt`.
struct AgoraProgressDots: View {
    let pageCount: Int
    let currentPage: Int

    var body: some View {
        HStack(spacing: 8) {
            // Escalones: el de la página actual más ancho y en naranja.
            ForEach(0..<pageCount, id: \.self) { index in
                RoundedRectangle(cornerRadius: 3, style: .continuous)
                    .fill(index == currentPage ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde)
                    .frame(width: index == currentPage ? 22 : 10, height: 8)
                    .animation(AgoraDesign.Animation.spring, value: currentPage)
            }
        }
    }
}
