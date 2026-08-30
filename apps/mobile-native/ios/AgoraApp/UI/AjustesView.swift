import SwiftUI
import PhotosUI
import UIKit

private let etiquetasPreferencia: [String: String] = [
    "COMENTARIO": "Comentarios",
    "REACCION": "Reacciones",
    "MENSAJE": "Mensajes",
    "EVENTO_NUEVO": "Eventos nuevos",
    "AVENTON_APARTADO": "Aventones",
    "MODERACION": "Moderación",
    "MENCION": "Menciones",
    "SEGUIDOR": "Nuevos seguidores",
    "INSIGNIA": "Insignias",
    "RETO": "Retos y duelos",
]

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
    @State private var cargando = true
    @State private var guardando = false
    @State private var subiendoFoto = false
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var error: String?
    @State private var aviso: String?

    var body: some View {
        Group {
            if cargando {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                        Text("@\(handle)")
                            .font(.title3.bold())
                            .foregroundStyle(AgoraDesign.Colors.naranja)

                        seccionFoto
                        campoSoloLectura("Nombre", valor: nombre)
                        campoSoloLectura("Apellidos", valor: apellidos)
                        if let generacion {
                            campoSoloLectura("Generación", valor: "Generación \(generacion)")
                        }

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

                        seccionIntereses
                        seccionVisibilidad
                        seccionComunidades
                        seccionNotificaciones

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
            comunidades = try await AgoraApi.misComunidades()
            preferencias = try await AgoraApi.preferenciasNotificacion().preferencias ?? []
            generacion = try await AgoraApi.perfilPorHandle(perfil.handle).generacion
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func guardar() async {
        guardando = true
        error = nil
        aviso = nil
        defer { guardando = false }
        do {
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
            let subida = try await MediaRepository.subir(imageData: data)
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
            fotoUrl = actualizado.fotoUrl ?? subida.url
            aviso = "Foto actualizada."
        } catch {
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
