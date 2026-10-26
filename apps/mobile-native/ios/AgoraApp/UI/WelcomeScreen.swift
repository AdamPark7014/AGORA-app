import SwiftUI

/// Onboarding de 3 páginas — paridad con `WelcomeScreen.kt`.
struct WelcomeScreen: View {
    let onFinished: () -> Void

    @State private var page = 0

    private struct WelcomePage {
        let icon: String
        let title: String
        let description: String
    }

    private let pages: [WelcomePage] = [
        WelcomePage(
            icon: "rectangle.stack",
            title: "Tu feed del campus",
            description: "Descubre lo que pasa en la UDLAP: posts, encuestas y conversaciones de tu comunidad verificada."
        ),
        WelcomePage(
            icon: "checkmark.seal",
            title: "Comunidades verificadas",
            description: "Carreras, colegios y grupos oficiales con badge verificado. Solo gente real de la UDLAP."
        ),
        WelcomePage(
            icon: "calendar",
            title: "Eventos en vivo",
            description: "Fiestas, charlas, torneos y más. RSVP y no te pierdas nada del campus."
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
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
                        ZStack {
                            Circle()
                                .fill(AgoraDesign.Colors.naranjaSuave)
                                .frame(width: 96, height: 96)
                            Image(systemName: item.icon)
                                .font(.system(size: 40))
                                .foregroundStyle(AgoraDesign.Colors.naranja)
                        }
                        Text(item.title)
                            .font(.bricolage(.title2, extra: false))
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

            Button {
                if page == pages.count - 1 {
                    onFinished()
                } else {
                    withAnimation(AgoraDesign.Animation.spring) {
                        page += 1
                    }
                }
            } label: {
                Text(page == pages.count - 1 ? "¡Empezar!" : "Siguiente")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(AgoraDesign.Colors.naranja)
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
            ForEach(0..<pageCount, id: \.self) { index in
                Circle()
                    .fill(index == currentPage ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde)
                    .frame(width: index == currentPage ? 10 : 8, height: index == currentPage ? 10 : 8)
                    .animation(AgoraDesign.Animation.spring, value: currentPage)
            }
        }
    }
}
