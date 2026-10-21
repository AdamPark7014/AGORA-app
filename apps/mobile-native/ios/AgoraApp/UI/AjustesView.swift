import SwiftUI
import PhotosUI
import UIKit

private let etiquetasPreferencia: [String: String] = [
    "COMENTARIO": "Comentarios",
    "REACCION": "Reacciones",
    "MENSAJE": "Mensajes",
    "EVENTO_NUEVO": "Eventos nuevos",
    "AVENTON_APARTADO": "Aventones",
    "AVENTON_CANCELADO": "Aventones cancelados",
    "MODERACION": "Moderación",
    "MENCION": "Menciones",
    "SEGUIDOR": "Nuevos seguidores",
    "INSIGNIA": "Insignias",
    "RETO": "Retos y duelos",
    "PREGUNTA": "Pregunta del día",
]

private let nombresMes = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

/// Días por mes en año bisiesto (mismo criterio que `actualizarPerfilSchema`).
private let diasPorMes = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/// Ajustes de perfil y notificaciones — paridad con `AjustesScreen.kt`.
struct AjustesView: View {
    @State private var handle = ""
    @State private var nombre = ""
    @State private var apellidos = ""
    @State private var generacion: Int?
    @State private var bio = ""
    @State private var ciudad = ""
    @State private var instagram = ""
    @State private var busco = ""
    @State private var intereses: [String] = []
    @State private var nuevoInteres = ""
    @State private var visibilidad = "UNIVERSIDAD"
    @State private var comunidades: [ComunidadDto] = []
    @State private var fotoUrl: String?
    @State private var preferencias: [PreferenciaNotificacionDto] = []
    @State private var avisoPregunta = true
    /// Si la cuenta ya tiene contraseña (`auth/yo`). `nil`: API anterior o sin respuesta; no se muestra la tarjeta.
    @State private var tieneContrasena: Bool?
    @State private var contrasenaAbierta = false
    @State private var cargando = true
    @State private var guardando = false
    @State private var subiendoFoto = false
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var error: String?
    @State private var aviso: String?
    @State private var confirmandoBaja = false
    @State private var confirmacionBaja = ""
    @State private var eliminando = false
    @State private var portadaUrl: String?
    @State private var selectedPortada: PhotosPickerItem?
    @State private var subiendoPortada = false
    /// 0 = sin cumpleaños.
    @State private var cumpleMes = 0
    @State private var cumpleDia = 0
    @State private var cumpleMesOriginal = 0
    @State private var cumpleDiaOriginal = 0
    /// Sistema / Claro / Oscuro; la raíz (`AgoraApp`) lee la misma clave.
    @AppStorage(AgoraTema.claveAlmacen) private var apariencia = AgoraTema.sistema.rawValue

    var body: some View {
        Group {
            if cargando {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    // Agrupado: en iOS 16 un ViewBuilder admite como máximo 10 hijos por bloque.
                    VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                        Group {
                            Text("@\(handle)")
                                .font(.title3.bold())
                                .foregroundStyle(AgoraDesign.Colors.naranja)

                            seccionFoto
                            seccionPortada
                            campoSoloLectura("Nombre", valor: nombre)
                            campoSoloLectura("Apellidos", valor: apellidos)
                            if let generacion {
                                campoSoloLectura("Generación", valor: "Generación \(generacion)")
                            }
                        }

                        Group {
                            Text("Bio").font(.subheadline.bold())
                            TextEditor(text: $bio)
                                .frame(minHeight: 90)
                                .padding(6)
                                .background(Color(.secondarySystemGroupedBackground))
                                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
                                .onChange(of: bio) { newValue in
                                    if newValue.count > 280 { bio = String(newValue.prefix(280)) }
                                }
                            Text("\(bio.count)/280")
                                .font(.caption)
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)

                            campoEditable("Ciudad de origen", text: $ciudad)
                            campoEditable("Instagram (sin @)", text: $instagram)
                            campoEditable("¿Qué buscas en Ágora?", text: $busco)
                                .onChange(of: busco) { newValue in
                                    if newValue.count > 120 { busco = String(newValue.prefix(120)) }
                                }
                        }

                        Group {
                            seccionCumple
                            seccionIntereses
                            seccionVisibilidad
                            seccionComunidades
                            seccionNotificaciones
                            seccionApariencia
                            seccionContrasena
                        }

                        Group {
                            if let error {
                                Text(error).font(.footnote).foregroundStyle(AgoraDesign.Colors.danger)
                            }
                            if let aviso {
                                Text(aviso).font(.footnote).foregroundStyle(AgoraDesign.Colors.naranja)
                            }

                            Button {
                                Task { await guardar() }
                            } label: {
                                HStack {
                                    Spacer()
                                    if guardando { ProgressView().tint(.white) }
                                    else { Text("Guardar cambios").fontWeight(.semibold) }
                                    Spacer()
                                }
                                .padding(.vertical, 14)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(AgoraDesign.Colors.naranja)
                            .disabled(guardando)

                            seccionEliminarCuenta
                        }
                    }
                    .padding(AgoraDesign.Spacing.md)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Ajustes")
        .task { await cargar() }
        .onChange(of: selectedPhoto) { item in
            Task { await subirFoto(item) }
        }
        .onChange(of: selectedPortada) { item in
            Task { await subirPortada(item) }
        }
        .onChange(of: cumpleMes) { mes in
            guard mes >= 1, mes <= 12 else { return }
            if cumpleDia > diasPorMes[mes - 1] { cumpleDia = diasPorMes[mes - 1] }
        }
        .alert("¿Eliminar tu cuenta?", isPresented: $confirmandoBaja) {
            TextField(handle.isEmpty ? "ELIMINAR" : "@\(handle)", text: $confirmacionBaja)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button("Eliminar", role: .destructive) {
                Task { await eliminarCuenta() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text(handle.isEmpty
                ? "Para confirmar, escribe ELIMINAR. No se puede deshacer."
                : "Para confirmar, escribe tu usuario @\(handle). No se puede deshacer.")
        }
    }

    private var seccionEliminarCuenta: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Eliminar mi cuenta")
                .font(.headline)
                .foregroundStyle(AgoraDesign.Colors.danger)
            Text("Se borran tu perfil, tus publicaciones, comentarios, mensajes y tu actividad. No se puede deshacer.")
                .font(.footnote)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
            Button(role: .destructive) {
                confirmacionBaja = ""
                confirmandoBaja = true
            } label: {
                HStack {
                    Spacer()
                    if eliminando { ProgressView() } else { Text("Eliminar mi cuenta") }
                    Spacer()
                }
                .padding(.vertical, 12)
            }
            .buttonStyle(.bordered)
            .disabled(eliminando)
        }
        .padding(.top, AgoraDesign.Spacing.lg)
    }

    private func eliminarCuenta() async {
        let escrito = confirmacionBaja.trimmingCharacters(in: .whitespacesAndNewlines)
        let esperado = handle.isEmpty ? "ELIMINAR" : handle
        let limpio = escrito.hasPrefix("@") ? String(escrito.dropFirst()) : escrito
        guard limpio.caseInsensitiveCompare(esperado) == .orderedSame else {
            error = "La confirmación no coincide."
            return
        }
        eliminando = true
        error = nil
        defer { eliminando = false }
        do {
            try await AgoraApi.eliminarCuenta(confirmacion: escrito)
            AuthRepository.shared.logout()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private var seccionFoto: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Foto de perfil").font(.subheadline.bold())
            HStack(spacing: AgoraDesign.Spacing.md) {
                if let url = ApiClient.shared.resolveUrl(fotoUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                        default:
                            fotoPlaceholder
                        }
                    }
                    .frame(width: 72, height: 72)
                    .clipShape(Circle())
                } else {
                    fotoPlaceholder
                }

                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    Text(subiendoFoto ? "Subiendo…" : "Cambiar foto")
                }
                .buttonStyle(.bordered)
                .disabled(subiendoFoto)
            }
        }
    }

    private var seccionPortada: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Portada").font(.subheadline.bold())
            ZStack {
                if let url = ApiClient.shared.resolveUrl(portadaUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                        default:
                            AgoraDesign.Colors.naranjaSuave
                        }
                    }
                } else {
                    AgoraDesign.Colors.naranjaSuave
                        .overlay {
                            Text("Sin portada")
                                .font(.caption)
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        }
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 110)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))

            PhotosPicker(selection: $selectedPortada, matching: .images) {
                Text(subiendoPortada ? "Subiendo…" : "Cambiar portada")
            }
            .buttonStyle(.bordered)
            .disabled(subiendoPortada)
        }
    }

    private var seccionCumple: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Cumpleaños").font(.subheadline.bold())
            Text("Solo día y mes. Ese día se lo avisamos a tu gente.")
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
            HStack(spacing: AgoraDesign.Spacing.sm) {
                Picker("Mes", selection: $cumpleMes) {
                    Text("Mes").tag(0)
                    ForEach(1...12, id: \.self) { mes in
                        Text(nombresMes[mes - 1]).tag(mes)
                    }
                }
                .pickerStyle(.menu)

                Picker("Día", selection: $cumpleDia) {
                    Text("Día").tag(0)
                    ForEach(1...diasMesElegido, id: \.self) { dia in
                        Text("\(dia)").tag(dia)
                    }
                }
                .pickerStyle(.menu)

                if cumpleMes != 0 || cumpleDia != 0 {
                    Button("Quitar") {
                        cumpleMes = 0
                        cumpleDia = 0
                    }
                    .font(.caption)
                }
            }
        }
    }

    private var diasMesElegido: Int {
        guard cumpleMes >= 1, cumpleMes <= 12 else { return 31 }
        return diasPorMes[cumpleMes - 1]
    }

    private var seccionApariencia: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Apariencia")
                .font(.headline)
                .padding(.top, AgoraDesign.Spacing.xs)
            Picker("Apariencia", selection: $apariencia) {
                ForEach(AgoraTema.allCases) { tema in
                    Text(tema.etiqueta).tag(tema.rawValue)
                }
            }
            .pickerStyle(.segmented)
            Text("Se aplica al instante.")
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
        }
    }

    /// Tarjeta «Contraseña» (paridad con `componentes/seccion-contrasena.tsx`).
    /// Quien aún no tiene (cuenta de antes de las contraseñas) la crea aquí sin
    /// más trámite: su sesión ya prueba que el buzón es suyo. Quien tiene, la
    /// cambia dando la actual; la API cierra las otras sesiones.
    @ViewBuilder
    private var seccionContrasena: some View {
        if let tiene = tieneContrasena {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
                Text(AgoraCopy.ajustesContrasenaTitulo)
                    .font(.headline)
                    .padding(.top, AgoraDesign.Spacing.xs)
                Text(tiene ? AgoraCopy.ajustesContrasenaTiene : AgoraCopy.ajustesContrasenaNoTiene)
                    .font(.caption)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .fixedSize(horizontal: false, vertical: true)
                if contrasenaAbierta {
                    FormularioContrasena(
                        modo: tiene ? .cambiar : .crear,
                        enviar: { actual, nueva in
                            if tiene {
                                try await AuthRepository.shared.cambiarContrasena(actual: actual, nueva: nueva)
                            } else {
                                try await AuthRepository.shared.crearContrasena(nueva)
                            }
                        },
                        onListo: {
                            contrasenaAbierta = false
                            tieneContrasena = true
                            error = nil
                            aviso = tiene ? AgoraCopy.ajustesContrasenaCambiada : AgoraCopy.ajustesContrasenaCreada
                        },
                        textoBoton: tiene ? AgoraCopy.ajustesContrasenaCambiarBoton : nil
                    )
                    Button(AgoraCopy.ajustesContrasenaCancelar) {
                        contrasenaAbierta = false
                    }
                    .font(.footnote)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                } else {
                    AgoraOutlinedButton(
                        title: tiene ? AgoraCopy.ajustesContrasenaCambiar : AgoraCopy.ajustesContrasenaCrear,
                        action: { contrasenaAbierta = true }
                    )
                }
            }
        }
    }

    private var fotoPlaceholder: some View {
        Circle()
            .fill(AgoraDesign.Colors.naranjaSuave)
            .frame(width: 72, height: 72)
            .overlay { Text("?").font(.title2) }
    }

    private var seccionIntereses: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Intereses").font(.subheadline.bold())
            FlowWrapLayout(spacing: 8) {
                ForEach(intereses, id: \.self) { interes in
                    Button {
                        intereses.removeAll { $0 == interes }
                    } label: {
                        Text("\(interes) ×")
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(AgoraDesign.Colors.naranjaSuave)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            HStack {
                TextField("Agregar interés", text: $nuevoInteres)
                    .textFieldStyle(.roundedBorder)
                Button("+") { agregarInteres() }
                    .buttonStyle(.borderedProminent)
                    .tint(AgoraDesign.Colors.naranja)
            }
        }
    }

    private var seccionVisibilidad: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Quién ve tu perfil").font(.subheadline.bold())
            HStack(spacing: 8) {
                chipVisibilidad("Toda la UDLAP", valor: "UNIVERSIDAD")
                chipVisibilidad("Solo mis comunidades", valor: "COMUNIDADES")
            }
        }
    }

    private var seccionComunidades: some View {
        Group {
            if !comunidades.isEmpty {
                Text("Silenciar comunidades en el feed")
                    .font(.subheadline.bold())
                    .padding(.top, AgoraDesign.Spacing.xs)
                ForEach(comunidades, id: \.slug) { comunidad in
                    Toggle(comunidad.nombre, isOn: Binding(
                        get: { comunidad.estaSilenciada },
                        set: { nuevo in Task { await alternarSilencio(slug: comunidad.slug, silenciada: nuevo) } }
                    ))
                }
            }
        }
    }

    private var seccionNotificaciones: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
            Text("Notificaciones")
                .font(.headline)
                .padding(.top, AgoraDesign.Spacing.xs)
            Toggle(isOn: Binding(
                get: { avisoPregunta },
                set: { activo in Task { await guardarAvisoPregunta(activo) } }
            )) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("⚡ Avísame cuando caiga la pregunta")
                        .font(.subheadline.bold())
                    Text("Sale a una hora sorpresa; tienes 2 minutos para contestar a tiempo.")
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }
            }
            ForEach(preferencias.indices, id: \.self) { index in
                let pref = preferencias[index]
                VStack(alignment: .leading, spacing: 4) {
                    Text(etiquetasPreferencia[pref.tipo] ?? pref.tipo)
                        .font(.subheadline.bold())
                    Toggle("En la app", isOn: Binding(
                        get: { preferencias[index].inApp },
                        set: { checked in
                            var nuevas = preferencias
                            nuevas[index].inApp = checked
                            Task { await guardarPreferencias(nuevas) }
                        }
                    ))
                    Toggle("Push", isOn: Binding(
                        get: { preferencias[index].push },
                        set: { checked in
                            var nuevas = preferencias
                            nuevas[index].push = checked
                            Task { await guardarPreferencias(nuevas) }
                        }
                    ))
                }
            }
        }
    }

    private func campoSoloLectura(_ titulo: String, valor: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(titulo).font(.caption).foregroundStyle(AgoraDesign.Colors.textoMedio)
            Text(valor)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
        }
    }

    private func campoEditable(_ titulo: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(titulo).font(.caption).foregroundStyle(AgoraDesign.Colors.textoMedio)
            TextField(titulo, text: text)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func chipVisibilidad(_ etiqueta: String, valor: String) -> some View {
        Button {
            visibilidad = valor
        } label: {
            Text(etiqueta)
                .font(.caption)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(visibilidad == valor ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                .foregroundStyle(visibilidad == valor ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func agregarInteres() {
        let limpio = nuevoInteres.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !limpio.isEmpty, intereses.count < 10 else { return }
        guard !intereses.contains(where: { $0.caseInsensitiveCompare(limpio) == .orderedSame }) else {
            nuevoInteres = ""
            return
        }
        intereses.append(limpio)
        nuevoInteres = ""
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let perfil = try await AgoraApi.perfilMio()
            handle = perfil.handle
            nombre = perfil.nombre
            apellidos = perfil.apellidos
            bio = perfil.bio ?? ""
            ciudad = perfil.ciudadOrigen ?? ""
            instagram = perfil.instagram ?? ""
            busco = perfil.busco ?? ""
            intereses = perfil.intereses ?? []
            visibilidad = perfil.visibilidad ?? "UNIVERSIDAD"
            fotoUrl = perfil.fotoUrl
            portadaUrl = perfil.portadaUrl
            cumpleMes = perfil.cumpleMes ?? 0
            cumpleDia = perfil.cumpleDia ?? 0
            cumpleMesOriginal = cumpleMes
            cumpleDiaOriginal = cumpleDia
            avisoPregunta = perfil.avisoPregunta ?? true
            comunidades = try await AgoraApi.misComunidades()
            preferencias = try await AgoraApi.preferenciasNotificacion().preferencias ?? []
            generacion = try await AgoraApi.perfilPorHandle(perfil.handle).generacion
            // Aparte: si falla, el resto de Ajustes sigue sirviendo.
            tieneContrasena = (try? await AuthRepository.shared.yo())?.tieneContrasena
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func guardar() async {
        let cumpleCambio = cumpleMes != cumpleMesOriginal || cumpleDia != cumpleDiaOriginal
        if cumpleCambio && ((cumpleMes == 0) != (cumpleDia == 0)) {
            error = "El cumpleaños necesita mes y día."
            return
        }
        guardando = true
        error = nil
        aviso = nil
        defer { guardando = false }
        do {
            if cumpleCambio {
                try await AgoraApi.actualizarCumple(
                    mes: cumpleMes == 0 ? nil : cumpleMes,
                    dia: cumpleDia == 0 ? nil : cumpleDia
                )
                cumpleMesOriginal = cumpleMes
                cumpleDiaOriginal = cumpleDia
            }
            _ = try await AgoraApi.actualizarPerfil(
                ActualizarPerfilRequest(
                    bio: bio.trimmingCharacters(in: .whitespacesAndNewlines),
                    fotoMediaId: nil,
                    ciudadOrigen: ciudad.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : ciudad,
                    instagram: instagram.trimmingCharacters(in: .whitespacesAndNewlines)
                        .replacingOccurrences(of: "@", with: "").isEmpty
                        ? nil
                        : instagram.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "@", with: ""),
                    intereses: intereses,
                    busco: busco.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : busco,
                    visibilidad: visibilidad
                )
            )
            aviso = "Cambios guardados."
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func subirFoto(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        subiendoFoto = true
        error = nil
        defer { subiendoFoto = false }
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else { return }
            // Siempre JPEG: el servidor rechaza HEIC y así no viajan los metadatos EXIF.
            let subida = try await MediaRepository.subirFoto(data)
            let actualizado = try await AgoraApi.actualizarPerfil(
                ActualizarPerfilRequest(
                    bio: nil,
                    fotoMediaId: subida.id,
                    ciudadOrigen: nil,
                    instagram: nil,
                    intereses: nil,
                    busco: nil,
                    visibilidad: nil
                )
            )
            fotoUrl = actualizado?.fotoUrl ?? subida.url
            aviso = "Foto actualizada."
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func subirPortada(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        subiendoPortada = true
        error = nil
        defer { subiendoPortada = false }
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else { return }
            let subida = try await MediaRepository.subirFoto(data)
            let actualizado = try await AgoraApi.actualizarPerfil(
                ActualizarPerfilRequest(
                    bio: nil,
                    fotoMediaId: nil,
                    ciudadOrigen: nil,
                    instagram: nil,
                    intereses: nil,
                    busco: nil,
                    visibilidad: nil,
                    portadaMediaId: subida.id
                )
            )
            portadaUrl = actualizado?.portadaUrl ?? subida.url
            aviso = "Portada actualizada."
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func guardarAvisoPregunta(_ activo: Bool) async {
        let antes = avisoPregunta
        avisoPregunta = activo
        do {
            try await AgoraApi.actualizarAvisoPregunta(activo)
        } catch {
            avisoPregunta = antes
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func guardarPreferencias(_ nuevas: [PreferenciaNotificacionDto]) async {
        preferencias = nuevas
        do {
            let resp = try await AgoraApi.actualizarPreferenciasNotificacion(
                ActualizarPreferenciasRequest(preferencias: nuevas)
            )
            preferencias = resp.preferencias ?? nuevas
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func alternarSilencio(slug: String, silenciada: Bool) async {
        do {
            let actualizada = try await AgoraApi.silenciarComunidad(slug: slug, silenciada: silenciada)
            comunidades = comunidades.map {
                $0.slug == slug
                    ? ComunidadDto(slug: actualizada.slug, nombre: actualizada.nombre, silenciada: silenciada)
                    : $0
            }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

/// Layout de chips reutilizable en ajustes.
private struct FlowWrapLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY),
                proposal: ProposedViewSize(frame.size)
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var frames: [CGRect] = []
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            frames.append(CGRect(origin: CGPoint(x: x, y: y), size: size))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return (CGSize(width: maxWidth, height: y + rowHeight), frames)
    }
}
