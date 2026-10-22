package mx.agora.mobile.nativeapp.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import mx.agora.mobile.nativeapp.ui.components.diasParaConfirmarUdlap
import mx.agora.mobile.nativeapp.ui.components.udlapPorConfirmar
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
    fun `auth yo lee los campos udlap del registro con correo personal`() {
        val yo = moshi.adapter(YoResponse::class.java).fromJson(
            """{"email":"ana@udlap.mx","tienePerfil":true,"tieneContrasena":true,"udlapPendiente":true,""" +
                """"udlapVenceEn":"2026-11-21T18:00:00.000Z","udlapVencida":false,"udlapDiasRestantes":1}""",
        )!!
        assertEquals(true, yo.udlapPendiente)
        assertEquals("2026-11-21T18:00:00.000Z", yo.udlapVenceEn)
        assertEquals(false, yo.udlapVencida)
        assertEquals(1, yo.udlapDiasRestantes)

        val vencida = moshi.adapter(YoResponse::class.java).fromJson(
            """{"udlapPendiente":true,"udlapVenceEn":"2026-10-01T00:00:00.000Z","udlapVencida":true,"udlapDiasRestantes":0}""",
        )!!
        assertEquals(true, vencida.udlapVencida)
        assertEquals(0, vencida.udlapDiasRestantes)

        // Cuenta confirmada: la API manda null en las fechas.
        val confirmada = moshi.adapter(YoResponse::class.java).fromJson(
            """{"udlapPendiente":false,"udlapVenceEn":null,"udlapVencida":false,"udlapDiasRestantes":null}""",
        )!!
        assertEquals(false, confirmada.udlapPendiente)
        assertNull(confirmada.udlapVenceEn)
        assertNull(confirmada.udlapDiasRestantes)
    }

    @Test
    fun `api anterior sin campos udlap deja null`() {
        val yo = moshi.adapter(YoResponse::class.java)
            .fromJson("""{"handle":"maria","tienePerfil":true,"tieneContrasena":true}""")!!
        assertNull(yo.udlapPendiente)
        assertNull(yo.udlapVenceEn)
        assertNull(yo.udlapVencida)
        assertNull(yo.udlapDiasRestantes)

        assertNull(
            moshi.adapter(VerificarOtpResponse::class.java)
                .fromJson("""{"tienePerfil":true,"token":"tok"}""")!!.udlapPendiente,
        )
        assertNull(
            moshi.adapter(EntrarResponse::class.java)
                .fromJson("""{"tienePerfil":true,"token":"tok"}""")!!.udlapPendiente,
        )
    }

    @Test
    fun `verificar y entrar leen udlapPendiente`() {
        val verificar = moshi.adapter(VerificarOtpResponse::class.java)
            .fromJson("""{"tienePerfil":false,"tieneContrasena":false,"udlapPendiente":true,"token":"tok"}""")!!
        assertEquals(true, verificar.udlapPendiente)

        val entrar = moshi.adapter(EntrarResponse::class.java)
            .fromJson("""{"tienePerfil":true,"tieneContrasena":true,"udlapPendiente":false,"token":"tok"}""")!!
        assertEquals(false, entrar.udlapPendiente)
    }

    @Test
    fun `correo personal manda email, correoPersonal y modo token`() {
        val solicitar = moshi.adapter(SolicitarOtpPersonalRequest::class.java)
            .toJson(SolicitarOtpPersonalRequest(email = "ana@udlap.mx", correoPersonal = "ana@gmail.com"))
        assertTrue(solicitar, solicitar.contains("\"email\":\"ana@udlap.mx\""))
        assertTrue(solicitar, solicitar.contains("\"correoPersonal\":\"ana@gmail.com\""))

        val verificar = moshi.adapter(VerificarOtpPersonalRequest::class.java)
            .toJson(VerificarOtpPersonalRequest(email = "ana@udlap.mx", correoPersonal = "ana@gmail.com", codigo = "123456"))
        assertTrue(verificar, verificar.contains("\"codigo\":\"123456\""))
        assertTrue(verificar, verificar.contains("\"correoPersonal\":\"ana@gmail.com\""))
        assertTrue(verificar, verificar.contains("\"modo\":\"token\""))
    }

    @Test
    fun `dias para confirmar usa los de la API o los calcula desde udlapVenceEn`() {
        assertEquals(1, YoResponse(udlapPendiente = true, udlapDiasRestantes = 1).diasParaConfirmarUdlap())
        assertEquals(0, YoResponse(udlapPendiente = true, udlapDiasRestantes = -3).diasParaConfirmarUdlap())

        val ahora = java.time.Instant.parse("2026-10-22T12:00:00Z").toEpochMilli()
        val calculado = YoResponse(udlapPendiente = true, udlapVenceEn = "2026-10-24T06:00:00.000Z")
            .diasParaConfirmarUdlap(ahora)
        assertEquals(2, calculado)
        assertNull(YoResponse(udlapPendiente = true).diasParaConfirmarUdlap(ahora))

        assertTrue(YoResponse(udlapPendiente = true, udlapVencida = false).udlapPorConfirmar())
        assertFalse(YoResponse(udlapPendiente = true, udlapVencida = true).udlapPorConfirmar())
        assertFalse(YoResponse().udlapPorConfirmar())
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
