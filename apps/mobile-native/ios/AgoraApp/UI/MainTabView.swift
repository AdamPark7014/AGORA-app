import SwiftUI
import UIKit

/// Tabs principales del diseño D (docs/diseno-d.md §3): Inicio, Clips, Publicar, Eventos y Campus,
/// como `MainShell.kt` en Android. Avisos, Mensajes y tu perfil se abren desde el encabezado del inicio.
struct MainTabView: View {
    @EnvironmentObject var session: SessionStore
    @ObservedObject private var deepLinkBus = DeepLinkBus.shared
    @Environment(\.scenePhase) private var scenePhase

    @State private var tab = 0
    /// Avisos sin leer (`GET notificaciones/sin-leer`): globo en el encabezado del inicio.
    @State private var avisosSinLeer = 0
    /// Mensajes directos sin leer (`GET mensajes/no-leidos`): globo en el encabezado del inicio.
    @State private var mensajesSinLeer = 0
    @State private var feedReloadKey = 0
    /// Cambia al tocar Inicio estando en Inicio: el feed sube al encabezado.
    @State private var inicioArriba = 0
    @State private var feedPath = NavigationPath()
    @State private var clipsPath = NavigationPath()
    @State private var eventosPath = NavigationPath()
    @State private var masPath = NavigationPath()
    /// `TabView` y no un contenedor propio: con `ZStack` las pestañas ocultas seguían en el árbol de
    /// accesibilidad (VoiceOver las leía y las pruebas tocaban lo que no se veía). La barra nativa se
    /// oculta en cada pestaña y en cada pantalla empujada (`sinBarraNativa`): con el SDK de iOS 26
    /// ponerlo solo sobre el `TabView` ya no basta y se asomaba bajo la barra flotante (1.0.0 (5)).
    var body: some View {
        TabView(selection: $tab) {
            NavigationStack(path: $feedPath) {
                FeedView(
                    reloadKey: feedReloadKey,
                    irArriba: inicioArriba,
                    avisosSinLeer: avisosSinLeer,
                    mensajesSinLeer: mensajesSinLeer,
                    onPostTap: { postId in feedPath.append(AppRoute.postDetail(postId)) },
                    onAuthorTap: { handle in feedPath.append(AppRoute.perfil(handle)) },
                    onHashtagTap: { tag in feedPath.append(AppRoute.hashtag(tag)) },
                    onEventoTap: { id in feedPath.append(AppRoute.eventoDetalle(id)) },
                    onClipsTap: { id in feedPath.append(AppRoute.clips(id)) },
                    onAvisosTap: {
                        avisosSinLeer = 0
                        feedPath.append(AppRoute.notificaciones)
                    },
                    onMensajesTap: { feedPath.append(AppRoute.mensajes) },
                    // Tu perfil con el diseño D (portada, cifras, pestañas); sin handle, el menú propio.
                    onPerfilTap: {
                        if let handle = session.currentUser?.handle {
                            feedPath.append(AppRoute.perfil(handle))
                        } else {
                            feedPath.append(AppRoute.perfilYo)
                        }
                    },
                    onPublicarTap: { tab = 2 },
                    onCrearEventoTap: {
                        tab = 3
                        eventosPath = NavigationPath()
                        eventosPath.append(AppRoute.createEvento)
                    },
                    onAventonesTap: { feedPath.append(AppRoute.aventones) }
                )
                .sinBarraNativa()
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $feedPath).sinBarraNativa()
                }
            }
            .tag(0)

            NavigationStack(path: $clipsPath) {
                ClipsView(
                    enPestana: true,
                    visible: tab == 1 && clipsPath.isEmpty,
                    onPostTap: { id in clipsPath.append(AppRoute.postDetail(id)) },
                    onAuthorTap: { handle in clipsPath.append(AppRoute.perfil(handle)) },
                    onGrabar: { tab = 2 }
                )
                .sinBarraNativa()
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $clipsPath).sinBarraNativa()
                }
            }
            .tag(1)

            NavigationStack {
                PublicarView(onPublicado: {
                    feedReloadKey += 1
                    tab = 0
                })
                .sinBarraNativa()
            }
            .tag(2)

            NavigationStack(path: $eventosPath) {
                EventosView(
                    onEventoTap: { id in eventosPath.append(AppRoute.eventoDetalle(id)) },
                    onCreateTap: { eventosPath.append(AppRoute.createEvento) }
                )
                .sinBarraNativa()
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $eventosPath).sinBarraNativa()
                }
            }
            .tag(3)

            NavigationStack(path: $masPath) {
                MasView(
                    onNavigate: { ruta in navegarDesdeMas(ruta) },
                    onTerminos: { masPath.append(AppRoute.terminos) },
                    onReglas: { masPath.append(AppRoute.reglas) },
                    onPrivacidad: { masPath.append(AppRoute.privacidad) },
                    onLogout: { AuthRepository.shared.logout() },
                    mensajesSinLeer: mensajesSinLeer
                )
                .sinBarraNativa()
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $masPath).sinBarraNativa()
                }
            }
            .tag(4)
        }
        .toolbar(.hidden, for: .tabBar)
        // Encima del contenido y no en `safeAreaInset` del `TabView`: con el SDK de iOS 26 ese
        // espacio no llega al contenido de cada pestaña y la barra tapaba lo último de las listas y
        // la barra de acciones del evento. Cada pantalla reserva su alto con `sinBarraNativa()`.
        .overlay(alignment: .bottom) {
            AgoraAnimatedTabBar(selection: $tab) { repetida in
                // Tocar la pestaña en la que ya estás: primero vuelve a su raíz, luego sube.
                guard repetida == 0 else { return }
                if feedPath.isEmpty {
                    inicioArriba += 1
                } else {
                    feedPath = NavigationPath()
                }
            }
                // Con el teclado abierto se queda abajo, detrás de él, en vez de subir con el campo.
                .ignoresSafeArea(.keyboard, edges: .bottom)
        }
        .tint(AgoraDesign.Colors.naranja)
        .agoraScreenBackground()
        .animation(AgoraDesign.Animation.spring, value: tab)
        .onChange(of: tab) { _ in
            Task {
                await actualizarBadge()
                await actualizarMensajesSinLeer()
            }
        }
        .onChange(of: feedPath.count) { _ in
            // Al volver de Avisos o de una conversación los globos deben bajar.
            Task {
                await actualizarBadge()
                await actualizarMensajesSinLeer()
            }
        }
        .onChange(of: scenePhase) { fase in
            guard fase == .active else { return }
            Task {
                await actualizarBadge()
                await actualizarMensajesSinLeer()
            }
        }
        .onChange(of: deepLinkBus.pendingRoute) { route in
            guard let route else { return }
            aplicarDeepLink(route)
            deepLinkBus.consume()
        }
        .task {
            PushRegistration.shared.registerIfNeeded()
            await actualizarBadge()
            await actualizarMensajesSinLeer()
            await AuthRepository.shared.refrescarPermisos()
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
            tab = 0
            feedPath = NavigationPath()
            feedPath.append(AppRoute.notificaciones)
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
            if let handle = session.currentUser?.handle {
                masPath.append(AppRoute.perfil(handle))
            } else {
                masPath.append(AppRoute.perfilYo)
            }
        case "moderacion":
            masPath.append(AppRoute.moderacion)
        default:
            if ruta.hasPrefix("perfil/") {
                let handle = String(ruta.dropFirst("perfil/".count))
                masPath.append(AppRoute.perfil(handle))
            } else if ruta.hasPrefix("hashtag/") {
                masPath.append(AppRoute.hashtag(String(ruta.dropFirst("hashtag/".count))))
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
            tab = 3
            eventosPath = NavigationPath()
            eventosPath.append(AppRoute.eventoDetalle(id))
            return
        }

        if route == "eventos/crear" {
            tab = 3
            eventosPath = NavigationPath()
            eventosPath.append(AppRoute.createEvento)
            return
        }

        if route == "notificaciones" {
            tab = 0
            feedPath = NavigationPath()
            feedPath.append(AppRoute.notificaciones)
            return
        }

        if route == "mas" {
            tab = 4
            masPath = NavigationPath()
            return
        }

        // Mensajes cuelga del encabezado del inicio (diseño D).
        if route.hasPrefix("mensaje/") {
            let id = String(route.dropFirst("mensaje/".count))
            tab = 0
            feedPath = NavigationPath()
            feedPath.append(AppRoute.mensajes)
            feedPath.append(AppRoute.mensajeDetalle(id))
            return
        }

        if route == "mensajes" {
            tab = 0
            feedPath = NavigationPath()
            feedPath.append(AppRoute.mensajes)
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
            "terminos": .terminos,
            "reglas": .reglas,
            "privacidad": .privacidad,
            "moderacion": .moderacion,
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
                onHashtagTap: { tag in path.wrappedValue.append(AppRoute.hashtag(tag)) },
                onEliminado: {
                    if !path.wrappedValue.isEmpty {
                        path.wrappedValue.removeLast()
                    }
                    feedReloadKey += 1
                }
            )
        case .eventoDetalle(let id):
            EventoDetalleView(
                eventoId: id,
                onPerfil: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onBorrado: { path.wrappedValue = NavigationPath() },
                onAventones: { path.wrappedValue.append(AppRoute.aventones) }
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
                    tab = 3
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
                onPostTap: { id in path.wrappedValue.append(AppRoute.postDetail(id)) },
                onSeguidores: { h in path.wrappedValue.append(AppRoute.seguidores(h)) },
                onSiguiendo: { h in path.wrappedValue.append(AppRoute.siguiendo(h)) },
                onEventoTap: { id in path.wrappedValue.append(AppRoute.eventoDetalle(id)) },
                onAventonesTap: { path.wrappedValue.append(AppRoute.aventones) }
            )
        case .seguidores(let handle):
            SeguidoresView(handle: handle, modo: .seguidores) { h in
                path.wrappedValue.append(AppRoute.perfil(h))
            }
        case .siguiendo(let handle):
            SeguidoresView(handle: handle, modo: .siguiendo) { h in
                path.wrappedValue.append(AppRoute.perfil(h))
            }
        case .perfilYo:
            // Mismo orden que las propiedades de ProfileView (init memberwise).
            ProfileView(
                onLogout: { AuthRepository.shared.logout() },
                onMensajesTap: { path.wrappedValue.append(AppRoute.mensajes) },
                onAjustesTap: { path.wrappedValue.append(AppRoute.ajustes) },
                onTerminosTap: { path.wrappedValue.append(AppRoute.terminos) },
                onReglasTap: { path.wrappedValue.append(AppRoute.reglas) },
                onPrivacidadTap: { path.wrappedValue.append(AppRoute.privacidad) },
                onModeracionTap: { path.wrappedValue.append(AppRoute.moderacion) },
                onMarketplaceTap: { path.wrappedValue.append(AppRoute.marketplace) },
                onAventonesTap: { path.wrappedValue.append(AppRoute.aventones) },
                onAnonimoTap: { path.wrappedValue.append(AppRoute.anonimo) },
                onMasTap: { tab = 4 },
                onSeguidoresTap: { h in path.wrappedValue.append(AppRoute.seguidores(h)) },
                onSiguiendoTap: { h in path.wrappedValue.append(AppRoute.siguiendo(h)) }
            )
        case .ajustes:
            AjustesView()
        case .terminos:
            TerminosView()
        case .reglas:
            ReglasView()
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
            AventonesView(
                onPerfil: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onMensaje: { conversacionId in
                    path.wrappedValue.append(AppRoute.mensajeDetalle(conversacionId))
                }
            )
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
        case .clips(let desde):
            ClipsView(
                desde: desde,
                onPostTap: { id in path.wrappedValue.append(AppRoute.postDetail(id)) },
                onAuthorTap: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onGrabar: { tab = 2 }
            )
        case .notificaciones:
            NotificacionesView()
        }
    }

    private func actualizarBadge() async {
        do {
            let resp = try await AgoraApi.sinLeer()
            avisosSinLeer = resp.total
        } catch {
            avisosSinLeer = 0
        }
    }

    private func actualizarMensajesSinLeer() async {
        do {
            let resp = try await AgoraApi.mensajesNoLeidos()
            mensajesSinLeer = max(0, resp.total)
        } catch {
            // Sin red: se conserva el último valor.
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
    case seguidores(String)
    case siguiendo(String)
    case perfilYo
    case ajustes
    case terminos
    case reglas
    case privacidad
    case marketplace
    case marketplaceDetalle(String)
    case marketplaceCrear
    case aventones
    case hashtag(String)
    case anonimo
    case moderacion
    /// Visor de clips; con el id del clip con el que abre.
    case clips(String?)
    /// Avisos: desde el encabezado del inicio.
    case notificaciones
}

// MARK: - Tab bar animado (paridad con `MainShell.kt`)

private struct AgoraTabItem: Identifiable {
    let id: Int
    let label: String
    let icon: String
    /// Ícono cuando está activa (relleno donde SF Symbols lo tiene).
    let iconActivo: String
}

private struct AgoraAnimatedTabBar: View {
    @Binding var selection: Int
    /// Toque en la pestaña que ya está activa.
    var onRepetir: (Int) -> Void = { _ in }

    @State private var iconScales: [Int: CGFloat] = [0: 1, 1: 1, 2: 1, 3: 1, 4: 1]

    /// Los cinco destinos del diseño D. Los identificadores `tab.<n>` se quedan: las pruebas de UI los usan.
    private let tabs: [AgoraTabItem] = [
        AgoraTabItem(id: 0, label: "Inicio", icon: "house", iconActivo: "house.fill"),
        AgoraTabItem(id: 1, label: "Clips", icon: "play.rectangle", iconActivo: "play.rectangle.fill"),
        AgoraTabItem(id: 2, label: "Publicar", icon: "plus", iconActivo: "plus"),
        AgoraTabItem(id: 3, label: "Eventos", icon: "calendar", iconActivo: "calendar"),
        AgoraTabItem(id: 4, label: "Campus", icon: "square.grid.2x2", iconActivo: "square.grid.2x2.fill"),
    ]

    /// Íconos inactivos sobre la píldora oscura (mismo tono en claro y oscuro).
    private let tonoInactivo = Color(red: 189 / 255, green: 182 / 255, blue: 173 / 255)

    /// Píldora oscura flotante con Publicar en naranja (docs/diseno-d.md §3).
    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs) { item in
                tabButton(item)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .padding(6)
        .background(
            AgoraDesign.Colors.oscuro,
            in: RoundedRectangle(cornerRadius: 24, style: .continuous)
        )
        .shadow(color: .black.opacity(0.22), radius: 14, y: 8)
        .padding(.horizontal, 14)
        .padding(.bottom, 4)
        .onChange(of: selection) { newTab in
            bounceIcon(for: newTab)
        }
    }

    private func tabButton(_ item: AgoraTabItem) -> some View {
        let selected = selection == item.id
        let scale = iconScales[item.id, default: 1]

        return Button {
            guard selection != item.id else {
                onRepetir(item.id)
                return
            }
            Haptics.light()
            selection = item.id
        } label: {
            ZStack {
                if item.id == 2 {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(AgoraDesign.Colors.naranja)
                        .frame(width: 52, height: 48)
                } else if selected {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.white.opacity(0.12))
                        .frame(height: 48)
                        .transition(.scale.combined(with: .opacity))
                }

                // Activo relleno, inactivo de línea (artboard FeedD).
                Image(systemName: selected ? item.iconActivo : item.icon)
                    .font(.system(size: item.id == 2 ? 20 : 19, weight: item.id == 2 ? .bold : .semibold))
                    .foregroundStyle(item.id == 2 || selected ? .white : tonoInactivo)
                    .scaleEffect(scale)
            }
            // Alto fijo, no mínimo: dentro de `safeAreaInset` las figuras sin alto crecen hasta
            // llenar la pantalla (TestFlight 1.0.0 (5) salió con la barra estirada).
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityLabel(item.label)
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier("tab.\(item.id)")
        .animation(AgoraDesign.Animation.spring, value: selected)
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
}

private extension View {
    /// Oculta la barra nativa de pestañas (la app usa su barra flotante propia) y reserva abajo el
    /// alto de la flotante, para que lo último de cada lista y las barras de acción queden por encima.
    func sinBarraNativa() -> some View {
        modifier(EspacioBarraFlotante())
    }
}

private struct EspacioBarraFlotante: ViewModifier {
    /// Alto de la barra flotante (48 de botones + 12 de relleno + 4 de margen) y un respiro.
    static let alto: CGFloat = 72

    @State private var tecladoVisible = false

    func body(content: Content) -> some View {
        content
            .toolbar(.hidden, for: .tabBar)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                // Con el teclado abierto la barra queda detrás de él: no hace falta el hueco.
                Color.clear
                    .frame(height: tecladoVisible ? 0 : Self.alto)
                    .allowsHitTesting(false)
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in
                tecladoVisible = true
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
                tecladoVisible = false
            }
    }
}
