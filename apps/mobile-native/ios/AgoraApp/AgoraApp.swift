import SwiftUI

@main
struct AgoraApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var session = SessionStore.shared
    /// Ajustes → Apariencia (Sistema / Claro / Oscuro).
    @AppStorage(AgoraTema.claveAlmacen) private var apariencia = AgoraTema.sistema.rawValue

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .environmentObject(DeepLinkBus.shared)
                .tint(AgoraDesign.Colors.naranja)
                .preferredColorScheme((AgoraTema(rawValue: apariencia) ?? .sistema).esquema)
                .onOpenURL { url in
                    guard let route = DeepLinkParser.parse(url: url) else { return }
                    let loggedIn = SessionStore.shared.token != nil
                    PendingDeepLink.enqueue(route: route, isLoggedIn: loggedIn)
                }
                .onReceive(NotificationCenter.default.publisher(for: .agoraPushDeepLink)) { note in
                    guard let raw = note.object as? String else { return }
                    // `guard let url` sobre un `let url` del mismo ámbito no compila.
                    guard let url = URL(string: raw) ?? URL(string: "agora://\(raw)"),
                          let route = DeepLinkParser.parse(url: url) else { return }
                    let loggedIn = SessionStore.shared.token != nil
                    PendingDeepLink.enqueue(route: route, isLoggedIn: loggedIn)
                }
                .onAppear {
                    if SessionStore.shared.token != nil {
                        AgoraCrashReporting.install()
                    }
                }
        }
    }
}

/// Raíz de navegación: login → welcome → registro → tabs principales.
struct RootView: View {
    @EnvironmentObject var session: SessionStore
    /// Correo UDLAP pendiente (registro con correo personal): aviso y bloqueo.
    @ObservedObject private var udlap = UdlapEstado.shared

    @State private var showWelcome = false

    var body: some View {
        Group {
            if session.currentUser == nil {
                LoginView(onLoggedIn: { _ in
                    PendingDeepLink.flush()
                    AgoraCrashReporting.install()
                    if !session.hasSeenWelcome {
                        showWelcome = true
                    }
                })
            } else if showWelcome {
                WelcomeScreen {
                    session.markWelcomeSeen()
                    showWelcome = false
                }
            } else if session.currentUser?.tienePerfil != true {
                RegistroView(onCompletado: { _ in
                    PendingDeepLink.flush()
                })
            } else if udlap.vencida {
                // Pasó el plazo para confirmar el correo UDLAP: la API ya no
                // deja usar nada más (403), así que no se muestra el feed.
                NavigationStack {
                    ConfirmarUdlapView(modo: .bloqueo) {
                        Task { await udlap.refrescar() }
                    }
                }
            } else {
                SessionExpiredHost {
                    MainTabView()
                        .onAppear { PendingDeepLink.flush() }
                }
            }
        }
        .task(id: session.currentUser?.token) { await udlap.refrescar() }
        .animation(.easeInOut(duration: 0.2), value: session.currentUser?.tienePerfil)
        .insigniaCelebracionOverlay()
        .onAppear {
            if session.currentUser != nil && !session.hasSeenWelcome {
                showWelcome = true
            }
            if session.currentUser != nil {
                Task {
                    if let resp = try? await AgoraApi.gamificacionPing() {
                        GamificacionEvents.notifyPingResult(nuevas: resp.nuevasInsignias)
                    }
                }
            }
        }
    }
}
