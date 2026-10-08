import SwiftUI

/// Interno (no `private`): es el tipo de una propiedad interna de `LegalTextView`.
struct LegalSection {
    let titulo: String
    let parrafos: [String]
}

/// Texto legal estático — paridad con `LegalTextScreen.kt`.
struct LegalTextView: View {
    let titulo: String
    let fecha: String
    let secciones: [LegalSection]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text(fecha)
                    .font(.caption)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .padding(.bottom, AgoraDesign.Spacing.xs)

                ForEach(secciones.indices, id: \.self) { index in
                    let seccion = secciones[index]
                    Text(seccion.titulo)
                        .font(.headline)
                        .padding(.top, AgoraDesign.Spacing.md)
                        .padding(.bottom, 6)
                    ForEach(seccion.parrafos.indices, id: \.self) { pIndex in
                        Text(seccion.parrafos[pIndex])
                            .font(.body)
                            .padding(.bottom, 8)
                    }
                }
            }
            .padding(AgoraDesign.Spacing.md)
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle(titulo)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct TerminosView: View {
    var body: some View {
        LegalTextView(
            titulo: "Términos de uso",
            fecha: "Última actualización: agosto 2026",
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
                            + "de terceros sin permiso, contenido íntimo sin consentimiento y la suplantación de identidad.",
                    ]
                ),
                LegalSection(
                    titulo: "Tu responsabilidad",
                    parrafos: [
                        "Eres responsable de lo que publicas. Ágora puede suspender cuentas que abusen de la "
                            + "plataforma o pongan en riesgo a otros miembros.",
                    ]
                ),
            ]
        )
    }
}

struct PrivacidadView: View {
    var body: some View {
        LegalTextView(
            titulo: "Política de privacidad",
            fecha: "Última actualización: agosto 2026",
            secciones: [
                LegalSection(
                    titulo: "Qué datos guardamos",
                    parrafos: [
                        "Tu correo UDLAP (para verificar identidad), perfil público, publicaciones, mensajes "
                            + "directos y metadatos de uso necesarios para operar la plataforma.",
                    ]
                ),
                LegalSection(
                    titulo: "Para qué los usamos",
                    parrafos: [
                        "Autenticarte, mostrar tu perfil a la comunidad, moderar contenido reportado y enviarte "
                            + "notificaciones sobre actividad dirigida a ti (comentarios, mensajes, etc.).",
                    ]
                ),
                LegalSection(
                    titulo: "Con quién los compartimos",
                    parrafos: [
                        "No vendemos tus datos. Solo compartimos información con proveedores técnicos necesarios "
                            + "(hosting, correo) bajo contrato de confidencialidad.",
                    ]
                ),
                LegalSection(
                    titulo: "Tus derechos",
                    parrafos: [
                        "Puedes editar tu perfil, silenciar comunidades, bloquear usuarios y solicitar la baja "
                            + "de tu cuenta escribiendo al equipo de Ágora.",
                    ]
                ),
            ]
        )
    }
}
