import SwiftUI

private struct AccesoCampus: Identifiable {
    var id: String { ruta }
    let ruta: String
    let icono: String
    let titulo: String
    let nota: String
    /// Color del cuadro del ícono y de las terrazas (B «Cholula»).
    let color: Color
    var tinta: Color = .white
}

/// Cuadrícula de la pestaña Campus (docs/diseno-d.md §3). Los identificadores `mas.<ruta>` se
/// quedan: las pruebas de UI los usan.
private let accesosCampus: [AccesoCampus] = [
    AccesoCampus(ruta: "marketplace", icono: "bag", titulo: "Mercado", nota: "El tianguis del campus", color: AgoraDesign.Colors.adobe),
    AccesoCampus(ruta: "aventones", icono: "car", titulo: "Aventones", nota: "Viajes a Cholula y Puebla", color: AgoraDesign.Colors.jade),
    AccesoCampus(ruta: "directorio", icono: "person.2", titulo: "Directorio", nota: "Gente por carrera", color: AgoraDesign.Colors.talavera),
    AccesoCampus(ruta: "anonimo", icono: "eye.slash", titulo: "Sin nombre", nota: "Publica sin firmar",
                 color: AgoraDesign.Colors.maiz, tinta: AgoraDesign.Colors.sobreMaiz),
    AccesoCampus(ruta: "buscar", icono: "magnifyingglass", titulo: "Buscar", nota: "Personas y publicaciones", color: AgoraDesign.Colors.talavera),
    AccesoCampus(ruta: "guardados", icono: "bookmark", titulo: "Guardados", nota: "Para ver después", color: AgoraDesign.Colors.adobe),
]

/// Campus (antes «Más»), artboard «Campus · accesos y "Tu día"»: los accesos del campus, la racha y
/// los retos, y tu cuenta. Con el Feed B se abre desde el menú de tu perfil. Paridad con `MasScreen.kt`.
struct MasView: View {
    let onNavigate: (String) -> Void
    let onTerminos: () -> Void
    let onReglas: () -> Void
    let onPrivacidad: () -> Void
    let onLogout: () -> Void
    /// Globo en la fila «Mensajes» (`GET mensajes/no-leidos`).
    var mensajesSinLeer: Int = 0

    @EnvironmentObject var session: SessionStore

    private let columnas = [
        GridItem(.flexible(), spacing: 8),
        GridItem(.flexible(), spacing: 8),
    ]

    var body: some View {
        ScrollView {
            CabezaCholula(titulo: "Campus", subtitulo: "Todo lo de la UDLAP, a un toque")
            VStack(alignment: .leading, spacing: 0) {
                LazyVGrid(columns: columnas, spacing: 10) {
                    ForEach(accesosCampus) { acceso in
                        tile(acceso)
                    }
                }

                titulo("Tu día")
                VStack(spacing: 8) {
                    TarjetaRachaD()
                    RetoSemanalBanner()
                    RetosAmigosRow()
                    RetosRankingSemanalRow(onPerfilTap: { handle in onNavigate("perfil/\(handle)") })
                    LeaderboardRachasRow(onPerfilTap: { handle in onNavigate("perfil/\(handle)") })
                    CampusPulseBanner(
                        onHashtagTap: { tag in onNavigate("hashtag/\(tag)") },
                        onPerfilTap: { handle in onNavigate("perfil/\(handle)") }
                    )
                }

                titulo("Tu cuenta")
                VStack(spacing: 0) {
                    fila("Mi perfil", ruta: "perfil-yo")
                    Divider().overlay(AgoraDesign.Colors.borde)
                    fila("Mensajes", ruta: "mensajes", cuenta: mensajesSinLeer)
                    Divider().overlay(AgoraDesign.Colors.borde)
                    fila("Ajustes", ruta: "ajustes")
                    if session.currentUser?.puedeModerar == true {
                        Divider().overlay(AgoraDesign.Colors.borde)
                        fila("Moderación", ruta: "moderacion")
                    }
                }
                .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous))

                HStack(spacing: AgoraDesign.Spacing.xs) {
                    Spacer(minLength: 0)
                    Button("Términos", action: onTerminos)
                        .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                    Text("·")
                        .foregroundStyle(AgoraDesign.Colors.textoMuted)
                    Button("Reglas", action: onReglas)
                        .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                        .accessibilityLabel("Reglas de la comunidad")
                    Text("·")
                        .foregroundStyle(AgoraDesign.Colors.textoMuted)
                    Button("Privacidad", action: onPrivacidad)
                        .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                    Spacer(minLength: 0)
                }
                .font(.outfit(.subheadline))
                .frame(minHeight: 44)
                .padding(.top, 12)

                Button(role: .destructive, action: onLogout) {
                    Text("Cerrar sesión")
                        .font(.outfit(.subheadline, .semibold))
                        .foregroundStyle(AgoraDesign.Colors.danger)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
                }
                .buttonStyle(.agoraPlain)
                .padding(.top, 4)

                VStack(spacing: AgoraDesign.Spacing.xs) {
                    AgoraIsotipo(tamano: 28)
                    AgoraCreditoLegal()
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 20)
            }
            .padding(.horizontal, 14)
            .padding(.top, 12)
            .padding(.bottom, 16)
        }
        .background(AgoraDesign.Colors.fondo)
        // Se abre desde el menú de tu perfil: barra con «atrás», el título grande va en la pantalla.
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func titulo(_ texto: String) -> some View {
        Text(texto)
            .font(.bricolage(20, relativeTo: .title3))
            .foregroundStyle(AgoraDesign.Colors.texto)
            .accessibilityAddTraits(.isHeader)
            .padding(.horizontal, 4)
            .padding(.top, 22)
            .padding(.bottom, 10)
    }

    private func tile(_ acceso: AccesoCampus) -> some View {
        Button {
            onNavigate(acceso.ruta)
        } label: {
            // B «Cholula»: cuadro de color con el ícono y terrazas del mismo color de fondo.
            VStack(alignment: .leading, spacing: 0) {
                Image(systemName: acceso.icono)
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(acceso.tinta)
                    .frame(width: 40, height: 40)
                    .background(acceso.color, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .accessibilityHidden(true)
                Spacer(minLength: 10)
                Text(acceso.titulo)
                    .font(.bricolage(16, relativeTo: .callout))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                Text(acceso.nota)
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
            .frame(maxWidth: .infinity, minHeight: 90, alignment: .leading)
            .padding(14)
            .background(alignment: .bottomTrailing) {
                Terrazas(niveles: 3)
                    .fill(acceso.color.opacity(0.18))
                    .frame(width: 90, height: 48)
                    .offset(x: 6, y: 4)
            }
            .background(AgoraDesign.Colors.superficie)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
            }
        }
        .buttonStyle(.agoraPlain)
        .accessibilityIdentifier("mas.\(acceso.ruta)")
        .accessibilityLabel("\(acceso.titulo): \(acceso.nota)")
    }

    private func fila(_ texto: String, ruta: String, cuenta: Int = 0) -> some View {
        Button {
            onNavigate(ruta)
        } label: {
            HStack(spacing: 10) {
                Text(texto)
                    .font(.outfit(.callout))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                Spacer()
                if cuenta > 0 {
                    Text(cuenta > 99 ? "99+" : "\(cuenta)")
                        .font(.outfit(.caption2, .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(AgoraDesign.Colors.naranja, in: Capsule())
                        .accessibilityLabel("\(cuenta) sin leer")
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .accessibilityHidden(true)
            }
            .padding(.horizontal, 18)
            .frame(minHeight: 52)
            .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .accessibilityIdentifier("mas.\(ruta)")
    }
}

/// Racha en la tarjeta oscura de «Tu día»: días seguidos, la mejor y cómo va el campus.
private struct TarjetaRachaD: View {
    @State private var datos: GamificacionDto?

    var body: some View {
        VStack(spacing: 0) {
            if let datos {
                HStack(spacing: 14) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color(red: 1, green: 138 / 255, blue: 76 / 255))
                        .frame(width: 52, height: 52)
                        .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(datos.rachaActual) \(datos.rachaActual == 1 ? "día" : "días") de racha")
                            .font(.bricolage(22, relativeTo: .title2))
                            .foregroundStyle(.white)
                        Text(detalle(datos))
                            .font(.outfit(.footnote))
                            .foregroundStyle(Color.white.opacity(0.75))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 16)
                .background(
                    Color(red: 20 / 255, green: 17 / 255, blue: 15 / 255),
                    in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous)
                )
                .accessibilityElement(children: .combine)
            }
        }
        .task { datos = try? await AgoraApi.gamificacionMio() }
    }

    private func detalle(_ datos: GamificacionDto) -> String {
        var partes = ["Mejor: \(datos.rachaMaxima)"]
        if let promedio = datos.comparacionCampus?.promedioRacha {
            partes.append("el campus va en \(Int(promedio.rounded()))")
        }
        return partes.joined(separator: " · ") + ". Contesta la pregunta de hoy para seguir."
    }
}
