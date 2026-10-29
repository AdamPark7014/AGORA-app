import SwiftUI

/// Interno (no `private`): es el tipo de una propiedad interna de `LegalTextView`.
/// Los párrafos aceptan Markdown en línea (**negritas** y enlaces).
struct LegalSection {
    let titulo: String
    let parrafos: [String]
}

/// Texto legal estático — paridad con `LegalTextScreen.kt`. La fuente es la web
/// (`apps/web/app/{terminos,reglas,privacidad}`): si cambia allá, cambia aquí.
struct LegalTextView: View {
    let titulo: String
    let fecha: String
    var entradilla: String? = nil
    let secciones: [LegalSection]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text(fecha)
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .padding(.bottom, AgoraDesign.Spacing.xs)

                if let entradilla {
                    parrafo(entradilla)
                        .padding(.top, AgoraDesign.Spacing.xs)
                }

                ForEach(secciones.indices, id: \.self) { index in
                    let seccion = secciones[index]
                    Text(seccion.titulo)
                        .font(.outfit(.headline))
                        .padding(.top, AgoraDesign.Spacing.md)
                        .padding(.bottom, 6)
                    ForEach(seccion.parrafos.indices, id: \.self) { pIndex in
                        parrafo(seccion.parrafos[pIndex])
                    }
                }
            }
            .padding(AgoraDesign.Spacing.md)
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle(titulo)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func parrafo(_ texto: String) -> some View {
        Text(Self.markdown(texto))
            .font(.outfit(.body))
            .tint(AgoraDesign.Colors.naranja)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.bottom, 8)
    }

    private static func markdown(_ texto: String) -> AttributedString {
        let opciones = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: texto, options: opciones)) ?? AttributedString(texto)
    }
}

/// Correo público de soporte, privacidad y bajas (`apps/web/lib/contacto.ts`).
/// udlagora.com no tiene MX: contacto@udlagora.com rebota.
enum AgoraContacto {
    static let correo = "contacto@zynoratek.com"
    static let enlaceCorreo = "[\(correo)](mailto:\(correo))"
}

struct TerminosView: View {
    var body: some View {
        LegalTextView(
            titulo: "Términos de uso",
            fecha: "Última actualización: 22 de octubre de 2026",
            secciones: [
                LegalSection(
                    titulo: "Qué es Ágora",
                    parrafos: [
                        "Ágora es una red social independiente para la comunidad verificada de la UDLAP. "
                            + "No está afiliada ni respaldada oficialmente por la universidad.",
                    ]
                ),
                LegalSection(
                    titulo: "Quién puede usarla",
                    parrafos: [
                        "Solo personas con correo @udlap.mx verificado. Al registrarte confirmas que eres parte "
                            + "de esa comunidad y que la información que das es veraz.",
                    ]
                ),
                LegalSection(
                    titulo: "Contenido permitido",
                    parrafos: [
                        "Publica con respeto. Está prohibido el acoso, las amenazas, compartir datos personales "
                            + "de terceros sin permiso, contenido íntimo sin consentimiento y la suplantación de identidad. "
                            + "El equipo de moderación puede retirar publicaciones que violen estas reglas. El detalle "
                            + "está en las Reglas de la comunidad.",
                    ]
                ),
                LegalSection(
                    titulo: "Cero tolerancia",
                    parrafos: [
                        "No hay tolerancia para el contenido ofensivo ni para quien abusa de otros. Cualquiera "
                            + "puede reportar una publicación, un comentario, un mensaje o un perfil, y bloquear a quien "
                            + "quiera. El equipo revisa cada reporte en menos de 24 horas: retira lo que cruza las "
                            + "reglas y suspende la cuenta de quien lo publicó cuando es grave o se repite.",
                    ]
                ),
                LegalSection(
                    titulo: "Tu responsabilidad",
                    parrafos: [
                        "Eres responsable de lo que publicas. Ágora puede suspender cuentas que abusen de la "
                            + "plataforma o pongan en riesgo a otros miembros.",
                    ]
                ),
                LegalSection(
                    titulo: "Disponibilidad",
                    parrafos: [
                        "El servicio se ofrece «tal cual», sin garantías. Podemos cambiar funciones o "
                            + "interrumpir el servicio con aviso razonable cuando sea posible.",
                    ]
                ),
                LegalSection(
                    titulo: "Contacto",
                    parrafos: [
                        "Dudas sobre estos términos: \(AgoraContacto.enlaceCorreo). Ágora la desarrolla Zynora Tek.",
                    ]
                ),
            ]
        )
    }
}

/// Reglas de la comunidad (`apps/web/app/reglas/page.tsx`). Sin filtro automático:
/// en producción cada reporte lo revisa una persona del equipo.
struct ReglasView: View {
    var body: some View {
        LegalTextView(
            titulo: "Reglas de la comunidad",
            fecha: "Última actualización: octubre 2026",
            entradilla: "Ágora es para decir lo que piensas. Critica al profe, quéjate del comedor, búrlate del "
                + "tráfico de la Recta. Todo eso se vale. Lo que no se vale cabe en cinco líneas.",
            secciones: [
                LegalSection(
                    titulo: "Las cinco líneas rojas",
                    parrafos: [
                        "1. **Contenido íntimo sin permiso.** Fotos o videos sexuales o de desnudos de alguien que "
                            + "no dio su consentimiento, aunque sea «de broma». Cero tolerancia.",
                        "2. **Datos personales de otros.** Teléfono, dirección, cuarto del colegio, matrícula, "
                            + "horarios o capturas de chats privados de alguien que no quiere que se sepan.",
                        "3. **Amenazas de violencia.** Contra una persona, un grupo o el campus. Tampoco «en broma».",
                        "4. **Acoso dirigido.** Insistir contra una persona concreta: humillarla, organizar a otros "
                            + "para atacarla, burlarse de su cuerpo, origen, género u orientación. Criticar lo que "
                            + "alguien hace se vale; ir contra quien es, no.",
                        "5. **Suplantación.** Hacerte pasar por otra persona, por un profesor o por una cuenta "
                            + "oficial de la universidad.",
                        "Además, lo que ya es ilegal fuera también lo es aquí: vender drogas o armas, fraudes, "
                            + "contenido sexual con menores (se reporta a las autoridades).",
                    ]
                ),
                LegalSection(
                    titulo: "Cómo se modera",
                    parrafos: [
                        "• Cualquiera puede reportar una publicación, un comentario, un mensaje o un perfil desde "
                            + "«…». Los reportes llegan a una cola que el equipo revisa en menos de 24 horas, y lo "
                            + "que cruza una línea roja se retira.",
                        "• Si una publicación tuya se retira, ves el motivo. Puede ser un error: escríbenos y la "
                            + "revisamos.",
                        "• Quien cruza las líneas rojas de forma grave o repetida pierde la cuenta. Una suspensión "
                            + "solo la levanta el equipo de moderación.",
                    ]
                ),
                LegalSection(
                    titulo: "La zona anónima",
                    parrafos: [
                        "Nadie ve tu nombre, pero Ágora sí lo sabe. El anonimato es frente a otros usuarios, no "
                            + "frente a nosotros ni frente a una autoridad que lo pida conforme a la ley. Las mismas "
                            + "cinco líneas rojas aplican, y ahí se revisan con más cuidado.",
                    ]
                ),
                LegalSection(
                    titulo: "Aventones y marketplace",
                    parrafos: [
                        "Ágora solo conecta a personas de la comunidad; no organiza los viajes ni las ventas y no "
                            + "responde por ellos. Antes de subirte a un aventón, comparte con alguien a dónde vas y "
                            + "con quién. En el marketplace, entrega y paga en persona dentro del campus y desconfía "
                            + "de quien te pida adelantos. Si algo sale mal, repórtalo.",
                    ]
                ),
                LegalSection(
                    titulo: "Cómo reportar",
                    parrafos: [
                        "Cada publicación y cada comentario tienen la opción **Reportar**. Elige el motivo; quien "
                            + "publicó no sabe quién lo reportó. También puedes **bloquear** a alguien: no podrá "
                            + "escribirte, seguirte ni mandarte avisos.",
                        "Si alguien está en peligro, no esperes a la app: llama al 911.",
                        "Estas reglas forman parte de los Términos de uso. Lo que hacemos con tus datos está en el "
                            + "Aviso de privacidad. Dudas: \(AgoraContacto.enlaceCorreo).",
                    ]
                ),
            ]
        )
    }
}

/// Resumen del aviso de privacidad (`apps/web/app/privacidad/page.tsx`). Tiene que
/// coincidir con la etiqueta de privacidad de App Store y `PrivacyInfo.xcprivacy`.
struct PrivacidadView: View {
    var body: some View {
        LegalTextView(
            titulo: "Aviso de privacidad",
            fecha: "Última actualización: 29 de octubre de 2026",
            entradilla: "Ágora es una red social independiente para la comunidad de la UDLAP, desarrollada por "
                + "Zynora Tek. No está afiliada a la Universidad de las Américas Puebla. Para cualquier tema de "
                + "tus datos escríbenos a \(AgoraContacto.enlaceCorreo).",
            secciones: [
                LegalSection(
                    titulo: "Qué datos recogemos",
                    parrafos: [
                        "• **Cuenta:** tu correo @udlap.mx y tu contraseña, guardada cifrada (nadie del equipo "
                            + "puede leerla). Si te registras con un correo personal mientras confirmas el de la "
                            + "UDLAP, ese correo se borra en cuanto lo confirmas.",
                        "• **Perfil:** nombre, apellidos y nombre de usuario, y lo que tú agregues (foto, bio, "
                            + "carrera, generación, colegio, intereses…).",
                        "• **Lo que publicas:** publicaciones, fotos y videos, comentarios, reacciones, mensajes "
                            + "directos, anuncios, eventos y aventones.",
                        "• **Uso y datos técnicos:** a quién sigues y bloqueas, lo que guardas, dirección IP y "
                            + "tipo de teléfono (para cuidar tu cuenta) y, si aceptas avisos, el identificador de "
                            + "notificaciones.",
                        "No pedimos tu ubicación, tus contactos, tu calendario ni tu micrófono. La app no tiene "
                            + "publicidad, no usa rastreadores de terceros y no vendemos tus datos.",
                    ]
                ),
                LegalSection(
                    titulo: "Para qué los usamos",
                    parrafos: [
                        "Para verificar que eres de la comunidad UDLAP, mostrarte el feed, eventos, aventones, "
                            + "mercado y mensajes, mandarte los avisos que eliges y moderar lo que se reporta.",
                        "Lo que publicas, tu perfil y los mensajes que mandas se revisan de forma automática antes "
                            + "de que se vean, para detectar lo que prohíben las Reglas (contenido íntimo sin permiso, "
                            + "datos de otra persona, amenazas, acoso y suplantación). En los mensajes también se miran "
                            + "los últimos de esa conversación. Si algo cruza una línea roja no se publica; si es "
                            + "dudoso, se publica y lo puede revisar una persona del equipo de moderación.",
                    ]
                ),
                LegalSection(
                    titulo: "Quién más los ve",
                    parrafos: [
                        "Tu perfil lo ve la comunidad verificada, según lo elijas en Ajustes. En la zona anónima "
                            + "otros usuarios no ven tu nombre; el equipo de moderación sí puede ligar esas "
                            + "publicaciones a tu cuenta para hacer cumplir las reglas.",
                        "Solo usamos proveedores para que el servicio funcione: Hetzner (servidor), Cloudflare "
                            + "(HTTPS), Brevo (correos con tu código), Anthropic (la revisión automática; no usa tus "
                            + "datos para entrenar sus modelos) y los servicios de notificaciones de Apple, "
                            + "Google y tu navegador. Nadie más recibe tus datos, salvo que una autoridad competente "
                            + "lo pida conforme a la ley.",
                    ]
                ),
                LegalSection(
                    titulo: "Cuánto tiempo y tus derechos",
                    parrafos: [
                        "Los guardamos mientras tengas cuenta. Si la eliminas desde Ajustes, borramos al momento "
                            + "tu perfil, tu correo, tu contraseña, tus sesiones y tus archivos.",
                        "Puedes ver y corregir tus datos en Ajustes. Para tus derechos ARCO escríbenos a "
                            + "\(AgoraContacto.enlaceCorreo) desde tu correo; respondemos en un máximo de 20 días "
                            + "hábiles. Ágora no está dirigida a menores de 13 años.",
                        "Versión completa en [udlagora.com/privacidad](https://udlagora.com/privacidad).",
                    ]
                ),
            ]
        )
    }
}
