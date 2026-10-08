import SwiftUI

/// Banner del reto semanal — paridad con `RetoSemanalBanner.kt`.
struct RetoSemanalBanner: View {
    @State private var reto: RetoSemanalDto?
    @State private var celebrando = false
    @State private var confettiTrigger = 0
    @AppStorage("agora.retoSemanalConfettiMostrado") private var confettiMostrado = false

    var body: some View {
        // VStack y no Group: los modificadores de un Group se aplican a cada hijo,
        // y con el contenido vacío `.task` nunca se disparaba (el banner no cargaba).
        VStack(spacing: 0) {
            if let reto {
                ZStack {
                    bannerContent(reto)
                        .scaleEffect(celebrando ? 1.03 : 1)
                        .animation(AgoraDesign.Animation.spring, value: celebrando)

                    ConfettiView(trigger: confettiTrigger)
                }
            }
        }
        .task { await cargar() }
        .onReceive(NotificationCenter.default.publisher(for: .gamificacionRefresh)) { _ in
            Task { await cargar() }
        }
    }

    @ViewBuilder
    private func bannerContent(_ actual: RetoSemanalDto) -> some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            HStack {
                Text(actual.titulo)
                    .font(.caption.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
                Spacer()
                if actual.completado {
                    Text("⭐").font(.title3)
                }
            }

            Text(actual.completado
                ? "¡Semana perfecta! Respondiste las 7 preguntas."
                : "Responde la pregunta del día cada día esta semana.")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AgoraDesign.Colors.texto)

            progresoBar(progreso: actual.progreso, meta: actual.meta, completado: actual.completado)
        }
        .padding(AgoraDesign.Spacing.sm + 2)
        .background(
            LinearGradient(
                colors: [
                    AgoraDesign.Colors.naranjaSuave,
                    AgoraDesign.Colors.superficie,
                    AgoraDesign.Colors.naranjaSuave.opacity(0.6),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
    }

    @ViewBuilder
    private func progresoBar(progreso: Int, meta: Int, completado: Bool) -> some View {
        let metaSegura = max(meta, 1)
        let fraccion = min(1, Double(progreso) / Double(metaSegura))

        VStack(alignment: .leading, spacing: 4) {
            Text("\(progreso)/\(metaSegura) preguntas")
                .font(.caption2)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(AgoraDesign.Colors.borde)
                    Capsule()
                        .fill(completado ? AgoraDesign.Colors.success : AgoraDesign.Colors.naranja)
                        .frame(width: geo.size.width * fraccion)
                }
            }
            .frame(height: 6)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(progreso) de \(metaSegura) preguntas esta semana")
            .accessibilityValue("\(Int(fraccion * 100)) por ciento")
        }
    }

    private func cargar() async {
        do {
            let data = try await AgoraApi.gamificacionMio()
            let nuevoReto = data.retoSemanal

            if let nuevoReto, !nuevoReto.completado, nuevoReto.progreso == 0 {
                confettiMostrado = false
            }

            if let nuevoReto, nuevoReto.completado, !confettiMostrado {
                confettiMostrado = true
                confettiTrigger += 1
                celebrando = true
                Haptics.success()
                try? await Task.sleep(nanoseconds: 400_000_000)
                celebrando = false
            }

            reto = nuevoReto
        } catch {
            reto = nil
        }
    }
}
