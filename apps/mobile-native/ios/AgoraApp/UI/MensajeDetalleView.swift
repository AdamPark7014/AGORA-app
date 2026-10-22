import SwiftUI

/// Chat DM — paridad con `MensajeDetalleScreen.kt`.
struct MensajeDetalleView: View {
    let conversacionId: String

    @State private var mensajes: [MensajeDto] = []
    @State private var con: ParticipanteConversacionDto?
    @State private var siguienteCursor: String?
    @State private var cargando = true
    @State private var cargandoAntiguos = false
    @State private var enviando = false
    @State private var texto = ""
    @State private var error: String?

    var body: some View {
        VStack(spacing: 0) {
            if cargando && mensajes.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: AgoraDesign.Spacing.xs) {
                            if siguienteCursor != nil {
                                Button {
                                    Task { await cargarAntiguos() }
                                } label: {
                                    Text(cargandoAntiguos ? "Cargando…" : "Cargar mensajes anteriores")
                                        .font(.caption)
                                }
                                .disabled(cargandoAntiguos)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, AgoraDesign.Spacing.xs)
                            }

                            if mensajes.isEmpty {
                                AgoraEmptyState(
                                    emoji: "💬",
                                    title: AgoraCopy.mensajeDetalleEmptyTitle,
                                    subtitle: AgoraCopy.mensajeDetalleEmptySubtitle
                                )
                                .frame(minHeight: 200)
                            }

                            ForEach(mensajes) { mensaje in
                                BurbujaMensajeView(mensaje: mensaje)
                                    .id(mensaje.id)
                            }
                        }
                        .padding(.horizontal, AgoraDesign.Spacing.sm)
                        .padding(.vertical, AgoraDesign.Spacing.xs)
                    }
                    .onChange(of: mensajes.count) { _ in
                        if let last = mensajes.last {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(AgoraDesign.Colors.danger)
                    .padding(.horizontal, AgoraDesign.Spacing.sm)
            }

            HStack(alignment: .bottom, spacing: AgoraDesign.Spacing.xs) {
                TextField("Escribe a \(con?.nombre ?? "…")", text: $texto, axis: .vertical)
                    .lineLimit(1...5)
                    .textFieldStyle(.roundedBorder)
                    .onChange(of: texto) { nuevo in
                        if nuevo.count > 4000 { texto = String(nuevo.prefix(4000)) }
                    }

                Button {
                    Task { await enviar() }
                } label: {
                    Text(enviando ? "…" : "Enviar")
                        .fontWeight(.semibold)
                }
                .buttonStyle(.borderedProminent)
                .tint(AgoraDesign.Colors.naranja)
                .disabled(texto.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || enviando)
            }
            .padding(AgoraDesign.Spacing.sm)
            .background(AgoraDesign.Colors.superficie)
        }
        .navigationTitle(con?.nombre ?? "Chat")
        .navigationBarTitleDisplayMode(.inline)
        .agoraScreenBackground()
        .task(id: conversacionId) {
            await cargarInicial()
            let handle = SessionStore.shared.currentUser?.handle
            await MensajesSseClient.shared.watch(conversacionId: conversacionId, miHandle: handle) { nuevo in
                Task { @MainActor in
                    guard !mensajes.contains(where: { $0.id == nuevo.id }) else { return }
                    mensajes.append(nuevo)
                }
            }
        }
        .onDisappear {
            Task { await MensajesSseClient.shared.stop() }
        }
    }

    private func cargarInicial() async {
        cargando = true
        defer { cargando = false }
        await traerRecientes()
    }


    private func traerRecientes() async {
        do {
            let datos = try await AgoraApi.conversacion(id: conversacionId)
            con = datos.con
            siguienteCursor = datos.siguienteCursor
            let nuevos = datos.mensajes ?? []
            let ids = Set(mensajes.map(\.id))
            let filtrados = nuevos.filter { !ids.contains($0.id) }
            if mensajes.isEmpty {
                mensajes = nuevos
            } else if !filtrados.isEmpty {
                mensajes.append(contentsOf: filtrados)
            }
            error = nil
        } catch {
            if mensajes.isEmpty { self.error = FormatUtils.mensajeDe(error) }
        }
    }

    private func cargarAntiguos() async {
        guard let cursor = siguienteCursor else { return }
        cargandoAntiguos = true
        defer { cargandoAntiguos = false }
        do {
            let datos = try await AgoraApi.conversacion(id: conversacionId, cursor: cursor)
            siguienteCursor = datos.siguienteCursor
            mensajes = (datos.mensajes ?? []) + mensajes
        } catch {
            // Silencioso.
        }
    }

    private func enviar() async {
        let limpio = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !limpio.isEmpty else { return }
        enviando = true
        error = nil
        defer { enviando = false }
        do {
            let resp = try await AgoraApi.enviarMensaje(conversacionId: conversacionId, texto: limpio)
            AgoraAnalytics.dmEnviado(["conversacionId": conversacionId])
            texto = ""
            if let resp {
                // Se agrega ya con el id real; si el SSE lo trae antes o después,
                // el filtro por id evita la burbuja doble.
                if !mensajes.contains(where: { $0.id == resp.id }) {
                    mensajes.append(
                        MensajeDto(id: resp.id, texto: limpio, createdAt: resp.createdAt, mio: true, autor: nil)
                    )
                }
            } else {
                await traerRecientes()
            }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

private struct BurbujaMensajeView: View {
    let mensaje: MensajeDto

    var body: some View {
        HStack {
            if mensaje.mio { Spacer(minLength: 48) }
            Text(mensaje.texto)
                .font(.body)
                .foregroundStyle(mensaje.mio ? .white : AgoraDesign.Colors.texto)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(mensaje.mio ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay {
                    if !mensaje.mio {
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
                    }
                }
            if !mensaje.mio { Spacer(minLength: 48) }
        }
    }
}
