package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.api.ApiClient
import mx.agora.mobile.nativeapp.ui.copy.AgoraCopy
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.util.mensajeDe
import retrofit2.HttpException

/** La API pide entre 8 y 128 caracteres (`packages/contracts`). */
const val CONTRASENA_MINIMO = 8
const val CONTRASENA_MAXIMO = 128

/** Borde y etiqueta naranja al enfocar, como los campos del login. */
@Composable
fun agoraFieldColors(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = AgoraColors.Naranja,
    focusedLabelColor = AgoraColors.Naranja,
    cursorColor = AgoraColors.Naranja,
)

/**
 * Campo de contraseña con el botón de ver/ocultar (paridad con `CampoContrasena`
 * de la web). Sin autocorrección ni sugerencias del teclado.
 */
@Composable
fun CampoContrasena(
    valor: String,
    onCambio: (String) -> Unit,
    etiqueta: String,
    visible: Boolean,
    onAlternar: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    imeAction: ImeAction = ImeAction.Next,
    onDone: () -> Unit = {},
) {
    val copy = AgoraCopy.login
    OutlinedTextField(
        value = valor,
        onValueChange = { onCambio(it.take(CONTRASENA_MAXIMO)) },
        label = { Text(etiqueta) },
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        enabled = enabled,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Password,
            imeAction = imeAction,
            autoCorrectEnabled = false,
        ),
        keyboardActions = KeyboardActions(onDone = { onDone() }),
        trailingIcon = {
            IconButton(onClick = onAlternar) {
                Icon(
                    if (visible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                    contentDescription = if (visible) copy.ocultarContrasena else copy.mostrarContrasena,
                    tint = AgoraColors.TextoMedio,
                )
            }
        },
        colors = agoraFieldColors(),
        shape = MaterialTheme.shapes.medium,
    )
}

enum class ModoContrasena {
    /** Fija la contraseña sin la actual (`POST auth/contrasena`). */
    CREAR,

    /** Pide además la actual (`POST auth/contrasena/cambiar`). */
    CAMBIAR,
}

/**
 * Crear o cambiar contraseña con el mismo formulario: nueva + repetir (y la
 * actual en [ModoContrasena.CAMBIAR]). Valida que coincidan y el mínimo de 8;
 * el resto de reglas las dice la API con su `mensaje`, que se muestra tal cual.
 *
 * [enviar] hace la llamada (actual vacía en modo crear) y lanza si falla.
 */
@Composable
fun FormularioContrasena(
    modo: ModoContrasena,
    enviar: suspend (actual: String, nueva: String) -> Unit,
    onListo: () -> Unit,
    modifier: Modifier = Modifier,
    textoBoton: String? = null,
) {
    val textos = AgoraCopy.login.nuevaContrasena
    val scope = rememberCoroutineScope()
    var actual by remember { mutableStateOf("") }
    var nueva by remember { mutableStateOf("") }
    var confirmacion by remember { mutableStateOf("") }
    var visible by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var guardando by remember { mutableStateOf(false) }

    val listo = nueva.length >= CONTRASENA_MINIMO &&
        confirmacion.length >= CONTRASENA_MINIMO &&
        (modo == ModoContrasena.CREAR || actual.isNotEmpty())

    fun guardar() {
        if (guardando || !listo) return
        error = null
        if (nueva != confirmacion) {
            error = textos.noCoincide
            return
        }
        scope.launch {
            guardando = true
            try {
                enviar(actual, nueva)
                actual = ""
                nueva = ""
                confirmacion = ""
                onListo()
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                error = ApiClient.mensajeDelServidor(e) ?: AgoraCopy.login.errorContrasena
            } catch (e: Exception) {
                error = mensajeDe(e).ifBlank { AgoraCopy.login.errorContrasena }
            } finally {
                guardando = false
            }
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        if (modo == ModoContrasena.CAMBIAR) {
            CampoContrasena(
                valor = actual,
                onCambio = { actual = it },
                etiqueta = textos.etiquetaActual,
                visible = visible,
                onAlternar = { visible = !visible },
                enabled = !guardando,
            )
            Spacer(Modifier.height(AgoraSpacing.Sm))
        }
        CampoContrasena(
            valor = nueva,
            onCambio = { nueva = it },
            etiqueta = textos.etiqueta,
            visible = visible,
            onAlternar = { visible = !visible },
            enabled = !guardando,
        )
        Text(
            textos.ayuda,
            style = MaterialTheme.typography.bodySmall,
            color = AgoraColors.TextMuted,
        )
        Spacer(Modifier.height(AgoraSpacing.Sm))
        CampoContrasena(
            valor = confirmacion,
            onCambio = { confirmacion = it },
            etiqueta = textos.confirmar,
            visible = visible,
            onAlternar = { visible = !visible },
            enabled = !guardando,
            imeAction = ImeAction.Done,
            onDone = { guardar() },
        )
        Spacer(Modifier.height(AgoraSpacing.Sm))
        AgoraPrimaryButton(
            text = if (guardando) textos.botonGuardando else (textoBoton ?: textos.boton),
            onClick = { guardar() },
            enabled = listo,
            loading = guardando,
        )
        error?.let {
            Spacer(Modifier.height(AgoraSpacing.Sm))
            Text(
                it,
                color = AgoraColors.Danger,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}
