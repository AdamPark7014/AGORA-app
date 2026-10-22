import SwiftUI

/// Ranking semanal de duelos ganando — paridad con `RetosRankingSemanalRow.kt`.
struct RetosRankingSemanalRow: View {
    var onPerfilTap: (String) -> Void = { _ in }

    @State private var entradas: [RetosRankingSemanalEntradaDto] = []

    private let medallas = ["🥇", "🥈", "🥉"]

    var body: some View {
        // VStack y no Group: los modificadores de un Group se aplican a cada hijo,
        // y con el contenido vacío `.task` nunca se disparaba (el banner no cargaba).
        VStack(spacing: 0) {
            if !entradas.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("🏆 Duelos de la semana")
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)

                    Text("Los que van ganando sus duelos esta semana.")
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(Array(entradas.enumerated()), id: \.element.id) { index, entrada in
                                rankingCard(
                                    entrada,
                                    medalla: medallas.indices.contains(index) ? medallas[index] : "#\(index + 1)"
                                )
                            }
                        }
                    }
                }
                .padding(AgoraDesign.Spacing.sm + 2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
            }
        }
        .task { await cargar() }
        .onReceive(NotificationCenter.default.publisher(for: .gamificacionRefresh)) { _ in
            Task { await cargar() }
        }
    }

    private func rankingCard(_ entrada: RetosRankingSemanalEntradaDto, medalla: String) -> some View {
        Button {
            onPerfilTap(entrada.handle)
        } label: {
            VStack(spacing: 6) {
                Text(medalla)
                    .font(.caption)

                rankingAvatar(nombre: entrada.nombre, url: entrada.fotoUrl)

                Text(entrada.nombre.split(separator: " ").first.map(String.init) ?? entrada.nombre)
                    .font(.caption.bold())
                    .lineLimit(1)

                Text("🏆 \(entrada.victorias) \(entrada.victorias == 1 ? "victoria" : "victorias")")
                    .font(.caption.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(AgoraDesign.Colors.fondo)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
        }
        .buttonStyle(.agoraPlain)
    }

    @ViewBuilder
    private func rankingAvatar(nombre: String, url: String?) -> some View {
        if let imageUrl = ApiClient.shared.resolveUrl(url) {
            AsyncImage(url: imageUrl) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    avatarPlaceholder(nombre: nombre)
                }
            }
            .frame(width: 40, height: 40)
            .clipShape(Circle())
        } else {
            avatarPlaceholder(nombre: nombre)
        }
    }

    private func avatarPlaceholder(nombre: String) -> some View {
        let inicial = nombre.first.map { String($0).uppercased() } ?? "?"
        return Text(inicial)
            .font(.subheadline.bold())
            .foregroundStyle(AgoraDesign.Colors.naranja)
            .frame(width: 40, height: 40)
            .background(AgoraDesign.Colors.naranjaSuave)
            .clipShape(Circle())
    }

    private func cargar() async {
        do {
            let resp = try await AgoraApi.retosRankingSemanal(limite: 5)
            entradas = resp.entradas ?? []
        } catch {
            entradas = []
        }
    }
}
