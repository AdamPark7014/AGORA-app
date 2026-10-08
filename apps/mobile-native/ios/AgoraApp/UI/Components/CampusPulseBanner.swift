import SwiftUI

/// Trending + cumpleaños del campus — paridad con el carril derecho web (`carriles.tsx`).
struct CampusPulseBanner: View {
    var onHashtagTap: (String) -> Void = { _ in }
    var onPerfilTap: (String) -> Void = { _ in }

    @State private var trending: [HashtagTrendingDto] = []
    @State private var cumples: [CumpleDto] = []

    var body: some View {
        // VStack siempre presente: con `.task` dentro del `if` (listas vacías al
        // inicio) la carga nunca se disparaba y el banner no aparecía.
        VStack(spacing: 0) {
            if !trending.isEmpty || !cumples.isEmpty {
                VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                    if !trending.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("🔥 Trending hoy")
                                .font(.caption.bold())
                                .foregroundStyle(AgoraDesign.Colors.naranja)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(trending, id: \.tag) { item in
                                        Button {
                                            onHashtagTap(item.tag)
                                        } label: {
                                            Text("#\(item.tag)")
                                                .font(.caption.weight(.semibold))
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 8)
                                                .background(AgoraDesign.Colors.naranjaSuave)
                                                .foregroundStyle(AgoraDesign.Colors.naranja)
                                                .clipShape(Capsule())
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                    }

                    if !cumples.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("🎂 Cumplen hoy")
                                .font(.caption.bold())
                                .foregroundStyle(AgoraDesign.Colors.naranja)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 10) {
                                    ForEach(cumples, id: \.handle) { persona in
                                        Button {
                                            onPerfilTap(persona.handle)
                                        } label: {
                                            VStack(spacing: 4) {
                                                cumpleAvatar(persona)
                                                Text(primerNombre(persona.nombre))
                                                    .font(.caption2)
                                                    .lineLimit(1)
                                                    .foregroundStyle(AgoraDesign.Colors.texto)
                                            }
                                            .frame(width: 64)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            Text("Mándale un mensaje, cuesta nada.")
                                .font(.caption2)
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        }
                    }
                }
                .padding(AgoraDesign.Spacing.sm + 2)
                .background(AgoraDesign.Colors.superficie)
                .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium)
                        .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
                }
            }
        }
        .task { await cargar() }
    }

    @ViewBuilder
    private func cumpleAvatar(_ persona: CumpleDto) -> some View {
        if let url = ApiClient.shared.resolveUrl(persona.fotoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    avatarPlaceholder(persona)
                }
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())
            .overlay {
                Circle().stroke(AgoraDesign.Colors.naranja.opacity(0.35), lineWidth: 2)
            }
        } else {
            avatarPlaceholder(persona)
        }
    }

    private func avatarPlaceholder(_ persona: CumpleDto) -> some View {
        Circle()
            .fill(AgoraDesign.Colors.naranjaSuave)
            .frame(width: 44, height: 44)
            .overlay {
                Text(String(persona.nombre.prefix(1)).uppercased())
                    .font(.subheadline.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
    }

    private func primerNombre(_ nombre: String) -> String {
        nombre.split(separator: " ").first.map(String.init) ?? nombre
    }

    private func cargar() async {
        async let t = try? AgoraApi.hashtagsTrending()
        async let c = try? AgoraApi.cumplesHoy()
        let (trendResp, cumpleResp) = await (t, c)
        trending = trendResp?.hashtags ?? []
        cumples = cumpleResp?.cumples ?? []
    }
}
