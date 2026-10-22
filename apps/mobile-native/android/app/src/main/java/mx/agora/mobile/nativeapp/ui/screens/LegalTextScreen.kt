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

/** Misma fecha que las páginas de udlagora.com (terminos, privacidad, reglas). */
private const val FECHA_LEGAL = "Última actualización: 22 de octubre de 2026"

private const val CORREO_CONTACTO = "contacto@zynoratek.com"

@Composable
fun TerminosScreen(onBack: () -> Unit) {
    LegalTextScreen(
        titulo = "Términos de uso",
        fecha = FECHA_LEGAL,
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
                        "de terceros sin permiso, contenido íntimo sin consentimiento y la suplantación de identidad. " +
                        "El detalle está en las Reglas de la comunidad.",
                ),
            ),
            LegalSection(
                "Cero tolerancia",
                listOf(
                    "No hay tolerancia para el contenido ofensivo ni para quien abusa de otros. Retiramos el " +
                        "contenido y suspendemos la cuenta de quien acosa, amenaza, comparte contenido íntimo sin " +
                        "consentimiento o se hace pasar por otra persona.",
                    "Cualquiera puede reportar una publicación, un comentario, un mensaje o un perfil, y bloquear " +
                        "a quien quiera. El equipo revisa cada reporte en menos de 24 horas.",
                ),
            ),
            LegalSection(
                "Tu responsabilidad",
                listOf(
                    "Eres responsable de lo que publicas. Ágora puede suspender cuentas que abusen de la " +
                        "plataforma o pongan en riesgo a otros miembros.",
                ),
            ),
            LegalSection(
                "Contacto",
                listOf("Dudas sobre estos términos: $CORREO_CONTACTO. Ágora la desarrolla Zynora Tek."),
            ),
        ),
        onBack = onBack,
    )
}

/** Versión corta de udlagora.com/privacidad: lo mismo que declaran las fichas de las tiendas. */
@Composable
fun PrivacidadScreen(onBack: () -> Unit) {
    LegalTextScreen(
        titulo = "Aviso de privacidad",
        fecha = FECHA_LEGAL,
        secciones = listOf(
            LegalSection(
                "Quién es responsable",
                listOf(
                    "Ágora la desarrolla Zynora Tek y no está afiliada a la UDLAP. Para cualquier tema de tus " +
                        "datos escríbenos a $CORREO_CONTACTO.",
                ),
            ),
            LegalSection(
                "Qué datos guardamos",
                listOf(
                    "• Cuenta: tu correo @udlap.mx y tu contraseña (cifrada; nadie del equipo puede leerla). " +
                        "Si te registraste con un correo personal porque el código UDLAP no llegaba, ese correo " +
                        "se borra en cuanto confirmas el de la UDLAP.",
                    "• Perfil: nombre, apellidos y usuario; y lo que tú agregues (foto, portada, bio, carrera, " +
                        "ciudad, Instagram, intereses, cumpleaños sin año).",
                    "• Lo que publicas: publicaciones, fotos y videos, comentarios, reacciones, votos, mensajes, " +
                        "anuncios, eventos y aventones.",
                    "• Datos técnicos: IP y tipo de teléfono (para cuidar tu cuenta) y, si aceptas avisos, el " +
                        "identificador de notificaciones de tu teléfono.",
                    "• Diagnóstico: la app nos manda, ligados a tu cuenta, el error y la versión cuando se " +
                        "cierra de golpe, y eventos de uso básicos para saber qué arreglar. Van a nuestro " +
                        "servidor, sin herramientas de terceros.",
                ),
            ),
            LegalSection(
                "Lo que no hacemos",
                listOf(
                    "No pedimos tu ubicación, tus contactos, tu calendario ni tu micrófono. No hay publicidad ni " +
                        "rastreadores de terceros, y no vendemos tus datos.",
                ),
            ),
            LegalSection(
                "Con quién los compartimos",
                listOf(
                    "Solo con los proveedores que hacen funcionar el servicio: Hetzner (servidor y fotos), " +
                        "Cloudflare (conexión segura), Brevo (correos con tu código) y Firebase Cloud Messaging " +
                        "y Apple Push Notification service (notificaciones). Nadie más, salvo que una autoridad " +
                        "lo pida conforme a la ley.",
                ),
            ),
            LegalSection(
                "Tus derechos",
                listOf(
                    "En Ajustes puedes corregir tus datos, elegir quién ve tu perfil, apagar avisos y eliminar " +
                        "tu cuenta: se borran al momento tu perfil, tu correo, tu contraseña y tus archivos. Para " +
                        "derechos ARCO escribe a $CORREO_CONTACTO.",
                ),
            ),
        ),
        pie = "Versión completa en udlagora.com/privacidad",
        onBack = onBack,
    )
}

/**
 * Reglas de la comunidad (udlagora.com/reglas). Las tiendas las exigen en
 * cualquier app con contenido de usuarios, y el registro pide aceptarlas.
 *
 * A diferencia de la web, aquí no se promete un filtro automático: en
 * producción no hay llave de moderación previa, así que lo que vale es la cola
 * de reportes que revisa el equipo.
 */
@Composable
fun ReglasScreen(onBack: () -> Unit) {
    LegalTextScreen(
        titulo = "Reglas de la comunidad",
        fecha = FECHA_LEGAL,
        secciones = listOf(
            LegalSection(
                "Lo que se vale",
                listOf(
                    "Ágora es para decir lo que piensas. Critica al profe, quéjate del comedor, búrlate del " +
                        "tráfico de la Recta. Todo eso se vale. Lo que no se vale cabe en cinco líneas.",
                ),
            ),
            LegalSection(
                "Las cinco líneas rojas",
                listOf(
                    "1. Contenido íntimo sin permiso. Fotos o videos sexuales o de desnudos de alguien que no " +
                        "dio su consentimiento, aunque sea «de broma». Cero tolerancia.",
                    "2. Datos personales de otros. Teléfono, dirección, cuarto del colegio, matrícula, horarios " +
                        "o capturas de chats privados de alguien que no quiere que se sepan.",
                    "3. Amenazas de violencia. Contra una persona, un grupo o el campus. Tampoco «en broma».",
                    "4. Acoso dirigido. Insistir contra una persona concreta: humillarla, organizar a otros para " +
                        "atacarla, burlarse de su cuerpo, origen, género u orientación. Criticar lo que alguien " +
                        "hace se vale; ir contra quien es, no.",
                    "5. Suplantación. Hacerte pasar por otra persona, por un profesor o por una cuenta oficial " +
                        "de la universidad.",
                    "Además, lo que ya es ilegal fuera también lo es aquí: vender drogas o armas, fraudes, " +
                        "contenido sexual con menores (se reporta a las autoridades).",
                ),
            ),
            LegalSection(
                "Cómo se modera",
                listOf(
                    "• Cualquiera puede reportar una publicación, un comentario, un mensaje o un perfil desde " +
                        "«…». El reporte entra a una cola de moderación que el equipo revisa en menos de 24 " +
                        "horas, y si cruza una línea roja se retira.",
                    "• Si una publicación tuya se retira, ves el motivo. Puede ser un error: escríbenos y la " +
                        "revisamos.",
                    "• Quien cruza las líneas rojas de forma grave o repetida pierde la cuenta. Una suspensión " +
                        "solo la levanta el equipo de moderación.",
                ),
            ),
            LegalSection(
                "La zona anónima",
                listOf(
                    "Nadie ve tu nombre, pero Ágora sí lo sabe. El anonimato es frente a otros usuarios, no " +
                        "frente a nosotros ni frente a una autoridad que lo pida conforme a la ley. Las mismas " +
                        "cinco líneas rojas aplican, y ahí se revisan con más cuidado.",
                ),
            ),
            LegalSection(
                "Aventones y marketplace",
                listOf(
                    "Ágora solo conecta a personas de la comunidad; no organiza los viajes ni las ventas y no " +
                        "responde por ellos. Antes de subirte a un aventón, comparte con alguien a dónde vas y " +
                        "con quién. En el marketplace, entrega y paga en persona dentro del campus y desconfía " +
                        "de quien te pida adelantos. Si algo sale mal, repórtalo.",
                ),
            ),
            LegalSection(
                "Cómo reportar",
                listOf(
                    "Cada publicación y cada comentario tienen la opción Reportar. Elige el motivo; quien " +
                        "publicó no sabe quién lo reportó. También puedes bloquear a alguien: no podrá " +
                        "escribirte, seguirte ni mandarte avisos.",
                    "Si alguien está en peligro, no esperes a la app: llama al 911.",
                ),
            ),
        ),
        pie = "Estas reglas forman parte de los Términos de uso.",
        onBack = onBack,
    )
}

@Composable
private fun LegalTextScreen(
    titulo: String,
    fecha: String,
    secciones: List<LegalSection>,
    onBack: () -> Unit,
    /** Nota final en tono tenue (p. ej. dónde está la versión completa). */
    pie: String? = null,
) {
    // El padding del Scaffold no se aplicaba: el principio del texto quedaba
    // debajo de la barra superior.
    SubScreenScaffold(title = titulo, onBack = onBack) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
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
            pie?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(0.6f),
                    modifier = Modifier.padding(top = 16.dp),
                )
            }
        }
    }
}
