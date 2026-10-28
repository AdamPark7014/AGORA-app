import SwiftUI

/// Bandeja de mensajes de B «Cholula» (artboard WowB-Mensajes): encabezado con la franja de Talavera,
/// «Sin leer» y «Antes» separados por terrazas, y el número de no leídos en un cuadro `boton`.
/// Paridad con `MensajesListScreen.kt`.
struct MensajesListView: View {
    var onConversacionTap: (String) -> Void = { _ in }
    /// Vacío con acción: buscar a alguien de tu carrera en el directorio.
    var onDirectorio: (() -> Void)?

    @State private var conversaciones: [ConversacionDto] = []
    @State private var cargando = true
    @State private var error: String?

    private var sinLeer: [ConversacionDto] { conversaciones.filter { ($0.noLeidos ?? 0) > 0 } }
    private var antes: [ConversacionDto] { conversaciones.filter { ($0.noLeidos ?? 0) == 0 } }

    var body: some View {
        VStack(spacing: 0) {
            CabezaCholula(titulo: "Mensajes")
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
                        emoji: "",
                        title: AgoraCopy.mensajesEmptyTitle,
                        subtitle: "Escríbele a alguien de tu carrera o de tu colegio. El primer escalón es saludar.",
                        actionLabel: onDirectorio == nil ? nil : "Buscar en el directorio",
                        onAction: onDirectorio
                    )
                } else {
                    List {
                        if !sinLeer.isEmpty {
                            divisor("SIN LEER")
                            ForEach(sinLeer) { conv in fila(conv) }
                        }
                        if !antes.isEmpty {
                            divisor(sinLeer.isEmpty ? "TUS CONVERSACIONES" : "ANTES")
                            ForEach(antes) { conv in fila(conv) }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .environment(\.defaultMinListRowHeight, 0)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await cargar(refresh: true) }
        .task {
            await cargar()
            await pollLoop()
        }
    }

    private func divisor(_ texto: String) -> some View {
        HStack(spacing: 8) {
            Terrazas(niveles: 2)
                .fill(AgoraDesign.Colors.naranja)
                .frame(width: 18, height: 10)
                .accessibilityHidden(true)
            Text(texto)
                .font(.outfit(.caption, .bold))
                .tracking(1)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .accessibilityAddTraits(.isHeader)
        }
        .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 4, trailing: 16))
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
    }

    private func fila(_ conv: ConversacionDto) -> some View {
        ConversacionRowView(conversacion: conv) {
            onConversacionTap(conv.id)
        }
        .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
        .listRowSeparator(.hidden)
        .listRowBackground(Color.clear)
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
            HStack(spacing: 12) {
                avatar
                    .padding(2)
                    .overlay {
                        Circle().stroke(nueva ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde, lineWidth: 2)
                    }
                VStack(alignment: .leading, spacing: 3) {
                    Text(conversacion.con?.nombre ?? "Alguien")
                        .font(.outfit(.body, nueva ? .bold : .semibold))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .lineLimit(1)
                    Text(ultimoTexto)
                        .font(.outfit(.subheadline))
                        .fontWeight(nueva ? .semibold : .regular)
                        .foregroundStyle(nueva ? AgoraDesign.Colors.texto : AgoraDesign.Colors.textoMedio)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                VStack(alignment: .trailing, spacing: 6) {
                    Text(FormatUtils.haceCuanto(conversacion.ultimoAt))
                        .font(.outfit(.caption))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    if let noLeidos = conversacion.noLeidos, noLeidos > 0 {
                        Text(noLeidos > 9 ? "9+" : "\(noLeidos)")
                            .font(.outfit(.caption2, .bold))
                            .foregroundStyle(AgoraDesign.Colors.sobreBoton)
                            .padding(.horizontal, 5)
                            .frame(minWidth: 20, minHeight: 20)
                            .background(AgoraDesign.Colors.boton, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityElement(children: .combine)
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
            .frame(width: 48, height: 48)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(AgoraDesign.Colors.naranjaSuave)
            .frame(width: 48, height: 48)
            .overlay {
                Text(iniciales(conversacion.con?.nombre))
                    .font(.outfit(.subheadline, .bold))
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
    }

    private func iniciales(_ nombre: String?) -> String {
        guard let nombre else { return "?" }
        let partes = nombre.split(separator: " ").filter { !$0.isEmpty }
        return partes.prefix(2).compactMap { $0.first.map { String($0).uppercased() } }.joined()
    }
}
