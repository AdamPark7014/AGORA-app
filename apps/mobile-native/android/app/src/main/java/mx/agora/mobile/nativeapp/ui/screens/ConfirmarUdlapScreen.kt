package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.SessionUser
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.ui.components.AgoraIsotipo
import mx.agora.mobile.nativeapp.ui.components.AgoraPrimaryButton
import mx.agora.mobile.nativeapp.ui.components.EstadoEntregaCodigo
import mx.agora.mobile.nativeapp.ui.components.FormularioContrasena
import mx.agora.mobile.nativeapp.ui.components.ModoContrasena
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import retrofit2.HttpException

private enum class PasoUdlap { INICIO, CODIGO, CONTRASENA }

/**
 * «Confirma tu correo UDLAP» para una cuenta que se registró con el correo
 * personal: pide el código normal al buzón @udlap.mx, sigue su entrega y lo
 * canjea con `auth/otp/verificar`. En una cuenta pendiente eso borra el correo
 * personal y la contraseña y cierra todas las sesiones; la sesión nueva ya
 * queda guardada y se elige la contraseña otra vez («Elige tu contraseña de
 * nuevo»). Al terminar llama [onConfirmada] con la sesión nueva.
 *
 * Lo usan el aviso del feed (ruta propia), la tarjeta de Ajustes y el bloqueo
 * por plazo vencido. [mostrarTitulo] en false cuando el que lo contiene ya
 * pone su propio título.
 */
@Composable
fun ConfirmarUdlap(
    auth: AuthRepository,
    email: String,
    onConfirmada: (SessionUser) -> Unit,
    modifier: Modifier = Modifier,
    mostrarTitulo: Boolean = true,
) {
    val textos = AgoraCopy.login.udlap
    val copy = AgoraCopy.login
    val scope = rememberCoroutineScope()
    var paso by remember { mutableStateOf(PasoUdlap.INICIO) }
    var envioId by remember { mutableStateOf<String?>(null) }
    var codigo by remember { mutableStateOf("") }
    var cargando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Nota neutra bajo el estado de entrega (p. ej. el 429 «espera un minuto»). */
    var aviso by remember { mutableStateOf<String?>(null) }
    /** Sesión nueva que da la API al confirmar; espera a que se elija la contraseña. */
    var sesionNueva by remember { mutableStateOf<SessionUser?>(null) }

    fun pedirCodigo() {
        if (cargando) return
        scope.launch {
            cargando = true
            error = null
            try {
                val id = auth.solicitarOtp(email)
                envioId = id
                aviso = if (id == null) copy.avisoOutlook else null
                paso = PasoUdlap.CODIGO
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                val delServidor = ApiClient.mensajeDelServidor(e) ?: mensajeDe(e)
                // El límite es uno por minuto por cuenta, cuente el buzón: en el
                // primer intento un 429 no garantiza que haya un código UDLAP.
                if (e.code() == 429 && paso == PasoUdlap.CODIGO) aviso = delServidor else error = delServidor
            } catch (e: Exception) {
                error = mensajeDe(e).ifBlank { copy.errorEnviar }
            } finally {
                cargando = false
            }
        }
    }

    fun confirmar() {
        if (cargando || codigo.length != 6) return
        scope.launch {
            cargando = true
            error = null
            try {
                val entrada = auth.verificarOtp(email, codigo)
                codigo = ""
                aviso = null
                if (entrada.tieneContrasena == true) {
                    // La cuenta ya no estaba pendiente: no se borró la contraseña.
                    onConfirmada(entrada.user)
                } else {
                    sesionNueva = entrada.user
                    paso = PasoUdlap.CONTRASENA
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                error = ApiClient.mensajeDelServidor(e) ?: copy.errorVerificar
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
            }
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        when (paso) {
            PasoUdlap.INICIO, PasoUdlap.CODIGO -> {
                if (mostrarTitulo) {
                    Text(
                        textos.confirmarTitulo,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = AgoraColors.Texto,
                    )
                    Spacer(Modifier.height(AgoraSpacing.Xxs))
                }
                Text(
                    textos.confirmarTexto(email),
                    style = MaterialTheme.typography.bodyMedium,
                    color = AgoraColors.TextoMedio,
                )
                Spacer(Modifier.height(AgoraSpacing.Sm))
                if (paso == PasoUdlap.INICIO) {
                    AgoraPrimaryButton(
                        text = if (cargando) textos.botonEnviando else textos.boton,
                        onClick = { pedirCodigo() },
                        loading = cargando,
                    )
                } else {
                    envioId?.let { id ->
                        EstadoEntregaCodigo(
                            envioId = id,
                            email = email,
                            consultar = { auth.estadoEntrega(it) },
                            // El correo UDLAP es el de la cuenta: no hay nada que corregir,
                            // solo volver a pedirlo.
                            onCorregir = { pedirCodigo() },
                            onReenviar = { pedirCodigo() },
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                    }
                    aviso?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = AgoraColors.TextoMedio)
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                    }
                    CampoCodigo(
                        codigo = codigo,
                        onCambio = { codigo = it },
                        onDone = { confirmar() },
                        enabled = !cargando,
                    )
                    Spacer(Modifier.height(AgoraSpacing.Sm))
                    AgoraPrimaryButton(
                        text = if (cargando) textos.confirmando else textos.confirmar,
                        onClick = { confirmar() },
                        enabled = codigo.length == 6,
                        loading = cargando,
                    )
                    TextButton(
                        onClick = { pedirCodigo() },
                        enabled = !cargando,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(copy.reenviar, color = AgoraColors.Naranja)
                    }
                    Text(
                        "${copy.pie} ${copy.remitente}",
                        style = MaterialTheme.typography.bodySmall,
                        color = AgoraColors.TextMuted,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            PasoUdlap.CONTRASENA -> {
                Text(
                    textos.contrasenaTitulo,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = AgoraColors.Texto,
                )
                Spacer(Modifier.height(AgoraSpacing.Xxs))
                Text(
                    textos.contrasenaTexto,
                    style = MaterialTheme.typography.bodyMedium,
                    color = AgoraColors.TextoMedio,
                )
                Spacer(Modifier.height(AgoraSpacing.Sm))
                FormularioContrasena(
                    modo = ModoContrasena.CREAR,
                    enviar = { _, nueva -> auth.crearContrasena(nueva) },
                    onListo = { (sesionNueva ?: auth.loadSession())?.let(onConfirmada) },
                )
            }
        }

        error?.let {
            Spacer(Modifier.height(AgoraSpacing.Sm))
            Text(it, color = AgoraColors.Danger, style = MaterialTheme.typography.bodySmall)
        }
    }
}

/** El flujo de confirmación como pantalla (desde el aviso del feed), dentro del scaffold de la ruta. */
@Composable
fun ConfirmarUdlapScreen(
    auth: AuthRepository,
    email: String,
    onConfirmada: (SessionUser) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(AgoraSpacing.Lg),
    ) {
        ConfirmarUdlap(auth = auth, email = email, onConfirmada = onConfirmada)
    }
}

/**
 * Pasaron los 30 días sin confirmar la UDLAP: la API responde 403 en todo lo
 * que no sea de `auth` ni de `cuenta` (la sesión sigue siendo buena, no se borra). Pantalla
 * completa antes del feed con el flujo de confirmación y «Cerrar sesión».
 */
@Composable
fun BloqueoUdlapScreen(
    auth: AuthRepository,
    email: String,
    onConfirmada: (SessionUser) -> Unit,
    onCerrarSesion: () -> Unit,
    cerrandoSesion: Boolean = false,
) {
    val textos = AgoraCopy.login.udlap
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .safeDrawingPadding(),
    ) {
        val alto = maxHeight
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .heightIn(min = alto)
                .padding(AgoraSpacing.Lg),
            verticalArrangement = Arrangement.Center,
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                AgoraIsotipo(size = 64.dp)
                Spacer(Modifier.height(AgoraSpacing.Sm))
                Text(
                    textos.vencidoTitulo,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = AgoraColors.Texto,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(AgoraSpacing.Xs))
                Text(
                    textos.vencidoTexto,
                    style = MaterialTheme.typography.bodyMedium,
                    color = AgoraColors.TextoMedio,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(AgoraSpacing.Lg))
            ConfirmarUdlap(
                auth = auth,
                email = email,
                onConfirmada = onConfirmada,
                mostrarTitulo = false,
            )
            Spacer(Modifier.height(AgoraSpacing.Md))
            TextButton(
                onClick = onCerrarSesion,
                enabled = !cerrandoSesion,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(textos.cerrarSesion, color = AgoraColors.TextoMedio)
            }
        }
    }
}
