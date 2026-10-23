import SwiftUI

private struct EnlaceMas: Identifiable {
    var id: String { ruta }
    let ruta: String
    let emoji: String
    let titulo: String
    let nota: String
}

private struct SeccionMas: Identifiable {
    var id: String { titulo }
    let titulo: String
    let enlaces: [EnlaceMas]
}

private let seccionesMas: [SeccionMas] = [
    SeccionMas(
        titulo: "Descubre",
        enlaces: [
            EnlaceMas(ruta: "buscar", emoji: "🔍", titulo: "Buscar", nota: "Personas, posts y más"),
            EnlaceMas(ruta: "directorio", emoji: "📇", titulo: "Directorio", nota: "Buscar gente por carrera"),
            EnlaceMas(ruta: "guardados", emoji: "🔖", titulo: "Guardados", nota: "Posts para ver después"),
        ]
    ),
    SeccionMas(
        titulo: "Campus",
        enlaces: [
            EnlaceMas(ruta: "marketplace", emoji: "🛍", titulo: "Marketplace", nota: "Compra y vende en campus"),
            EnlaceMas(ruta: "aventones", emoji: "🚗", titulo: "Aventones", nota: "Comparte coche a Cholula"),
            EnlaceMas(ruta: "anonimo", emoji: "🎭", titulo: "Sin nombre", nota: "Publicar sin firmar"),
        ]
    ),
    SeccionMas(
        titulo: "Tu cuenta",
        enlaces: [
            EnlaceMas(ruta: "notificaciones", emoji: "🔔", titulo: "Notificaciones", nota: "Todo tu historial"),
            EnlaceMas(ruta: "mensajes", emoji: "✉️", titulo: "Mensajes", nota: "Tus conversaciones"),
            EnlaceMas(ruta: "ajustes", emoji: "⚙️", titulo: "Ajustes", nota: "Tu perfil y privacidad"),
        ]
    ),
]

/// Hub «Más» — paridad con `MasScreen.kt`.
struct MasView: View {
    let onNavigate: (String) -> Void
    let onTerminos: () -> Void
    let onReglas: () -> Void
    let onPrivacidad: () -> Void
    let onLogout: () -> Void
    /// Globo en la fila «Mensajes» (`GET mensajes/no-leidos`).
    var mensajesSinLeer: Int = 0

    @EnvironmentObject var session: SessionStore

    @State private var perfil: PerfilMioDto?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.md) {
                Text("Más")
                    .font(.largeTitle.bold())
                    .foregroundStyle(AgoraDesign.Colors.texto)

                if let handle = perfil?.handle ?? session.currentUser?.handle {
                    tarjetaPerfil(handle: handle)
                }

                ForEach(seccionesMas) { seccion in
                    Text(seccion.titulo)
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .padding(.leading, AgoraDesign.Spacing.xxs)

                    VStack(spacing: 0) {
                        ForEach(Array(seccion.enlaces.enumerated()), id: \.element.id) { index, enlace in
                            Button {
                                onNavigate(enlace.ruta)
                            } label: {
                                HStack(spacing: AgoraDesign.Spacing.sm) {
                                    Text(enlace.emoji)
                                        .font(.title3)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(enlace.titulo)
                                            .font(.subheadline.bold())
                                            .foregroundStyle(AgoraDesign.Colors.texto)
                                        Text(enlace.nota)
                                            .font(.caption)
                                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                                    }
                                    Spacer()
                                    if enlace.ruta == "mensajes", mensajesSinLeer > 0 {
                                        Text(mensajesSinLeer > 99 ? "99+" : "\(mensajesSinLeer)")
                                            .font(.caption2.bold())
                                            .foregroundStyle(.white)
                                            .padding(.horizontal, 7)
                                            .padding(.vertical, 3)
                                            .background(AgoraDesign.Colors.naranja)
                                            .clipShape(Capsule())
                                            .accessibilityLabel("\(mensajesSinLeer) sin leer")
                                    }
                                    Text("›")
                                        .foregroundStyle(AgoraDesign.Colors.textoMuted)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 14)
                            }
                            .buttonStyle(.agoraPlain)
                            .accessibilityIdentifier("mas.\(enlace.ruta)")

                            if index < seccion.enlaces.count - 1 {
                                Divider()
                                    .overlay(AgoraDesign.Colors.bordeSutil)
                            }
                        }
                    }
                    .background(AgoraDesign.Colors.superficie)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
                    .overlay {
                        RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                            .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
                    }
                }

                HStack(spacing: AgoraDesign.Spacing.xs) {
                    Spacer(minLength: 0)
                    Button("Términos", action: onTerminos)
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                    Text("·")
                        .foregroundStyle(AgoraDesign.Colors.textoMuted)
                    Button("Reglas", action: onReglas)
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                        .accessibilityLabel("Reglas de la comunidad")
                    Text("·")
                        .foregroundStyle(AgoraDesign.Colors.textoMuted)
                    Button("Privacidad", action: onPrivacidad)
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                    Spacer(minLength: 0)
                }
                .font(.subheadline)
                .frame(minHeight: 44)

                Button("Cerrar sesión", role: .destructive, action: onLogout)
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)

                VStack(spacing: AgoraDesign.Spacing.xs) {
                    AgoraIsotipo(tamano: 28)
                    AgoraCreditoLegal()
                }
                .padding(.top, AgoraDesign.Spacing.sm)
            }
            .padding(AgoraDesign.Spacing.md)
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Más")
        .navigationBarTitleDisplayMode(.inline)
        .task { await cargarPerfil() }
    }

    private func tarjetaPerfil(handle: String) -> some View {
        Button {
            // Hub propio: ProfileView (moderación, ajustes, legal), no PerfilAjeno.
            onNavigate("perfil-yo")
        } label: {
            HStack(spacing: 14) {
                avatarConAnillo(nombre: perfil?.nombre ?? handle)
                VStack(alignment: .leading, spacing: 4) {
                    Text(perfil?.nombre ?? "Tu perfil")
                        .font(.headline)
                        .foregroundStyle(AgoraDesign.Colors.texto)
                    Text("@\(handle)")
                        .font(.subheadline)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    Text("Ver mi perfil ›")
                        .font(.caption.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                        .padding(.top, 2)
                }
                Spacer()
            }
            .padding(AgoraDesign.Spacing.md)
            .background(AgoraDesign.Colors.superficieElevada)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                    .stroke(AgoraDesign.Colors.bordeSutil, lineWidth: 1)
            }
        }
        .buttonStyle(.agoraPlain)
    }

    private func avatarConAnillo(nombre: String) -> some View {
        let iniciales = inicialesDe(nombre)
        return ZStack {
            Circle()
                .stroke(AgoraDesign.Colors.naranja, lineWidth: 2.5)
                .frame(width: 56, height: 56)
            if let url = ApiClient.shared.resolveUrl(perfil?.fotoUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        placeholderAvatar(iniciales: iniciales)
                    }
                }
                .frame(width: 48, height: 48)
                .clipShape(Circle())
            } else {
                placeholderAvatar(iniciales: iniciales)
                    .frame(width: 48, height: 48)
            }
        }
    }

    private func placeholderAvatar(iniciales: String) -> some View {
        Circle()
            .fill(AgoraDesign.Colors.naranjaSuave)
            .overlay {
                Text(iniciales)
                    .font(.headline.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
    }

    private func cargarPerfil() async {
        do {
            perfil = try await AgoraApi.perfilMio()
        } catch {
            // La tarjeta usa datos de sesión si falla.
        }
    }
}

private func inicialesDe(_ nombre: String) -> String {
    nombre.split(separator: " ")
        .prefix(2)
        .compactMap { $0.first.map { String($0).uppercased() } }
        .joined()
}
