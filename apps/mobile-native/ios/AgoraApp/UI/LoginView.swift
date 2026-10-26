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
///  - `personal` → `codigoPersonal`: si el código a la UDLAP no llega, se
///    registra con un código a su correo personal (la API confirma con
///    Microsoft que el buzón UDLAP existe). La UDLAP queda pendiente 30 días.
///  - `contrasena`: después del código, cuando la cuenta no tiene contraseña o
///    se vino por «olvidé», se elige una antes de pasar al perfil o al feed.
struct LoginView: View {
    let onLoggedIn: (SessionUser) -> Void

    private enum Paso {
        case entrar, pedir, codigo, personal, codigoPersonal, contrasena
    }

    private enum Motivo {
        case registro, olvide
    }

    @State private var paso: Paso = .entrar
    @State private var motivo: Motivo = .registro
    @State private var email = ""
    @State private var correoPersonal = ""
    @State private var contrasena = ""
    @State private var verContrasena = false
    @State private var recordarme = true
    @State private var codigo = ""
    @State private var cargando = false
    @State private var error: String?
    /// Aviso neutro en el paso del código (sin seguimiento o tras un 429).
    @State private var aviso: String?
    /// El buzón UDLAP no existe: se dice junto al correo UDLAP, no debajo del personal.
    @State private var errorUdlap: String?
    /// Id de seguimiento del último código enviado (cabecera `X-Envio-Id`).
    @State private var envioId: String?
    /// Sesión abierta por código que espera a que se elija la contraseña.
    @State private var verificado: SessionUser?

    private var emailNormalizado: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private var personalNormalizado: String {
        correoPersonal.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    /// En el paso del código: ¿el código se mandó al correo personal?
    private var codigoAlPersonal: Bool { paso == .codigoPersonal }

    private var titulo: String {
        switch paso {
        case .entrar: return AgoraCopy.loginTitulo
        case .pedir: return motivo == .olvide ? AgoraCopy.loginPedirTituloOlvide : AgoraCopy.loginPedirTituloRegistro
        case .codigo, .codigoPersonal: return AgoraCopy.loginCheckEmail
        case .personal: return AgoraCopy.personalTitulo
        case .contrasena: return motivo == .olvide ? AgoraCopy.contrasenaTituloOlvide : AgoraCopy.contrasenaTituloCrear
        }
    }

    private var entradilla: String {
        switch paso {
        case .entrar: return AgoraCopy.loginEntradilla
        case .pedir: return motivo == .olvide ? AgoraCopy.loginPedirExplicacionOlvide : AgoraCopy.loginPedirExplicacionRegistro
        case .codigo: return AgoraCopy.loginSubtitleCode(emailNormalizado)
        case .codigoPersonal: return AgoraCopy.personalEntradillaCodigo(personalNormalizado)
        case .personal: return AgoraCopy.personalExplicacion
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
                        .font(.bricolage(.title2, extra: false))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .accessibilityIdentifier("login.titulo")

                    Text(entradilla)
                        .font(.outfit(.subheadline))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, AgoraDesign.Spacing.xxs)
                        .padding(.bottom, AgoraDesign.Spacing.lg)
                        .accessibilityIdentifier("login.entradilla")

                    Group {
                        switch paso {
                        case .entrar:
                            pasoEntrar
                        case .pedir:
                            pasoPedir
                        case .codigo, .codigoPersonal:
                            pasoCodigo
                        case .personal:
                            pasoPersonal
                        case .contrasena:
                            pasoContrasena
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .trailing)))

                    if let error {
                        Text(error)
                            .font(.outfit(.footnote))
                            .foregroundStyle(AgoraDesign.Colors.danger)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, AgoraDesign.Spacing.sm)
                            .accessibilityIdentifier("login.error")
                    }

                    AgoraCreditoLegal()
                        .padding(.top, AgoraDesign.Spacing.xl)
                }
                .padding(AgoraDesign.Spacing.lg)
                .animation(AgoraDesign.Animation.spring, value: paso)
            }
            // Arrastrar la pantalla baja el teclado: con él arriba, el botón y
            // los enlaces de abajo quedaban tapados en iPhone pequeños.
            .scrollDismissesKeyboard(.interactively)
            .agoraScreenBackground()
            .navigationBarHidden(true)
            // «Listo» encima del teclado: con él arriba, «Entrar» queda tapado en
            // un iPhone normal y no había forma evidente de bajarlo.
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button(AgoraCopy.tecladoListo) {
                        UIApplication.shared.sendAction(
                            #selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil
                        )
                    }
                    .accessibilityIdentifier("teclado.listo")
                }
            }
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
                enviar: { Task { await entrar() } },
                id: "login.contrasena"
            )

            Toggle(isOn: $recordarme) {
                Text(AgoraCopy.loginRecordarme)
                    .font(.outfit(.subheadline))
                    .foregroundStyle(AgoraDesign.Colors.texto)
            }
            .tint(AgoraDesign.Colors.naranja)

            AgoraPrimaryButton(
                title: cargando ? AgoraCopy.loginEntrando : AgoraCopy.loginEnter,
                action: { Task { await entrar() } },
                enabled: email.contains("@") && !contrasena.isEmpty,
                loading: cargando
            )
            .accessibilityIdentifier("login.entrar")

            VStack(spacing: AgoraDesign.Spacing.xs) {
                enlace(AgoraCopy.loginOlvide, id: "login.olvide") {
                    irA(.pedir, motivo: .olvide)
                }

                Button {
                    irA(.pedir, motivo: .registro)
                } label: {
                    (Text(AgoraCopy.loginPrimeraVez + " ")
                        .foregroundColor(AgoraDesign.Colors.textoMedio)
                        + Text(AgoraCopy.loginCrearCuenta)
                        .bold()
                        .foregroundColor(AgoraDesign.Colors.naranja))
                        .padding(.vertical, AgoraDesign.Spacing.xs)
                        .frame(maxWidth: .infinity)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.agoraPlain)
                .accessibilityIdentifier("login.crearCuenta")
            }
            .font(.outfit(.footnote))
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
            .accessibilityIdentifier("pedir.enviar")

            enlace(AgoraCopy.loginPedirVolver, id: "pedir.volver") {
                irA(.entrar)
            }
            .font(.outfit(.footnote))
            .padding(.top, AgoraDesign.Spacing.xxs)
            .disabled(cargando)
        }
    }

    private var pasoPersonal: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            tarjetaCorreoUdlap

            campoTexto(
                etiqueta: AgoraCopy.personalEtiqueta,
                placeholder: AgoraCopy.personalPlaceholder,
                texto: $correoPersonal,
                id: "personal.correo"
            ) {
                if correoPersonal.contains("@") { Task { await solicitarCodigoPersonal() } }
            }

            AgoraPrimaryButton(
                title: cargando ? AgoraCopy.loginSending : AgoraCopy.personalBoton,
                action: { Task { await solicitarCodigoPersonal() } },
                enabled: correoPersonal.contains("@"),
                loading: cargando
            )
            .accessibilityIdentifier("personal.enviar")

            enlace(AgoraCopy.personalVolver, id: "personal.volver") {
                irA(.codigo)
            }
            .font(.outfit(.footnote))
            .padding(.top, AgoraDesign.Spacing.xxs)
            .disabled(cargando)
        }
    }

    /// El correo UDLAP que se va a confirmar, a la vista y con «Cambiar». Sin esto,
    /// quien lo escribió mal (sin el punto) solo veía el error debajo de su correo
    /// personal y creía que le rechazaban ese (Adam, 23-10).
    private var tarjetaCorreoUdlap: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(AgoraCopy.personalConfirmaremos)
                        .font(.outfit(.footnote))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    Text(emailNormalizado)
                        .font(.outfit(.subheadline, .semibold))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                }
                Spacer(minLength: AgoraDesign.Spacing.xs)
                enlace(AgoraCopy.personalCambiar, id: "personal.cambiarUdlap") {
                    volverAlCorreo()
                }
                .font(.outfit(.subheadline, .semibold))
                .disabled(cargando)
            }
            if let errorUdlap {
                Text(errorUdlap)
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.danger)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(AgoraDesign.Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(errorUdlap == nil ? AgoraDesign.Colors.superficie : AgoraDesign.Colors.dangerSuave)
        .overlay(
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium)
                .stroke(errorUdlap == nil ? AgoraDesign.Colors.borde : AgoraDesign.Colors.danger, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
        .accessibilityElement(children: .contain)
    }

    private var pasoCodigo: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            if let envioId {
                EstadoEntregaOtpView(
                    envioId: envioId,
                    email: codigoAlPersonal ? personalNormalizado : emailNormalizado,
                    onCorregir: { corregirCorreo() },
                    onReenviar: { Task { await reenviar() } }
                )
                // Vista nueva por envío: reinicia el sondeo con cada reenvío.
                .id(envioId)
            }

            if let aviso {
                Text(aviso)
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Text(AgoraCopy.loginCodeLabel)
                .font(.outfit(.caption, .bold))
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
                .accessibilityIdentifier("codigo.campo")

            AgoraPrimaryButton(
                title: cargando ? AgoraCopy.loginVerifying : AgoraCopy.loginEnter,
                action: { Task { await verificarCodigo() } },
                enabled: codigo.count == 6,
                loading: cargando
            )
            .accessibilityIdentifier("codigo.entrar")

            HStack(spacing: AgoraDesign.Spacing.lg) {
                enlace(AgoraCopy.loginChangeEmail, id: "codigo.cambiarCorreo", color: AgoraDesign.Colors.textoMedio) {
                    corregirCorreo()
                }
                enlace(AgoraCopy.loginResend, id: "codigo.reenviar", color: AgoraDesign.Colors.textoMedio) {
                    Task { await reenviar() }
                }
                .disabled(cargando)
            }
            .font(.outfit(.footnote))
            .frame(maxWidth: .infinity)
            .padding(.top, AgoraDesign.Spacing.xxs)

            if !codigoAlPersonal {
                enlace(AgoraCopy.loginNoLlego, id: "codigo.noLlego") {
                    codigo = ""
                    envioId = nil
                    irA(.personal)
                }
                .font(.outfit(.footnote, .bold))
                .disabled(cargando)
            }

            Text(AgoraCopy.loginPie)
                .font(.outfit(.caption))
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
                try await AuthRepository.shared.crearContrasena(nueva, token: verificado?.token)
            },
            onListo: {
                // La sesión se pone hasta aquí (ver `verificarCodigo`).
                guard let verificado else { return }
                Task {
                    await AuthRepository.shared.guardarSesion(verificado)
                    await MainActor.run { terminar(verificado) }
                }
            }
        )
    }

    // MARK: Piezas

    private func campoCorreo(
        contentType: UITextContentType,
        submit: SubmitLabel,
        onSubmit: @escaping () -> Void = {}
    ) -> some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
            Text(AgoraCopy.loginEmailLabel)
                .font(.outfit(.caption, .bold))
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
                .accessibilityIdentifier("login.correo")
        }
    }

    private func campoTexto(
        etiqueta: String,
        placeholder: String,
        texto: Binding<String>,
        id: String,
        onSubmit: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xxs) {
            Text(etiqueta)
                .font(.outfit(.caption, .bold))
                .foregroundStyle(AgoraDesign.Colors.texto)
            TextField(placeholder, text: texto)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .autocorrectionDisabled()
                .submitLabel(.send)
                .onSubmit(onSubmit)
                .disabled(cargando)
                .padding(AgoraDesign.Spacing.sm)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.button))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.button)
                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                }
                .accessibilityIdentifier(id)
        }
    }

    /// Enlace de texto con un área de toque cómoda (44 pt de alto, todo el ancho
    /// del texto), no solo las letras.
    private func enlace(
        _ titulo: String,
        id: String,
        color: Color = AgoraDesign.Colors.naranja,
        accion: @escaping () -> Void
    ) -> some View {
        Button(action: accion) {
            Text(titulo)
                .foregroundStyle(color)
                .multilineTextAlignment(.center)
                .frame(minHeight: 44)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityIdentifier(id)
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
        errorUdlap = nil
    }

    private func volverAlCorreo() {
        paso = .pedir
        codigo = ""
        error = nil
        aviso = nil
        errorUdlap = nil
        envioId = nil
    }

    /// «Cambiar correo» vuelve a donde se escribió el correo al que se mandó el código.
    private func corregirCorreo() {
        if codigoAlPersonal {
            codigo = ""
            envioId = nil
            irA(.personal)
        } else {
            volverAlCorreo()
        }
    }

    private func reenviar() async {
        if codigoAlPersonal {
            await solicitarCodigoPersonal()
        } else {
            await solicitarCodigo()
        }
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
            self.error = (error as? ApiError)?.mensajeServidor
                ?? FormatUtils.mensajeDe(error)
        }
    }

    private func solicitarCodigoPersonal() async {
        guard !cargando, correoPersonal.contains("@") else { return }
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let id = try await AuthRepository.shared.solicitarOtpPersonal(
                email: email,
                correoPersonal: correoPersonal
            )
            envioId = id
            aviso = nil
            codigo = ""
            paso = .codigoPersonal
        } catch let api as ApiError where api.codigoHttp == 429 {
            aviso = api.mensajeServidor ?? AgoraCopy.loginDemasiadosIntentos
            paso = .codigoPersonal
        } catch let api as ApiError where api.codigoHttp == 400
            && (api.mensajeServidor ?? "").hasPrefix("El correo UDLAP") {
            // El que falló es el UDLAP (p. ej. sin el punto): se dice junto a él.
            errorUdlap = api.mensajeServidor
        } catch {
            // 400 (el buzón UDLAP no existe), 409 (cuenta ya confirmada o correo
            // personal en uso), 503 (Microsoft no contestó): el texto de la API.
            self.error = (error as? ApiError)?.mensajeServidor
                ?? FormatUtils.mensajeDe(error)
        }
    }

    private func verificarCodigo() async {
        guard !cargando, codigo.count == 6 else { return }
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            // Sin guardar la sesión todavía: en cuanto hay sesión, `RootView` deja
            // la puerta y el paso de la contraseña no se vería.
            let entrada = codigoAlPersonal
                ? try await AuthRepository.shared.verificarOtpPersonal(
                    email: email,
                    correoPersonal: correoPersonal,
                    codigo: codigo,
                    guardar: false
                )
                : try await AuthRepository.shared.verificarOtp(email: email, codigo: codigo, guardar: false)
            // Sin contraseña todavía (cuenta nueva o de antes), o vino a
            // cambiarla: se elige antes de entrar. Si ya tiene y solo prefirió
            // el código, pasa. Con una API anterior (`nil`) pasa.
            if entrada.tieneContrasena == false || motivo == .olvide {
                await MainActor.run {
                    verificado = entrada.user
                    irA(.contrasena)
                }
            } else {
                await AuthRepository.shared.guardarSesion(entrada.user)
                await MainActor.run { terminar(entrada.user) }
            }
        } catch {
            self.error = (error as? ApiError)?.mensajeServidor
                ?? FormatUtils.mensajeDe(error)
        }
    }
}
