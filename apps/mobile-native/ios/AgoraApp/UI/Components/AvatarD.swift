import SwiftUI

/// Avatar del diseño D: cuadrado redondeado (radio 14 a 40 pt, proporcional en otros tamaños),
/// foto si la hay y, si no, iniciales sobre naranja suave.
struct AvatarD: View {
    let nombre: String
    var fotoUrl: String?
    var tamano: CGFloat = 40
    /// Borde del color de fondo para apilarlos («quién va», «lo siguen»).
    var conBorde = false

    private var radio: CGFloat { tamano * AgoraDesign.Radii.avatar / 40 }

    private var iniciales: String {
        let partes = nombre.split(separator: " ").prefix(2)
        let letras = partes.compactMap(\.first).map(String.init).joined()
        return letras.isEmpty ? "?" : letras.uppercased()
    }

    var body: some View {
        Group {
            if let url = ApiClient.shared.resolveUrl(fotoUrl) {
                AsyncImage(url: url) { fase in
                    if case .success(let imagen) = fase {
                        imagen.resizable().scaledToFill()
                    } else {
                        relleno
                    }
                }
            } else {
                relleno
            }
        }
        .frame(width: tamano, height: tamano)
        .clipShape(RoundedRectangle(cornerRadius: radio, style: .continuous))
        .overlay {
            if conBorde {
                RoundedRectangle(cornerRadius: radio, style: .continuous)
                    .stroke(AgoraDesign.Colors.superficie, lineWidth: 2)
            }
        }
        .accessibilityLabel(nombre)
    }

    private var relleno: some View {
        ZStack {
            AgoraDesign.Colors.naranjaSuave
            Text(iniciales)
                .font(.system(size: tamano * 0.36, weight: .bold))
                .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
        }
    }
}
