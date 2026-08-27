import SwiftUI

/// Banner interactivo de pregunta del día — paridad con `PreguntaDelDiaBanner.kt`.
struct PreguntaDelDiaBanner: View {
    @State private var pregunta: PreguntaHoyDto?
    @State private var respondiendo = false
    @State private var celebrando = false
    @State private var confettiTrigger = 0

    var body: some View {
        Group {
            if let pregunta {
                ZStack {
                    bannerContent(pregunta)
                        .scaleEffect(celebrando ? 1.03 : 1)
                        .animation(AgoraDesign.Animation.spring, value: celebrando)

                    ConfettiView(trigger: confettiTrigger)
                }
            }
        }
        .task { await cargar() }
    }

    @ViewBuilder
    private func bannerContent(_ actual: PreguntaHoyDto) -> some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            HStack {
                Text("Pregunta del día")
                    .font(.caption.bold())
                    .foregroundStyle(AgoraDesign.Colors.naranja)
                Spacer()
                if celebrando {
                    Text("🎉").font(.title3)
                }
            }

            Text(actual.texto)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AgoraDesign.Colors.texto)

            if let semana = actual.semanaPregunta {
                progresoSemana(semana)
            }

            if actual.yaRespondi {
                resultados(actual)
            } else {
                opciones(actual)
            }
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
    private func progresoSemana(_ semana: SemanaPreguntaDto) -> some View {
        let meta = max(semana.meta, 1)
        let progreso = min(1, Double(semana.respondidas) / Double(meta))

        VStack(alignment: .leading, spacing: 4) {
            Text("Esta semana: \(semana.respondidas)/\(semana.meta) días")
                .font(.caption2)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(AgoraDesign.Colors.borde)
                    Capsule()
                        .fill(AgoraDesign.Colors.naranja)
                        .frame(width: geo.size.width * progreso)
                }
            }
            .frame(height: 6)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(semana.respondidas) de \(semana.meta) días esta semana")
            .accessibilityValue("\(Int(progreso * 100)) por ciento")
        }
    }

    @ViewBuilder
    private func opciones(_ actual: PreguntaHoyDto) -> some View {
        ForEach(actual.opciones ?? []) { opcion in
            Button {
                Task { await responder(actual: actual, opcion: opcion.indice) }
            } label: {
                Text(opcion.texto)
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, AgoraDesign.Spacing.sm)
                    .padding(.vertical, 10)
                    .background(AgoraDesign.Colors.superficie)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
            }
            .buttonStyle(.plain)
            .disabled(respondiendo)
        }
    }

    @ViewBuilder
    private func resultados(_ actual: PreguntaHoyDto) -> some View {
        let total = max(actual.total ?? 1, 1)
        ForEach(actual.opciones ?? []) { opcion in
            let votos = opcion.votos ?? 0
            let pct = votos * 100 / total
            let seleccionada = opcion.indice == actual.miOpcion
            HStack {
                Text(opcion.texto)
                    .font(.caption)
                    .fontWeight(seleccionada ? .bold : .regular)
                Spacer()
                Text("\(pct)%")
                    .font(.caption2)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
            .padding(.horizontal, AgoraDesign.Spacing.sm)
            .padding(.vertical, 10)
            .background(
                seleccionada
                    ? AgoraDesign.Colors.superficie
                    : AgoraDesign.Colors.superficie.opacity(0.7)
            )
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small))
        }
        Text("\(actual.total ?? 0) respuestas")
            .font(.caption2)
            .foregroundStyle(AgoraDesign.Colors.textoMedio)
    }

    private func cargar() async {
        do {
            pregunta = try await AgoraApi.preguntaHoy()
        } catch {
            pregunta = nil
        }
    }

    private func responder(actual: PreguntaHoyDto, opcion: Int) async {
        respondiendo = true
        defer { respondiendo = false }
        do {
            let resp = try await AgoraApi.responderPregunta(id: actual.id, opcion: opcion)
            pregunta = resp
            GamificacionEvents.notifyPingResult(nuevas: resp.nuevasInsignias ?? [])
            Haptics.success()
            celebrando = true
            confettiTrigger += 1
            try? await Task.sleep(nanoseconds: 400_000_000)
            celebrando = false
        } catch {
            // Silencioso si falla.
        }
    }
}
