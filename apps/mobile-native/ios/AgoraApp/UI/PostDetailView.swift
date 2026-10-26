import SwiftUI

/// Detalle de publicación con reacciones, comentarios y guardar — paridad con `PostDetailScreen.kt`.
struct PostDetailView: View {
    let postId: String
    var onAuthorTap: ((String) -> Void)?
    var onHashtagTap: ((String) -> Void)?
    /// Se llama tras borrar o retirar la publicación (el contenedor hace pop).
    var onEliminado: (() -> Void)?

    @ObservedObject private var session = SessionStore.shared

    @State private var post: PostDetalleDto?
    @State private var cargando = true
    @State private var error: String?
    @State private var miReaccion: String?
    @State private var totalReacciones = 0
    @State private var conteos: [String: Int] = [:]
    @State private var guardado = false
    @State private var textoComentario = ""
    @State private var encuesta: EncuestaDto?
    @State private var votando = false
    @State private var heartTrigger = 0
    @State private var textoEditado: String?
    @State private var editando = false
    @State private var confirmandoBorrar = false
    @State private var eligiendoMotivo = false
    @State private var retirando = false
    @State private var motivoRetiro = ""
    @State private var aviso: String?
    /// Comentarios mostrados: los 50 recientes del detalle más las páginas previas.
    @State private var comentarios: [ComentarioDto] = []
    /// `comentariosAnteriores` de la API: id para `antesDe`; nil = no hay más.
    @State private var cursorAnteriores: String?
    @State private var cargandoAnteriores = false

    private var esMia: Bool {
        guard let post else { return false }
        return PublicacionPermisos.esMia(
            autorHandle: post.autor?.handle,
            anonimo: post.anonimo,
            miHandle: session.currentUser?.handle
        )
    }

    var body: some View {
        Group {
            if cargando {
                ProgressView()
            } else if let error, post == nil {
                AgoraErrorState(message: error) {
                    Task { await cargar() }
                }
            } else if let post {
                contenido(post)
            } else {
                AgoraEmptyState(
                    emoji: "📄",
                    title: "Publicación",
                    subtitle: "No encontrada."
                )
            }
        }
        .agoraScreenBackground()
        .navigationTitle("Publicación")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if post != nil {
                    menuOpciones
                }
            }
        }
        .refreshable { await cargar() }
        .task(id: postId) { await cargar() }
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
            aviso ?? "",
            isPresented: Binding(
                get: { aviso != nil },
                set: { if !$0 { aviso = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        }
        .sheet(isPresented: $editando) {
            EditarPublicacionSheet(postId: postId, textoInicial: textoEditado ?? post?.texto ?? "") { nuevo, avisoModeracion in
                textoEditado = nuevo
                if let avisoModeracion, !avisoModeracion.isEmpty {
                    aviso = avisoModeracion
                }
            }
        }
    }

    private func contenido(_ post: PostDetalleDto) -> some View {
        let texto = textoEditado ?? post.texto
        let esAnonimo = post.anonimo == true
        return ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                HStack(spacing: AgoraDesign.Spacing.xs) {
                    Button {
                        if let handle = post.autor?.handle { onAuthorTap?(handle) }
                    } label: {
                        Text(esAnonimo ? (post.alias ?? "Sin nombre") : (post.autor?.nombre ?? "Alguien"))
                            .font(.headline)
                            .foregroundStyle(AgoraDesign.Colors.texto)
                    }
                    .buttonStyle(.agoraPlain)
                    .disabled(onAuthorTap == nil || post.autor?.handle == nil)
                    Text("· \(post.comunidad.nombre) · \(FormatUtils.haceCuanto(post.createdAt))")
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }

                if !texto.isEmpty {
                    if let onHashtagTap {
                        TextoConHashtags(
                            texto: texto,
                            onHashtagTap: onHashtagTap,
                            onMencionTap: onAuthorTap
                        )
                    } else {
                        Text(texto)
                            .font(.body)
                            .foregroundStyle(AgoraDesign.Colors.texto)
                    }
                }

                if let media = post.media, !media.isEmpty {
                    ZStack {
                        PostMediaCarousel(
                            media: media,
                            altura: 260,
                            onToque: nil,
                            onDobleToque: {
                                heartTrigger += 1
                                Task { await reaccionar("ME_LATE") }
                            }
                        )

                        if heartTrigger > 0 {
                            FloatingHeartOverlay()
                                .id(heartTrigger)
                                .allowsHitTesting(false)
                        }
                    }
                }

                if let encuesta {
                    EncuestaBloque(
                        encuesta: encuesta,
                        onVotar: { opcionId in Task { await votar(opcionId: opcionId) } },
                        votando: votando
                    )
                }

                HStack(alignment: .bottom) {
                    ReaccionesRow(
                        miReaccion: miReaccion,
                        totalReacciones: totalReacciones,
                        numComments: post.numComments ?? 0,
                        conteos: conteos,
                        onReaccionar: { tipo in Task { await reaccionar(tipo) } }
                    )
                    Spacer()
                    GuardarButton(postId: postId, guardado: guardado) { nuevo in
                        guardado = nuevo
                    }
                }

                // Agrupado: en iOS 16 un ViewBuilder admite como máximo 10 hijos por bloque.
                Group {
                    Text("Comentarios")
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .padding(.top, AgoraDesign.Spacing.xs)

                    if cursorAnteriores != nil {
                        Button {
                            Task { await verAnteriores() }
                        } label: {
                            HStack(spacing: AgoraDesign.Spacing.xs) {
                                if cargandoAnteriores {
                                    ProgressView()
                                }
                                Text(cargandoAnteriores ? "Cargando…" : "Ver comentarios anteriores")
                                    .font(.subheadline)
                            }
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, AgoraDesign.Spacing.xs)
                        }
                        .buttonStyle(.agoraPlain)
                        .disabled(cargandoAnteriores)
                    }

                    ForEach(comentarios) { comentario in
                        ComentarioRowView(comentario: comentario)
                    }
                }

                TextField("Escribe un comentario…", text: $textoComentario, axis: .vertical)
                    .lineLimit(2...4)
                    .textFieldStyle(.roundedBorder)

                Button {
                    Task { await comentar() }
                } label: {
                    Text("Comentar")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(AgoraDesign.Colors.naranja)
                .disabled(textoComentario.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                if let error {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(AgoraDesign.Colors.danger)
                }
            }
            .padding(AgoraDesign.Spacing.md)
        }
    }

    private var menuOpciones: some View {
        Menu {
            if let url = EnlacesWeb.publicacion(postId) {
                ShareLink(item: url) {
                    Label("Compartir", systemImage: "square.and.arrow.up")
                }
            }
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
            if session.currentUser?.puedeModerar == true && !esMia {
                Button(role: .destructive) {
                    motivoRetiro = ""
                    retirando = true
                } label: {
                    Label("Retirar (moderación)", systemImage: "shield.lefthalf.filled")
                }
            }
        } label: {
            Image(systemName: "ellipsis.circle")
        }
        .accessibilityLabel("Más opciones")
    }

    private func cargar() async {
        cargando = post == nil
        error = nil
        defer { cargando = false }
        do {
            let detalle = try await AgoraApi.postDetalle(id: postId)
            post = detalle
            textoEditado = nil
            miReaccion = detalle.miReaccion
            totalReacciones = detalle.numReactions ?? 0
            conteos = detalle.reacciones ?? [:]
            guardado = detalle.miGuardado ?? false
            encuesta = detalle.encuesta
            let recientes = detalle.comentarios ?? []
            if let primero = recientes.first,
               let idx = comentarios.firstIndex(where: { $0.id == primero.id }),
               idx > 0 {
                // Al recargar (p. ej. tras comentar) se conservan los anteriores
                // que ya se habían pedido, y su cursor sigue valiendo.
                comentarios = Array(comentarios[..<idx]) + recientes
            } else {
                comentarios = recientes
                cursorAnteriores = detalle.comentariosAnteriores
            }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func votar(opcionId: String) async {
        guard !votando else { return }
        votando = true
        defer { votando = false }
        Haptics.toggle()
        do {
            let resp = try await AgoraApi.votarEncuesta(postId: postId, opcionId: opcionId)
            if let opts = resp.opciones, let pregunta = encuesta?.pregunta {
                encuesta = EncuestaDto(pregunta: pregunta, opciones: opts)
            }
            Haptics.success()
        } catch {}
    }

    private func reaccionar(_ tipo: String) async {
        Haptics.toggle()
        let activa = miReaccion == tipo
        let anterior = miReaccion
        let totalAnterior = totalReacciones
        let conteosAnteriores = conteos
        miReaccion = activa ? nil : tipo
        totalReacciones += activa ? -1 : (anterior != nil ? 0 : 1)
        if post?.reacciones != nil {
            conteos = moverReaccion(conteos, de: anterior, a: miReaccion)
        }
        do {
            let resp = try await AgoraApi.reaccionar(postId: postId, tipo: tipo)
            miReaccion = resp.miReaccion
        } catch {
            miReaccion = anterior
            totalReacciones = totalAnterior
            conteos = conteosAnteriores
        }
    }

    /// Pide la página previa y la antepone (la API ya la manda en orden cronológico).
    private func verAnteriores() async {
        guard let cursor = cursorAnteriores, !cargandoAnteriores else { return }
        cargandoAnteriores = true
        defer { cargandoAnteriores = false }
        do {
            let pagina = try await AgoraApi.comentariosAnteriores(postId: postId, antesDe: cursor)
            let yaEstan = Set(comentarios.map(\.id))
            let nuevos = (pagina.comentarios ?? []).filter { !yaEstan.contains($0.id) }
            comentarios = nuevos + comentarios
            cursorAnteriores = pagina.comentariosAnteriores
        } catch {
            aviso = "No se pudieron cargar los comentarios anteriores."
        }
    }

    private func comentar() async {
        let texto = textoComentario.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !texto.isEmpty else { return }
        do {
            try await AgoraApi.comentar(postId: postId, texto: texto)
            textoComentario = ""
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func reportar(_ motivo: String) async {
        do {
            try await AgoraApi.reportar(postId: postId, motivo: motivo)
            aviso = "Gracias. Un moderador lo revisará."
        } catch {
            aviso = FormatUtils.mensajeDe(error)
        }
    }

    private func borrar() async {
        do {
            try await AgoraApi.borrarPost(id: postId)
            Haptics.success()
            onEliminado?()
        } catch {
            aviso = FormatUtils.mensajeDe(error)
        }
    }

    private func retirar() async {
        let motivo = motivoRetiro.trimmingCharacters(in: .whitespacesAndNewlines)
        guard motivo.count >= 3 else {
            aviso = "Escribe el motivo (mínimo 3 caracteres)."
            return
        }
        do {
            try await AgoraApi.retirarPost(id: postId, motivo: motivo)
            motivoRetiro = ""
            onEliminado?()
        } catch {
            aviso = FormatUtils.mensajeDe(error)
        }
    }
}

private struct FloatingHeartOverlay: View {
    @State private var scale: CGFloat = 0.4
    @State private var opacity: Double = 1

    var body: some View {
        Text("🧡")
            .font(.system(size: 36))
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

private struct ComentarioRowView: View {
    let comentario: ComentarioDto

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(comentario.autor?.nombre ?? "Alguien")
                .font(.caption.bold())
                .foregroundStyle(AgoraDesign.Colors.texto)
            Text(comentario.texto)
                .font(.subheadline)
                .foregroundStyle(AgoraDesign.Colors.texto)
            Text(FormatUtils.haceCuanto(comentario.createdAt))
                .font(.caption2)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
    }
}
