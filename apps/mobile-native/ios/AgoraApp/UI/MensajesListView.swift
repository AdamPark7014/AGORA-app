import SwiftUI

/// Bandeja de mensajes DM — paridad con `MensajesListScreen.kt`.
struct MensajesListView: View {
    var onConversacionTap: (String) -> Void = { _ in }

    @State private var conversaciones: [ConversacionDto] = []
    @State private var cargando = true
    @State private var error: String?

    var body: some View {
        Group {
            if cargando && conversaciones.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error, conversaciones.isEmpty {
                AgoraErrorState(message: error) {
                    Task { await cargar() }
                }
            } else if conversaciones.isEmpty {
                AgoraEmptyState(
                    emoji: "📚",
                    title: AgoraCopy.mensajesEmptyTitle,
                    subtitle: AgoraCopy.mensajesEmptySubtitle
                )
            } else {
                List(conversaciones) { conv in
                    ConversacionRowView(conversacion: conv) {
                        onConversacionTap(conv.id)
                    }
                    .listRowInsets(EdgeInsets(
                        top: AgoraDesign.Spacing.xxs,
                        leading: AgoraDesign.Spacing.sm,
                        bottom: AgoraDesign.Spacing.xxs,
                        trailing: AgoraDesign.Spacing.sm
                    ))
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(AgoraDesign.Colors.fondo)
            }
        }
        .navigationTitle("Mensajes")
        .refreshable { await cargar(refresh: true) }
        .task {
            await cargar()
            await pollLoop()
        }
    }

    private func pollLoop() async {
        while !Task.isCancelled {
            try? await Task.sleep(nanoseconds: 15_000_000_000)
            await cargar(refresh: true)
        }
    }

    private func cargar(refresh: Bool = false) async {
        if !refresh { cargando = true }
        error = nil
        defer { if !refresh { cargando = false } }
        do {
            let resp = try await AgoraApi.bandejaMensajes()
            conversaciones = resp.conversaciones ?? []
        } catch {
            if conversaciones.isEmpty { self.error = FormatUtils.mensajeDe(error) }
        }
    }
}

private struct ConversacionRowView: View {
    let conversacion: ConversacionDto
    let onTap: () -> Void

    private var nueva: Bool { (conversacion.noLeidos ?? 0) > 0 }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: AgoraDesign.Spacing.sm) {
                avatar
                VStack(alignment: .leading, spacing: 4) {
                    Text(conversacion.con?.nombre ?? "Alguien")
                        .font(.subheadline.weight(nueva ? .bold : .semibold))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                    Text(ultimoTexto)
                        .font(.caption)
                        .fontWeight(nueva ? .semibold : .regular)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .lineLimit(1)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    Text(FormatUtils.haceCuanto(conversacion.ultimoAt))
                        .font(.caption2)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    if let noLeidos = conversacion.noLeidos, noLeidos > 0 {
                        Text(noLeidos > 9 ? "9+" : "\(noLeidos)")
                            .font(.caption2.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(AgoraDesign.Colors.naranja)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(AgoraDesign.Spacing.sm)
            .background(nueva ? AgoraDesign.Colors.naranjaSuave.opacity(0.5) : AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                    .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
            }
        }
        .buttonStyle(.agoraPlain)
    }

    private var ultimoTexto: String {
        let prefijo = conversacion.mioElUltimo == true ? "Tú: " : ""
        return prefijo + (conversacion.ultimoTexto ?? "Sin mensajes")
    }

    @ViewBuilder
    private var avatar: some View {
        if let url = ApiClient.shared.resolveUrl(conversacion.con?.fotoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    avatarPlaceholder
                }
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(AgoraDesign.Colors.naranjaSuave)
            .frame(width: 44, height: 44)
            .overlay {
                Text(iniciales(conversacion.con?.nombre))
                    .font(.subheadline.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
    }

    private func iniciales(_ nombre: String?) -> String {
        guard let nombre else { return "?" }
        let partes = nombre.split(separator: " ").filter { !$0.isEmpty }
        return partes.prefix(2).compactMap { $0.first.map { String($0).uppercased() } }.joined()
    }
}
