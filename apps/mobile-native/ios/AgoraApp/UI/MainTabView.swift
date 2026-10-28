import SwiftUI
import UIKit

/// Pestañas del Feed B que eligió Adam (artboard FeedB, 26-10-2026): Inicio, Eventos, Publicar,
/// Mercado y Tu perfil. Avisos y Mensajes van en el encabezado del inicio; los clips, en la fila de
/// historias; Campus (aventones, directorio, sin nombre, tu día, ajustes), en el menú de tu perfil.
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
    @State private var eventosPath = NavigationPath()
    @State private var mercadoPath = NavigationPath()
    /// Pila de «Tu perfil» (y de Campus, que se abre desde su menú).
    @State private var masPath = NavigationPath()
    /// Foto de tu perfil para la pestaña (`GET perfil/yo`).
    @State private var miFoto: String?
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
                    onClipsTap: { id in feedPath.append(AppRoute.clips(id)) },
                    onAvisosTap: {
                        avisosSinLeer = 0
                        feedPath.append(AppRoute.notificaciones)
                    },
                    onMensajesTap: { feedPath.append(AppRoute.mensajes) },
                    onPublicarTap: { tab = 2 },
                    onCrearEventoTap: {
                        tab = 1
                        eventosPath = NavigationPath()
                        eventosPath.append(AppRoute.createEvento)
                    }
                )
                .sinBarraNativa()
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $feedPath).sinBarraNativa()
                }
            }
            .tag(0)

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
            .tag(1)

            NavigationStack {
                PublicarView(onPublicado: {
                    feedReloadKey += 1
                    tab = 0
                })
                .sinBarraNativa()
            }
            .tag(2)

            NavigationStack(path: $mercadoPath) {
                MarketplaceListView(
                    onAnuncio: { id in mercadoPath.append(AppRoute.marketplaceDetalle(id)) },
                    onCrear: { mercadoPath.append(AppRoute.marketplaceCrear) }
                )
                .sinBarraNativa()
                .navigationDestination(for: AppRoute.self) { route in
                    hubDestination(route, path: $mercadoPath).sinBarraNativa()
                }
            }
            .tag(3)

            NavigationStack(path: $masPath) {
                Group {
                    if let handle = session.currentUser?.handle {
                        PerfilAjenoView(
                            handle: handle,
                            miHandle: handle,
                            onMensaje: { conversacionId in masPath.append(AppRoute.mensajeDetalle(conversacionId)) },
                            onAjustes: { masPath.append(AppRoute.ajustes) },
                            onPostTap: { id in masPath.append(AppRoute.postDetail(id)) },
                            onSeguidores: { h in masPath.append(AppRoute.seguidores(h)) },
                            onSiguiendo: { h in masPath.append(AppRoute.siguiendo(h)) },
                            onEventoTap: { id in masPath.append(AppRoute.eventoDetalle(id)) },
                            onAventonesTap: { masPath.append(AppRoute.aventones) },
                            onCampus: { masPath.append(AppRoute.campus) }
                        )
                    } else {
                        campus
                    }
                }
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
            AgoraAnimatedTabBar(
                selection: $tab,
                nombre: session.currentUser?.nombre ?? session.currentUser?.handle ?? "?",
                foto: miFoto
            ) { repetida in
                // Tocar la pestaña en la que ya estás: vuelve a su raíz; en Inicio, además sube.
                switch repetida {
                case 0:
                    if feedPath.isEmpty { inicioArriba += 1 } else { feedPath = NavigationPath() }
                case 1: eventosPath = NavigationPath()
                case 3: mercadoPath = NavigationPath()
                case 4: masPath = NavigationPath()
                default: break
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
            miFoto = (try? await AgoraApi.perfilMio())?.fotoUrl
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

    /// Campus: accesos, «Tu día» y tu cuenta. Se abre desde el menú de tu perfil.
    private var campus: some View {
        MasView(
            onNavigate: { ruta in navegarDesdeMas(ruta) },
            onTerminos: { masPath.append(AppRoute.terminos) },
            onReglas: { masPath.append(AppRoute.reglas) },
            onPrivacidad: { masPath.append(AppRoute.privacidad) },
            onLogout: { AuthRepository.shared.logout() },
            mensajesSinLeer: mensajesSinLeer
        )
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
            // Mercado tiene su propia pestaña en el Feed B.
            tab = 3
        case "aventones":
            masPath.append(AppRoute.aventones)
        case "anonimo":
            masPath.append(AppRoute.anonimo)
        case "perfil-yo":
            // Campus cuelga de «Tu perfil»: volver a su raíz es volver a tu perfil.
            masPath = NavigationPath()
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
            tab = 3
            mercadoPath = NavigationPath()
            return
        }

        if route.hasPrefix("marketplace/") {
            let id = String(route.dropFirst("marketplace/".count))
            tab = 3
            mercadoPath = NavigationPath()
            mercadoPath.append(AppRoute.marketplaceDetalle(id))
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
            // Se abre desde las historias del inicio: al cambiar de pestaña el video se pausa.
            ClipsView(
                desde: desde,
                visible: tab == 0,
                onPostTap: { id in path.wrappedValue.append(AppRoute.postDetail(id)) },
                onAuthorTap: { handle in path.wrappedValue.append(AppRoute.perfil(handle)) },
                onGrabar: { tab = 2 }
            )
        case .notificaciones:
            NotificacionesView()
        case .campus:
            campus
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
    /// Campus: desde el menú de tu perfil.
    case campus
}

// MARK: - Tab bar animado (paridad con `MainShell.kt`)

private struct AgoraTabItem: Identifiable {
    let id: Int
    let label: String
    let icon: String
    /// Ícono cuando está activa (relleno donde SF Symbols lo tiene).
    let iconActivo: String
}

/// Barra del Feed B: blanca con borde arriba, íconos de línea que se rellenan al activarse,
/// Publicar como rectángulo con borde y tu foto en «Tu perfil». Los identificadores `tab.<n>`
/// se quedan: las pruebas de UI los usan.
private struct AgoraAnimatedTabBar: View {
    @Binding var selection: Int
    var nombre: String = "?"
    var foto: String?
    /// Toque en la pestaña que ya está activa.
    var onRepetir: (Int) -> Void = { _ in }

    private let tabs: [AgoraTabItem] = [
        AgoraTabItem(id: 0, label: "Inicio", icon: "house", iconActivo: "house.fill"),
        AgoraTabItem(id: 1, label: "Eventos", icon: "calendar", iconActivo: "calendar"),
        AgoraTabItem(id: 2, label: "Publicar", icon: "plus", iconActivo: "plus"),
        AgoraTabItem(id: 3, label: "Mercado", icon: "bag", iconActivo: "bag.fill"),
        AgoraTabItem(id: 4, label: "Tu perfil", icon: "person", iconActivo: "person"),
    ]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs) { item in
                tabButton(item)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(AgoraDesign.Colors.fondoFeed.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) {
            AgoraDesign.Colors.bordeFeed.frame(height: 1)
        }
    }

    private func tabButton(_ item: AgoraTabItem) -> some View {
        let selected = selection == item.id
        return Button {
            guard selection != item.id else {
                onRepetir(item.id)
                return
            }
            Haptics.light()
            selection = item.id
        } label: {
            icono(item, selected: selected)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                // B «Cholula»: la pestaña activa lleva las terrazas naranjas abajo (Publicar no).
                .overlay(alignment: .bottom) {
                    if selected && item.id != 2 {
                        Terrazas(niveles: 2)
                            .fill(AgoraDesign.Colors.naranja)
                            .frame(width: 22, height: 6)
                            .offset(y: 4)
                            .accessibilityHidden(true)
                    }
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityLabel(item.label)
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier("tab.\(item.id)")
    }

    @ViewBuilder
    private func icono(_ item: AgoraTabItem, selected: Bool) -> some View {
        switch item.id {
        case 2:
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AgoraDesign.Colors.boton)
                .frame(width: 52, height: 38)
                .overlay {
                    Image(systemName: "plus")
                        .font(.system(size: 19, weight: .bold))
                        .foregroundStyle(AgoraDesign.Colors.sobreBoton)
                }
        case 4:
            AvatarD(nombre: nombre, fotoUrl: foto, tamano: 28)
                .clipShape(Circle())
                .padding(2)
                .overlay {
                    if selected {
                        Circle().stroke(AgoraDesign.Colors.tintaFeed, lineWidth: 2)
                    }
                }
        default:
            Image(systemName: selected ? item.iconActivo : item.icon)
                .font(.system(size: 22, weight: selected ? .semibold : .regular))
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
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
    /// Alto de la barra del Feed B (44 de botones + 16 de relleno).
    static let alto: CGFloat = 60

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
