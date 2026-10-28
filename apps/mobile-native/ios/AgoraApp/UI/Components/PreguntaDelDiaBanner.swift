import SwiftUI

/// Pregunta del día como el «boleto» de B «Cholula» (docs/diseno-cholula.md §3, artboard WowB-Inicio):
/// tarjeta `superficie` de radio 18 con sombra; a la izquierda la pregunta y las opciones 2×2, a la derecha
/// un talón Talavera de 88 con borde punteado y muescas, «QUEDAN» + m:ss + «a tiempo». Al contestar,
/// barras (la mía en naranja) y el revelado de tu carrera contra el campus (`pregunta/hoy` → `miCarrera`).
/// Antes de la hora sorpresa, el mismo boleto con «HOY» y un reloj. Paridad con `PreguntaDelDiaBanner.kt`.
struct PreguntaDelDiaBanner: View {
    @State private var pregunta: PreguntaHoyDto?
    @State private var respondiendo = false
    @State private var celebrando = false
    @State private var confettiTrigger = 0
    @Environment(\.colorScheme) private var esquema

    var body: some View {
        // VStack y no Group: los modificadores de un Group se aplican a cada hijo,
        // y con el contenido vacío `.task` nunca se disparaba (el banner no cargaba).
        VStack(spacing: 0) {
            if let pregunta {
                if Self.esperando(pregunta) {
                    boleto {
                        izquierdaEsperando
                    } talon: {
                        talonHoy
                    }
                } else {
                    ZStack {
                        boleto {
                            izquierda(pregunta)
                        } talon: {
                            talon(pregunta)
                        }
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

    // MARK: Boleto

    private func boleto<Izquierda: View, Talon: View>(
        @ViewBuilder _ izquierda: () -> Izquierda,
        @ViewBuilder talon: () -> Talon
    ) -> some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 10) {
                Text("PREGUNTA DEL DÍA")
                    .font(.outfit(.caption2, .bold))
                    .tracking(1.1)
                    .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
                    .accessibilityAddTraits(.isHeader)
                izquierda()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)

            VStack(spacing: 2) {
                talon()
            }
            .foregroundStyle(.white)
            .frame(width: 88)
            .frame(maxHeight: .infinity)
            .background(AgoraDesign.Colors.talavera)
            .overlay(alignment: .leading) {
                LineaPunteada()
                    .stroke(Color.white.opacity(0.55), style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
                    .frame(width: 2)
            }
            .overlay(alignment: .topLeading) { muesca.offset(x: -9, y: -9) }
            .overlay(alignment: .bottomLeading) { muesca.offset(x: -9, y: 9) }
            .accessibilityElement(children: .combine)
        }
        .fixedSize(horizontal: false, vertical: true)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: .black.opacity(esquema == .dark ? 0.5 : 0.10), radius: 9, y: 6)
    }

    /// Medio círculo del color del fondo en el corte del talón, arriba y abajo.
    private var muesca: some View {
        Circle()
            .fill(AgoraDesign.Colors.fondoFeed)
            .frame(width: 18, height: 18)
            .accessibilityHidden(true)
    }

    private func etiquetaTalon(_ texto: String) -> some View {
        Text(texto)
            .font(.outfit(.caption2, .bold))
            .tracking(1.2)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
    }

    private func cifraTalon(_ texto: String) -> some View {
        Text(texto)
            .font(.bricolage(28, relativeTo: .title).monospacedDigit())
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }

    private func pieTalon(_ texto: String) -> some View {
        Text(texto)
            .font(.outfit(.caption))
            .lineLimit(1)
            .minimumScaleFactor(0.8)
    }

    // MARK: Esperando la hora sorpresa

    private var izquierdaEsperando: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Hoy cae a una hora sorpresa")
                .font(.bricolage(19, relativeTo: .headline))
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                .fixedSize(horizontal: false, vertical: true)
            Text("Te avisamos en cuanto salga. Contesta en los primeros 2 minutos y sales a tiempo; antes de contestar no ves lo que dijeron los demás.")
                .font(.outfit(.footnote))
                .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var talonHoy: some View {
        Group {
            etiquetaTalon("HOY")
            Image(systemName: "clock")
                .font(.system(size: 26, weight: .semibold))
                .padding(.vertical, 4)
                .accessibilityHidden(true)
            pieTalon("sorpresa")
        }
    }

    // MARK: Abierta

    @ViewBuilder
    private func izquierda(_ actual: PreguntaHoyDto) -> some View {
        Text(actual.texto)
            .font(.bricolage(19, relativeTo: .headline))
            .foregroundStyle(AgoraDesign.Colors.tintaFeed)
            .fixedSize(horizontal: false, vertical: true)

        if actual.yaRespondi {
            VStack(spacing: 6) {
                ForEach(actual.opciones ?? []) { opcion in
                    barra(actual, opcion: opcion)
                }
            }
            if let texto = Self.comparacion(actual) ?? (actual.aTiempo == true ? "Contestaste a tiempo" : nil) {
                Text(texto)
                    .font(.outfit(.footnote, .medium))
                    .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
                    .fixedSize(horizontal: false, vertical: true)
            }
        } else {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 6), GridItem(.flexible(), spacing: 6)], spacing: 6) {
                ForEach(actual.opciones ?? []) { opcion in
                    boton(actual, opcion: opcion)
                }
            }
        }
    }

    @ViewBuilder
    private func talon(_ actual: PreguntaHoyDto) -> some View {
        if !actual.yaRespondi, let hasta = Self.fecha(actual.aTiempoHasta), hasta > Date() {
            // Cuenta regresiva de la ventana «a tiempo»; al terminar el talón vuelve a «HOY».
            TimelineView(.periodic(from: .now, by: 1)) { contexto in
                let falta = hasta.timeIntervalSince(contexto.date)
                if falta > 0 {
                    VStack(spacing: 2) {
                        etiquetaTalon("QUEDAN")
                        cifraTalon(Self.mmss(falta))
                        pieTalon("a tiempo")
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Quedan \(Self.mmss(falta)) para contestar a tiempo")
                } else {
                    VStack(spacing: 2) { talonHoy }
                }
            }
        } else if actual.yaRespondi {
            let total = actual.total ?? 0
            etiquetaTalon(actual.aTiempo == true ? "A TIEMPO" : "LISTO")
            cifraTalon("\(total)")
            pieTalon(total == 1 ? "respuesta" : "respuestas")
        } else if let semana = actual.semanaPregunta {
            etiquetaTalon("SEMANA")
            cifraTalon("\(semana.respondidas)/\(semana.meta)")
            pieTalon("contestadas")
        } else {
            talonHoy
        }
    }

    private func boton(_ actual: PreguntaHoyDto, opcion: PreguntaOpcionDto) -> some View {
        Button {
            Task { await responder(actual: actual, opcion: opcion.indice) }
        } label: {
            Text(opcion.texto)
                .font(.outfit(.footnote, .semibold))
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 6)
                .frame(maxWidth: .infinity, minHeight: 40)
                .background(AgoraDesign.Colors.fondoFeed, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(AgoraDesign.Colors.bordeFeed, lineWidth: 1)
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
            Text(opcion.texto)
                .fontWeight(mia ? .semibold : .regular)
                .multilineTextAlignment(.leading)
                .lineLimit(2)
            Spacer(minLength: 6)
            Text("\(pct) %")
                .fontWeight(mia ? .bold : .regular)
                .monospacedDigit()
        }
        .font(.outfit(.footnote))
        .foregroundStyle(mia ? AgoraDesign.Colors.naranjaTinta : AgoraDesign.Colors.tintaFeed)
        .padding(.horizontal, 10)
        .frame(maxWidth: .infinity, minHeight: 36)
        .background(alignment: .leading) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    AgoraDesign.Colors.fondoFeed
                    (mia ? AgoraDesign.Colors.naranja.opacity(0.28) : AgoraDesign.Colors.secundarioFeed.opacity(0.14))
                        .frame(width: geo.size.width * CGFloat(pct) / 100)
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(mia ? "\(opcion.texto), \(pct) por ciento, tu respuesta" : "\(opcion.texto), \(pct) por ciento")
        .accessibilityAddTraits(mia ? .isSelected : [])
    }

    // MARK: Lógica (igual que antes)

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
            let nombre = NombreSello.corto(nombre: carrera.nombre, slug: "carrera:")
            return "\(nombre) votó \(deCarrera) % \(favorita.texto) · el campus \(delCampus) %"
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

/// Línea vertical al borde izquierdo del talón (se traza punteada).
private struct LineaPunteada: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addLine(to: CGPoint(x: r.midX, y: r.maxY))
        return p
    }
}
