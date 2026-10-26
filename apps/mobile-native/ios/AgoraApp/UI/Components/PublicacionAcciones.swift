import SwiftUI

/// Mismos códigos que `MOTIVOS_REPORTE` en `@agora/contracts`.
struct MotivoReporte: Identifiable {
    let id: String
    let etiqueta: String
}

let motivosReporte: [MotivoReporte] = [
    MotivoReporte(id: "INTIMIDAD_SEXUAL", etiqueta: "Contenido íntimo sin permiso"),
    MotivoReporte(id: "DATOS_PERSONALES", etiqueta: "Datos personales"),
    MotivoReporte(id: "AMENAZA_VIOLENCIA", etiqueta: "Amenaza de violencia"),
    MotivoReporte(id: "ACOSO_DIRIGIDO", etiqueta: "Acoso dirigido"),
    MotivoReporte(id: "SUPLANTACION", etiqueta: "Suplantación"),
    MotivoReporte(id: "OTRO", etiqueta: "Otro"),
]

/// Límite de `editarPostSchema` (1–2000).
let limiteTextoPublicacion = 2000

/// Reglas comunes de autoría para publicaciones del feed y del detalle.
enum PublicacionPermisos {
    /// Es mía si el autor visible coincide con mi @. Las anónimas no traen autor.
    static func esMia(autorHandle: String?, anonimo: Bool?, miHandle: String?) -> Bool {
        guard anonimo != true,
              let autor = autorHandle?.lowercased(),
              let yo = miHandle?.lowercased(),
              !autor.isEmpty
        else { return false }
        return autor == yo
    }
}

/// Hoja para editar el texto de una publicación propia (`PATCH posts/:id`).
struct EditarPublicacionSheet: View {
    let postId: String
    let textoInicial: String
    /// Texto guardado + aviso de moderación (si la API devolvió uno).
    let onGuardado: (String, String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var texto: String
    @State private var guardando = false
    @State private var error: String?

    init(postId: String, textoInicial: String, onGuardado: @escaping (String, String?) -> Void) {
        self.postId = postId
        self.textoInicial = textoInicial
        self.onGuardado = onGuardado
        _texto = State(initialValue: textoInicial)
    }

    private var limpio: String {
        texto.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                TextEditor(text: $texto)
                    .frame(minHeight: 180)
                    .padding(8)
                    .background(AgoraDesign.Colors.superficie)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
                    .overlay {
                        RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                            .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                    }
                    .onChange(of: texto) { nuevo in
                        if nuevo.count > limiteTextoPublicacion {
                            texto = String(nuevo.prefix(limiteTextoPublicacion))
                        }
                    }

                Text("\(texto.count)/\(limiteTextoPublicacion)")
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)

                if let error {
                    Text(error)
                        .font(.outfit(.footnote))
                        .foregroundStyle(AgoraDesign.Colors.danger)
                }

                Spacer()
            }
            .padding(AgoraDesign.Spacing.md)
            .agoraScreenBackground()
            .navigationTitle("Editar publicación")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                        .disabled(guardando)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if guardando {
                        ProgressView()
                    } else {
                        Button("Guardar") {
                            Task { await guardar() }
                        }
                        .disabled(limpio.isEmpty || limpio == textoInicial.trimmingCharacters(in: .whitespacesAndNewlines))
                    }
                }
            }
        }
    }

    private func guardar() async {
        let nuevo = limpio
        guard !nuevo.isEmpty else { return }
        guardando = true
        error = nil
        defer { guardando = false }
        do {
            let resp = try await AgoraApi.editarPost(id: postId, texto: nuevo)
            Haptics.success()
            onGuardado(nuevo, resp.aviso)
            dismiss()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}
