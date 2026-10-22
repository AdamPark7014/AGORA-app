import SwiftUI

private let reaccionesAnonimo: [(tipo: String, emoji: String)] = [
    ("ME_LATE", "🔥"),
    ("ME_RIO", "😂"),
    ("APOYO", "🤝"),
]

/// Zona sin nombre — paridad con `AnonimoScreen.kt`.
struct AnonimoView: View {
    @State private var habilitada: Bool?
    @State private var alias: String?
    @State private var posts: [AnonimoPostDto] = []
    @State private var texto = ""
    @State private var cargando = true
    @State private var enviando = false
    @State private var error: String?
    @State private var aviso: String?

    var body: some View {
        Group {
            if cargando {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if habilitada != true {
                VStack(spacing: AgoraDesign.Spacing.xs) {
                    Text("Zona sin nombre apagada")
                        .font(.title3.bold())
                    Text("El equipo la tiene desactivada por ahora.")
                        .font(.subheadline)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .multilineTextAlignment(.center)
                }
                .padding(AgoraDesign.Spacing.lg)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: AgoraDesign.Spacing.xs) {
                        tarjetaPublicar
                        if posts.isEmpty {
                            AgoraEmptyState(
                                emoji: "🎭",
                                title: AgoraCopy.anonimoEmptyTitle,
                                subtitle: AgoraCopy.anonimoEmptySubtitle
                            )
                        } else {
                            ForEach(posts) { post in
                                AnonimoPostCard(
                                    post: post,
                                    onReaccionar: { tipo in Task { await reaccionar(post: post, tipo: tipo) } },
                                    onBorrar: { Task { await borrar(post: post) } },
                                    onReportar: { motivo in Task { await reportar(post: post, motivo: motivo) } }
                                )
                            }
                        }
                    }
                    .padding(AgoraDesign.Spacing.sm)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Sin nombre")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await cargarFeed() }
        .task { await cargarInicial() }
        .alert(
            aviso ?? "",
            isPresented: Binding(
                get: { aviso != nil },
                set: { if !$0 { aviso = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        }
    }

    private var tarjetaPublicar: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Publicas como \(alias ?? "…")")
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)

            TextEditor(text: $texto)
                .frame(minHeight: 80, maxHeight: 100)
                .padding(6)
                .background(AgoraDesign.Colors.superficieElevada)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
                .overlay(alignment: .topLeading) {
                    if texto.isEmpty {
                        Text("Di algo sin que sepan quién eres…")
                            .foregroundStyle(AgoraDesign.Colors.textoMuted)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 14)
                            .allowsHitTesting(false)
                    }
                }
                .onChange(of: texto) { newValue in
                    if newValue.count > 600 {
                        texto = String(newValue.prefix(600))
                    }
                }

            if let error {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(AgoraDesign.Colors.danger)
            }

            Button {
                Task { await publicar() }
            } label: {
                Text(enviando ? "…" : "Publicar")
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(AgoraDesign.Colors.naranja)
            .disabled(enviando || texto.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(AgoraDesign.Spacing.sm + 2)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
        }
    }

    private func cargarInicial() async {
        cargando = true
        defer { cargando = false }
        do {
            let estado = try await AgoraApi.anonimoEstado()
            habilitada = estado.habilitada
            if estado.habilitada {
                await cargarFeed()
                alias = try await AgoraApi.anonimoAlias().alias
            }
        } catch {
            habilitada = false
        }
    }

    private func cargarFeed() async {
        do {
            let resp = try await AgoraApi.anonimoFeed()
            posts = resp.publicaciones ?? []
        } catch {
            posts = []
        }
    }

    private func publicar() async {
        let limpio = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !limpio.isEmpty else { return }
        enviando = true
        error = nil
        defer { enviando = false }
        do {
            _ = try await AgoraApi.publicarAnonimo(PublicarAnonimoRequest(texto: limpio))
            texto = ""
            await cargarFeed()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    /// Siempre con el tipo: si ya era tu reacción, la API la quita.
    private func reaccionar(post: AnonimoPostDto, tipo: String) async {
        do {
            _ = try await AgoraApi.reaccionar(postId: post.id, tipo: tipo)
            await cargarFeed()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func reportar(post: AnonimoPostDto, motivo: String) async {
        do {
            try await AgoraApi.reportar(postId: post.id, motivo: motivo)
            aviso = "Gracias. Un moderador lo revisará."
        } catch {
            aviso = FormatUtils.mensajeDe(error)
        }
    }

    private func borrar(post: AnonimoPostDto) async {
        do {
            try await AgoraApi.borrarAnonimo(id: post.id)
            await cargarFeed()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

private struct AnonimoPostCard: View {
    let post: AnonimoPostDto
    let onReaccionar: (String) -> Void
    let onBorrar: () -> Void
    let onReportar: (String) -> Void

    @State private var eligiendoMotivo = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(post.alias)
                    .font(.subheadline.bold())
                Spacer()
                if post.esMio == true {
                    Button("Borrar", action: onBorrar)
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.danger)
                } else {
                    Menu {
                        Button(role: .destructive) {
                            eligiendoMotivo = true
                        } label: {
                            Label("Reportar", systemImage: "flag")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.subheadline)
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            .frame(width: 32, height: 28)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel("Más opciones")
                }
            }

            Text(FormatUtils.haceCuanto(post.createdAt))
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)

            Text(post.texto)
                .font(.body)

            HStack(spacing: AgoraDesign.Spacing.md) {
                ForEach(reaccionesAnonimo, id: \.tipo) { reaccion in
                    Button {
                        onReaccionar(reaccion.tipo)
                    } label: {
                        Text("\(reaccion.emoji) \(post.numReactions ?? 0)")
                            .font(.subheadline)
                            .foregroundStyle(
                                post.miReaccion == reaccion.tipo
                                    ? AgoraDesign.Colors.naranja
                                    : AgoraDesign.Colors.textoMedio
                            )
                    }
                    .buttonStyle(.agoraPlain)
                }
            }
        }
        .padding(AgoraDesign.Spacing.sm + 2)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
        }
        .confirmationDialog("¿Por qué la reportas?", isPresented: $eligiendoMotivo, titleVisibility: .visible) {
            ForEach(motivosReporte) { motivo in
                Button(motivo.etiqueta) {
                    onReportar(motivo.id)
                }
            }
            Button("Cancelar", role: .cancel) {}
        }
    }
}
