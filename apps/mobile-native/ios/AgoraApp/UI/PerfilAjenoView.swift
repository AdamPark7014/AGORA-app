import SwiftUI

/// Perfil de otro usuario — paridad con `PerfilAjenoScreen.kt`.
struct PerfilAjenoView: View {
    let handle: String
    var miHandle: String?
    var onMensaje: (String) -> Void = { _ in }
    var onAjustes: () -> Void = {}
    var onPostTap: (String) -> Void = { _ in }
    var onSeguidores: (String) -> Void = { _ in }
    var onSiguiendo: (String) -> Void = { _ in }

    @State private var perfil: PerfilAjenoDto?
    @State private var gamificacion: GamificacionDto?
    @State private var publicaciones: [PerfilPublicacionDto] = []
    @State private var cursor: String?
    @State private var siguiendo = false
    @State private var bloqueado = false
    /// Silenciado: no ves sus publicaciones y no se le avisa.
    @State private var silenciado = false
    @State private var cargando = true
    @State private var ocupado = false
    @State private var error: String?
    @State private var puedeRetar = false
    @State private var mostrarSheetRetar = false
    @State private var enviandoReto = false
    @State private var mostrarExitoReto = false

    private var esMio: Bool { miHandle == handle }

    var body: some View {
        Group {
            if cargando {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if error != nil, perfil == nil {
                AgoraErrorState(message: error ?? "No encontrado.") { }
            } else if let perfil {
                ScrollView {
                    VStack(spacing: AgoraDesign.Spacing.sm) {
                        tarjetaPerfil(perfil)
                        if perfil.restringido != true {
                            seccionPublicaciones
                        }
                    }
                    .padding(AgoraDesign.Spacing.sm)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("@\(handle)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if let url = EnlacesWeb.perfil(handle) {
                    ShareLink(item: url) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Compartir perfil")
                }
            }
        }
        .refreshable { await cargar() }
        .task(id: handle) { await cargar() }
        .sheet(isPresented: $mostrarSheetRetar) {
            sheetElegirTipoReto
        }
        .alert("Reto enviado. A ver si le entra.", isPresented: $mostrarExitoReto) {
            Button("OK", role: .cancel) { }
        }
    }

    @ViewBuilder
    private func tarjetaPerfil(_ p: PerfilAjenoDto) -> some View {
        let nombreCompleto = "\(p.nombre) \(p.apellidos)".trimmingCharacters(in: .whitespaces)

        VStack(spacing: AgoraDesign.Spacing.xs) {
            Group {
                if let portada = ApiClient.shared.resolveUrl(p.portadaUrl) {
                    AsyncImage(url: portada) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                        default:
                            AgoraDesign.Colors.naranjaSuave
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 110)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
                }
                fotoPerfil(nombre: nombreCompleto, url: p.fotoUrl)

                Text("\(nombreCompleto)\(p.verificado == true ? " ✓" : "")")
                    .font(.title2.bold())
                Text("@\(p.handle)")
                    .font(.subheadline)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)

                if let bio = p.bio, !bio.isEmpty {
                    Text(bio)
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .padding(.top, 4)
                }

                if let carrera = p.carrera, !carrera.isEmpty {
                    Text("\(p.escuela ?? "") · \(carrera)".trimmingCharacters(in: CharacterSet(charactersIn: " ·")))
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }

                if let ciudad = p.ciudadOrigen {
                    Text("📍 \(ciudad)").font(.caption)
                }
                if let ig = p.instagram {
                    Text("📷 @\(ig)").font(.caption)
                }
            }

            HStack(spacing: AgoraDesign.Spacing.md) {
                Text("\(p.publicaciones ?? 0) posts").font(.caption)
                Button {
                    onSeguidores(p.handle)
                } label: {
                    Text("\(p.seguidores ?? 0) seguidores").font(.caption)
                }
                .buttonStyle(.agoraPlain)
                .disabled(p.restringido == true)
                Button {
                    onSiguiendo(p.handle)
                } label: {
                    Text("\(p.siguiendo ?? 0) siguiendo").font(.caption)
                }
                .buttonStyle(.agoraPlain)
                .disabled(p.restringido == true)
            }
            .foregroundStyle(AgoraDesign.Colors.textoMedio)

            GamificacionPublicSection(gamificacion: gamificacion)
                .padding(.top, AgoraDesign.Spacing.xs)

            if p.restringido == true {
                Text("Este perfil es privado o no compartís comunidades.")
                    .font(.subheadline)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .multilineTextAlignment(.center)
                    .padding(.top, AgoraDesign.Spacing.xs)
            } else if esMio {
                Button("Editar perfil", action: onAjustes)
                    .buttonStyle(.bordered)
                    .padding(.top, AgoraDesign.Spacing.xs)
            } else {
                HStack(spacing: 10) {
                    Button {
                        Task { await alternarSeguir() }
                    } label: {
                        Text(siguiendo ? "✓ Siguiendo" : "＋ Seguir")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AgoraDesign.Colors.naranja)
                    .disabled(ocupado || bloqueado)

                    Button {
                        Task { await escribir() }
                    } label: {
                        Text("Escribirle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(ocupado || bloqueado)
                }
                .padding(.top, AgoraDesign.Spacing.xs)

                if puedeRetar {
                    Button {
                        mostrarSheetRetar = true
                    } label: {
                        Text("Retar 🔥")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(ocupado || enviandoReto)
                    .padding(.top, 4)
                }

                HStack(spacing: 10) {
                    Button {
                        Task { await alternarSilencio() }
                    } label: {
                        Text(silenciado ? "Dejar de silenciar" : "Silenciar")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(ocupado || bloqueado)

                    Button {
                        Task { await alternarBloqueo() }
                    } label: {
                        Text(bloqueado ? "Desbloquear" : "Bloquear")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(ocupado)
                }
                .padding(.top, 4)

                if silenciado {
                    Text("Silenciado: no verás sus publicaciones. No se le avisa.")
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .multilineTextAlignment(.center)
                }
            }

            if let intereses = p.intereses, !intereses.isEmpty {
                FlowWrapLayout(spacing: 8) {
                    ForEach(intereses, id: \.self) { interes in
                        Text(interes)
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(AgoraDesign.Colors.naranjaSuave)
                            .clipShape(Capsule())
                    }
                }
                .padding(.top, AgoraDesign.Spacing.xs)
            }

            if let error {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(AgoraDesign.Colors.danger)
            }
        }
        .padding(AgoraDesign.Spacing.md)
        .frame(maxWidth: .infinity)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
    }

    private var sheetElegirTipoReto: some View {
        NavigationStack {
            VStack(spacing: AgoraDesign.Spacing.md) {
                Text("¿A qué le entramos?")
                    .font(.headline)
                    .padding(.top, AgoraDesign.Spacing.sm)

                Button {
                    Task { await enviarReto(tipo: "RACHA") }
                } label: {
                    VStack(spacing: 4) {
                        Text("🔥 Racha diaria")
                            .font(.subheadline.bold())
                        Text("Quien mantenga más días seguidos gana.")
                            .font(.caption)
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(AgoraDesign.Colors.fondo)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
                }
                .buttonStyle(.agoraPlain)
                .disabled(enviandoReto)

                Button {
                    Task { await enviarReto(tipo: "SEMANA_PREGUNTA") }
                } label: {
                    VStack(spacing: 4) {
                        Text("🧠 Semana de preguntas")
                            .font(.subheadline.bold())
                        Text("Quien responda más preguntas del día gana.")
                            .font(.caption)
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(AgoraDesign.Colors.fondo)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
                }
                .buttonStyle(.agoraPlain)
                .disabled(enviandoReto)

                if enviandoReto {
                    ProgressView()
                }

                Spacer()
            }
            .padding(AgoraDesign.Spacing.md)
            .background(AgoraDesign.Colors.fondo)
            .navigationTitle("Retar a @\(handle)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        mostrarSheetRetar = false
                    }
                    .disabled(enviandoReto)
                }
            }
        }
        .presentationDetents([.medium])
    }

    @ViewBuilder
    private var seccionPublicaciones: some View {
        Text("Publicaciones")
            .font(.subheadline.bold())
            .frame(maxWidth: .infinity, alignment: .leading)

        if publicaciones.isEmpty {
            AgoraEmptyState(
                emoji: "📷",
                title: AgoraCopy.perfilPublicacionesEmptyTitle,
                subtitle: AgoraCopy.perfilPublicacionesEmptySubtitle
            )
        }

        ForEach(publicaciones) { pub in
            Button {
                onPostTap(pub.id)
            } label: {
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(FormatUtils.haceCuanto(pub.createdAt)) · \(pub.comunidad)")
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    Text(pub.texto)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .lineLimit(4)
                        .multilineTextAlignment(.leading)
                    Text("\(pub.numReactions ?? 0) reacciones · \(pub.numComments ?? 0) comentarios")
                        .font(.caption.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                }
                .padding(AgoraDesign.Spacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
            }
            .buttonStyle(.agoraPlain)
        }

        if cursor != nil {
            Button("Cargar más") {
                Task { await cargarMas() }
            }
            .buttonStyle(.bordered)
            .frame(maxWidth: .infinity)
        }
    }

    @ViewBuilder
    private func fotoPerfil(nombre: String, url: String?) -> some View {
        if let imageUrl = ApiClient.shared.resolveUrl(url) {
            AsyncImage(url: imageUrl) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    avatarPlaceholder(nombre: nombre)
                }
            }
            .frame(width: 76, height: 76)
            .clipShape(Circle())
        } else {
            avatarPlaceholder(nombre: nombre)
                .frame(width: 76, height: 76)
        }
    }

    private func avatarPlaceholder(nombre: String) -> some View {
        Circle()
            .fill(AgoraDesign.Colors.naranjaSuave)
            .overlay {
                Text(inicialesDe(nombre: nombre))
                    .font(.title2.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
    }

    private func cargar() async {
        cargando = perfil == nil
        error = nil
        defer { cargando = false }
        do {
            let datos = try await AgoraApi.perfilPorHandle(handle)
            perfil = datos
            siguiendo = datos.yoLeSigo ?? false
            if let miHandle, miHandle != handle {
                let estado = try? await AgoraApi.estadoBloqueo(handle: handle)
                bloqueado = estado?.bloqueado ?? false
                silenciado = estado?.silenciado ?? false
            }
            if datos.restringido != true {
                let pubs = try await AgoraApi.publicacionesPerfil(handle: handle)
                publicaciones = pubs.publicaciones ?? []
                cursor = pubs.siguienteCursor
            } else {
                publicaciones = []
                cursor = nil
            }
            gamificacion = try? await AgoraApi.gamificacionPorHandle(handle)
            if !esMio, datos.restringido != true {
                puedeRetar = (try? await AgoraApi.retosPuede(handle: handle).puedeRetar) ?? false
            } else {
                puedeRetar = false
            }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func alternarSeguir() async {
        ocupado = true
        let era = siguiendo
        siguiendo.toggle()
        defer { ocupado = false }
        do {
            let resp = try await AgoraApi.seguir(handle: handle)
            siguiendo = resp.siguiendo
        } catch {
            siguiendo = era
        }
    }

    private func alternarBloqueo() async {
        ocupado = true
        error = nil
        defer { ocupado = false }
        do {
            if bloqueado {
                try await AgoraApi.desbloquear(handle: handle)
                bloqueado = false
            } else {
                let resp = try await AgoraApi.bloquear(handle: handle)
                bloqueado = resp.bloqueado
                silenciado = resp.silenciado ?? false
            }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    /// `POST bloqueos/:handle` con `soloSilencio: true`; quitarlo es `DELETE`.
    private func alternarSilencio() async {
        ocupado = true
        error = nil
        defer { ocupado = false }
        do {
            if silenciado {
                try await AgoraApi.desbloquear(handle: handle)
                silenciado = false
            } else {
                let resp = try await AgoraApi.bloquear(handle: handle, soloSilencio: true)
                silenciado = resp.silenciado ?? true
                bloqueado = resp.bloqueado
            }
            Haptics.toggle()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func escribir() async {
        ocupado = true
        error = nil
        defer { ocupado = false }
        do {
            let resp = try await AgoraApi.abrirConversacion(handle: handle)
            onMensaje(resp.id)
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func cargarMas() async {
        guard let cursor else { return }
        do {
            let pubs = try await AgoraApi.publicacionesPerfil(handle: handle, cursor: cursor)
            publicaciones += pubs.publicaciones ?? []
            self.cursor = pubs.siguienteCursor
        } catch {
            // Silencioso.
        }
    }

    private func enviarReto(tipo: String) async {
        enviandoReto = true
        error = nil
        defer { enviandoReto = false }
        do {
            _ = try await AgoraApi.crearReto(retadoHandle: handle, tipo: tipo)
            mostrarSheetRetar = false
            puedeRetar = false
            mostrarExitoReto = true
            Haptics.success()
            GamificacionEvents.notifyPingResult(nuevas: [])
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

private func inicialesDe(nombre: String) -> String {
    nombre.split(separator: " ")
        .prefix(2)
        .compactMap { $0.first.map { String($0).uppercased() } }
        .joined()
}

/// Layout simple para chips de intereses.
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
