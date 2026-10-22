package mx.agora.mobile.nativeapp.ui.navigation

import android.net.Uri
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Rutas deep link — patrón NEXARA (unit tests sin instrumentación).
 */
@RunWith(RobolectricTestRunner::class)
class DeepLinkParserTest {

    @Test
    fun `agora scheme publicacion maps to post route`() {
        assertEquals(
            AgoraRoutes.post("abc123"),
            DeepLinkParser.parse("agora://publicacion/abc123"),
        )
    }

    @Test
    fun `agora scheme perfil maps to perfil route`() {
        assertEquals(
            AgoraRoutes.perfil("maria.udlap"),
            DeepLinkParser.parse("agora://perfil/maria.udlap"),
        )
    }

    @Test
    fun `https udlagora com evento maps to evento route`() {
        assertEquals(
            AgoraRoutes.evento("evt-42"),
            DeepLinkParser.parse("https://udlagora.com/evento/evt-42"),
        )
    }

    @Test
    fun `https www udlagora com mensajes maps to mensajes list`() {
        assertEquals(
            AgoraRoutes.MENSAJES,
            DeepLinkParser.parse("https://www.udlagora.com/mensajes"),
        )
    }

    @Test
    fun `https udlagora com mensaje thread maps to mensaje route`() {
        assertEquals(
            AgoraRoutes.mensaje("thread-9"),
            DeepLinkParser.parse("https://udlagora.com/mensajes/thread-9"),
        )
    }

    @Test
    fun `relative path hashtag maps to hashtag route`() {
        assertEquals(
            AgoraRoutes.hashtag("udlap"),
            DeepLinkParser.parse("/hashtag/udlap"),
        )
    }

    @Test
    fun `relative path perfil mio maps to perfil yo route`() {
        assertEquals(
            AgoraRoutes.PERFIL_YO,
            DeepLinkParser.parse("/perfil/mio"),
        )
        assertEquals(
            AgoraRoutes.PERFIL_YO,
            DeepLinkParser.parse("https://udlagora.com/perfil/mio"),
        )
        assertEquals(
            AgoraRoutes.PERFIL_YO,
            DeepLinkParser.parse("agora://perfil-yo"),
        )
    }

    @Test
    fun `unknown host returns null`() {
        assertNull(DeepLinkParser.parseUri(Uri.parse("https://example.com/publicacion/x")))
    }

    @Test
    fun `terminos and privacidad map to legal routes`() {
        assertEquals(AgoraRoutes.TERMINOS, DeepLinkParser.parse("/terminos"))
        assertEquals(AgoraRoutes.PRIVACIDAD, DeepLinkParser.parse("https://udlagora.com/privacidad"))
    }

    @Test
    fun `moderacion maps to moderacion route`() {
        assertEquals(AgoraRoutes.MODERACION, DeepLinkParser.parse("agora://moderacion"))
        assertEquals(AgoraRoutes.MODERACION, DeepLinkParser.parse("/moderacion"))
        assertEquals(
            AgoraRoutes.MODERACION,
            DeepLinkParser.parse("https://udlagora.com/moderacion"),
        )
    }

    @Test
    fun `feed maps to main`() {
        assertEquals(AgoraRoutes.MAIN, DeepLinkParser.parse("/feed"))
        assertEquals(AgoraRoutes.MAIN, DeepLinkParser.parse("agora://feed"))
    }

    @Test
    fun `retos maps to main feed`() {
        assertEquals(AgoraRoutes.MAIN, DeepLinkParser.parse("/retos"))
        assertEquals(AgoraRoutes.MAIN, DeepLinkParser.parse("agora://retos"))
        assertEquals(
            AgoraRoutes.MAIN,
            DeepLinkParser.parse("https://udlagora.com/retos"),
        )
    }

    @Test
    fun `eventos crear maps to create route not evento id`() {
        assertEquals(AgoraRoutes.EVENTOS_CREAR, DeepLinkParser.parse("/eventos/crear"))
        assertEquals(AgoraRoutes.EVENTOS_CREAR, DeepLinkParser.parse("agora://eventos/crear"))
        assertEquals(
            AgoraRoutes.EVENTOS_CREAR,
            DeepLinkParser.parse("https://udlagora.com/eventos/crear"),
        )
    }

    @Test
    fun `eventos list opens the eventos tab not the feed`() {
        assertEquals(AgoraRoutes.EVENTOS, DeepLinkParser.parse("/eventos"))
        assertEquals(AgoraRoutes.EVENTOS, DeepLinkParser.parse("agora://eventos"))
        assertEquals(AgoraRoutes.EVENTOS, DeepLinkParser.parse("https://udlagora.com/eventos"))
        // Con id sigue siendo el detalle.
        assertEquals(AgoraRoutes.evento("evt-7"), DeepLinkParser.parse("/eventos/evt-7"))
    }

    @Test
    fun `reglas maps to reglas route`() {
        assertEquals(AgoraRoutes.REGLAS, DeepLinkParser.parse("/reglas"))
        assertEquals(AgoraRoutes.REGLAS, DeepLinkParser.parse("agora://reglas"))
        assertEquals(AgoraRoutes.REGLAS, DeepLinkParser.parse("https://www.udlagora.com/reglas"))
    }

    @Test
    fun `marketplace list and detalle`() {
        assertEquals(AgoraRoutes.MARKETPLACE, DeepLinkParser.parse("/marketplace"))
        assertEquals(
            AgoraRoutes.marketplaceDetalle("anuncio-1"),
            DeepLinkParser.parse("agora://marketplace/anuncio-1"),
        )
    }

    @Test
    fun `toAgoraUri normalizes web path`() {
        assertEquals(
            "agora://publicacion/xyz",
            DeepLinkParser.toAgoraUri("https://udlagora.com/publicacion/xyz").toString(),
        )
    }

    @Test
    fun `hub secondary routes map`() {
        assertEquals(AgoraRoutes.AVENTONES, DeepLinkParser.parse("/aventones"))
        assertEquals(AgoraRoutes.AVENTONES, DeepLinkParser.parse("agora://aventones"))
        assertEquals(AgoraRoutes.ANONIMO, DeepLinkParser.parse("https://udlagora.com/anonimo"))
        assertEquals(AgoraRoutes.GUARDADOS, DeepLinkParser.parse("/guardados"))
        assertEquals(AgoraRoutes.DIRECTORIO, DeepLinkParser.parse("agora://directorio"))
        assertEquals(AgoraRoutes.BUSCAR, DeepLinkParser.parse("/buscar"))
        assertEquals(AgoraRoutes.NOTIFICACIONES, DeepLinkParser.parse("/notificaciones"))
    }
}
