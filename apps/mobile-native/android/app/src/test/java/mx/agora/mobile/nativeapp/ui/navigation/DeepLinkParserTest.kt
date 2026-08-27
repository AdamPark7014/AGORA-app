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
    fun `toAgoraUri normalizes web path`() {
        assertEquals(
            "agora://publicacion/xyz",
            DeepLinkParser.toAgoraUri("https://udlagora.com/publicacion/xyz").toString(),
        )
    }
}
