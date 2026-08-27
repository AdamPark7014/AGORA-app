import SwiftUI

/// Detalle de publicación con reacciones, comentarios y guardar — paridad con `PostDetailScreen.kt`.
struct PostDetailView: View {
    let postId: String
    var onAuthorTap: ((String) -> Void)?
    var onHashtagTap: ((String) -> Void)?

    @State private var post: PostDetalleDto?
    @State private var cargando = true
    @State private var error: String?
    @State private var miReaccion: String?
    @State private var totalReacciones = 0
    @State private var guardado = false
    @State private var textoComentario = ""
    @State private var encuesta: EncuestaDto?
    @State private var votando = false
    @State private var heartTrigger = 0

    var body: some View {
        Group {
            if cargando {
                ProgressView()
            } else if let error, post == nil {
                AgoraErrorState(message: error) {
                    Task { await cargar() }
                }
            } else if let post {
                ScrollView {
                    VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                        HStack(spacing: AgoraDesign.Spacing.xs) {
                            Button {
                                if let handle = post.autor?.handle { onAuthorTap?(handle) }
                            } label: {
                                Text(post.autor?.nombre ?? "Alguien")
                                    .font(.headline)
                                    .foregroundStyle(AgoraDesign.Colors.texto)
                            }
                            .buttonStyle(.plain)
                            .disabled(onAuthorTap == nil || post.autor?.handle == nil)
                            Text("· \(post.comunidad.nombre) · \(FormatUtils.haceCuanto(post.createdAt))")
                                .font(.caption)
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        }

                        if !post.texto.isEmpty {
                            if let onHashtagTap {
                                TextoConHashtags(texto: post.texto, onHashtagTap: onHashtagTap)
                            } else {
                                Text(post.texto).font(.body)
                            }
                        }

                        if let media = post.media?.first(where: { $0.esVideo != true }),
                           let url = ApiClient.shared.resolveUrl(media.url) {
                            ZStack {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image.resizable().scaledToFill()
                                    default:
                                        Color(.secondarySystemGroupedBackground)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 220)
                                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))

                                if heartTrigger > 0 {
                                    FloatingHeartOverlay()
                                        .id(heartTrigger)
                                }
                            }
                            .contentShape(Rectangle())
                            .onTapGesture(count: 2) {
                                heartTrigger += 1
                                Task { await reaccionar("ME_LATE") }
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
                                onReaccionar: { tipo in Task { await reaccionar(tipo) } }
                            )
                            Spacer()
                            GuardarButton(postId: postId, guardado: guardado) { nuevo in
                                guardado = nuevo
                            }
                        }

                        Text("Comentarios")
                            .font(.subheadline.bold())
                            .padding(.top, AgoraDesign.Spacing.xs)

                        ForEach(post.comentarios ?? []) { comentario in
                            ComentarioRowView(comentario: comentario)
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
                    }
                    .padding(AgoraDesign.Spacing.md)
                }
            } else {
                AgoraEmptyState(
                    emoji: "📄",
                    title: "Publicación",
                    subtitle: "No encontrada."
                )
            }
        }
        .navigationTitle("Publicación")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await cargar() }
        .task(id: postId) { await cargar() }
    }

    private func cargar() async {
        cargando = post == nil
        error = nil
        defer { cargando = false }
        do {
            let detalle = try await AgoraApi.postDetalle(id: postId)
            post = detalle
            miReaccion = detalle.miReaccion
            totalReacciones = detalle.numReactions ?? 0
            guardado = detalle.miGuardado ?? false
            encuesta = detalle.encuesta
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
        miReaccion = activa ? nil : tipo
        totalReacciones += activa ? -1 : (anterior != nil ? 0 : 1)
        do {
            let resp = try await AgoraApi.reaccionar(postId: postId, tipo: tipo)
            miReaccion = resp.miReaccion
        } catch {
            miReaccion = anterior
            totalReacciones = totalAnterior
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
            Text(comentario.texto)
                .font(.subheadline)
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
