package mx.agora.mobile.nativeapp.data

import kotlinx.coroutines.runBlocking
import mx.agora.mobile.nativeapp.data.api.AuthApi
import mx.agora.mobile.nativeapp.data.api.CambiarContrasenaRequest
import mx.agora.mobile.nativeapp.data.api.CrearContrasenaRequest
import mx.agora.mobile.nativeapp.data.api.EntrarRequest
import mx.agora.mobile.nativeapp.data.api.EntrarResponse
import mx.agora.mobile.nativeapp.data.api.EntregaOtpResponse
import mx.agora.mobile.nativeapp.data.api.SolicitarOtpPersonalRequest
import mx.agora.mobile.nativeapp.data.api.SolicitarOtpRequest
import mx.agora.mobile.nativeapp.data.api.VerificarOtpPersonalRequest
import mx.agora.mobile.nativeapp.data.api.VerificarOtpRequest
import mx.agora.mobile.nativeapp.data.api.VerificarOtpResponse
import mx.agora.mobile.nativeapp.data.api.YoResponse
import okhttp3.Headers
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import retrofit2.Response

/**
 * Entrar con contraseña guarda la sesión igual que entrar por código: token,
 * correo normalizado y lo que diga `auth/yo`. Sin tocar la red ni Android.
 */
class AuthRepositoryTest {

    private class AlmacenEnMemoria : AlmacenSesion {
        var guardado: SessionUser? = null
        override fun load(): SessionUser? = guardado
        override fun save(user: SessionUser) { guardado = user }
        override fun clear() { guardado = null }
        override fun token(): String? = guardado?.token
        override fun hasSeenWelcome(): Boolean = false
        override fun markWelcomeSeen() {}
    }

    /** API falsa: registra lo que se le pidió y responde lo que se le configure. */
    private open class AuthApiFalsa : AuthApi {
        var ultimoEntrar: EntrarRequest? = null
        var respuestaEntrar: EntrarResponse = EntrarResponse(tienePerfil = true, tieneContrasena = true, token = "tok-123")
        var ultimoVerificar: VerificarOtpRequest? = null
        var respuestaVerificar: VerificarOtpResponse = VerificarOtpResponse(tienePerfil = false, token = "tok-otp", tieneContrasena = false)
        var yo: YoResponse? = YoResponse(handle = "maria", nombre = "María")
        var tokenVistoEnYo: String? = null
        var ultimaCrear: CrearContrasenaRequest? = null
        var ultimaCambiar: CambiarContrasenaRequest? = null
        var ultimoSolicitarPersonal: SolicitarOtpPersonalRequest? = null
        var respuestaSolicitarPersonal: Response<Unit> =
            Response.success(Unit, Headers.headersOf("X-Envio-Id", " env-42 "))
        var ultimoVerificarPersonal: VerificarOtpPersonalRequest? = null
        var respuestaVerificarPersonal: VerificarOtpResponse = VerificarOtpResponse(
            tienePerfil = false,
            token = "tok-personal",
            tieneContrasena = false,
            udlapPendiente = true,
        )

        override suspend fun solicitarOtp(body: SolicitarOtpRequest): Response<Unit> = Response.success(Unit)
        override suspend fun verificarOtp(body: VerificarOtpRequest): VerificarOtpResponse {
            ultimoVerificar = body
            return respuestaVerificar
        }
        override suspend fun solicitarOtpPersonal(body: SolicitarOtpPersonalRequest): Response<Unit> {
            ultimoSolicitarPersonal = body
            return respuestaSolicitarPersonal
        }
        override suspend fun verificarOtpPersonal(body: VerificarOtpPersonalRequest): VerificarOtpResponse {
            ultimoVerificarPersonal = body
            return respuestaVerificarPersonal
        }
        override suspend fun entrar(body: EntrarRequest): EntrarResponse {
            ultimoEntrar = body
            return respuestaEntrar
        }
        override suspend fun yo(): YoResponse = yo ?: throw IllegalStateException("sin yo")
        override suspend fun entregaOtp(envioId: String): Response<EntregaOtpResponse> =
            Response.success(EntregaOtpResponse("entregado"))
        override suspend fun salir(): Response<Unit> = Response.success(Unit)
        override suspend fun crearContrasena(body: CrearContrasenaRequest): Response<Unit> {
            ultimaCrear = body
            return Response.success(Unit)
        }
        override suspend fun cambiarContrasena(body: CambiarContrasenaRequest): Response<Unit> {
            ultimaCambiar = body
            return Response.success(Unit)
        }
    }

    private fun repositorio(api: AuthApiFalsa, almacen: AlmacenEnMemoria) = AuthRepository(
        store = almacen,
        authApi = api,
        authApiConToken = { token ->
            api.tokenVistoEnYo = token
            api
        },
    )

    @Test
    fun `entrar manda correo normalizado, modo token y recordarme, y guarda la sesion`() = runBlocking {
        val api = AuthApiFalsa()
        val almacen = AlmacenEnMemoria()

        val user = repositorio(api, almacen).entrar("  Ana.R@UDLAP.MX ", "ocho-888", recordarme = false)

        val pedido = api.ultimoEntrar!!
        assertEquals("ana.r@udlap.mx", pedido.email)
        assertEquals("ocho-888", pedido.contrasena)
        assertEquals("token", pedido.modo)
        assertFalse(pedido.recordarme)

        assertEquals("tok-123", user.token)
        assertEquals("ana.r@udlap.mx", user.email)
        assertEquals("maria", user.handle)
        assertEquals("María", user.nombre)
        assertTrue(user.tienePerfil)
        assertEquals(user, almacen.guardado)
        // `auth/yo` se consulta con el token recién recibido.
        assertEquals("tok-123", api.tokenVistoEnYo)
    }

    @Test
    fun `entrar sin token no guarda nada`() = runBlocking {
        val api = AuthApiFalsa().apply { respuestaEntrar = EntrarResponse(tienePerfil = true, token = null) }
        val almacen = AlmacenEnMemoria()

        try {
            repositorio(api, almacen).entrar("ana@udlap.mx", "ocho-888", recordarme = true)
            fail("Debía fallar sin token")
        } catch (e: IllegalStateException) {
            // esperado
        }
        assertNull(almacen.guardado)
    }

    @Test
    fun `entrar guarda la sesion aunque auth yo falle`() = runBlocking {
        val api = AuthApiFalsa().apply { yo = null }
        val almacen = AlmacenEnMemoria()

        val user = repositorio(api, almacen).entrar("ana@udlap.mx", "ocho-888", recordarme = true)

        assertEquals("tok-123", user.token)
        assertNull(user.handle)
        assertEquals(user, almacen.guardado)
    }

    @Test
    fun `verificar otp devuelve tieneContrasena para decidir si se crea una`() = runBlocking {
        val api = AuthApiFalsa()
        val almacen = AlmacenEnMemoria()

        val entrada = repositorio(api, almacen).verificarOtp("Ana@udlap.mx", " 123456 ")

        assertEquals("ana@udlap.mx", api.ultimoVerificar!!.email)
        assertEquals("123456", api.ultimoVerificar!!.codigo)
        assertEquals(false, entrada.tieneContrasena)
        assertEquals("tok-otp", entrada.user.token)
        assertFalse(entrada.user.tienePerfil)
        assertEquals(entrada.user, almacen.guardado)
    }

    @Test
    fun `solicitar otp personal manda el correo UDLAP normalizado y el personal, y devuelve el envio`() = runBlocking {
        val api = AuthApiFalsa()
        val almacen = AlmacenEnMemoria()

        val envio = repositorio(api, almacen).solicitarOtpPersonal("  Ana.R@UDLAP.MX ", " Ana.R@Gmail.com ")

        val pedido = api.ultimoSolicitarPersonal!!
        assertEquals("ana.r@udlap.mx", pedido.email)
        assertEquals("ana.r@gmail.com", pedido.correoPersonal)
        assertEquals("env-42", envio)
        // Pedir el código no abre sesión.
        assertNull(almacen.guardado)
    }

    @Test
    fun `solicitar otp personal sin cabecera devuelve null y un error llega como HttpException`() = runBlocking {
        val api = AuthApiFalsa().apply { respuestaSolicitarPersonal = Response.success(Unit) }
        val repo = repositorio(api, AlmacenEnMemoria())
        assertNull(repo.solicitarOtpPersonal("ana@udlap.mx", "ana@gmail.com"))

        api.respuestaSolicitarPersonal = Response.error(
            409,
            """{"mensaje":"Ese correo personal ya está ligado a otra cuenta."}""".toResponseBody(null),
        )
        try {
            repo.solicitarOtpPersonal("ana@udlap.mx", "ana@gmail.com")
            fail("Debía fallar con 409")
        } catch (e: HttpException) {
            assertEquals(409, e.code())
        }
    }

    @Test
    fun `verificar otp personal guarda la sesion con el correo UDLAP`() = runBlocking {
        val api = AuthApiFalsa()
        val almacen = AlmacenEnMemoria()

        val entrada = repositorio(api, almacen)
            .verificarOtpPersonal(" Ana@UDLAP.mx", "ANA@gmail.com ", " 654321 ")

        val pedido = api.ultimoVerificarPersonal!!
        assertEquals("ana@udlap.mx", pedido.email)
        assertEquals("ana@gmail.com", pedido.correoPersonal)
        assertEquals("654321", pedido.codigo)
        assertEquals("token", pedido.modo)

        assertEquals("tok-personal", entrada.user.token)
        assertEquals("ana@udlap.mx", entrada.user.email)
        assertEquals("maria", entrada.user.handle)
        assertFalse(entrada.user.tienePerfil)
        assertEquals(false, entrada.tieneContrasena)
        assertEquals(true, entrada.udlapPendiente)
        assertEquals(entrada.user, almacen.guardado)
        assertEquals("tok-personal", api.tokenVistoEnYo)
    }

    @Test
    fun `confirmar la UDLAP con verificar otp reemplaza la sesion guardada`() = runBlocking {
        val api = AuthApiFalsa().apply {
            respuestaVerificar = VerificarOtpResponse(
                tienePerfil = true,
                token = "tok-nueva",
                tieneContrasena = false,
                udlapPendiente = false,
            )
        }
        val almacen = AlmacenEnMemoria().apply {
            guardado = SessionUser(token = "tok-vieja", email = "ana@udlap.mx", handle = "maria", nombre = null, tienePerfil = true)
        }

        val entrada = repositorio(api, almacen).verificarOtp("ana@udlap.mx", "111222")

        assertEquals("tok-nueva", almacen.guardado!!.token)
        assertEquals(false, entrada.tieneContrasena)
        assertEquals(false, entrada.udlapPendiente)
    }

    @Test
    fun `verificar otp personal sin token no guarda nada`() = runBlocking {
        val api = AuthApiFalsa().apply {
            respuestaVerificarPersonal = VerificarOtpResponse(tienePerfil = false, token = null)
        }
        val almacen = AlmacenEnMemoria()

        try {
            repositorio(api, almacen).verificarOtpPersonal("ana@udlap.mx", "ana@gmail.com", "123456")
            fail("Debía fallar sin token")
        } catch (e: IllegalStateException) {
            // esperado
        }
        assertNull(almacen.guardado)
    }

    @Test
    fun `crear y cambiar contrasena usan el token guardado`() = runBlocking {
        val api = AuthApiFalsa()
        val almacen = AlmacenEnMemoria().apply {
            guardado = SessionUser(token = "tok-guardado", email = "ana@udlap.mx", handle = null, nombre = null, tienePerfil = true)
        }
        val repo = repositorio(api, almacen)

        repo.crearContrasena("nueva-888")
        assertEquals("nueva-888", api.ultimaCrear!!.contrasena)
        assertEquals("tok-guardado", api.tokenVistoEnYo)

        repo.cambiarContrasena("vieja-777", "nueva-999")
        assertEquals("vieja-777", api.ultimaCambiar!!.actual)
        assertEquals("nueva-999", api.ultimaCambiar!!.nueva)
    }
}
