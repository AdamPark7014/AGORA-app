import SwiftUI

/// Texto con hashtags tappeables — paridad con `TextoConHashtags` en `PostCard.kt`.
struct TextoConHashtags: View {
    let texto: String
    var onHashtagTap: (String) -> Void = { _ in }
    var onBackgroundTap: (() -> Void)?

    var body: some View {
        Text(attributed)
            .font(.body)
            .foregroundStyle(AgoraDesign.Colors.texto)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .onTapGesture { onBackgroundTap?() }
            .environment(\.openURL, OpenURLAction { url in
                if url.scheme == "hashtag", let tag = url.host {
                    onHashtagTap(tag)
                    return .handled
                }
                return .systemAction
            })
    }

    private var attributed: AttributedString {
        var result = AttributedString()
        let pattern = /#(\w+)/
        var lastIndex = texto.startIndex

        for match in texto.matches(of: pattern) {
            if lastIndex < match.range.lowerBound {
                result.append(AttributedString(texto[lastIndex..<match.range.lowerBound]))
            }

            let hashtag = String(match.output.0)
            let tag = String(match.output.1)
            var fragment = AttributedString(hashtag)
            fragment.foregroundColor = AgoraDesign.Colors.naranja
            fragment.font = .body.bold()
            fragment.link = URL(string: "hashtag://\(tag)")
            result.append(fragment)

            lastIndex = match.range.upperBound
        }

        if lastIndex < texto.endIndex {
            result.append(AttributedString(texto[lastIndex...]))
        }

        return result
    }
}
