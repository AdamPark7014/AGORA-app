package mx.agora.mobile.nativeapp.ui.screens

import mx.agora.mobile.nativeapp.ui.theme.AgoraFonts
import mx.agora.mobile.nativeapp.ui.components.Terrazas
import mx.agora.mobile.nativeapp.ui.components.Talavera
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.unit.sp
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clipToBounds
import androidx.activity.compose.BackHandler
import androidx.compose.material3.Surface
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.SessionUser
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.AgoraPieLegal
import mx.agora.mobile.nativeapp.ui.components.AgoraPrimaryButton
import mx.agora.mobile.nativeapp.ui.components.CampoContrasena
import mx.agora.mobile.nativeapp.ui.components.EstadoEntregaCodigo
import mx.agora.mobile.nativeapp.ui.components.FormularioContrasena
import mx.agora.mobile.nativeapp.ui.components.ModoContrasena
import mx.agora.mobile.nativeapp.ui.components.agoraFieldColors
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import mx.agora.mobile.nativeapp.ui.util.mensajeLegibleDelServidor
import retrofit2.HttpException

/**
 * La puerta de Ágora (misma secuencia que `apps/web/app/page.tsx`):
 *
 *  - `entrar`: correo + contraseña, lo de todos los días.
 *  - `pedir` → `codigo`: el código al buzón @udlap.mx. Solo para crear la
 *    cuenta, para una cuenta de antes que aún no tiene contraseña y para
 *    «olvidé mi contraseña». Es la única verificación institucional, por eso
 *    no se quita: solo se pide una vez.
 *  - `personal` → `codigo-personal`: si el código UDLAP no llega, el código va
 *    al correo personal (la API pregunta a Microsoft si el buzón UDLAP existe)
 *    y la cuenta tiene 30 días para confirmar la UDLAP desde Ajustes.
 *  - `contrasena`: después del código, cuando la cuenta no tiene contraseña o
 *    se vino por «olvidé», se elige una antes de pasar al perfil o al feed.
 */
private const val PASO_ENTRAR = "entrar"
private const val PASO_PEDIR = "pedir"
private const val PASO_CODIGO = "codigo"
private const val PASO_PERSONAL = "personal"
private const val PASO_CODIGO_PERSONAL = "codigo-personal"
private const val PASO_CONTRASENA = "contrasena"

private const val MOTIVO_REGISTRO = "registro"
private const val MOTIVO_OLVIDE = "olvide"

@Composable
fun LoginScreen(
    auth: AuthRepository,
    onLoggedIn: (SessionUser) -> Unit,
) {
    var paso by remember { mutableStateOf(PASO_ENTRAR) }
    var motivo by remember { mutableStateOf(MOTIVO_REGISTRO) }
    var email by remember { mutableStateOf("") }
    var contrasena by remember { mutableStateOf("") }
    var verContrasena by remember { mutableStateOf(false) }
    var recordarme by remember { mutableStateOf(true) }
    var codigo by remember { mutableStateOf("") }
    var cargando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Nota neutra bajo el estado de entrega (p. ej. el 429 "espera un minuto"). */
    var aviso by remember { mutableStateOf<String?>(null) }
    /** El buzón UDLAP no existe: va junto al correo UDLAP, no debajo del personal. */
    var errorUdlap by remember { mutableStateOf<String?>(null) }
    /** Id de seguimiento del último código enviado (cabecera X-Envio-Id). */
    var envioId by remember { mutableStateOf<String?>(null) }
    /** Correo personal cuando el código UDLAP no llega, y el seguimiento de su código. */
    var correoPersonal by remember { mutableStateOf("") }
    var envioIdPersonal by remember { mutableStateOf<String?>(null) }
    /** Sesión abierta por código que espera a que se elija la contraseña. */
    var verificado by remember { mutableStateOf<SessionUser?>(null) }
    val scope = rememberCoroutineScope()
    val copy = AgoraCopy.login
    val fieldColors = agoraFieldColors()

    fun terminar(user: SessionUser) {
        AgoraAnalytics.login { user.token }
        onLoggedIn(user)
    }

    fun irA(destino: String, nuevoMotivo: String? = null) {
        if (nuevoMotivo != null) motivo = nuevoMotivo
        paso = destino
        error = null
        aviso = null
        errorUdlap = null
    }

    fun entrar() {
        if (cargando || !email.contains("@") || contrasena.isEmpty()) return
        scope.launch {
            cargando = true
            error = null
            try {
                terminar(auth.entrar(email, contrasena, recordarme))
            } catch (e: HttpException) {
                // 401 uniforme y 429 por intentos: el mensaje de la API ya lo explica.
                error = mensajeLegibleDelServidor(e) ?: copy.errorEntrar
            } catch (e: Exception) {
                error = mensajeDe(e).ifBlank { copy.errorEntrar }
            } finally {
                cargando = false
            }
        }
    }

    fun pedirCodigo() {
        if (cargando) return
        scope.launch {
            cargando = true
            error = null
            try {
                val id = auth.solicitarOtp(email)
                envioId = id
                // Sin seguimiento (API vieja o modo consola) queda el aviso de siempre.
                aviso = if (id == null) copy.avisoOutlook else null
                paso = PASO_CODIGO
            } catch (e: HttpException) {
                val delServidor = mensajeLegibleDelServidor(e)
                if (e.code() == 429) {
                    // Como la web: el código anterior sigue sirviendo; se pasa a
                    // escribirlo y se explica por qué no salió otro.
                    paso = PASO_CODIGO
                    aviso = delServidor ?: mensajeDe(e)
                } else {
                    error = delServidor ?: mensajeDe(e)
                }
            } catch (e: Exception) {
                error = mensajeDe(e).ifBlank { copy.errorEnviar }
            } finally {
                cargando = false
            }
        }
    }

    fun volverAlCorreo() {
        paso = PASO_PEDIR
        codigo = ""
        error = null
        aviso = null
        errorUdlap = null
        envioId = null
    }

    /**
     * El código al correo personal. El límite (uno por minuto) es por cuenta,
     * cuente el buzón: un 429 aquí puede venir del código UDLAP recién pedido,
     * así que solo se pasa a escribir el código si ya se había mandado uno.
     */
    fun pedirCodigoPersonal() {
        if (cargando || !correoPersonal.contains("@")) return
        scope.launch {
            cargando = true
            error = null
            try {
                envioIdPersonal = auth.solicitarOtpPersonal(email, correoPersonal)
                aviso = null
                if (paso != PASO_CODIGO_PERSONAL) codigo = ""
                paso = PASO_CODIGO_PERSONAL
            } catch (e: HttpException) {
                val delServidor = mensajeLegibleDelServidor(e) ?: mensajeDe(e)
                when {
                    // El que falló es el UDLAP (p. ej. sin el punto): se dice junto a él.
                    e.code() == 400 && delServidor.startsWith("El correo UDLAP") -> errorUdlap = delServidor
                    e.code() == 429 && paso == PASO_CODIGO_PERSONAL -> aviso = delServidor
                    else -> error = delServidor
                }
            } catch (e: Exception) {
                error = mensajeDe(e).ifBlank { copy.errorEnviar }
            } finally {
                cargando = false
            }
        }
    }

    fun volverAlPersonal() {
        paso = PASO_PERSONAL
        codigo = ""
        error = null
        aviso = null
        envioIdPersonal = null
    }

    fun verificar(personal: Boolean = false) {
        if (cargando || codigo.length != 6) return
        scope.launch {
            cargando = true
            error = null
            try {
                val entrada = if (personal) {
                    auth.verificarOtpPersonal(email, correoPersonal, codigo)
                } else {
                    auth.verificarOtp(email, codigo)
                }
                // Sin contraseña todavía (cuenta nueva o de antes), o vino a
                // cambiarla: se elige antes de entrar. Si ya tiene y solo
                // prefirió el código, pasa. Con una API anterior (null) pasa.
                if (entrada.tieneContrasena == false || motivo == MOTIVO_OLVIDE) {
                    verificado = entrada.user
                    irA(PASO_CONTRASENA)
                } else {
                    terminar(entrada.user)
                }
            } catch (e: HttpException) {
                // Sin cuerpo (429, 5xx) no es que el código esté mal.
                error = mensajeLegibleDelServidor(e)
                    ?: if (e.code() in 400..401) copy.errorVerificar else mensajeDe(e)
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
            }
        }
    }

    // «Atrás» del sistema regresa al paso anterior, como el botón de cada paso;
    // antes cerraba la app a media verificación. En «contrasena» no hay a dónde
    // volver: el código ya se canjeó y la sesión ya está abierta.
    BackHandler(enabled = paso != PASO_ENTRAR && paso != PASO_CONTRASENA) {
        // Con una petición en curso no se cambia de paso (al terminar movería el paso).
        if (cargando) return@BackHandler
        when (paso) {
            PASO_PEDIR -> irA(PASO_ENTRAR)
            PASO_CODIGO -> volverAlCorreo()
            PASO_PERSONAL -> irA(PASO_CODIGO)
            PASO_CODIGO_PERSONAL -> volverAlPersonal()
        }
    }

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
                .heightIn(min = alto),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // B «Cholula» (WowB-Entrada): azulejo con la pirámide y «Ágora»; más bajo pasado el primer paso.
            HeroEntrada(grande = paso == PASO_ENTRAR)

            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp).padding(top = 6.dp)) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    val titulo = when (paso) {
                        PASO_PEDIR -> if (motivo == MOTIVO_OLVIDE) AgoraCopy.login.pedir.tituloOlvide else AgoraCopy.login.pedir.tituloRegistro
                        PASO_CODIGO, PASO_CODIGO_PERSONAL -> copy.tituloCodigo
                        PASO_PERSONAL -> AgoraCopy.login.personal.titulo
                        PASO_CONTRASENA ->
                            if (motivo == MOTIVO_OLVIDE) AgoraCopy.login.nuevaContrasena.tituloOlvide else AgoraCopy.login.nuevaContrasena.tituloCrear
                        else -> copy.lema
                    }
                    Text(
                        titulo,
                        style = if (paso == PASO_ENTRAR) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.titleMedium,
                        color = if (paso == PASO_ENTRAR) AgoraColors.TextMuted else AgoraColors.Texto,
                        textAlign = TextAlign.Center,
                    )
                }
                Spacer(Modifier.height(AgoraSpacing.Lg))

                when (paso) {
                    PASO_ENTRAR -> {
                        Text(
                            copy.entradilla,
                            style = MaterialTheme.typography.bodySmall,
                            color = AgoraColors.TextoMedio,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        CampoCorreo(
                            email = email,
                            onCambio = { email = it },
                            imeAction = ImeAction.Next,
                            enabled = !cargando,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        CampoContrasena(
                            valor = contrasena,
                            onCambio = { contrasena = it },
                            etiqueta = copy.etiquetaContrasena,
                            visible = verContrasena,
                            onAlternar = { verContrasena = !verContrasena },
                            enabled = !cargando,
                            imeAction = ImeAction.Done,
                            onDone = { entrar() },
                        )
                        // Un solo nodo para TalkBack: el renglón alterna y la casilla solo se dibuja.
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .toggleable(
                                    value = recordarme,
                                    role = Role.Checkbox,
                                    enabled = !cargando,
                                    onValueChange = { recordarme = it },
                                ),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(
                                checked = recordarme,
                                onCheckedChange = null,
                                // Sin onCheckedChange pierde los 48 dp: se conservan para no mover el renglón.
                                modifier = Modifier.minimumInteractiveComponentSize(),
                                colors = CheckboxDefaults.colors(checkedColor = AgoraColors.Naranja),
                            )
                            Text(
                                copy.recordarme,
                                style = MaterialTheme.typography.bodyMedium,
                                color = AgoraColors.Texto,
                            )
                        }
                        AgoraPrimaryButton(
                            text = if (cargando) copy.botonEntrando else copy.botonEntrar,
                            onClick = { entrar() },
                            enabled = email.contains("@") && contrasena.isNotEmpty(),
                            loading = cargando,
                        )
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            TextButton(onClick = { irA(PASO_PEDIR, MOTIVO_OLVIDE) }, enabled = !cargando) {
                                Text(copy.olvide, color = AgoraColors.Naranja)
                            }
                            TextButton(onClick = { irA(PASO_PEDIR, MOTIVO_REGISTRO) }, enabled = !cargando) {
                                Text(
                                    buildAnnotatedString {
                                        withStyle(SpanStyle(color = AgoraColors.TextoMedio)) { append("${copy.primeraVez} ") }
                                        withStyle(SpanStyle(color = AgoraColors.Naranja, fontWeight = FontWeight.SemiBold)) {
                                            append(copy.crearCuenta)
                                        }
                                    },
                                )
                            }
                        }
                    }

                    PASO_PEDIR -> {
                        Text(
                            if (motivo == MOTIVO_OLVIDE) AgoraCopy.login.pedir.explicacionOlvide else AgoraCopy.login.pedir.explicacionRegistro,
                            style = MaterialTheme.typography.bodyMedium,
                            color = AgoraColors.TextoMedio,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        CampoCorreo(
                            email = email,
                            onCambio = { email = it },
                            imeAction = ImeAction.Send,
                            enabled = !cargando,
                            onEnviar = { if (email.contains("@")) pedirCodigo() },
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        AgoraPrimaryButton(
                            text = if (cargando) AgoraCopy.login.pedir.botonEnviando else AgoraCopy.login.pedir.boton,
                            onClick = { pedirCodigo() },
                            enabled = email.contains("@"),
                            loading = cargando,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            TextButton(onClick = { irA(PASO_ENTRAR) }, enabled = !cargando) {
                                Text(AgoraCopy.login.pedir.volver, color = AgoraColors.Naranja)
                            }
                        }
                    }

                    PASO_CODIGO -> {
                        Text(
                            copy.entradillaCodigo(email),
                            style = MaterialTheme.typography.bodyMedium,
                            color = AgoraColors.TextoMedio,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        envioId?.let { id ->
                            EstadoEntregaCodigo(
                                envioId = id,
                                email = email,
                                consultar = { auth.estadoEntrega(it) },
                                onCorregir = { volverAlCorreo() },
                                onReenviar = { pedirCodigo() },
                            )
                            Spacer(Modifier.height(AgoraSpacing.Sm))
                        }
                        aviso?.let {
                            Text(
                                it,
                                style = MaterialTheme.typography.bodySmall,
                                color = AgoraColors.TextoMedio,
                            )
                            Spacer(Modifier.height(AgoraSpacing.Sm))
                        }
                        CampoCodigo(
                            codigo = codigo,
                            onCambio = { codigo = it },
                            onDone = { verificar() },
                            enabled = !cargando,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        AgoraPrimaryButton(
                            text = if (cargando) copy.botonVerificando else copy.botonCodigo,
                            onClick = { verificar() },
                            enabled = codigo.length == 6,
                            loading = cargando,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            TextButton(onClick = { volverAlCorreo() }, enabled = !cargando) {
                                Text(copy.cambiarCorreo, color = AgoraColors.Naranja)
                            }
                            TextButton(onClick = { pedirCodigo() }, enabled = !cargando) {
                                Text(copy.reenviar, color = AgoraColors.Naranja)
                            }
                        }
                        TextButton(
                            onClick = { irA(PASO_PERSONAL) },
                            enabled = !cargando,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(copy.noLlego, color = AgoraColors.Naranja, textAlign = TextAlign.Center)
                        }
                    }

                    PASO_PERSONAL -> {
                        TarjetaCorreoUdlap(
                            email = email,
                            error = errorUdlap,
                            enabled = !cargando,
                            onCambiar = { volverAlCorreo() },
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        Text(
                            AgoraCopy.login.personal.explicacion,
                            style = MaterialTheme.typography.bodyMedium,
                            color = AgoraColors.TextoMedio,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        OutlinedTextField(
                            value = correoPersonal,
                            onValueChange = { correoPersonal = it.trim() },
                            label = { Text(AgoraCopy.login.personal.etiqueta) },
                            placeholder = { Text(AgoraCopy.login.personal.placeholder) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            enabled = !cargando,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Email,
                                imeAction = ImeAction.Send,
                                autoCorrectEnabled = false,
                            ),
                            keyboardActions = KeyboardActions(onSend = { pedirCodigoPersonal() }),
                            colors = fieldColors,
                            shape = MaterialTheme.shapes.medium,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        AgoraPrimaryButton(
                            text = if (cargando) AgoraCopy.login.personal.botonEnviando else AgoraCopy.login.personal.boton,
                            onClick = { pedirCodigoPersonal() },
                            enabled = correoPersonal.contains("@"),
                            loading = cargando,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            TextButton(onClick = { irA(PASO_CODIGO) }, enabled = !cargando) {
                                Text(AgoraCopy.login.personal.volver, color = AgoraColors.Naranja)
                            }
                        }
                    }

                    PASO_CODIGO_PERSONAL -> {
                        Text(
                            AgoraCopy.login.personal.entradillaCodigo(correoPersonal),
                            style = MaterialTheme.typography.bodyMedium,
                            color = AgoraColors.TextoMedio,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        envioIdPersonal?.let { id ->
                            EstadoEntregaCodigo(
                                envioId = id,
                                email = correoPersonal,
                                consultar = { auth.estadoEntrega(it) },
                                onCorregir = { volverAlPersonal() },
                                onReenviar = { pedirCodigoPersonal() },
                                personal = true,
                            )
                            Spacer(Modifier.height(AgoraSpacing.Sm))
                        }
                        aviso?.let {
                            Text(
                                it,
                                style = MaterialTheme.typography.bodySmall,
                                color = AgoraColors.TextoMedio,
                            )
                            Spacer(Modifier.height(AgoraSpacing.Sm))
                        }
                        CampoCodigo(
                            codigo = codigo,
                            onCambio = { codigo = it },
                            onDone = { verificar(personal = true) },
                            enabled = !cargando,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        AgoraPrimaryButton(
                            text = if (cargando) copy.botonVerificando else copy.botonCodigo,
                            onClick = { verificar(personal = true) },
                            enabled = codigo.length == 6,
                            loading = cargando,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            TextButton(onClick = { volverAlPersonal() }, enabled = !cargando) {
                                Text(copy.cambiarCorreo, color = AgoraColors.Naranja)
                            }
                            TextButton(onClick = { pedirCodigoPersonal() }, enabled = !cargando) {
                                Text(copy.reenviar, color = AgoraColors.Naranja)
                            }
                        }
                    }

                    PASO_CONTRASENA -> {
                        Text(
                            if (motivo == MOTIVO_OLVIDE) AgoraCopy.login.nuevaContrasena.entradillaOlvide else AgoraCopy.login.nuevaContrasena.entradillaCrear,
                            style = MaterialTheme.typography.bodyMedium,
                            color = AgoraColors.TextoMedio,
                        )
                        Spacer(Modifier.height(AgoraSpacing.Sm))
                        FormularioContrasena(
                            modo = ModoContrasena.CREAR,
                            enviar = { _, nueva -> auth.crearContrasena(nueva) },
                            onListo = { verificado?.let { terminar(it) } },
                        )
                    }
                }

                error?.let {
                    Spacer(Modifier.height(AgoraSpacing.Sm))
                    Text(
                        it,
                        color = AgoraColors.Danger,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                    )
                }

                if (paso == PASO_CODIGO) {
                    Spacer(Modifier.height(AgoraSpacing.Md))
                    PistaCorreo()
                } else if (paso == PASO_CODIGO_PERSONAL) {
                    Spacer(Modifier.height(AgoraSpacing.Md))
                    Text(
                        "${copy.pie} ${copy.remitente}",
                        style = MaterialTheme.typography.bodySmall,
                        color = AgoraColors.TextMuted,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            AgoraPieLegal(modifier = Modifier.padding(top = AgoraSpacing.Lg, bottom = AgoraSpacing.Lg))
        }
    }
}

/** Azulejo de Talavera de orilla a orilla con la pirámide escalonada del color del fondo y «Ágora» en ella. */
@Composable
private fun HeroEntrada(grande: Boolean) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(if (grande) 300.dp else 190.dp)
            .clipToBounds(),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Talavera(Modifier.matchParentSize(), fondo = AgoraColors.Talavera, trazo = Color(0xFF3557B8))
        Terrazas(
            AgoraColors.Fondo,
            Modifier.size(330.dp, if (grande) 150.dp else 100.dp),
            niveles = 5,
        )
        Text(
            "Ágora",
            fontFamily = AgoraFonts.titulo,
            fontWeight = FontWeight.ExtraBold,
            fontSize = if (grande) 52.sp else 40.sp,
            letterSpacing = (-1.4).sp,
            color = AgoraColors.Texto,
            modifier = Modifier
                .padding(bottom = if (grande) 62.dp else 38.dp)
                .semantics { heading() },
        )
    }
}

@Composable
private fun CampoCorreo(
    email: String,
    onCambio: (String) -> Unit,
    imeAction: ImeAction,
    enabled: Boolean,
    onEnviar: () -> Unit = {},
) {
    OutlinedTextField(
        value = email,
        onValueChange = { onCambio(it.trim()) },
        label = { Text(AgoraCopy.login.etiquetaCorreo) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        enabled = enabled,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Email,
            imeAction = imeAction,
            autoCorrectEnabled = false,
        ),
        keyboardActions = KeyboardActions(onSend = { onEnviar() }),
        colors = agoraFieldColors(),
        shape = MaterialTheme.shapes.medium,
    )
}

/** Los 6 dígitos del correo (solo números). También lo usa «Confirma tu correo UDLAP». */
@Composable
internal fun CampoCodigo(
    codigo: String,
    onCambio: (String) -> Unit,
    onDone: () -> Unit,
    enabled: Boolean = true,
) {
    OutlinedTextField(
        value = codigo,
        onValueChange = { nuevo -> onCambio(nuevo.filter(Char::isDigit).take(6)) },
        label = { Text(AgoraCopy.login.etiquetaCodigo) },
        placeholder = { Text("000000") },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        enabled = enabled,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.NumberPassword,
            imeAction = ImeAction.Done,
        ),
        keyboardActions = KeyboardActions(onDone = { onDone() }),
        colors = agoraFieldColors(),
        shape = MaterialTheme.shapes.medium,
    )
}

/** "Vence en 15 minutos…" + dónde buscarlo en Outlook, con las palabras clave en negrita. */
@Composable
private fun PistaCorreo() {
    val copy = AgoraCopy.login
    val negrita = SpanStyle(fontWeight = FontWeight.SemiBold, color = AgoraColors.Texto)
    Text(
        buildAnnotatedString {
            append("${copy.pie} ${copy.remitente} En Outlook: busca ")
            withStyle(negrita) { append("Zynora") }
            append(" o ")
            withStyle(negrita) { append("Ágora") }
            append(", revisa ")
            withStyle(negrita) { append("Correo no deseado") }
            append(" y la pestaña ")
            withStyle(negrita) { append("Otros") }
            append(".")
        },
        style = MaterialTheme.typography.bodySmall,
        color = AgoraColors.TextMuted,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth(),
    )
}

/**
 * El correo UDLAP que se va a confirmar, a la vista y con «Cambiar». Sin esto,
 * quien lo escribió mal (sin el punto) solo veía el error debajo de su correo
 * personal y creía que le rechazaban ese (Adam, 23-10).
 */
@Composable
private fun TarjetaCorreoUdlap(email: String, error: String?, enabled: Boolean, onCambiar: () -> Unit) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = if (error != null) AgoraColors.DangerSuave else AgoraColors.Superficie,
        border = BorderStroke(1.dp, if (error != null) AgoraColors.Danger else AgoraColors.Borde),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(start = 14.dp, end = 4.dp, top = 8.dp, bottom = 8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        AgoraCopy.login.personal.confirmaremos,
                        style = MaterialTheme.typography.bodySmall,
                        color = AgoraColors.TextoMedio,
                    )
                    Text(
                        email,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = AgoraColors.Texto,
                    )
                }
                TextButton(onClick = onCambiar, enabled = enabled) {
                    Text(AgoraCopy.login.personal.cambiar, color = AgoraColors.Naranja)
                }
            }
            error?.let {
                Text(
                    it,
                    color = AgoraColors.Danger,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(end = 10.dp, top = 2.dp),
                )
            }
        }
    }
}

