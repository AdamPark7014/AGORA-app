import SwiftUI

struct LoginView: View {
    let onLoggedIn: (SessionUser) -> Void

    @State private var paso = "correo"
    @State private var email = ""
    @State private var codigo = ""
    @State private var cargando = false
    @State private var error: String?
    /// Aviso neutro en el paso del código (sin seguimiento o tras un 429).
    @State private var aviso: String?
    /// Id de seguimiento del último código enviado (cabecera `X-Envio-Id`).
    @State private var envioId: String?

    private var emailNormalizado: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header
                        .padding(.top, AgoraDesign.Spacing.xl)
                        .padding(.bottom, AgoraDesign.Spacing.lg)

                    Text(paso == "correo" ? AgoraCopy.loginWelcomeBack : AgoraCopy.loginCheckEmail)
                        .font(.title2.bold())
                        .foregroundStyle(AgoraDesign.Colors.texto)

                    Text(paso == "correo"
                         ? AgoraCopy.loginSubtitleEmail
                         : AgoraCopy.loginSubtitleCode(emailNormalizado))
                        .font(.subheadline)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .padding(.top, AgoraDesign.Spacing.xxs)
                        .padding(.bottom, AgoraDesign.Spacing.lg)

                    if paso == "correo" {
                        pasoCorreo
                            .transition(.asymmetric(
                                insertion: .move(edge: .leading).combined(with: .opacity),
                                removal: .move(edge: .leading).combined(with: .opacity)
                            ))
                    } else {
                        pasoCodigo
                            .transition(.asymmetric(
                                insertion: .move(edge: .trailing).combined(with: .opacity),
                                removal: .move(edge: .trailing).combined(with: .opacity)
                            ))
                    }

                    if let error {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(AgoraDesign.Colors.danger)
                            .padding(.top, AgoraDesign.Spacing.sm)
                    }

                    AgoraCreditoLegal()
                        .padding(.top, AgoraDesign.Spacing.xl)
                }
                .padding(AgoraDesign.Spacing.lg)
                .animation(AgoraDesign.Animation.spring, value: paso)
            }
            .agoraScreenBackground()
            .navigationBarHidden(true)
        }
    }

    private var header: some View {
        AgoraMarca(tamano: 80, conNombre: true, conLema: true)
    }

    private var pasoCorreo: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            Text(AgoraCopy.loginEmailLabel)
                .font(.caption.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
            TextField(AgoraCopy.loginEmailPlaceholder, text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .autocorrectionDisabled()
                .padding(AgoraDesign.Spacing.sm)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }

            AgoraPrimaryButton(
                title: cargando ? AgoraCopy.loginSending : AgoraCopy.loginSendCode,
                action: { Task { await solicitarCodigo() } },
                enabled: email.contains("@"),
                loading: cargando
            )
        }
    }

    private var pasoCodigo: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            if let envioId {
                EstadoEntregaOtpView(
                    envioId: envioId,
                    email: emailNormalizado,
                    onCorregir: { volverAlCorreo() },
                    onReenviar: { Task { await solicitarCodigo() } }
                )
                // Vista nueva por envío: reinicia el sondeo con cada reenvío.
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
                .onChange(of: codigo) { newValue in
                    let filtered = newValue.filter(\.isNumber).prefix(6)
                    if filtered != newValue { codigo = String(filtered) }
                }

            AgoraPrimaryButton(
                title: cargando ? AgoraCopy.loginVerifying : AgoraCopy.loginEnter,
                action: { Task { await verificarCodigo() } },
                enabled: codigo.count >= 4,
                loading: cargando
            )

            HStack(spacing: AgoraDesign.Spacing.lg) {
                Button(AgoraCopy.loginChangeEmail) {
                    volverAlCorreo()
                }
                Button(AgoraCopy.loginResend) {
                    Task { await solicitarCodigo() }
                }
                .disabled(cargando)
            }
            .font(.footnote)
            .foregroundStyle(AgoraDesign.Colors.textoMedio)
            .frame(maxWidth: .infinity)
            .padding(.top, AgoraDesign.Spacing.xxs)

            Text(AgoraCopy.loginPie)
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMuted)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity)
                .padding(.top, AgoraDesign.Spacing.sm)
        }
    }

    private func volverAlCorreo() {
        paso = "correo"
        codigo = ""
        error = nil
        aviso = nil
        envioId = nil
    }

    private func solicitarCodigo() async {
        guard !cargando else { return }
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let id = try await AuthRepository.shared.solicitarOtp(email: email)
            envioId = id
            // Sin seguimiento (API vieja o modo consola) queda el aviso de siempre.
            aviso = id == nil ? AgoraCopy.loginAvisoOutlook : nil
            paso = "codigo"
        } catch let api as ApiError where api.codigoHttp == 429 {
            // Ya hay un código vigente: se pasa al paso del código con el aviso del servidor.
            aviso = api.mensajeServidor ?? AgoraCopy.loginDemasiadosIntentos
            paso = "codigo"
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func verificarCodigo() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let user = try await AuthRepository.shared.verificarOtp(email: email, codigo: codigo)
            AgoraAnalytics.login()
            await MainActor.run { onLoggedIn(user) }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}
