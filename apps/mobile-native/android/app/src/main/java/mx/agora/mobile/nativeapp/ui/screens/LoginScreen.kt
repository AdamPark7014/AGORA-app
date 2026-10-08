package mx.agora.mobile.nativeapp.ui.screens

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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics
import mx.agora.mobile.nativeapp.ui.components.AgoraIsotipo
import mx.agora.mobile.nativeapp.ui.components.AgoraPieLegal
import mx.agora.mobile.nativeapp.ui.components.AgoraPrimaryButton
import mx.agora.mobile.nativeapp.ui.components.EstadoEntregaCodigo
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import retrofit2.HttpException

@Composable
fun LoginScreen(
    auth: AuthRepository,
    onLoggedIn: (SessionUser) -> Unit,
) {
    var paso by remember { mutableStateOf("correo") }
    var email by remember { mutableStateOf("") }
    var codigo by remember { mutableStateOf("") }
    var cargando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    /** Nota neutra bajo el estado de entrega (p. ej. el 429 "espera un minuto"). */
    var aviso by remember { mutableStateOf<String?>(null) }
    /** Id de seguimiento del último código enviado (cabecera X-Envio-Id). */
    var envioId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val copy = AgoraCopy.login

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = AgoraColors.Naranja,
        focusedLabelColor = AgoraColors.Naranja,
        cursorColor = AgoraColors.Naranja,
    )

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
                paso = "codigo"
            } catch (e: HttpException) {
                val delServidor = ApiClient.mensajeDelServidor(e)
                if (e.code() == 429) {
                    // Como la web: el código anterior sigue sirviendo; se pasa a
                    // escribirlo y se explica por qué no salió otro.
                    paso = "codigo"
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
        paso = "correo"
        codigo = ""
        error = null
        aviso = null
        envioId = null
    }

    fun verificar() {
        if (cargando || codigo.length != 6) return
        scope.launch {
            cargando = true
            error = null
            try {
                val user = auth.verificarOtp(email, codigo)
                AgoraAnalytics.login { user.token }
                onLoggedIn(user)
            } catch (e: HttpException) {
                error = ApiClient.mensajeDelServidor(e) ?: copy.errorVerificar
            } catch (e: Exception) {
                error = mensajeDe(e)
            } finally {
                cargando = false
            }
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
                .heightIn(min = alto)
                .padding(AgoraSpacing.Lg),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Spacer(Modifier.height(AgoraSpacing.Md))

            Column(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    AgoraIsotipo(size = 76.dp)
                    Spacer(Modifier.height(AgoraSpacing.Xs))
                    Text(
                        "Ágora",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                        color = AgoraColors.Texto,
                    )
                    Spacer(Modifier.height(AgoraSpacing.Xxs))
                    Text(
                        if (paso == "correo") copy.lema else copy.tituloCodigo,
                        style = MaterialTheme.typography.bodyMedium,
                        color = AgoraColors.TextMuted,
                        textAlign = TextAlign.Center,
                    )
                }
                Spacer(Modifier.height(AgoraSpacing.Lg))

                if (paso == "correo") {
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it.trim() },
                        label = { Text(copy.etiquetaCorreo) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Send,
                        ),
                        keyboardActions = KeyboardActions(onSend = { if (email.contains("@")) pedirCodigo() }),
                        colors = fieldColors,
                        shape = MaterialTheme.shapes.medium,
                    )
                    Spacer(Modifier.height(AgoraSpacing.Sm))
                    AgoraPrimaryButton(
                        text = if (cargando) copy.botonCorreoEnviando else copy.botonCorreo,
                        onClick = { pedirCodigo() },
                        enabled = email.contains("@"),
                        loading = cargando,
                    )
                } else {
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
                    OutlinedTextField(
                        value = codigo,
                        onValueChange = { nuevo -> codigo = nuevo.filter(Char::isDigit).take(6) },
                        label = { Text(copy.etiquetaCodigo) },
                        placeholder = { Text("000000") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.NumberPassword,
                            imeAction = ImeAction.Done,
                        ),
                        keyboardActions = KeyboardActions(onDone = { verificar() }),
                        colors = fieldColors,
                        shape = MaterialTheme.shapes.medium,
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
                        TextButton(onClick = { volverAlCorreo() }) {
                            Text(copy.cambiarCorreo, color = AgoraColors.Naranja)
                        }
                        TextButton(onClick = { pedirCodigo() }, enabled = !cargando) {
                            Text(copy.reenviar, color = AgoraColors.Naranja)
                        }
                    }
                }

                error?.let {
                    Spacer(Modifier.height(AgoraSpacing.Sm))
                    Text(
                        it,
                        color = AgoraColors.Danger,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }

                if (paso == "codigo") {
                    Spacer(Modifier.height(AgoraSpacing.Md))
                    PistaCorreo()
                }
            }

            AgoraPieLegal(modifier = Modifier.padding(top = AgoraSpacing.Lg))
        }
    }
}

/** "Vence en 10 minutos…" + dónde buscarlo en Outlook, con las palabras clave en negrita. */
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
