package mx.agora.mobile.nativeapp.ui.util

import mx.agora.mobile.nativeapp.data.ModoTema
import mx.agora.mobile.nativeapp.ui.navigation.AgoraRoutes
import mx.agora.mobile.nativeapp.ui.navigation.DeepLinkParser
import mx.agora.mobile.nativeapp.ui.screens.textoCupo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Los enlaces que se comparten deben abrir la misma pantalla al tocarlos con
 * la app instalada: ida (EnlacesWeb) y vuelta (DeepLinkParser).
 */
@RunWith(RobolectricTestRunner::class)
class EnlacesWebTest {

    @Test
    fun `publicacion compartida abre el detalle del post`() {
        assertEquals("https://udlagora.com/publicacion/abc123", EnlacesWeb.publicacion("abc123"))
        assertEquals(AgoraRoutes.post("abc123"), DeepLinkParser.parse(EnlacesWeb.publicacion("abc123")))
    }

    @Test
    fun `evento compartido abre el detalle del evento`() {
        assertEquals(AgoraRoutes.evento("ev1"), DeepLinkParser.parse(EnlacesWeb.evento("ev1")))
    }

    @Test
    fun `anuncio compartido abre el detalle del marketplace`() {
        assertEquals(AgoraRoutes.marketplaceDetalle("an1"), DeepLinkParser.parse(EnlacesWeb.anuncio("an1")))
    }

    @Test
    fun `perfil compartido abre el perfil`() {
        assertEquals(AgoraRoutes.perfil("maria_udlap"), DeepLinkParser.parse(EnlacesWeb.perfil("maria_udlap")))
    }

    @Test
    fun `cupo muestra lugares restantes o lleno`() {
        assertNull(textoCupo(null, 10))
        assertEquals("cupo 40 · quedan 12", textoCupo(40, 28))
        assertEquals("cupo 40 · lleno", textoCupo(40, 40))
        assertEquals("cupo 40 · lleno", textoCupo(40, 45))
    }

    @Test
    fun `sin tema elegido o desconocido es claro`() {
        assertEquals(ModoTema.OSCURO, ModoTema.deClave("oscuro"))
        assertEquals(ModoTema.SISTEMA, ModoTema.deClave("sistema"))
        // Regla de Adam (26-10-2026): claro por omisión aunque el teléfono esté en oscuro.
        assertEquals(ModoTema.CLARO, ModoTema.deClave(null))
        assertEquals(ModoTema.CLARO, ModoTema.deClave("morado"))
    }
}
