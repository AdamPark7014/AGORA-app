import SwiftUI
import UIKit

/// La puerta de Ágora (misma secuencia que `apps/web/app/page.tsx` y
/// `LoginScreen.kt`):
///
///  - `entrar`: correo + contraseña, lo de todos los días.
///  - `pedir` → `codigo`: el código al buzón @udlap.mx. Solo para crear la
///    cuenta, para una cuenta de antes que aún no tiene contraseña y para
///    «olvidé mi contraseña». Es la única verificación institucional, por eso
///    no se quita: solo se pide una vez.
///  - `contrasena`: después del código, cuando la cuenta no tiene contraseña o
///    se vino por «olvidé», se elige una antes de pasar al perfil o al feed.
struct LoginView: View {
    let onLoggedIn: (SessionUser) -> Void

    private enum Paso {
        case entrar, pedir, codigo, contrasena
    }

    private enum Motivo {
        case registro, olvide
    }

    @State private var paso: Paso = .entrar
    @State private var motivo: Motivo = .registro
    @State private var email = ""
    @State private var contrasena = ""
    @State private var verContrasena = false
    @State private var recordarme = true
    @State private var codigo = ""
    @State private var cargando = false
    @State private var error: String?
    /// Aviso neutro en el paso del código (sin seguimiento o tras un 429).
    @State private var aviso: String?
    /// Id de seguimiento del último código enviado (cabecera `X-Envio-Id`).
    @State private var envioId: String?
    /// Sesión abierta por código que espera a que se elija la contraseña.
    @State private var verificado: SessionUser?

    private var emailNormalizado: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private var titulo: String {
        switch paso {
        case .entrar: return AgoraCopy.loginTitulo
        case .pedir: return motivo == .olvide ? AgoraCopy.loginPedirTituloOlvide : AgoraCopy.loginPedirTituloRegistro
        case .codigo: return AgoraCopy.loginCheckEmail
        case .contrasena: return motivo == .olvide ? AgoraCopy.contrasenaTituloOlvide : AgoraCopy.contrasenaTituloCrear
        }
    }

    private var entradilla: String {
        switch paso {
        case .entrar: return AgoraCopy.loginEntradilla
        case .pedir: return motivo == .olvide ? AgoraCopy.loginPedirExplicacionOlvide : AgoraCopy.loginPedirExplicacionRegistro
        case .codigo: return AgoraCopy.loginSubtitleCode(emailNormalizado)
        case .contrasena: return motivo == .olvide ? AgoraCopy.contrasenaEntradillaOlvide : AgoraCopy.contrasenaEntradillaCrear
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header
                        .padding(.top, AgoraDesign.Spacing.xl)
                        .padding(.bottom, AgoraDesign.Spacing.lg)

                    Text(titulo)
                        .font(.title2.bold())
                        .foregroundStyle(AgoraDesign.Colors.texto)

                    Text(entradilla)
                        .font(.subheadline)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, AgoraDesign.Spacing.xxs)
                        .padding(.bottom, AgoraDesign.Spacing.lg)

                    Group {
                        switch paso {
                        case .entrar:
                            pasoEntrar
                        case .pedir:
                            pasoPedir
                        case .codigo:
                            pasoCodigo
                        case .contrasena:
                            pasoContrasena
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .trailing)))

                    if let error {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(AgoraDesign.Colors.danger)
                            .fixedSize(horizontal: false, vertical: true)
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
        AgoraMarca(tamano: 80, conNombre: true, conLema: paso == .entrar)
    }

    // MARK: Pasos

    private var pasoEntrar: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            campoCorreo(contentType: .username, submit: .next)

            CampoContrasena(
                etiqueta: AgoraCopy.loginContrasenaLabel,
                valor: $contrasena,
                visible: $verContrasena,
                enviar: { Task { await entrar() } }
            )

            Toggle(isOn: $recordarme) {
                Text(AgoraCopy.loginRecordarme)
                    .font(.subheadline)
                    .foregroundStyle(AgoraDesign.Colors.texto)
            }
            .tint(AgoraDesign.Colors.naranja)

            AgoraPrimaryButton(
                title: cargando ? AgoraCopy.loginEntrando : AgoraCopy.loginEnter,
                action: { Task { await entrar() } },
                enabled: email.contains("@") && !contrasena.isEmpty,
                loading: cargando
            )

            VStack(spacing: AgoraDesign.Spacing.xs) {
                Button(AgoraCopy.loginOlvide) {
                    irA(.pedir, motivo: .olvide)
                }
                .foregroundStyle(AgoraDesign.Colors.naranja)

                Button {
                    irA(.pedir, motivo: .registro)
                } label: {
                    Text(AgoraCopy.loginPrimeraVez + " ")
                        .foregroundColor(AgoraDesign.Colors.textoMedio)
                        + Text(AgoraCopy.loginCrearCuenta)
                        .bold()
                        .foregroundColor(AgoraDesign.Colors.naranja)
                }
            }
            .font(.footnote)
            .frame(maxWidth: .infinity)
            .padding(.top, AgoraDesign.Spacing.xxs)
            .disabled(cargando)
        }
    }

    private var pasoPedir: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            campoCorreo(contentType: .emailAddress, submit: .send) {
                if email.contains("@") { Task { await solicitarCodigo() } }
            }

            AgoraPrimaryButton(
                title: cargando ? AgoraCopy.loginSending : AgoraCopy.loginPedirBoton,
                action: { Task { await solicitarCodigo() } },
                enabled: email.contains("@"),
                loading: cargando
            )

            Button(AgoraCopy.loginPedirVolver) {
                irA(.entrar)
            }
            .font(.footnote)
            .foregroundStyle(AgoraDesign.Colors.naranja)
            .frame(maxWidth: .infinity)
            .padding(.top, AgoraDesign.Spacing.xxs)
            .disabled(cargando)
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

    private var pasoContrasena: some View {
        FormularioContrasena(
            modo: .crear,
            enviar: { _, nueva in
                try await AuthRepository.shared.crearContrasena(nueva)
            },
            onListo: {
                if let verificado { terminar(verificado) }
            }
        )
    }

    private func campoCorreo(
        contentType: UITextContentType,
        submit: SubmitLabel,
        onSubmit: @escaping () -> Void = {}
    ) -> some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
            Text(AgoraCopy.loginEmailLabel)
                .font(.caption.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
            TextField(AgoraCopy.loginEmailPlaceholder, text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textContentType(contentType)
                .autocorrectionDisabled()
                .submitLabel(submit)
                .onSubmit(onSubmit)
                .disabled(cargando)
                .padding(AgoraDesign.Spacing.sm)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
        }
    }

    // MARK: Acciones

    private func terminar(_ user: SessionUser) {
        AgoraAnalytics.login()
        onLoggedIn(user)
    }

    private func irA(_ destino: Paso, motivo nuevo: Motivo? = nil) {
        if let nuevo { motivo = nuevo }
        paso = destino
        error = nil
        aviso = nil
    }

    private func volverAlCorreo() {
        paso = .pedir
        codigo = ""
        error = nil
        aviso = nil
        envioId = nil
    }

    private func entrar() async {
        guard !cargando, email.contains("@"), !contrasena.isEmpty else { return }
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let user = try await AuthRepository.shared.entrar(
                email: email,
                contrasena: contrasena,
                recordarme: recordarme
            )
            await MainActor.run { terminar(user) }
        } catch {
            // 401 uniforme y 429 por intentos: el mensaje de la API ya lo explica.
            self.error = (error as? ApiError)?.mensajeServidor
                ?? FormatUtils.mensajeDe(error)
        }
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
            paso = .codigo
        } catch let api as ApiError where api.codigoHttp == 429 {
            // Ya hay un código vigente: se pasa al paso del código con el aviso del servidor.
            aviso = api.mensajeServidor ?? AgoraCopy.loginDemasiadosIntentos
            paso = .codigo
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func verificarCodigo() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let entrada = try await AuthRepository.shared.verificarOtp(email: email, codigo: codigo)
            // Sin contraseña todavía (cuenta nueva o de antes), o vino a
            // cambiarla: se elige antes de entrar. Si ya tiene y solo prefirió
            // el código, pasa. Con una API anterior (`nil`) pasa.
            if entrada.tieneContrasena == false || motivo == .olvide {
                await MainActor.run {
                    verificado = entrada.user
                    irA(.contrasena)
                }
            } else {
                await MainActor.run { terminar(entrada.user) }
            }
        } catch {
            self.error = (error as? ApiError)?.mensajeServidor
                ?? FormatUtils.mensajeDe(error)
        }
    }
}
