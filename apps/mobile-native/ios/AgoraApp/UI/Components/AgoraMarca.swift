import SwiftUI

/// Isotipo de Ágora (asset vectorial `Isotipo`) con el nombre debajo.
/// Sustituye al círculo con «Á» que se usaba antes.
struct AgoraMarca: View {
    var tamano: CGFloat = 80
    var conNombre = true
    var conLema = false

    var body: some View {
        VStack(spacing: AgoraDesign.Spacing.sm) {
            AgoraIsotipo(tamano: tamano)
            if conNombre {
                Text(AgoraCopy.appName)
                    .font(.bricolage(.largeTitle, extra: false))
                    .foregroundStyle(AgoraDesign.Colors.texto)
            }
            if conLema {
                Text(AgoraCopy.appTagline)
                    .font(.outfit(.subheadline))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}

/// Solo el isotipo (escuadra naranja con la «Á»).
struct AgoraIsotipo: View {
    var tamano: CGFloat = 80

    var body: some View {
        Image("Isotipo")
            .resizable()
            .scaledToFit()
            .frame(width: tamano, height: tamano)
            .accessibilityLabel(AgoraCopy.appName)
    }
}

/// Pie legal: no afiliación con la UDLAP + crédito con enlace a Zynora Tek.
struct AgoraCreditoLegal: View {
    var body: some View {
        VStack(spacing: AgoraDesign.Spacing.xxs) {
            Text(AgoraCopy.legalNoAfiliada)
                .font(.outfit(.caption2))
                .foregroundStyle(AgoraDesign.Colors.textoMuted)
                .multilineTextAlignment(.center)
            HStack(spacing: 4) {
                Text(AgoraCopy.creditoPrefijo)
                    .foregroundStyle(AgoraDesign.Colors.textoMuted)
                if let url = URL(string: AgoraCopy.creditoUrl) {
                    Link(AgoraCopy.creditoNombre, destination: url)
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                } else {
                    Text(AgoraCopy.creditoNombre)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }
            }
            .font(.outfit(.caption2))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AgoraDesign.Spacing.xs)
    }
}

// MARK: - Enlaces públicos para compartir (rutas de `apps/web/app`)

enum EnlacesWeb {
    static func publicacion(_ id: String) -> URL? { url("/publicacion/\(id)") }
    static func evento(_ id: String) -> URL? { url("/eventos/\(id)") }
    static func anuncio(_ id: String) -> URL? { url("/marketplace/\(id)") }
    static func perfil(_ handle: String) -> URL? { url("/perfil/\(handle)") }

    private static func url(_ ruta: String) -> URL? {
        let segura = ruta.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? ruta
        return URL(string: AgoraCopy.webBase + segura)
    }
}

// MARK: - Apariencia (Ajustes → Sistema / Claro / Oscuro)

enum AgoraTema: String, CaseIterable, Identifiable {
    case sistema
    case claro
    case oscuro

    /// Clave de `@AppStorage` compartida entre la raíz y Ajustes.
    static let claveAlmacen = "agora.apariencia"

    /// Claro mientras la persona no elija otra cosa en Ajustes (regla de Adam, 26-10-2026).
    static let porOmision: AgoraTema = .claro

    var id: String { rawValue }

    var etiqueta: String {
        switch self {
        case .sistema: return "Sistema"
        case .claro: return "Claro"
        case .oscuro: return "Oscuro"
        }
    }

    /// `nil` = seguir al sistema.
    var esquema: ColorScheme? {
        switch self {
        case .sistema: return nil
        case .claro: return .light
        case .oscuro: return .dark
        }
    }
}
