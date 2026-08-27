import SwiftUI
import UIKit

/// Tabs principales — espejo de `MainShell.kt` en Android.
struct MainTabView: View {
    @EnvironmentObject var session: SessionStore
    @ObservedObject private var deepLinkBus = DeepLinkBus.shared

    @State private var tab = 0
    @State private var avisosSinLeer = 0
    @State private var prevAvisosSinLeer = 0
    @State private var badgePulseToken = 0
    @State private var feedReloadKey = 0
    @State private var feedPath = NavigationPath()
    @State private var eventosPath = NavigationPath()
    @State private var masPath = NavigationPath()

    init() {
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.backgroundColor = UIColor(AgoraDesign.Colors.superficie)
        appearance.shadowColor = UIColor(AgoraDesign.Colors.bordeSutil)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack(path: $feedPath) {
                FeedView(
                    reloadKey: feedReloadKey,
                    onPostTap: { postId in feedPath.append(AppRoute.postDetail(postId)) },
                    onAuthorTap: { handle in feedPath.append(AppRoute.perfil(handle)) },
                    onHashtagTap: { tag in feedPath.append(AppRoute.hashtag(tag)) },
                    onEventoTap: { id in feedPath.append(AppRoute.eventoDetalle(id)) }
                )
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $feedPath)
                }
            }
            .tabItem { Label("Feed", systemImage: "house.fill") }
            .tag(0)

            NavigationStack(path: $eventosPath) {
                EventosView(
                    onEventoTap: { id in eventosPath.append(AppRoute.eventoDetalle(id)) },
                    onCreateTap: { eventosPath.append(AppRoute.createEvento) }
                )
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $eventosPath)
                }
            }
            .tabItem { Label("Eventos", systemImage: "calendar") }
            .tag(1)

            NavigationStack {
                PublicarView(onPublicado: {
                    feedReloadKey += 1
                    tab = 0
                })
            }
            .tabItem { Label("Publicar", systemImage: "plus.circle.fill") }
            .tag(2)

            NavigationStack {
                NotificacionesView()
            }
            .tabItem { Label("Avisos", systemImage: "bell.fill") }
            .tag(3)

            NavigationStack(path: $masPath) {
                MasView(
                    onNavigate: { ruta in navegarDesdeMas(ruta) },
                    onTerminos: { masPath.append(AppRoute.terminos) },
                    onPrivacidad: { masPath.append(AppRoute.privacidad) },
                    onLogout: { AuthRepository.shared.logout() }
                )
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $masPath)
                }
            }
            .tabItem { Label("Más", systemImage: "line.3.horizontal") }
            .tag(4)
        }
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            AgoraAnimatedTabBar(
                selection: $tab,
                avisosSinLeer: avisosSinLeer,
                badgePulseToken: badgePulseToken
            )
        }
        .tint(AgoraDesign.Colors.naranja)
        .agoraScreenBackground()
        .animation(AgoraDesign.Animation.spring, value: tab)
        .onChange(of: tab) { newTab in
            if newTab == 3 {
                avisosSinLeer = 0
                prevAvisosSinLeer = 0
            } else {
                Task { await actualizarBadge() }
            }
        }
        .onChange(of: avisosSinLeer) { newValue in
            if newValue > prevAvisosSinLeer && tab != 3 {
                badgePulseToken += 1
            }
            prevAvisosSinLeer = newValue
        }
        .onChange(of: deepLinkBus.pendingRoute) { route in
            guard let route else { return }
            aplicarDeepLink(route)
            deepLinkBus.consume()
        }
        .task {
            await actualizarBadge()
            if let route = deepLinkBus.pendingRoute {
                aplicarDeepLink(route)
                deepLinkBus.consume()
            }
        }
    }

    private func navegarDesdeMas(_ ruta: String) {
        switch ruta {
        case "buscar":
            masPath.append(AppRoute.buscar)
        case "directorio":
            masPath.append(AppRoute.directorio)
        case "guardados":
            masPath.append(AppRoute.guardados)
        case "notificaciones":
            tab = 3
        case "mensajes":
            masPath.append(AppRoute.mensajes)
        case "ajustes":
            masPath.append(AppRoute.ajustes)
        case "marketplace":
            masPath.append(AppRoute.marketplace)
        case "aventones":
            masPath.append(AppRoute.aventones)
        case "anonimo":
            masPath.append(AppRoute.anonimo)
        case "perfil-yo":
            masPath.append(AppRoute.perfilYo)
        default:
            if ruta.hasPrefix("perfil/") {
                let handle = String(ruta.dropFirst("perfil/".count))
                masPath.append(AppRoute.perfil(handle))
            }
        }
    }

  private func aplicarDeepLink(_ route: String) {
        if route == "main" {
            tab = 0
            feedPath = NavigationPath()
            return
        }

        if route.hasPrefix("post/") {
            let id = String(route.dropFirst("post/".count))
            tab = 0
            feedPath = NavigationPath()
            feedPath.append(AppRoute.postDetail(id))
            return
        }

        if route.hasPrefix("evento/") {
            let id = String(route.dropFirst("evento/".count))
            tab = 1
            eventosPath = NavigationPath()
            eventosPath.append(AppRoute.eventoDetalle(id))
            return
        }

        if route == "eventos/crear" {
            tab = 1
            eventosPath = NavigationPath()
            eventosPath.append(AppRoute.createEvento)
            return
        }

        if route == "notificaciones" {
            tab = 3
            return
        }

        if route == "mas" {
            tab = 4
            masPath = NavigationPath()
            return
        }

        if route.hasPrefix("mensaje/") {
            let id = String(route.dropFirst("mensaje/".count))
            tab = 4
            masPath = NavigationPath()
            masPath.append(AppRoute.mensajes)
            masPath.append(AppRoute.mensajeDetalle(id))
            return
        }

        if route == "mensajes" {
            tab = 4
            masPath = NavigationPath()
            masPath.append(AppRoute.mensajes)
            return
        }

        if route.hasPrefix("perfil/") {
            let handle = String(route.dropFirst("perfil/".count))
            tab = 4
            masPath = NavigationPath()
            masPath.append(AppRoute.perfil(handle))
            return
        }

        if route == "perfil-yo" {
            tab = 4
            masPath = NavigationPath()
            masPath.append(AppRoute.perfilYo)
            return
        }

        let masRoutes: [String: AppRoute] = [
            "buscar": .buscar,
            "directorio": .directorio,
            "guardados": .guardados,
            "ajustes": .ajustes,
        ]

        if let destino = masRoutes[route] {
            tab = 4
            masPath = NavigationPath()
            masPath.append(destino)
            return
        }

        if route == "marketplace" {
            tab = 4
            masPath = NavigationPath()
            masPath.append(AppRoute.marketplace)
            return
        }

        if route.hasPrefix("marketplace/") {
            let id = String(route.dropFirst("marketplace/".count))
            tab = 4
            masPath = NavigationPath()
            masPath.append(AppRoute.marketplace)
            masPath.append(AppRoute.marketplaceDetalle(id))
            return
        }

        if route.hasPrefix("hashtag/") {
            let tag = String(route.dropFirst("hashtag/".count))
            tab = 0
            feedPath = NavigationPath()
            feedPath.append(AppRoute.hashtag(tag))
            return
        }

        if route == "aventones" {
            tab = 4
            masPath = NavigationPath()
            masPath.append(AppRoute.aventones)
            return
        }

        if route == "anonimo" {
            tab = 4
            masPath = NavigationPath()
            masPath.append(AppRoute.anonimo)
            return
        }
    }

    @ViewBuilder
    private func hubDestination(_ route: AppRoute, path: Binding<NavigationPath>) -> some View {
        switch route {
        case .postDetail(let id):
            PostDetailView(
                postId: id,
                onAuthorTap: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onHashtagTap: { tag in path.wrappedValue.append(AppRoute.hashtag(tag)) }
            )
        case .eventoDetalle(let id):
            EventoDetalleView(
                eventoId: id,
                onPerfil: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onBorrado: { path.wrappedValue = NavigationPath() }
            )
        case .createEvento:
            CreateEventoView(
                onCreado: { id in
                    path.wrappedValue = NavigationPath()
                    path.wrappedValue.append(AppRoute.eventoDetalle(id))
                },
                onCancelar: {
                    if !path.wrappedValue.isEmpty {
                        path.wrappedValue.removeLast()
                    }
                }
            )
        case .mensajes:
            MensajesListView { conversacionId in
                path.wrappedValue.append(AppRoute.mensajeDetalle(conversacionId))
            }
        case .mensajeDetalle(let id):
            MensajeDetalleView(conversacionId: id)
        case .buscar:
            BuscarView(
                onPerfil: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onPublicacion: { id in path.wrappedValue.append(AppRoute.postDetail(id)) },
                onEvento: { id in
                    tab = 1
                    eventosPath = NavigationPath()
                    eventosPath.append(AppRoute.eventoDetalle(id))
                },
                onAnuncio: { id in path.wrappedValue.append(AppRoute.marketplaceDetalle(id)) }
            )
        case .directorio:
            DirectorioView { handle in
                path.wrappedValue.append(AppRoute.perfil(handle))
            }
        case .guardados:
            GuardadosView(
                onPostTap: { id in path.wrappedValue.append(AppRoute.postDetail(id)) },
                onAuthorTap: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onHashtagTap: { tag in path.wrappedValue.append(AppRoute.hashtag(tag)) }
            )
        case .perfil(let handle):
            PerfilAjenoView(
                handle: handle,
                miHandle: session.currentUser?.handle,
                onMensaje: { conversacionId in
                    path.wrappedValue.append(AppRoute.mensajeDetalle(conversacionId))
                },
                onAjustes: { path.wrappedValue.append(AppRoute.ajustes) },
                onPostTap: { id in path.wrappedValue.append(AppRoute.postDetail(id)) }
            )
        case .perfilYo:
            ProfileView(
                onLogout: { AuthRepository.shared.logout() },
                onMensajesTap: { path.wrappedValue.append(AppRoute.mensajes) },
                onMarketplaceTap: { path.wrappedValue.append(AppRoute.marketplace) },
                onAventonesTap: { path.wrappedValue.append(AppRoute.aventones) },
                onAnonimoTap: { path.wrappedValue.append(AppRoute.anonimo) },
                onMasTap: { tab = 4 },
                onAjustesTap: { path.wrappedValue.append(AppRoute.ajustes) },
                onTerminosTap: { path.wrappedValue.append(AppRoute.terminos) },
                onPrivacidadTap: { path.wrappedValue.append(AppRoute.privacidad) },
                onModeracionTap: { path.wrappedValue.append(AppRoute.moderacion) }
            )
        case .ajustes:
            AjustesView()
        case .terminos:
            TerminosView()
        case .privacidad:
            PrivacidadView()
        case .marketplace:
            MarketplaceListView(
                onAnuncio: { id in path.wrappedValue.append(AppRoute.marketplaceDetalle(id)) },
                onCrear: { path.wrappedValue.append(AppRoute.marketplaceCrear) }
            )
        case .marketplaceDetalle(let id):
            MarketplaceDetailView(
                anuncioId: id,
                onPerfil: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onMensaje: { conversacionId in
                    path.wrappedValue.append(AppRoute.mensajes)
                    path.wrappedValue.append(AppRoute.mensajeDetalle(conversacionId))
                }
            )
        case .marketplaceCrear:
            CreateAnuncioView(
                onCreado: { id in
                    path.wrappedValue = NavigationPath()
                    path.wrappedValue.append(AppRoute.marketplace)
                    path.wrappedValue.append(AppRoute.marketplaceDetalle(id))
                },
                onCancelar: {
                    if !path.wrappedValue.isEmpty {
                        path.wrappedValue.removeLast()
                    }
                }
            )
        case .aventones:
            AventonesView { handle in
                path.wrappedValue.append(AppRoute.perfil(handle))
            }
        case .hashtag(let tag):
            HashtagView(
                tag: tag,
                onPostTap: { id in path.wrappedValue.append(AppRoute.postDetail(id)) },
                onHashtagTap: { t in path.wrappedValue.append(AppRoute.hashtag(t)) },
                onAuthorTap: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) }
            )
        case .anonimo:
            AnonimoView()
        case .moderacion:
            ModeracionView()
        }
    }

    private func actualizarBadge() async {
        guard tab != 3 else { return }
        do {
            let resp = try await AgoraApi.sinLeer()
            avisosSinLeer = resp.total
        } catch {
            avisosSinLeer = 0
        }
    }
}

/// Rutas secundarias desde tabs principales.
enum AppRoute: Hashable {
    case postDetail(String)
    case eventoDetalle(String)
    case createEvento
    case mensajes
    case mensajeDetalle(String)
    case buscar
    case directorio
    case guardados
    case perfil(String)
    case perfilYo
    case ajustes
    case terminos
    case privacidad
    case marketplace
    case marketplaceDetalle(String)
    case marketplaceCrear
    case aventones
    case hashtag(String)
    case anonimo
    case moderacion
}

// MARK: - Tab bar animado (paridad con `MainShell.kt`)

private struct AgoraTabItem: Identifiable {
    let id: Int
    let label: String
    let icon: String
}

private struct AgoraAnimatedTabBar: View {
    @Binding var selection: Int
    let avisosSinLeer: Int
    let badgePulseToken: Int

    @State private var iconScales: [Int: CGFloat] = [0: 1, 1: 1, 2: 1, 3: 1, 4: 1]
    @State private var badgeScale: CGFloat = 1

    private let tabs: [AgoraTabItem] = [
        AgoraTabItem(id: 0, label: "Feed", icon: "house.fill"),
        AgoraTabItem(id: 1, label: "Eventos", icon: "calendar"),
        AgoraTabItem(id: 2, label: "Publicar", icon: "plus.circle.fill"),
        AgoraTabItem(id: 3, label: "Avisos", icon: "bell.fill"),
        AgoraTabItem(id: 4, label: "Más", icon: "line.3.horizontal"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(AgoraDesign.Colors.bordeSutil)
                .frame(height: 1)

            HStack(spacing: 0) {
                ForEach(tabs) { item in
                    tabButton(item)
                }
            }
            .padding(.horizontal, AgoraDesign.Spacing.xxs)
            .padding(.top, AgoraDesign.Spacing.xs)
            .padding(.bottom, AgoraDesign.Spacing.xxs)
        }
        .background(AgoraDesign.Colors.superficie)
        .onChange(of: selection) { newTab in
            bounceIcon(for: newTab)
        }
        .onChange(of: badgePulseToken) { _ in
            pulseBadge()
        }
    }

    private func tabButton(_ item: AgoraTabItem) -> some View {
        let selected = selection == item.id
        let scale = iconScales[item.id, default: 1]

        return Button {
            guard selection != item.id else { return }
            Haptics.light()
            selection = item.id
        } label: {
            VStack(spacing: 4) {
                ZStack {
                    if selected {
                        Capsule()
                            .fill(AgoraDesign.Colors.naranjaSuave)
                            .frame(width: 56, height: 32)
                            .transition(.scale.combined(with: .opacity))
                    }

                    tabIcon(item, scale: scale)
                }
                .frame(height: 32)

                Text(item.label)
                    .font(.caption2)
                    .fontWeight(selected ? .semibold : .regular)
                    .foregroundStyle(selected ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.textoMedio)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
        .animation(AgoraDesign.Animation.spring, value: selected)
    }

    @ViewBuilder
    private func tabIcon(_ item: AgoraTabItem, scale: CGFloat) -> some View {
        if item.id == 3, avisosSinLeer > 0 {
            ZStack(alignment: .topTrailing) {
                Image(systemName: item.icon)
                    .font(.body)
                    .foregroundStyle(selection == item.id ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.textoMedio)
                    .scaleEffect(scale)

                Text(avisosSinLeer > 9 ? "9+" : "\(avisosSinLeer)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(AgoraDesign.Colors.danger)
                    .clipShape(Capsule())
                    .scaleEffect(badgeScale)
                    .offset(x: 10, y: -8)
            }
        } else {
            Image(systemName: item.icon)
                .font(.body)
                .foregroundStyle(selection == item.id ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.textoMedio)
                .scaleEffect(scale)
        }
    }

    private func bounceIcon(for tab: Int) {
        withAnimation(.spring(response: 0.25, dampingFraction: 0.45)) {
            iconScales[tab] = 1.15
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                iconScales[tab] = 1.0
            }
        }
    }

    private func pulseBadge() {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.45)) {
            badgeScale = 1.25
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                badgeScale = 1.0
            }
        }
    }
}
