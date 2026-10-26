import SwiftUI

struct PostCardView: View {
    let post: PostDto
    var onTap: (() -> Void)?
    var onAuthorTap: (() -> Void)?
    var onHashtagTap: ((String) -> Void)?
    /// Toque en una @mención del texto (handle sin arroba).
    var onMencionTap: ((String) -> Void)?
    /// La publicación se borró o se retiró: el contenedor puede quitarla de la lista.
    var onEliminado: ((String) -> Void)?

    @ObservedObject private var session = SessionStore.shared

    @State private var miReaccion: String?
    @State private var totalReacciones = 0
    @State private var conteos: [String: Int] = [:]
    @State private var encuesta: EncuestaDto?
    @State private var votando = false
    @State private var heartTrigger = 0
    @State private var eligiendoMotivo = false
    @State private var avisoReporte: String?
    @State private var textoEditado: String?
    @State private var editando = false
    @State private var confirmandoBorrar = false
    @State private var retirando = false
    @State private var motivoRetiro = ""
    @State private var eliminado = false

    private var texto: String { textoEditado ?? post.texto }
    private var esAnonimo: Bool { post.anonimo == true }
    private var esMia: Bool {
        PublicacionPermisos.esMia(
            autorHandle: post.autor?.handle,
            anonimo: post.anonimo,
            miHandle: session.currentUser?.handle
        )
    }
    private var puedeRetirar: Bool {
        session.currentUser?.puedeModerar == true && !esMia
    }

    var body: some View {
        Group {
            if eliminado {
                Text("Publicación eliminada.")
                    .font(.footnote)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(AgoraDesign.Spacing.sm + 2)
                    .background(AgoraDesign.Colors.superficie)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
            } else {
                tarjeta
            }
        }
        .onAppear {
            sincronizarEstado()
            encuesta = post.encuesta
        }
        .onChange(of: post.id) { _ in
            sincronizarEstado()
            encuesta = post.encuesta
            textoEditado = nil
            eliminado = false
        }
    }

    private var nombreVisible: String {
        esAnonimo ? (post.alias ?? "Sin nombre") : (post.autor?.nombre ?? "Usuario")
    }

    /// Diseño D (docs/diseno-d.md §3): banda de comunidad → autor → texto → fotos con esquinas →
    /// chips de reacción con número → comentarios y acciones.
    private var tarjeta: some View {
        VStack(alignment: .leading, spacing: 0) {
            bandaComunidad

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Button {
                        onAuthorTap?()
                    } label: {
                        HStack(spacing: 10) {
                            avatar
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 4) {
                                    Text(nombreVisible)
                                        .font(.subheadline.bold())
                                        .foregroundStyle(AgoraDesign.Colors.texto)
                                        .lineLimit(1)
                                    if post.autor?.verificado == true {
                                        Image(systemName: "checkmark.seal.fill")
                                            .font(.caption2)
                                            .foregroundStyle(AgoraDesign.Colors.naranja)
                                            .accessibilityLabel("Verificado")
                                    }
                                }
                                Text(
                                    [post.autor?.handle.map { "@\($0)" }, FormatUtils.haceCuanto(post.createdAt)]
                                        .compactMap { $0 }
                                        .joined(separator: " · ")
                                )
                                .font(.caption)
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                                .lineLimit(1)
                            }
                        }
                    }
                    .buttonStyle(.agoraPlain)
                    .disabled(onAuthorTap == nil || esAnonimo)

                    Spacer(minLength: 0)
                    menuOpciones
                }

                if !texto.isEmpty {
                    if let onHashtagTap {
                        TextoConHashtags(
                            texto: texto,
                            onHashtagTap: onHashtagTap,
                            onBackgroundTap: onTap,
                            onMencionTap: onMencionTap
                        )
                    } else {
                        Button {
                            onTap?()
                        } label: {
                            Text(texto)
                                .font(.body)
                                .foregroundStyle(AgoraDesign.Colors.texto)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.agoraPlain)
                    }
                }

                if let media = post.media, !media.isEmpty {
                    ZStack {
                        PostMediaCarousel(
                            media: media,
                            altura: 230,
                            onToque: onTap,
                            onDobleToque: {
                                heartTrigger += 1
                                Task { await reaccionar("ME_LATE") }
                            }
                        )
                        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.foto))

                        if heartTrigger > 0 {
                            FloatingHeartOverlay()
                                .id(heartTrigger)
                                .allowsHitTesting(false)
                        }
                    }
                    .padding(.horizontal, -4)
                }

                if let encuesta {
                    EncuestaBloque(
                        encuesta: encuesta,
                        onVotar: { opcionId in Task { await votar(opcionId: opcionId) } },
                        votando: votando
                    )
                }

                ReaccionesRow(
                    miReaccion: miReaccion,
                    totalReacciones: totalReacciones,
                    numComments: post.numComments ?? 0,
                    conteos: conteos,
                    onReaccionar: { tipo in Task { await reaccionar(tipo) } },
                    onCommentsTap: onTap
                )
                .padding(.top, 2)

                pie
            }
            .padding(.leading, 16)
            .padding(.trailing, 8)
            .padding(.top, 12)
            .padding(.bottom, 4)
        }
        .confirmationDialog("¿Por qué la reportas?", isPresented: $eligiendoMotivo, titleVisibility: .visible) {
            ForEach(motivosReporte) { motivo in
                Button(motivo.etiqueta) {
                    Task { await reportar(motivo.id) }
                }
            }
            Button("Cancelar", role: .cancel) {}
        }
        .confirmationDialog("¿Borrar esta publicación?", isPresented: $confirmandoBorrar, titleVisibility: .visible) {
            Button("Borrar", role: .destructive) {
                Task { await borrar() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("No se puede deshacer.")
        }
        .alert("Retirar publicación", isPresented: $retirando) {
            TextField("Motivo (lo verá el autor)", text: $motivoRetiro)
            Button("Retirar", role: .destructive) {
                Task { await retirar() }
            }
            Button("Cancelar", role: .cancel) {
                motivoRetiro = ""
            }
        } message: {
            Text("Escribe el motivo: mínimo 3 caracteres.")
        }
        .alert(
            avisoReporte ?? "",
            isPresented: Binding(
                get: { avisoReporte != nil },
                set: { if !$0 { avisoReporte = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        }
        .sheet(isPresented: $editando) {
            EditarPublicacionSheet(postId: post.id, textoInicial: texto) { nuevo, aviso in
                textoEditado = nuevo
                if let aviso, !aviso.isEmpty {
                    avisoReporte = aviso
                }
            }
        }
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
        }
    }

    /// La comunidad manda (docs/diseno-d.md §1): dónde se dijo algo va antes que quién.
    private var bandaComunidad: some View {
        HStack(spacing: 8) {
            Image(systemName: iconoComunidad)
                .font(.caption.weight(.semibold))
                .accessibilityHidden(true)
            Text(post.comunidad.nombre.uppercased())
                .font(.caption.weight(.bold))
                .tracking(0.6)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
        .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
        .padding(.horizontal, 16)
        .padding(.vertical, 9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AgoraDesign.Colors.naranjaSuave)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("En \(post.comunidad.nombre)")
    }

    /// Ícono por tipo de comunidad: el slug empieza con el tipo (`carrera:`, `generacion:`…).
    private var iconoComunidad: String {
        switch post.comunidad.slug.split(separator: ":").first.map(String.init) ?? "" {
        case "carrera": return "graduationcap"
        case "generacion": return "person.2"
        case "colegio": return "house"
        case "escuela", "departamento": return "building.2"
        default: return "building.columns"
        }
    }

    private var pie: some View {
        let comentarios = post.numComments ?? 0
        return HStack(spacing: 0) {
            if comentarios > 0 {
                Button {
                    onTap?()
                } label: {
                    Text("\(comentarios) \(comentarios == 1 ? "comentario" : "comentarios")")
                        .font(.footnote)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }
                .buttonStyle(.agoraPlain)
                .disabled(onTap == nil)
            }
            Spacer(minLength: 0)
            if onTap != nil {
                Button {
                    onTap?()
                } label: {
                    Image(systemName: "bubble.left")
                        .font(.body)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.agoraPlain)
                .accessibilityLabel("Comentar")
            }
            if let url = EnlacesWeb.publicacion(post.id) {
                ShareLink(item: url) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.body)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Compartir")
            }
            GuardarButton(postId: post.id, guardado: post.miGuardado ?? false)
                .frame(width: 44, height: 44)
        }
    }

    private var menuOpciones: some View {
        Menu {
            if esMia {
                Button {
                    editando = true
                } label: {
                    Label("Editar", systemImage: "pencil")
                }
                Button(role: .destructive) {
                    confirmandoBorrar = true
                } label: {
                    Label("Borrar", systemImage: "trash")
                }
            } else {
                Button(role: .destructive) {
                    eligiendoMotivo = true
                } label: {
                    Label("Reportar", systemImage: "flag")
                }
            }
            if puedeRetirar {
                Button(role: .destructive) {
                    motivoRetiro = ""
                    retirando = true
                } label: {
                    Label("Retirar (moderación)", systemImage: "shield.lefthalf.filled")
                }
            }
        } label: {
            Image(systemName: "ellipsis")
                .font(.subheadline)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Más opciones")
    }

    @ViewBuilder
    private var avatar: some View {
        if !esAnonimo, let url = ApiClient.shared.resolveUrl(post.autor?.fotoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    avatarPlaceholder
                }
            }
            .frame(width: 40, height: 40)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.avatar))
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        RoundedRectangle(cornerRadius: AgoraDesign.Radii.avatar)
            .fill(esAnonimo ? AgoraDesign.Colors.superficie2 : AgoraDesign.Colors.naranjaSuave)
            .frame(width: 40, height: 40)
            .overlay {
                if esAnonimo {
                    Image(systemName: "theatermasks")
                        .font(.subheadline)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                } else {
                    Text(String((post.autor?.nombre ?? "?").prefix(1)).uppercased())
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                }
            }
    }

    private func sincronizarEstado() {
        miReaccion = post.miReaccion
        totalReacciones = post.numReactions ?? 0
        conteos = post.reacciones ?? [:]
    }

    private func votar(opcionId: String) async {
        guard !votando else { return }
        votando = true
        defer { votando = false }
        Haptics.toggle()
        do {
            let resp = try await AgoraApi.votarEncuesta(postId: post.id, opcionId: opcionId)
            if let opts = resp.opciones, let pregunta = encuesta?.pregunta {
                encuesta = EncuestaDto(pregunta: pregunta, opciones: opts)
            }
            Haptics.success()
        } catch {
            // Silencioso.
        }
    }

    private func reportar(_ motivo: String) async {
        do {
            try await AgoraApi.reportar(postId: post.id, motivo: motivo)
            avisoReporte = "Gracias. Un moderador lo revisará."
        } catch {
            avisoReporte = FormatUtils.mensajeDe(error)
        }
    }

    private func borrar() async {
        do {
            try await AgoraApi.borrarPost(id: post.id)
            Haptics.success()
            eliminado = true
            onEliminado?(post.id)
        } catch {
            avisoReporte = FormatUtils.mensajeDe(error)
        }
    }

    private func retirar() async {
        let motivo = motivoRetiro.trimmingCharacters(in: .whitespacesAndNewlines)
        guard motivo.count >= 3 else {
            avisoReporte = "Escribe el motivo (mínimo 3 caracteres)."
            return
        }
        do {
            try await AgoraApi.retirarPost(id: post.id, motivo: motivo)
            motivoRetiro = ""
            eliminado = true
            onEliminado?(post.id)
        } catch {
            avisoReporte = FormatUtils.mensajeDe(error)
        }
    }

    private func reaccionar(_ tipo: String) async {
        Haptics.toggle()
        let activa = miReaccion == tipo
        let anterior = miReaccion
        let totalAnterior = totalReacciones
        let conteosAnteriores = conteos
        miReaccion = activa ? nil : tipo
        totalReacciones += activa ? -1 : (anterior != nil ? 0 : 1)
        // Solo si la ruta mandó los conteos por tipo: si no, se inventarían números.
        if post.reacciones != nil {
            conteos = moverReaccion(conteos, de: anterior, a: miReaccion)
        }
        do {
            let resp = try await AgoraApi.reaccionar(postId: post.id, tipo: tipo)
            miReaccion = resp.miReaccion
        } catch {
            miReaccion = anterior
            totalReacciones = totalAnterior
            conteos = conteosAnteriores
        }
    }
}

private struct FloatingHeartOverlay: View {
    @State private var scale: CGFloat = 0.4
    @State private var opacity: Double = 1

    var body: some View {
        Image(systemName: "heart.fill")
            .font(.system(size: 44))
            .foregroundStyle(AgoraDesign.Colors.naranja)
            .scaleEffect(scale)
            .opacity(opacity)
            .onAppear {
                withAnimation(.easeOut(duration: 0.25)) {
                    scale = 1.4
                }
                withAnimation(.easeOut(duration: 0.55).delay(0.25)) {
                    opacity = 0
                }
            }
    }
}
