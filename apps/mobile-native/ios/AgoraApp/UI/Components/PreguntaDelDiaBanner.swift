import SwiftUI

/// Pregunta relámpago del diseño D (docs/diseno-d.md §3): tarjeta oscura con rayo naranja,
/// «cierra en m:ss», opciones como barras de porcentaje (la mía en naranja) y abajo tu carrera
/// contra el campus. Misma lógica que antes; paridad con `PreguntaDelDiaBanner.kt`.
struct PreguntaDelDiaBanner: View {
    @State private var pregunta: PreguntaHoyDto?
    @State private var respondiendo = false
    @State private var celebrando = false
    @State private var confettiTrigger = 0

    /// Naranja claro sobre la tarjeta oscura (mismo en claro y oscuro).
    private static let naranjaClaro = Color(red: 1, green: 179 / 255, blue: 133 / 255)

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
                            .scaleEffect(celebrando ? 1.02 : 1)
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

    private func cabeza<Pildora: View>(@ViewBuilder pildora: () -> Pildora) -> some View {
        HStack {
            Label {
                Text("PREGUNTA RELÁMPAGO")
                    .font(.outfit(.caption, .bold))
                    .tracking(0.7)
            } icon: {
                Image(systemName: "bolt.fill")
                    .font(.outfit(.caption))
            }
            .foregroundStyle(Self.naranjaClaro)
            .accessibilityAddTraits(.isHeader)
            Spacer(minLength: 8)
            pildora()
        }
    }

    private func pildora(_ texto: String, resaltada: Bool = false) -> some View {
        Text(texto)
            .font(.outfit(.caption).monospacedDigit())
            .foregroundStyle(resaltada ? Self.naranjaClaro : .white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.white.opacity(0.12), in: Capsule())
    }

    private var tarjetaEsperando: some View {
        VStack(alignment: .leading, spacing: 10) {
            cabeza { EmptyView() }
            Text("Hoy cae a una hora sorpresa.")
                .font(.outfit(.title3, .bold))
                .foregroundStyle(.white)
            Text("Te avisamos en cuanto salga. Contesta en los primeros 2 minutos y sales a tiempo; antes de contestar no ves lo que dijeron los demás.")
                .font(.outfit(.footnote))
                .foregroundStyle(Color.white.opacity(0.75))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(AgoraDesign.Colors.oscuro, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous))
    }

    @ViewBuilder
    private func bannerContent(_ actual: PreguntaHoyDto) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            cabeza {
                if !actual.yaRespondi, let hasta = Self.fecha(actual.aTiempoHasta), hasta > Date() {
                    // Cuenta regresiva de la ventana "a tiempo"; al terminar desaparece sola.
                    TimelineView(.periodic(from: .now, by: 1)) { contexto in
                        let falta = hasta.timeIntervalSince(contexto.date)
                        if falta > 0 {
                            pildora("cierra en \(Self.mmss(falta))")
                        }
                    }
                } else if actual.yaRespondi, let aTiempo = actual.aTiempo, actual.abreAt != nil {
                    pildora(aTiempo ? "Contestaste a tiempo" : "Contestaste tarde", resaltada: aTiempo)
                } else if let semana = actual.semanaPregunta {
                    pildora("\(semana.respondidas)/\(semana.meta) esta semana")
                }
            }

            Text(actual.texto)
                .font(.outfit(.title3, .bold))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)

            VStack(spacing: 8) {
                ForEach(actual.opciones ?? []) { opcion in
                    opcionView(actual, opcion: opcion)
                }
            }

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(actual.yaRespondi ? (Self.comparacion(actual) ?? "") : "Contesta para ver qué dijeron los demás.")
                    .font(.outfit(.footnote))
                    .foregroundStyle(Color.white.opacity(0.75))
                Spacer(minLength: 0)
                if actual.yaRespondi {
                    let total = actual.total ?? 0
                    Text("\(total) \(total == 1 ? "respuesta" : "respuestas")")
                        .font(.outfit(.footnote, .semibold))
                        .foregroundStyle(Self.naranjaClaro)
                }
            }
        }
        .padding(18)
        .background(AgoraDesign.Colors.oscuro, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.card, style: .continuous))
    }

    private func opcionView(_ actual: PreguntaHoyDto, opcion: PreguntaOpcionDto) -> some View {
        let mia = opcion.indice == actual.miOpcion
        let total = max(actual.total ?? 0, 1)
        let pct = actual.yaRespondi ? (opcion.votos ?? 0) * 100 / total : 0

        return Button {
            Task { await responder(actual: actual, opcion: opcion.indice) }
        } label: {
            HStack(spacing: 8) {
                Text(mia ? "\(opcion.texto) · tu respuesta" : opcion.texto)
                    .fontWeight(mia ? .bold : .medium)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                if actual.yaRespondi {
                    Text("\(pct) %")
                        .fontWeight(.bold)
                        .monospacedDigit()
                }
            }
            .font(.outfit(.subheadline))
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(alignment: .leading) {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Color.white.opacity(0.08)
                        if actual.yaRespondi {
                            (mia ? AgoraDesign.Colors.naranja : Color.white.opacity(0.22))
                                .frame(width: geo.size.width * CGFloat(pct) / 100)
                        }
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .disabled(respondiendo || actual.yaRespondi)
        .accessibilityLabel(actual.yaRespondi ? "\(opcion.texto), \(pct) por ciento" : opcion.texto)
        .accessibilityAddTraits(mia ? .isSelected : [])
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

    /// «Sistemas votó 71 % Biblioteca · el campus 58 %»: la opción que más eligió tu carrera,
    /// comparada con todo el campus. Sin datos de carrera, cuántos contestaron a tiempo.
    private static func comparacion(_ p: PreguntaHoyDto) -> String? {
        let opciones = p.opciones ?? []
        if let carrera = p.miCarrera, carrera.total > 0,
           let favorita = opciones.max(by: {
               (carrera.votos[String($0.indice)] ?? 0) < (carrera.votos[String($1.indice)] ?? 0)
           }) {
            let deCarrera = (carrera.votos[String(favorita.indice)] ?? 0) * 100 / carrera.total
            let delCampus = (favorita.votos ?? 0) * 100 / max(p.total ?? 0, 1)
            return "\(carrera.nombre) votó \(deCarrera) % \(favorita.texto) · el campus \(delCampus) %"
        }
        if let aTiempo = p.totalATiempo, p.abreAt != nil {
            return "\(aTiempo) contestaron a tiempo"
        }
        return nil
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
