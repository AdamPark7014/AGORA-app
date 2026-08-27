import SwiftUI

struct LoginView: View {
    let onLoggedIn: (SessionUser) -> Void

    @State private var paso = "correo"
    @State private var email = ""
    @State private var codigo = ""
    @State private var cargando = false
    @State private var error: String?

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
                         : AgoraCopy.loginSubtitleCode(email))
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
                }
                .padding(AgoraDesign.Spacing.lg)
                .animation(AgoraDesign.Animation.spring, value: paso)
            }
            .agoraScreenBackground()
            .navigationBarHidden(true)
        }
    }

    private var header: some View {
        VStack(alignment: .center, spacing: AgoraDesign.Spacing.md) {
            ZStack {
                Circle()
                    .fill(AgoraDesign.Colors.naranjaSuave)
                    .frame(width: 72, height: 72)
                Text("Á")
                    .font(.largeTitle.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
            Text(AgoraCopy.appName)
                .font(.largeTitle.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
            Text(AgoraCopy.appTagline)
                .font(.subheadline)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }

    private var pasoCorreo: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            Text(AgoraCopy.loginEmailLabel)
                .font(.caption.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
            TextField(AgoraCopy.loginEmailPlaceholder, text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
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
            Text(AgoraCopy.loginCodeLabel)
                .font(.caption.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
            TextField("123456", text: $codigo)
                .keyboardType(.numberPad)
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

            Button(AgoraCopy.loginChangeEmail) {
                paso = "correo"
                codigo = ""
                error = nil
            }
            .font(.footnote)
            .foregroundStyle(AgoraDesign.Colors.textoMedio)
            .frame(maxWidth: .infinity)
        }
    }

    private func solicitarCodigo() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            try await AuthRepository.shared.solicitarOtp(email: email)
            paso = "codigo"
        } catch {
            self.error = error.localizedDescription
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
            self.error = error.localizedDescription
        }
    }
}
