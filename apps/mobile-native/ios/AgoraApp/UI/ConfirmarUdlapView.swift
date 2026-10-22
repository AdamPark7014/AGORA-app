import SwiftUI

/// Estado del correo UDLAP de la sesión (`GET auth/yo`). Lo leen el aviso de
/// arriba del feed, Ajustes y la raíz (que bloquea si pasó el plazo).
@MainActor
final class UdlapEstado: ObservableObject {
    static let shared = UdlapEstado()

    @Published private(set) var pendiente = false
    @Published private(set) var vencida = false
    @Published private(set) var diasRestantes: Int?

    private init() {}

    func refrescar() async {
        guard SessionStore.shared.token != nil else {
            limpiar()
            return
        }
        guard let yo = try? await AuthRepository.shared.yo() else { return }
        pendiente = yo.udlapPendiente ?? false
        vencida = yo.udlapVencida ?? false
        diasRestantes = yo.udlapDiasRestantes
    }

    func limpiar() {
        pendiente = false
        vencida = false
        diasRestantes = nil
    }
}

/// Aviso arriba del feed mientras la cuenta, registrada con correo personal,
/// no confirma su buzón UDLAP.
struct AvisoUdlapView: View {
    @ObservedObject private var estado = UdlapEstado.shared
    @State private var confirmando = false

    var body: some View {
        if estado.pendiente && !estado.vencida {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
                Text(AgoraCopy.udlapAvisoTitulo)
                    .font(.subheadline.bold())
                    .foregroundStyle(AgoraDesign.Colors.texto)
                Text(AgoraCopy.udlapAvisoTexto(estado.diasRestantes ?? 30))
                    .font(.footnote)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .fixedSize(horizontal: false, vertical: true)
                Button(AgoraCopy.udlapAvisoBoton) { confirmando = true }
                    .font(.footnote.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
                    .frame(minHeight: 36)
                    .buttonStyle(.agoraPlain)
                    .accessibilityIdentifier("udlap.aviso.confirmar")
            }
            .padding(AgoraDesign.Spacing.sm)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AgoraDesign.Colors.naranjaSuave)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
            .padding(.horizontal, AgoraDesign.Spacing.md)
            .padding(.vertical, AgoraDesign.Spacing.xs)
            .sheet(isPresented: $confirmando) {
                NavigationStack {
                    ConfirmarUdlapView(modo: .normal) { confirmando = false }
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button(AgoraCopy.ajustesContrasenaCancelar) { confirmando = false }
                            }
                        }
                }
                .environmentObject(SessionStore.shared)
            }
        }
    }
}

/// Confirmar el buzón UDLAP de una cuenta registrada con correo personal:
/// código al @udlap.mx → canje (sesión nueva; la API borra el correo personal
/// y la contraseña y cierra las demás sesiones) → elegir contraseña de nuevo.
struct ConfirmarUdlapView: View {
    enum Modo {
        /// Desde el aviso o Ajustes: se puede cerrar.
        case normal
        /// Pasó el plazo: pantalla completa, solo confirmar o salir.
        case bloqueo
    }

    let modo: Modo
    var onListo: () -> Void = {}

    private enum Paso { case inicio, codigo, contrasena, listo }

    @EnvironmentObject private var session: SessionStore
    @State private var paso: Paso = .inicio
    @State private var codigo = ""
    @State private var envioId: String?
    @State private var aviso: String?
    @State private var error: String?
    @State private var cargando = false

    private var email: String { session.currentUser?.email ?? "" }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                if modo == .bloqueo {
                    AgoraMarca(tamano: 64, conNombre: false)
                        .padding(.top, AgoraDesign.Spacing.xl)
                }
                Text(titulo)
                    .font(.title2.bold())
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .accessibilityIdentifier("udlap.titulo")
                Text(entradilla)
                    .font(.subheadline)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.bottom, AgoraDesign.Spacing.sm)

                switch paso {
                case .inicio:
                    AgoraPrimaryButton(
                        title: cargando ? AgoraCopy.loginSending : AgoraCopy.udlapBoton,
                        action: { Task { await pedirCodigo() } },
                        enabled: !email.isEmpty,
                        loading: cargando
                    )
                    .accessibilityIdentifier("udlap.pedir")
                case .codigo:
                    pasoCodigo
                case .contrasena:
                    FormularioContrasena(
                        modo: .crear,
                        enviar: { _, nueva in try await AuthRepository.shared.crearContrasena(nueva) },
                        onListo: {
                            paso = .listo
                            Task { await UdlapEstado.shared.refrescar() }
                        }
                    )
                case .listo:
                    Text(AgoraCopy.udlapConfirmada)
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.success)
                    AgoraPrimaryButton(title: AgoraCopy.udlapConfirmar, action: onListo)
                        .accessibilityIdentifier("udlap.listo")
                }

                if let error {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(AgoraDesign.Colors.danger)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("udlap.error")
                }

                if modo == .bloqueo && paso != .listo {
                    Button(AgoraCopy.cerrarSesion) { AuthRepository.shared.logout() }
                        .font(.footnote)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .buttonStyle(.agoraPlain)
                        .padding(.top, AgoraDesign.Spacing.md)
                }
            }
            .padding(AgoraDesign.Spacing.lg)
        }
        .scrollDismissesKeyboard(.interactively)
        .agoraScreenBackground()
        .navigationTitle(modo == .normal ? AgoraCopy.udlapConfirmarTitulo : "")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var titulo: String {
        switch paso {
        case .contrasena: return AgoraCopy.udlapContrasenaTitulo
        default: return modo == .bloqueo ? AgoraCopy.udlapVencidoTitulo : AgoraCopy.udlapConfirmarTitulo
        }
    }

    private var entradilla: String {
        switch paso {
        case .contrasena: return AgoraCopy.udlapContrasenaTexto
        case .codigo: return AgoraCopy.loginSubtitleCode(email)
        default:
            return modo == .bloqueo
                ? AgoraCopy.udlapVencidoTexto + "\n\n" + AgoraCopy.udlapConfirmarExplicacion(email)
                : AgoraCopy.udlapConfirmarExplicacion(email)
        }
    }

    private var pasoCodigo: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            if let envioId {
                EstadoEntregaOtpView(
                    envioId: envioId,
                    email: email,
                    onCorregir: { paso = .inicio },
                    onReenviar: { Task { await pedirCodigo() } }
                )
                .id(envioId)
            }
            if let aviso {
                Text(aviso)
                    .font(.footnote)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text(AgoraCopy.loginCodeLabel)
                .font(.caption.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
            TextField("123456", text: $codigo)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .padding(AgoraDesign.Spacing.sm)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
                .onChange(of: codigo) { nuevo in
                    let filtrado = nuevo.filter(\.isNumber).prefix(6)
                    if filtrado != nuevo { codigo = String(filtrado) }
                }
                .accessibilityIdentifier("udlap.codigo")
            AgoraPrimaryButton(
                title: cargando ? AgoraCopy.loginVerifying : AgoraCopy.udlapConfirmar,
                action: { Task { await confirmar() } },
                enabled: codigo.count == 6,
                loading: cargando
            )
            .accessibilityIdentifier("udlap.confirmar")
            Button(AgoraCopy.loginResend) { Task { await pedirCodigo() } }
                .font(.footnote)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .frame(maxWidth: .infinity, minHeight: 44)
                .buttonStyle(.agoraPlain)
                .disabled(cargando)
        }
    }

    private func pedirCodigo() async {
        guard !cargando, !email.isEmpty else { return }
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            envioId = try await AuthRepository.shared.solicitarOtp(email: email)
            aviso = envioId == nil ? AgoraCopy.loginAvisoOutlook : nil
            paso = .codigo
        } catch let api as ApiError where api.codigoHttp == 429 {
            aviso = api.mensajeServidor ?? AgoraCopy.loginDemasiadosIntentos
            paso = .codigo
        } catch {
            self.error = (error as? ApiError)?.mensajeServidor ?? FormatUtils.mensajeDe(error)
        }
    }

    private func confirmar() async {
        guard !cargando, codigo.count == 6 else { return }
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            // Guarda la sesión nueva: la API cerró las demás al confirmar.
            let entrada = try await AuthRepository.shared.verificarOtp(email: email, codigo: codigo)
            if entrada.tieneContrasena == false {
                paso = .contrasena
            } else {
                paso = .listo
                await UdlapEstado.shared.refrescar()
            }
        } catch {
            self.error = (error as? ApiError)?.mensajeServidor ?? FormatUtils.mensajeDe(error)
        }
    }
}
