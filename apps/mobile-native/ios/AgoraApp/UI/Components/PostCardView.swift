import SwiftUI

/// Mismos codigos que `MOTIVOS_REPORTE` en `@agora/contracts`.
private struct MotivoReporte: Identifiable {
    let id: String
    let etiqueta: String
}

private let motivosReporte: [MotivoReporte] = [
    MotivoReporte(id: "INTIMIDAD_SEXUAL", etiqueta: "Contenido íntimo sin permiso"),
    MotivoReporte(id: "DATOS_PERSONALES", etiqueta: "Datos personales"),
    MotivoReporte(id: "AMENAZA_VIOLENCIA", etiqueta: "Amenaza de violencia"),
    MotivoReporte(id: "ACOSO_DIRIGIDO", etiqueta: "Acoso dirigido"),
    MotivoReporte(id: "SUPLANTACION", etiqueta: "Suplantación"),
    MotivoReporte(id: "OTRO", etiqueta: "Otro"),
]

struct PostCardView: View {
    let post: PostDto
    var onTap: (() -> Void)?
    var onAuthorTap: (() -> Void)?
    var onHashtagTap: ((String) -> Void)?

    @State private var miReaccion: String?
    @State private var totalReacciones = 0
    @State private var encuesta: EncuestaDto?
    @State private var votando = false
    @State private var heartTrigger = 0
    @State private var eligiendoMotivo = false
    @State private var avisoReporte: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                onAuthorTap?()
            } label: {
                HStack(spacing: 10) {
                    avatar
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Text(post.autor?.nombre ?? "Usuario")
                                .font(.subheadline.bold())
                            if post.autor?.verificado == true {
                                Image(systemName: "checkmark.seal.fill")
                                    .font(.caption2)
                                    .foregroundStyle(AgoraDesign.Colors.naranja)
                            }
                        }
                        HStack(spacing: 6) {
                            if let handle = post.autor?.handle {
                                Text("@\(handle)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Text("·")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(FormatUtils.haceCuanto(post.createdAt))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    Text(post.comunidad.nombre)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AgoraDesign.Colors.naranjaSuave)
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                        .clipShape(Capsule())
                }
            }
            .buttonStyle(.plain)
            .disabled(onAuthorTap == nil)

            if !post.texto.isEmpty {
                if let onHashtagTap {
                    TextoConHashtags(
                        texto: post.texto,
                        onHashtagTap: onHashtagTap,
                        onBackgroundTap: onTap
                    )
                } else {
                    Button {
                        onTap?()
                    } label: {
                        Text(post.texto)
                            .font(.body)
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }
            }

            if let media = post.media, let first = media.first,
               let url = ApiClient.shared.resolveUrl(first.url) {
                postMedia(url: url)
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
                    onReaccionar: { tipo in Task { await reaccionar(tipo) } },
                    onCommentsTap: onTap
                )
                Spacer()
                GuardarButton(postId: post.id, guardado: post.miGuardado ?? false)
                Menu {
                    Button(role: .destructive) {
                        eligiendoMotivo = true
                    } label: {
                        Label("Reportar", systemImage: "flag")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(width: 36, height: 36)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Más opciones")
            }
        }
        .confirmationDialog("¿Por qué la reportas?", isPresented: $eligiendoMotivo, titleVisibility: .visible) {
            ForEach(motivosReporte) { motivo in
                Button(motivo.etiqueta) {
                    Task { await reportar(motivo.id) }
                }
            }
            Button("Cancelar", role: .cancel) {}
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
        .padding(AgoraDesign.Spacing.sm + 2)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
        }
        .onAppear {
            sincronizarEstado()
            encuesta = post.encuesta
        }
        .onChange(of: post.id) { _ in
            sincronizarEstado()
            encuesta = post.encuesta
        }
    }

    @ViewBuilder
    private func postMedia(url: URL) -> some View {
        ZStack {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    Color(.secondarySystemGroupedBackground)
                        .overlay {
                            Image(systemName: "photo")
                                .foregroundStyle(.secondary)
                        }
                default:
                    ProgressView()
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 180)
            .clipShape(RoundedRectangle(cornerRadius: 10))

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
        .onTapGesture(count: 1) {
            onTap?()
        }
    }

    @ViewBuilder
    private var avatar: some View {
        if let url = ApiClient.shared.resolveUrl(post.autor?.fotoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    avatarPlaceholder
                }
            }
            .frame(width: 40, height: 40)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(AgoraDesign.Colors.naranjaSuave)
            .frame(width: 40, height: 40)
            .overlay {
                Text(String((post.autor?.nombre ?? "?").prefix(1)).uppercased())
                    .font(.subheadline.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
    }

    private func sincronizarEstado() {
        miReaccion = post.miReaccion
        totalReacciones = post.numReactions ?? 0
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

    private func reaccionar(_ tipo: String) async {
        Haptics.toggle()
        let activa = miReaccion == tipo
        let anterior = miReaccion
        let totalAnterior = totalReacciones
        miReaccion = activa ? nil : tipo
        totalReacciones += activa ? -1 : (anterior != nil ? 0 : 1)
        do {
            let resp = try await AgoraApi.reaccionar(postId: post.id, tipo: tipo)
            miReaccion = resp.miReaccion
        } catch {
            miReaccion = anterior
            totalReacciones = totalAnterior
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
