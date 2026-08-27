package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.data.AuthRepository
import mx.agora.mobile.nativeapp.data.SessionUser
import mx.agora.mobile.nativeapp.ui.components.AgoraPrimaryButton
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing
import mx.agora.mobile.nativeapp.ui.analytics.AgoraAnalytics

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
    val scope = rememberCoroutineScope()

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = AgoraColors.Naranja,
        focusedLabelColor = AgoraColors.Naranja,
        cursorColor = AgoraColors.Naranja,
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(AgoraSpacing.Lg),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            "Ágora",
            style = MaterialTheme.typography.headlineLarge,
            color = AgoraColors.Naranja,
        )
        Spacer(Modifier.height(AgoraSpacing.Xxs))
        Text(
            "Red social verificada de la UDLAP",
            style = MaterialTheme.typography.bodyMedium,
            color = AgoraColors.TextMuted,
        )
        Spacer(Modifier.height(AgoraSpacing.Lg))

        if (paso == "correo") {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Correo @udlap.mx") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                colors = fieldColors,
                shape = MaterialTheme.shapes.medium,
            )
            Spacer(Modifier.height(AgoraSpacing.Sm))
            AgoraPrimaryButton(
                text = if (cargando) "Enviando…" else "Enviar código",
                onClick = {
                    scope.launch {
                        cargando = true
                        error = null
                        try {
                            auth.solicitarOtp(email)
                            paso = "codigo"
                        } catch (e: Exception) {
                            error = e.message ?: "No se pudo enviar el código."
                        } finally {
                            cargando = false
                        }
                    }
                },
                enabled = email.contains("@"),
                loading = cargando,
            )
        } else {
            Text(
                "Código enviado a $email",
                style = MaterialTheme.typography.bodySmall,
                color = AgoraColors.TextMuted,
            )
            Spacer(Modifier.height(AgoraSpacing.Xs))
            OutlinedTextField(
                value = codigo,
                onValueChange = { codigo = it },
                label = { Text("Código de 6 dígitos") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = fieldColors,
                shape = MaterialTheme.shapes.medium,
            )
            Spacer(Modifier.height(AgoraSpacing.Sm))
            AgoraPrimaryButton(
                text = if (cargando) "Verificando…" else "Entrar",
                onClick = {
                    scope.launch {
                        cargando = true
                        error = null
                        try {
                            val user = auth.verificarOtp(email, codigo)
                            AgoraAnalytics.login { user.token }
                            onLoggedIn(user)
                        } catch (e: Exception) {
                            error = e.message ?: "Código incorrecto."
                        } finally {
                            cargando = false
                        }
                    }
                },
                enabled = codigo.length >= 4,
                loading = cargando,
            )
            TextButton(onClick = { paso = "correo"; error = null }) {
                Text("Cambiar correo", color = AgoraColors.Naranja)
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
    }
}
