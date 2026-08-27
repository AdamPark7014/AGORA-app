import SwiftUI

/// Votación inline en encuestas de posts — paridad con `EncuestaBloque` en `PostCard.kt`.
struct EncuestaBloque: View {
    let encuesta: EncuestaDto
    let onVotar: (String) -> Void
    var votando: Bool = false

    private var votosTotales: Int {
        encuesta.opciones?.reduce(0) { $0 + ($1.votos ?? 0) } ?? 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(encuesta.pregunta)
                .font(.subheadline.weight(.semibold))

            ForEach(encuesta.opciones ?? [], id: \.id) { opcion in
                let pct = votosTotales > 0 ? (opcion.votos ?? 0) * 100 / votosTotales : 0
                Button {
                    onVotar(opcion.id)
                } label: {
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(AgoraDesign.Colors.fondo)
                        if pct > 0 {
                            GeometryReader { geo in
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(AgoraDesign.Colors.naranjaSuave)
                                    .frame(width: geo.size.width * CGFloat(pct) / 100)
                            }
                        }
                        Text("\(opcion.texto) · \(pct)%")
                            .font(.caption)
                            .foregroundStyle(AgoraDesign.Colors.texto)
                            .padding(.horizontal, 10)
                            .frame(maxWidth: .infinity, minHeight: 36, alignment: .leading)
                    }
                    .frame(height: 36)
                }
                .buttonStyle(.plain)
                .disabled(votando)
            }
        }
    }
}
