package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import mx.agora.mobile.nativeapp.ui.components.SubScreenScaffold

data class LegalSection(val titulo: String, val parrafos: List<String>)

@Composable
fun TerminosScreen(onBack: () -> Unit) {
    LegalTextScreen(
        titulo = "Términos de uso",
        fecha = "Última actualización: agosto 2026",
        secciones = listOf(
            LegalSection(
                "Qué es Ágora",
                listOf(
                    "Ágora es una red social independiente para la comunidad verificada de la UDLAP. " +
                        "No está afiliada ni respaldada oficialmente por la universidad.",
                ),
            ),
            LegalSection(
                "Quién puede usarla",
                listOf(
                    "Solo personas con correo @udlap.mx verificado. Al registrarte confirmas que eres parte " +
                        "de esa comunidad y que la información que das es veraz.",
                ),
            ),
            LegalSection(
                "Contenido permitido",
                listOf(
                    "Publica con respeto. Está prohibido el acoso, las amenazas, compartir datos personales " +
                        "de terceros sin permiso, contenido íntimo sin consentimiento y la suplantación de identidad.",
                ),
            ),
            LegalSection(
                "Tu responsabilidad",
                listOf(
                    "Eres responsable de lo que publicas. Ágora puede suspender cuentas que abusen de la " +
                        "plataforma o pongan en riesgo a otros miembros.",
                ),
            ),
        ),
        onBack = onBack,
    )
}

@Composable
fun PrivacidadScreen(onBack: () -> Unit) {
    LegalTextScreen(
        titulo = "Política de privacidad",
        fecha = "Última actualización: agosto 2026",
        secciones = listOf(
            LegalSection(
                "Qué datos guardamos",
                listOf(
                    "Tu correo UDLAP (para verificar identidad), perfil público, publicaciones, mensajes " +
                        "directos y metadatos de uso necesarios para operar la plataforma.",
                ),
            ),
            LegalSection(
                "Para qué los usamos",
                listOf(
                    "Autenticarte, mostrar tu perfil a la comunidad, moderar contenido reportado y enviarte " +
                        "notificaciones sobre actividad dirigida a ti (comentarios, mensajes, etc.).",
                ),
            ),
            LegalSection(
                "Con quién los compartimos",
                listOf(
                    "No vendemos tus datos. Solo compartimos información con proveedores técnicos necesarios " +
                        "(hosting, correo) bajo contrato de confidencialidad.",
                ),
            ),
            LegalSection(
                "Tus derechos",
                listOf(
                    "Puedes editar tu perfil, silenciar comunidades, bloquear usuarios y solicitar la baja " +
                        "de tu cuenta escribiendo al equipo de Ágora.",
                ),
            ),
        ),
        onBack = onBack,
    )
}

@Composable
private fun LegalTextScreen(
    titulo: String,
    fecha: String,
    secciones: List<LegalSection>,
    onBack: () -> Unit,
) {
    SubScreenScaffold(title = titulo, onBack = onBack) { _ ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            Text(fecha, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(0.6f))
            secciones.forEach { seccion ->
                Text(
                    seccion.titulo,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 16.dp, bottom = 6.dp),
                )
                seccion.parrafos.forEach { parrafo ->
                    Text(parrafo, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(bottom = 8.dp))
                }
            }
        }
    }
}
