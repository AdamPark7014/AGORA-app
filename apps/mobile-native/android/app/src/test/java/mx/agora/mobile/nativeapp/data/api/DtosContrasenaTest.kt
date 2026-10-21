package mx.agora.mobile.nativeapp.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `tieneContrasena` llegó a la API el 21-10-2026 (`docs/autenticacion.md`).
 * Debe leerse cuando viene y quedar en null con una API anterior, sin tirar
 * el parseo de la respuesta.
 */
class DtosContrasenaTest {
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

    @Test
    fun `verificar otp lee tieneContrasena`() {
        val adapter = moshi.adapter(VerificarOtpResponse::class.java)
        val sin = adapter.fromJson("""{"tienePerfil":true,"tieneContrasena":false,"token":"tok","expiraEn":"2027-04-19T00:00:00.000Z"}""")!!
        assertTrue(sin.tienePerfil)
        assertEquals(false, sin.tieneContrasena)
        assertEquals("tok", sin.token)

        val con = adapter.fromJson("""{"tienePerfil":false,"tieneContrasena":true,"token":"tok"}""")!!
        assertEquals(true, con.tieneContrasena)
    }

    @Test
    fun `api anterior sin tieneContrasena deja null`() {
        val verificar = moshi.adapter(VerificarOtpResponse::class.java)
            .fromJson("""{"tienePerfil":true,"token":"tok"}""")!!
        assertNull(verificar.tieneContrasena)

        val yo = moshi.adapter(YoResponse::class.java)
            .fromJson("""{"handle":"maria","nombre":"María","tienePerfil":true}""")!!
        assertNull(yo.tieneContrasena)
        assertEquals("maria", yo.handle)
    }

    @Test
    fun `auth yo lee tieneContrasena`() {
        val yo = moshi.adapter(YoResponse::class.java)
            .fromJson("""{"handle":"maria","tienePerfil":true,"tieneContrasena":true,"viaCodigo":false}""")!!
        assertEquals(true, yo.tieneContrasena)
    }

    @Test
    fun `entrar responde token y expiraEn`() {
        val resp = moshi.adapter(EntrarResponse::class.java)
            .fromJson("""{"tienePerfil":true,"tieneContrasena":true,"token":"abc","expiraEn":"2027-04-19T12:00:00.000Z"}""")!!
        assertTrue(resp.tienePerfil)
        assertEquals("abc", resp.token)
        assertEquals("2027-04-19T12:00:00.000Z", resp.expiraEn)
    }

    @Test
    fun `entrar manda modo token y recordarme`() {
        val json = moshi.adapter(EntrarRequest::class.java)
            .toJson(EntrarRequest(email = "ana@udlap.mx", contrasena = "ocho-888", recordarme = false))
        assertTrue(json, json.contains("\"modo\":\"token\""))
        assertTrue(json, json.contains("\"recordarme\":false"))
        assertTrue(json, json.contains("\"contrasena\":\"ocho-888\""))
        assertFalse(json, json.contains("codigo"))
    }
}
