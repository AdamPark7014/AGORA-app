import SwiftUI

/// Dice si el código llegó al buzón — paridad con `componentes/estado-entrega.tsx`.
///
/// Pregunta `GET auth/otp/entrega/:envioId` con esperas crecientes (casi todo se
/// resuelve en los primeros 10 s) y se rinde a los ~90 s. El sondeo vive en
/// `.task(id:)`: se cancela solo cuando la vista desaparece o cambia el envío.
struct EstadoEntregaOtpView: View {
    let envioId: String
    let email: String
    let onCorregir: () -> Void
    let onReenviar: () -> Void

    @State private var estado = "enviado"
    @State private var agotado = false
    @State private var perdido = false

    /// Segundos entre preguntas (mismas que `ESPERAS_MS` en la web).
    private static let esperas: [Double] = [1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20]
    private static let finales: Set<String> = ["entregado", "rebotado", "bloqueado", "error"]

    var body: some View {
        contenido
            .animation(AgoraDesign.Animation.spring, value: estado)
            .animation(AgoraDesign.Animation.spring, value: agotado)
            .task(id: envioId) {
                await seguir()
            }
    }

    @ViewBuilder
    private var contenido: some View {
        if perdido {
            // La API se reinició y olvidó el envío: no hay nada que mostrar.
            EmptyView()
        } else {
            switch estado {
            case "entregado":
                fila(
                    icono: "checkmark.circle.fill",
                    color: AgoraDesign.Colors.success,
                    texto: AgoraCopy.entregaEntregado,
                    accion: nil,
                    onAccion: nil
                )
            case "rebotado":
                fila(
                    icono: "exclamationmark.circle.fill",
                    color: AgoraDesign.Colors.danger,
                    texto: AgoraCopy.entregaRebotado(email),
                    accion: AgoraCopy.loginChangeEmail,
                    onAccion: onCorregir
                )
            case "bloqueado":
                fila(
                    icono: "exclamationmark.circle.fill",
                    color: AgoraDesign.Colors.danger,
                    texto: AgoraCopy.entregaBloqueado,
                    accion: AgoraCopy.loginResend,
                    onAccion: onReenviar
                )
            case "error":
                fila(
                    icono: "exclamationmark.circle.fill",
                    color: AgoraDesign.Colors.danger,
                    texto: AgoraCopy.entregaError,
                    accion: AgoraCopy.loginResend,
                    onAccion: onReenviar
                )
            default:
                if agotado {
                    fila(
                        icono: "exclamationmark.circle",
                        color: AgoraDesign.Colors.textoMedio,
                        texto: AgoraCopy.entregaSinNoticias,
                        accion: AgoraCopy.loginResend,
                        onAccion: onReenviar
                    )
                } else {
                    fila(
                        icono: nil,
                        color: AgoraDesign.Colors.naranja,
                        texto: estado == "demorado" ? AgoraCopy.entregaDemorado : AgoraCopy.entregaEnviado,
                        accion: nil,
                        onAccion: nil
                    )
                }
            }
        }
    }

    private func fila(
        icono: String?,
        color: Color,
        texto: String,
        accion: String?,
        onAccion: (() -> Void)?
    ) -> some View {
        HStack(alignment: .top, spacing: AgoraDesign.Spacing.xs) {
            Group {
                if let icono {
                    Image(systemName: icono)
                        .foregroundStyle(color)
                } else {
                    ProgressView()
                        .controlSize(.small)
                        .tint(color)
                }
            }
            .frame(width: 20, height: 20)

            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
                Text(texto)
                    .font(.footnote)
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .fixedSize(horizontal: false, vertical: true)
                if let accion, let onAccion {
                    Button(accion, action: onAccion)
                        .font(.footnote.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                        .buttonStyle(.agoraPlain)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(AgoraDesign.Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                .stroke(color.opacity(0.35), lineWidth: 1)
        }
    }

    private func seguir() async {
        estado = "enviado"
        agotado = false
        perdido = false
        for espera in Self.esperas {
            do {
                try await Task.sleep(nanoseconds: UInt64(espera * 1_000_000_000))
            } catch {
                return // cancelado: la vista se fue o cambió el envío
            }
            if Task.isCancelled { return }
            do {
                let respuesta = try await AuthRepository.shared.estadoEntregaOtp(envioId: envioId)
                if Task.isCancelled { return }
                guard let nuevo = respuesta else {
                    perdido = true
                    return
                }
                estado = nuevo
                if Self.finales.contains(nuevo) { return }
            } catch {
                if Task.isCancelled { return }
                // Error de red puntual: se vuelve a preguntar tras la siguiente espera.
            }
        }
        if !Task.isCancelled {
            agotado = true
        }
    }
}
