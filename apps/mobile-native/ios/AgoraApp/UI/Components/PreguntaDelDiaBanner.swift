import SwiftUI

/// Banner interactivo de pregunta del día — paridad con `PreguntaDelDiaBanner.kt`.
struct PreguntaDelDiaBanner: View {
    @State private var pregunta: PreguntaHoyDto?
    @State private var respondiendo = false
    @State private var celebrando = false
    @State private var confettiTrigger = 0

    var body: some View {
        // VStack y no Group: los modificadores de un Group se aplican a cada hijo,
        // y con el contenido vacío `.task` nunca se disparaba (el banner no cargaba).
        VStack(spacing: 0) {
            if let pregunta {
                if Self.esperando(pregunta) {
                    tarjetaEsperando
                } else {
                    ZStack {
                        bannerContent(pregunta)
                            .scaleEffect(celebrando ? 1.03 : 1)
                            .animation(AgoraDesign.Animation.spring, value: celebrando)

                        ConfettiView(trigger: confettiTrigger)
                    }
                }
            }
        }
        .task { await cargar() }
        // Antes de la hora sorpresa: se vuelve a pedir justo cuando cae.
        .task(id: pregunta?.abreAt) {
            guard let pregunta, Self.esperando(pregunta),
                  let abre = Self.fecha(pregunta.abreAt) else { return }
            let falta = max(abre.timeIntervalSinceNow + 0.5, 0)
            try? await Task.sleep(nanoseconds: UInt64(falta * 1_000_000_000))
            if !Task.isCancelled { await cargar() }
        }
    }

    private var tarjetaEsperando: some View {
        VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
            Text("Pregunta del día")
                .font(.caption.bold())
                .foregroundStyle(AgoraDesign.Colors.naranja)
            Text("⚡ Hoy cae a una hora sorpresa.")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AgoraDesign.Colors.texto)
            Text("Te avisamos en cuanto salga. Contesta en los primeros 2 minutos y sales a tiempo; antes de contestar no ves lo que dijeron los demás.")
                .font(.caption)
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AgoraDesign.Spacing.sm + 2)
        .background(AgoraDesign.Colors.naranjaSuave)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
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

            if !actual.yaRespondi, let hasta = Self.fecha(actual.aTiempoHasta), hasta > Date() {
                // Cuenta regresiva de la ventana "a tiempo"; al terminar desaparece sola.
                TimelineView(.periodic(from: .now, by: 1)) { contexto in
                    let falta = hasta.timeIntervalSince(contexto.date)
                    if falta > 0 {
                        Text("⚡ \(Self.mmss(falta)) para contestar a tiempo")
                            .font(.caption.bold())
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                    }
                }
            }
            if actual.yaRespondi, let aTiempo = actual.aTiempo, actual.abreAt != nil {
                Text((aTiempo ? "⚡ Contestaste a tiempo" : "Contestaste tarde")
                     + (actual.totalATiempo.map { " · \($0) a tiempo hoy" } ?? ""))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(aTiempo ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.textoMedio)
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
            .buttonStyle(.agoraPlain)
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
                Text("\(pct)%" + Self.textoCarrera(actual.miCarrera, indice: opcion.indice))
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
        Text(Self.pieResultados(actual))
            .font(.caption2)
            .foregroundStyle(AgoraDesign.Colors.textoMedio)
    }

    private static func esperando(_ p: PreguntaHoyDto) -> Bool {
        p.abierta == false && fecha(p.abreAt) != nil
    }

    private static func fecha(_ iso: String?) -> Date? {
        guard let iso else { return nil }
        let conFraccion = ISO8601DateFormatter()
        conFraccion.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return conFraccion.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    }

    private static func mmss(_ segundos: TimeInterval) -> String {
        let s = max(0, Int(segundos.rounded(.up)))
        return "\(s / 60):" + String(format: "%02d", s % 60)
    }

    private static func textoCarrera(_ carrera: MiCarreraPreguntaDto?, indice: Int) -> String {
        guard let carrera, carrera.total > 0 else { return "" }
        let votos = carrera.votos[String(indice)] ?? 0
        return " · tu carrera \(votos * 100 / carrera.total)%"
    }

    private static func pieResultados(_ p: PreguntaHoyDto) -> String {
        let total = p.total ?? 0
        guard let carrera = p.miCarrera, carrera.total > 0 else {
            return "\(total) de tu comunidad ya contestaron hoy."
        }
        return "\(total) de tu comunidad ya contestaron hoy, \(carrera.total) de \(carrera.nombre)."
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
