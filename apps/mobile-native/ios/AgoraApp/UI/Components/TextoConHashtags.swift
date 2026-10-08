import Foundation
import SwiftUI

/// Texto con #hashtags y @menciones tocables — paridad con `TextoConHashtags`
/// en `PostCard.kt` y `TextoConMenciones` (web, `partirTextoSocial`).
struct TextoConHashtags: View {
    let texto: String
    var onHashtagTap: (String) -> Void = { _ in }
    var onBackgroundTap: (() -> Void)?
    /// Toque en una @mención (handle en minúsculas, sin arroba).
    var onMencionTap: ((String) -> Void)?

    /// Mismo patrón que `TOKEN` en `packages/shared/src/texto-social.ts`.
    private static let patron: NSRegularExpression? = try? NSRegularExpression(
        pattern: "(@[a-z][a-z0-9_]{2,29}|#[\\p{L}\\p{N}_]{2,40})",
        options: [.caseInsensitive]
    )

    private static let esquema = "agora-texto"

    var body: some View {
        Text(attributed)
            .font(.body)
            .foregroundStyle(AgoraDesign.Colors.texto)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .onTapGesture { onBackgroundTap?() }
            .environment(\.openURL, OpenURLAction { url in
                guard url.scheme == Self.esquema,
                      let comps = URLComponents(url: url, resolvingAgainstBaseURL: false),
                      let valor = comps.queryItems?.first(where: { $0.name == "v" })?.value,
                      !valor.isEmpty
                else { return .systemAction }
                if comps.host == "hashtag" {
                    onHashtagTap(valor)
                    return .handled
                }
                if comps.host == "mencion", let onMencionTap {
                    onMencionTap(valor)
                    return .handled
                }
                return .discarded
            })
    }

    private var attributed: AttributedString {
        var result = AttributedString()
        guard let patron = Self.patron else {
            return AttributedString(texto)
        }
        let nsTexto = texto as NSString
        let coincidencias = patron.matches(
            in: texto,
            options: [],
            range: NSRange(location: 0, length: nsTexto.length)
        )
        var ultimo = 0

        for coincidencia in coincidencias {
            let rango = coincidencia.range
            if rango.location > ultimo {
                let previo = nsTexto.substring(with: NSRange(location: ultimo, length: rango.location - ultimo))
                result.append(AttributedString(previo))
            }

            let token = nsTexto.substring(with: rango)
            let esMencion = token.hasPrefix("@")
            let valor = esMencion ? String(token.dropFirst()).lowercased() : String(token.dropFirst())
            var fragmento = AttributedString(token)
            fragmento.foregroundColor = AgoraDesign.Colors.naranja
            fragmento.font = .body.bold()
            if !esMencion || onMencionTap != nil {
                fragmento.link = enlace(tipo: esMencion ? "mencion" : "hashtag", valor: valor)
            }
            result.append(fragmento)

            ultimo = rango.location + rango.length
        }

        if ultimo < nsTexto.length {
            result.append(AttributedString(nsTexto.substring(from: ultimo)))
        }

        return result
    }

    private func enlace(tipo: String, valor: String) -> URL? {
        var comps = URLComponents()
        comps.scheme = Self.esquema
        comps.host = tipo
        comps.queryItems = [URLQueryItem(name: "v", value: valor)]
        return comps.url
    }
}
