import SwiftUI

/// Lista de seguidores o seguidos de un perfil
/// (`GET perfil/:handle/seguidores` y `/siguiendo`).
struct SeguidoresView: View {
    enum Modo {
        case seguidores
        case siguiendo

        var titulo: String {
            switch self {
            case .seguidores: return "Seguidores"
            case .siguiendo: return "Siguiendo"
            }
        }

        var vacio: String {
            switch self {
            case .seguidores: return "Todavía nadie sigue este perfil."
            case .siguiendo: return "Este perfil todavía no sigue a nadie."
            }
        }
    }

    let handle: String
    let modo: Modo
    var onPerfil: (String) -> Void = { _ in }

    @State private var personas: [PersonaListaDto] = []
    @State private var restringido = false
    @State private var cargando = true
    @State private var error: String?

    var body: some View {
        Group {
            if cargando && personas.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error, personas.isEmpty {
                AgoraErrorState(message: error) {
                    Task { await cargar() }
                }
            } else if restringido {
                AgoraEmptyState(
                    emoji: "🔒",
                    title: "Perfil privado",
                    subtitle: "Solo lo ven sus comunidades."
                )
            } else if personas.isEmpty {
                AgoraEmptyState(
                    emoji: "👥",
                    title: modo.titulo,
                    subtitle: modo.vacio
                )
            } else {
                List(personas) { persona in
                    Button {
                        onPerfil(persona.handle)
                    } label: {
                        fila(persona)
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(AgoraDesign.Colors.superficie)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .agoraScreenBackground()
        .navigationTitle(modo.titulo)
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await cargar() }
        .task(id: handle) { await cargar() }
    }

    private func fila(_ persona: PersonaListaDto) -> some View {
        HStack(spacing: AgoraDesign.Spacing.sm) {
            avatar(persona)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(persona.nombre)
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.texto)
                    if persona.verificado == true {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption2)
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                    }
                }
                Text("@\(persona.handle)")
                    .font(.caption)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMuted)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private func avatar(_ persona: PersonaListaDto) -> some View {
        if let url = ApiClient.shared.resolveUrl(persona.fotoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    iniciales(persona)
                }
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())
        } else {
            iniciales(persona)
                .frame(width: 44, height: 44)
        }
    }

    private func iniciales(_ persona: PersonaListaDto) -> some View {
        let letras = persona.nombre
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map { String($0).uppercased() } }
            .joined()
        return Circle()
            .fill(AgoraDesign.Colors.naranjaSuave)
            .overlay {
                Text(letras)
                    .font(.subheadline.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let resp: ListaPersonasResponse
            switch modo {
            case .seguidores:
                resp = try await AgoraApi.seguidores(handle: handle)
            case .siguiendo:
                resp = try await AgoraApi.siguiendo(handle: handle)
            }
            restringido = resp.restringido ?? false
            personas = resp.personas ?? []
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}
