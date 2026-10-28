import SwiftUI

/// Botón primario relleno `boton` de B «Cholula» (radio 12, 52 de alto) — paridad con `AgoraPrimaryButton.kt`.
struct AgoraPrimaryButton: View {
    let title: String
    let action: () -> Void
    var enabled: Bool = true
    var loading: Bool = false

    var body: some View {
        Button(action: action) {
            HStack {
                Spacer()
                if loading {
                    ProgressView()
                        .tint(AgoraDesign.Colors.sobreBoton)
                } else {
                    Text(title)
                        .font(.outfit(.body, .bold))
                }
                Spacer()
            }
            .padding(.vertical, AgoraDesign.Spacing.sm + 2)
            .frame(minHeight: 52)
        }
        .buttonStyle(AgoraScaleButtonStyle())
        .background(
            (enabled && !loading ? AgoraDesign.Colors.boton : AgoraDesign.Colors.boton.opacity(0.4))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        )
        .foregroundStyle(AgoraDesign.Colors.sobreBoton)
        .disabled(!enabled || loading)
    }
}

struct AgoraOutlinedButton: View {
    let title: String
    let action: () -> Void
    var enabled: Bool = true

    var body: some View {
        Button(action: action) {
            Text(title)
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AgoraDesign.Spacing.sm + 2)
                .frame(minHeight: 48)
        }
        .buttonStyle(AgoraScaleButtonStyle())
        .foregroundStyle(enabled ? AgoraDesign.Colors.texto : AgoraDesign.Colors.textoMuted)
        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
        }
        .disabled(!enabled)
    }
}

struct AgoraScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            // Con un ButtonStyle propio, SwiftUI solo recibe toques donde hay algo
            // dibujado: los Spacer y el relleno alrededor del texto son
            // transparentes. Sin esto, tocar el botón fuera de las letras no hacía
            // nada (TestFlight 1.0.0 (2): «Enviarme el código» no respondía).
            .contentShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(AgoraDesign.Animation.press, value: configuration.isPressed)
    }
}

/// Reemplazo de `.plain` para toda la app. `PlainButtonStyle` solo recibe
/// toques donde hay algo dibujado: en una fila `HStack { avatar; texto; Spacer() }`
/// el hueco del Spacer no respondía, y tocar «a un lado» del texto no hacía
/// nada (el mismo fallo que «Enviarme el código» en TestFlight 1.0.0 (2)).
/// Este estilo hace tocable todo el rectángulo del contenido y atenúa al pulsar.
struct AgoraPlainButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(Rectangle())
            .opacity(configuration.isPressed ? 0.6 : 1)
    }
}

extension ButtonStyle where Self == AgoraPlainButtonStyle {
    /// `.buttonStyle(.agoraPlain)`: como `.plain`, pero tocable en toda su área.
    static var agoraPlain: AgoraPlainButtonStyle { AgoraPlainButtonStyle() }
}
