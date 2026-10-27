import SwiftUI

/// Pregunta del día con el estilo del artboard Main (Feed B no la define): tarjeta naranja muy
/// suave, «QUEDAN m:ss», opciones en cuadrícula de dos y, al contestar, barras de porcentaje (la
/// mía en naranja) con tu carrera contra el campus. Misma lógica que antes; paridad con
/// `PreguntaDelDiaBanner.kt`.
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

    private func cabeza<Derecha: View>(@ViewBuilder derecha: () -> Derecha) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text("PREGUNTA DEL DÍA")
                .font(.outfit(.caption, .bold))
                .tracking(0.5)
                .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                .accessibilityAddTraits(.isHeader)
            Spacer(minLength: 8)
            derecha()
        }
    }

    private func dato(_ texto: String, resaltado: Bool = false) -> some View {
        Text(texto)
            .font(.outfit(.caption, resaltado ? .bold : .regular).monospacedDigit())
            .foregroundStyle(resaltado ? AgoraDesign.Colors.naranjaOscuro : AgoraDesign.Colors.secundarioFeed)
    }

    private func tarjeta<Contenido: View>(@ViewBuilder _ contenido: () -> Contenido) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            contenido()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(AgoraDesign.Colors.preguntaFondo, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var tarjetaEsperando: some View {
        tarjeta {
            cabeza { EmptyView() }
            Text("Hoy cae a una hora sorpresa.")
                .font(.bricolage(18, relativeTo: .headline, extra: false))
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
            Text("Te avisamos en cuanto salga. Contesta en los primeros 2 minutos y sales a tiempo; antes de contestar no ves lo que dijeron los demás.")
                .font(.outfit(.footnote))
                .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private func bannerContent(_ actual: PreguntaHoyDto) -> some View {
        tarjeta {
            cabeza {
                if !actual.yaRespondi, let hasta = Self.fecha(actual.aTiempoHasta), hasta > Date() {
                    // Cuenta regresiva de la ventana "a tiempo"; al terminar desaparece sola.
                    TimelineView(.periodic(from: .now, by: 1)) { contexto in
                        let falta = hasta.timeIntervalSince(contexto.date)
                        if falta > 0 {
                            dato("QUEDAN \(Self.mmss(falta))", resaltado: true)
                        }
                    }
                } else if actual.yaRespondi {
                    let total = actual.total ?? 0
                    dato("\(total) \(total == 1 ? "respuesta" : "respuestas")")
                } else if let semana = actual.semanaPregunta {
                    dato("\(semana.respondidas)/\(semana.meta) esta semana")
                }
            }

            Text(actual.texto)
                .font(.bricolage(18, relativeTo: .headline, extra: false))
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                .fixedSize(horizontal: false, vertical: true)

            if actual.yaRespondi {
                VStack(spacing: 6) {
                    ForEach(actual.opciones ?? []) { opcion in
                        barra(actual, opcion: opcion)
                    }
                }
                Text(Self.comparacion(actual) ?? (actual.aTiempo == true ? "Contestaste a tiempo" : ""))
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
            } else {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                    ForEach(actual.opciones ?? []) { opcion in
                        boton(actual, opcion: opcion)
                    }
                }
            }
        }
    }

    private func boton(_ actual: PreguntaHoyDto, opcion: PreguntaOpcionDto) -> some View {
        Button {
            Task { await responder(actual: actual, opcion: opcion.indice) }
        } label: {
            Text(opcion.texto)
                .font(.outfit(.subheadline, .medium))
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(AgoraDesign.Colors.fondoFeed, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous)
                        .stroke(AgoraDesign.Colors.preguntaBorde, lineWidth: 1)
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.agoraPlain)
        .disabled(respondiendo)
        .accessibilityLabel(opcion.texto)
    }

    private func barra(_ actual: PreguntaHoyDto, opcion: PreguntaOpcionDto) -> some View {
        let mia = opcion.indice == actual.miOpcion
        let total = max(actual.total ?? 0, 1)
        let pct = (opcion.votos ?? 0) * 100 / total
        return HStack(spacing: 8) {
            Text(mia ? "\(opcion.texto) · tu respuesta" : opcion.texto)
                .fontWeight(mia ? .semibold : .regular)
                .multilineTextAlignment(.leading)
            Spacer(minLength: 8)
            Text("\(pct) %")
                .fontWeight(mia ? .semibold : .regular)
                .monospacedDigit()
        }
        .font(.outfit(.subheadline))
        .foregroundStyle(AgoraDesign.Colors.tintaFeed)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity, minHeight: 40)
        .background(alignment: .leading) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    AgoraDesign.Colors.fondoFeed.opacity(0.7)
                    (mia ? AgoraDesign.Colors.naranja.opacity(0.3) : AgoraDesign.Colors.secundarioFeed.opacity(0.14))
                        .frame(width: geo.size.width * CGFloat(pct) / 100)
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(opcion.texto), \(pct) por ciento")
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
