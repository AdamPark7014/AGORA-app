import SwiftUI

/// Top rachas del campus — paridad con `leaderboard-rachas.tsx`.
struct LeaderboardRachasRow: View {
    var onPerfilTap: (String) -> Void = { _ in }

    @State private var entradas: [LeaderboardEntryDto] = []
    @State private var miPosicion: Int?
    @State private var pulsandoPosicion = false
    @AppStorage("agora.leaderboardUltimaPosicion") private var ultimaPosicion = 0

    private let medallas = ["🥇", "🥈", "🥉"]

    var body: some View {
        Group {
            if !entradas.isEmpty || miPosicion != nil {
                VStack(alignment: .leading, spacing: 10) {
                    Text("🔥 Top rachas del campus")
                        .font(.subheadline.bold())
                        .foregroundStyle(AgoraDesign.Colors.naranja)

                    Text("Los más constantes del momento — ¿te sumas mañana?")
                        .font(.caption)
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)

                    if let posicion = miPosicion {
                        miPosicionChip(posicion)
                    }

                    if !entradas.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(Array(entradas.enumerated()), id: \.element.id) { index, entrada in
                                    leaderboardCard(entrada, medalla: medallas.indices.contains(index) ? medallas[index] : "#\(index + 1)")
                                }
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

    private func miPosicionChip(_ posicion: Int) -> some View {
        Text("Tu posición: #\(posicion) en el campus")
            .font(.caption.bold())
            .foregroundStyle(AgoraDesign.Colors.naranja)
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, 6)
            .background(AgoraDesign.Colors.naranjaSuave)
            .clipShape(Capsule())
            .scaleEffect(pulsandoPosicion ? 1.08 : 1)
            .animation(
                pulsandoPosicion
                    ? .easeInOut(duration: 0.45).repeatCount(3, autoreverses: true)
                    : .default,
                value: pulsandoPosicion
            )
            .accessibilityLabel("Tu posición es número \(posicion) en el campus")
    }

    private func leaderboardCard(_ entrada: LeaderboardEntryDto, medalla: String) -> some View {
        Button {
            onPerfilTap(entrada.handle)
        } label: {
            VStack(spacing: 6) {
                Text(medalla)
                    .font(.caption)

                leaderboardAvatar(nombre: entrada.nombre)

                Text(entrada.nombre.split(separator: " ").first.map(String.init) ?? entrada.nombre)
                    .font(.caption.bold())
                    .lineLimit(1)

                Text("🔥 \(entrada.rachaActual) \(entrada.rachaActual == 1 ? "día" : "días")")
                    .font(.caption.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(AgoraDesign.Colors.fondo)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
        }
        .buttonStyle(.plain)
    }

    private func leaderboardAvatar(nombre: String) -> some View {
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
            let resp = try await AgoraApi.gamificacionLeaderboard(limite: 5)
            entradas = resp.entradas

            if let nuevaPosicion = resp.miPosicion {
                if ultimaPosicion > 0, nuevaPosicion < ultimaPosicion {
                    pulsandoPosicion = true
                    Haptics.success()
                    try? await Task.sleep(nanoseconds: 1_400_000_000)
                    pulsandoPosicion = false
                }
                ultimaPosicion = nuevaPosicion
                miPosicion = nuevaPosicion
            } else {
                miPosicion = nil
            }
        } catch {
            entradas = []
            miPosicion = nil
        }
    }
}
