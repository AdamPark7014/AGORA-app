import SwiftUI

/// La API pide entre 8 y 128 caracteres (`packages/contracts`).
enum PoliticaContrasena {
    static let minimo = 8
    static let maximo = 128
}

/// Campo de contraseña con el botón de ver/ocultar (paridad con
/// `CampoContrasena` de la web y `CampoContrasena.kt` en Android).
struct CampoContrasena: View {
    let etiqueta: String
    @Binding var valor: String
    @Binding var visible: Bool
    /// `true` para una contraseña nueva (el llavero propone una fuerte).
    var nueva = false
    var enviar: (() -> Void)? = nil
    /// Identificador de accesibilidad del campo (lo usan las pruebas de interfaz).
    var id: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
            Text(etiqueta)
                .font(.outfit(.caption, .bold))
                .foregroundStyle(AgoraDesign.Colors.texto)
            HStack(spacing: AgoraDesign.Spacing.xs) {
                Group {
                    if visible {
                        TextField(etiqueta, text: $valor)
                    } else {
                        SecureField(etiqueta, text: $valor)
                    }
                }
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textContentType(nueva ? .newPassword : .password)
                .submitLabel(enviar == nil ? .next : .go)
                .onSubmit { enviar?() }
                .onChange(of: valor) { nuevoValor in
                    if nuevoValor.count > PoliticaContrasena.maximo {
                        valor = String(nuevoValor.prefix(PoliticaContrasena.maximo))
                    }
                }
                .accessibilityIdentifier(id ?? etiqueta)

                Button {
                    visible.toggle()
                } label: {
                    Image(systemName: visible ? "eye.slash" : "eye")
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        // 44 pt: el ojito era un blanco de 20 pt, difícil de atinar.
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.agoraPlain)
                .accessibilityLabel(visible ? AgoraCopy.loginOcultarContrasena : AgoraCopy.loginMostrarContrasena)
            }
            .padding(AgoraDesign.Spacing.sm)
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                    .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
            }
        }
    }
}

enum ModoContrasena {
    /// Fija la contraseña sin la actual (`POST auth/contrasena`).
    case crear
    /// Pide además la actual (`POST auth/contrasena/cambiar`).
    case cambiar
}

/// Crear o cambiar contraseña con el mismo formulario: nueva + repetir (y la
/// actual en `.cambiar`). Valida que coincidan y el mínimo de 8; el resto de
/// reglas las dice la API con su `mensaje`, que se muestra tal cual.
///
/// `enviar` hace la llamada (actual vacía en modo crear) y lanza si falla.
struct FormularioContrasena: View {
    let modo: ModoContrasena
    let enviar: (_ actual: String, _ nueva: String) async throws -> Void
    let onListo: () -> Void
    var textoBoton: String? = nil

    @State private var actual = ""
    @State private var nueva = ""
    @State private var confirmacion = ""
    @State private var visible = false
    @State private var error: String?
    @State private var guardando = false

    private var listo: Bool {
        nueva.count >= PoliticaContrasena.minimo &&
            confirmacion.count >= PoliticaContrasena.minimo &&
            (modo == .crear || !actual.isEmpty)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            if modo == .cambiar {
                CampoContrasena(etiqueta: AgoraCopy.contrasenaActual, valor: $actual, visible: $visible)
            }
            CampoContrasena(etiqueta: AgoraCopy.contrasenaNueva, valor: $nueva, visible: $visible, nueva: true)
            Text(AgoraCopy.contrasenaAyuda)
                .font(.outfit(.caption))
                .foregroundStyle(AgoraDesign.Colors.textoMuted)
                .fixedSize(horizontal: false, vertical: true)
            CampoContrasena(
                etiqueta: AgoraCopy.contrasenaConfirmar,
                valor: $confirmacion,
                visible: $visible,
                nueva: true,
                enviar: { Task { await guardar() } }
            )
            AgoraPrimaryButton(
                title: guardando ? AgoraCopy.contrasenaGuardando : (textoBoton ?? AgoraCopy.contrasenaGuardar),
                action: { Task { await guardar() } },
                enabled: listo,
                loading: guardando
            )
            if let error {
                Text(error)
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.danger)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .disabled(guardando)
    }

    @MainActor
    private func guardar() async {
        guard !guardando, listo else { return }
        error = nil
        guard nueva == confirmacion else {
            error = AgoraCopy.contrasenaNoCoincide
            return
        }
        guardando = true
        defer { guardando = false }
        do {
            try await enviar(actual, nueva)
            actual = ""
            nueva = ""
            confirmacion = ""
            onListo()
        } catch {
            self.error = (error as? ApiError)?.mensajeServidor
                ?? FormatUtils.mensajeDe(error)
        }
    }
}
