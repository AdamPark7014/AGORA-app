import XCTest
@testable import AgoraApp

/// Paridad con `DeepLinkParserTest.kt` (Android).
final class DeepLinkParserTests: XCTestCase {
    func testAgoraSchemePublicacionMapsToPostRoute() {
        XCTAssertEqual(DeepLinkParser.parse("agora://publicacion/abc123"), "post/abc123")
    }

    func testAgoraSchemePerfilMapsToPerfilRoute() {
        XCTAssertEqual(DeepLinkParser.parse("agora://perfil/maria.udlap"), "perfil/maria.udlap")
    }

    func testHttpsUdlagoraEventoMapsToEventoRoute() {
        XCTAssertEqual(DeepLinkParser.parse("https://udlagora.com/evento/evt-42"), "evento/evt-42")
    }

    func testHttpsWwwUdlagoraMensajesMapsToMensajesList() {
        XCTAssertEqual(DeepLinkParser.parse("https://www.udlagora.com/mensajes"), "mensajes")
    }

    func testHttpsUdlagoraMensajeThreadMapsToMensajeRoute() {
        XCTAssertEqual(DeepLinkParser.parse("https://udlagora.com/mensajes/thread-9"), "mensaje/thread-9")
    }

    func testRelativePathHashtagMapsToHashtagRoute() {
        XCTAssertEqual(DeepLinkParser.parse("/hashtag/udlap"), "hashtag/udlap")
    }

    func testPerfilMioMapsToPerfilYoRoute() {
        XCTAssertEqual(DeepLinkParser.parse("/perfil/mio"), "perfil-yo")
        XCTAssertEqual(DeepLinkParser.parse("https://udlagora.com/perfil/mio"), "perfil-yo")
        XCTAssertEqual(DeepLinkParser.parse("agora://perfil-yo"), "perfil-yo")
    }

    func testUnknownHostReturnsNil() {
        XCTAssertNil(DeepLinkParser.parse(url: URL(string: "https://example.com/publicacion/x")!))
    }

    func testFeedPathMapsToMain() {
        XCTAssertEqual(DeepLinkParser.parse("/feed"), "main")
    }

    func testTerminosPrivacidadYModeracionRoutes() {
        XCTAssertEqual(DeepLinkParser.parse("/terminos"), "terminos")
        XCTAssertEqual(DeepLinkParser.parse("https://udlagora.com/privacidad"), "privacidad")
        XCTAssertEqual(DeepLinkParser.parse("agora://moderacion"), "moderacion")
    }

    func testEventosCrearMapsToCreateRoute() {
        XCTAssertEqual(DeepLinkParser.parse("/eventos/crear"), "eventos/crear")
        XCTAssertEqual(DeepLinkParser.parse("agora://eventos/crear"), "eventos/crear")
    }

    func testMarketplaceListAndDetalle() {
        XCTAssertEqual(DeepLinkParser.parse("/marketplace"), "marketplace")
        XCTAssertEqual(DeepLinkParser.parse("agora://marketplace/anuncio-1"), "marketplace/anuncio-1")
    }
}
