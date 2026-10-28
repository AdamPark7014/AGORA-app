package mx.agora.mobile.nativeapp.ui.screens

import mx.agora.mobile.nativeapp.data.api.AutorDto
import mx.agora.mobile.nativeapp.data.api.NotificacionDto
import org.junit.Assert.assertEquals
import org.junit.Test

/** Avisos agrupados en el cliente (B «Cholula»): mismo criterio que `GrupoAvisos` de iOS. */
class AgruparAvisosTest {

    private fun aviso(id: String, tipo: String, url: String?, quien: String?, fecha: String = "2026-10-28T18:00:00Z") =
        NotificacionDto(
            id = id,
            tipo = tipo,
            texto = "texto $id",
            url = url,
            leida = false,
            createdAt = fecha,
            actor = quien?.let { AutorDto(nombre = it) },
        )

    @Test
    fun juntaReaccionesSobreLaMismaPublicacion() {
        val grupos = agruparAvisos(
            listOf(
                aviso("1", "REACCION", "/p/a", "Diego Terán"),
                aviso("2", "COMENTARIO", "/p/a", "Isa Ruiz"),
                aviso("3", "REACCION", "/p/a", "Isa Ruiz"),
                aviso("4", "REACCION", "/p/a", "Carlos H"),
                aviso("5", "REACCION", "/p/a", "Ximena O"),
            ),
        )
        assertEquals(listOf("1", "2"), grupos.map { it.id })
        assertEquals("A Diego, Isa y 2 más les gustó tu publicación", grupos[0].texto)
        // Uno solo conserva su texto original.
        assertEquals("texto 2", grupos[1].texto)
    }

    @Test
    fun dosPersonasUsanEAnteI() {
        val grupos = agruparAvisos(listOf(aviso("1", "SEGUIDOR", null, "Diego"), aviso("2", "SEGUIDOR", null, "Isa")))
        assertEquals(1, grupos.size)
        assertEquals("Diego e Isa empezaron a seguirte", grupos[0].texto)
    }

    @Test
    fun loQueNoSeAgrupaVaSuelto() {
        val grupos = agruparAvisos(
            listOf(aviso("1", "EVENTO_RECORDATORIO", "/e/x", null), aviso("2", "EVENTO_RECORDATORIO", "/e/x", null)),
        )
        assertEquals(2, grupos.size)
        assertEquals("EVENTO", selloAviso(grupos[0].tipo).first)
    }
}
