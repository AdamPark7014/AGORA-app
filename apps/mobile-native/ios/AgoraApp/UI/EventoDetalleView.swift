import EventKit
import EventKitUI
import SwiftUI

private let etiquetasTipoEvento: [String: String] = [
    "FIESTA": "Fiesta",
    "ACADEMICO": "Académico",
    "DEPORTIVO": "Deportivo",
    "CULTURAL": "Cultural",
    "ORGANIZACION": "Organización",
    "OTRO": "Otro",
]

/// La portada es del tipo de evento: la API no guarda imagen de portada.
private let iconosTipoEvento: [String: String] = [
    "FIESTA": "sparkles",
    "ACADEMICO": "graduationcap",
    "DEPORTIVO": "sportscourt",
    "CULTURAL": "theatermasks",
    "ORGANIZACION": "person.3",
]

/// Detalle de evento del diseño D (docs/diseno-d.md §4) — paridad con `EventoDetalleScreen.kt`.
/// La API solo acepta VOY / ME_INTERESA; repetir la misma respuesta la retira.
struct EventoDetalleView: View {
    let eventoId: String
    var onPerfil: (String) -> Void = { _ in }
    var onBorrado: () -> Void = {}
    /// Tarjeta «Aventones»: la lista general (la API no liga aventones con eventos).
    var onAventones: () -> Void = {}

    @State private var evento: EventoDetalleDto?
    @State private var cargando = true
    @State private var error: String?
    @State private var respondiendo = false
    @State private var agregandoCalendario = false

    var body: some View {
        Group {
            if cargando && evento == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error, evento == nil {
                AgoraErrorState(message: error) {
                    Task { await cargar() }
                }
            } else if let evento {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        portada(evento)
                        encabezado(evento)
                        quienVa(evento)
                        HStack(alignment: .top, spacing: 8) {
                            if let lugar = evento.lugar, !lugar.isEmpty {
                                comoLlegar(lugar)
                            }
                            tarjetaAventones
                        }
                        if let descripcion = evento.descripcion, !descripcion.isEmpty {
                            Text(descripcion)
                                .font(.outfit(.body))
                                .foregroundStyle(AgoraDesign.Colors.texto)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        organiza(evento)
                        if evento.esMio == true {
                            Button(role: .destructive) {
                                Task { await borrar() }
                            } label: {
                                Text("Eliminar evento")
                                    .font(.outfit(.subheadline))
                            }
                        }
                        if let error {
                            Text(error)
                                .font(.outfit(.footnote))
                                .foregroundStyle(AgoraDesign.Colors.danger)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.top, 8)
                    .padding(.bottom, 16)
                }
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    barraAcciones(evento)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Evento")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if let url = EnlacesWeb.evento(eventoId) {
                    ShareLink(item: url, subject: Text(evento?.titulo ?? "Evento en Ágora")) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Compartir evento")
                }
            }
        }
        .task(id: eventoId) { await cargar() }
        .sheet(isPresented: $agregandoCalendario) {
            if let evento, let inicio = Self.fecha(evento.inicioAt) {
                EditorCalendario(
                    titulo: evento.titulo,
                    inicio: inicio,
                    fin: evento.finAt.flatMap(Self.fecha),
                    lugar: evento.lugar,
                    notas: evento.descripcion,
                    url: EnlacesWeb.evento(evento.id)
                ) {
                    agregandoCalendario = false
                }
                .ignoresSafeArea()
            }
        }
    }

    // MARK: - Piezas

    private func portada(_ evento: EventoDetalleDto) -> some View {
        let inicio = Self.fecha(evento.inicioAt)
        return ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(AgoraDesign.Colors.naranjaSuave)
                .overlay {
                    Image(systemName: iconosTipoEvento[evento.tipo] ?? "calendar")
                        .font(.system(size: 84, weight: .light))
                        .foregroundStyle(AgoraDesign.Colors.naranjaTinta.opacity(0.55))
                }
                .frame(height: 210)
                .accessibilityHidden(true)

            if let inicio {
                VStack(spacing: 2) {
                    Text(Self.formato(inicio, "EEE").uppercased())
                        .font(.outfit(.caption2, .bold))
                        .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                    Text(Self.formato(inicio, "d"))
                        .font(.bricolage(.title))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                    Text(Self.formato(inicio, "MMM").uppercased())
                        .font(.outfit(.caption2))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }
                .frame(width: 60, height: 66)
                .background(
                    AgoraDesign.Colors.superficie,
                    in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.foto, style: .continuous)
                )
                .padding(12)
                .accessibilityHidden(true)
            }
        }
    }

    private func encabezado(_ evento: EventoDetalleDto) -> some View {
        let etiqueta = [etiquetasTipoEvento[evento.tipo] ?? evento.tipo, evento.comunidad?.nombre]
            .compactMap { $0 }
            .joined(separator: " · ")
        return VStack(alignment: .leading, spacing: 6) {
            Text(etiqueta.uppercased())
                .font(.outfit(.caption, .bold))
                .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(AgoraDesign.Colors.naranjaSuave, in: Capsule())
            Text(evento.titulo)
                .font(.bricolage(.title))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            Text(Self.detalles(evento))
                .font(.outfit(.subheadline))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
        }
    }

    private func quienVa(_ evento: EventoDetalleDto) -> some View {
        let van = evento.vanAIr ?? 0
        let asistentes = evento.asistentes ?? []
        let nombres = asistentes.prefix(2).compactMap { $0.nombre?.split(separator: " ").first.map(String.init) }
        let resto = van - nombres.count
        let texto: String
        if van == 0 {
            texto = "Nadie ha dicho que va todavía"
        } else if !nombres.isEmpty {
            let quienes = nombres.joined(separator: ", ")
            texto = resto > 0 ? "\(quienes) y \(resto) más van" : (nombres.count == 1 ? "\(quienes) va" : "\(quienes) van")
        } else {
            texto = "\(van) van"
        }

        return HStack(spacing: 10) {
            if !asistentes.isEmpty {
                HStack(spacing: -8) {
                    ForEach(Array(asistentes.prefix(3).enumerated()), id: \.offset) { _, persona in
                        AvatarD(nombre: persona.nombre ?? persona.handle ?? "?", fotoUrl: persona.fotoUrl, tamano: 32, conBorde: true)
                    }
                }
                .accessibilityHidden(true)
            }
            Text(texto)
                .font(.outfit(.subheadline))
                .foregroundStyle(AgoraDesign.Colors.texto)
            Spacer(minLength: 0)
            if let cupo = evento.cupo {
                let libres = max(0, cupo - van)
                Text(libres == 0 ? "Lleno" : "\(libres) \(libres == 1 ? "lugar" : "lugares")")
                    .font(.outfit(.caption, .bold))
                    .foregroundStyle(libres == 0 ? AgoraDesign.Colors.danger : AgoraDesign.Colors.success)
            }
        }
        .padding(12)
        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private func comoLlegar(_ lugar: String) -> some View {
        let consulta = "\(lugar), San Andrés Cholula, Puebla"
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "https://maps.apple.com/?q=\(consulta)") {
            Link(destination: url) {
                tarjetaAccion(icono: "mappin.and.ellipse", titulo: lugar, accion: "Cómo llegar")
            }
            .accessibilityHint("Abre Mapas")
        }
    }

    /// Sin número: la API del evento no dice cuántos aventones hay (igual que Android).
    private var tarjetaAventones: some View {
        Button(action: onAventones) {
            tarjetaAccion(icono: "car", titulo: "Aventones", accion: "Busca o comparte uno")
        }
        .buttonStyle(.agoraPlain)
    }

    /// Tarjeta de la cuadrícula del evento (artboard Evento): ícono, título y acción en naranja.
    private func tarjetaAccion(icono: String, titulo: String, accion: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: icono)
                .font(.system(size: 18, weight: .regular))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .accessibilityHidden(true)
            Text(titulo)
                .font(.outfit(.subheadline, .semibold))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
            Text(accion)
                .font(.outfit(.caption, .semibold))
                .foregroundStyle(AgoraDesign.Colors.naranjaOscuro)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.foto, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.foto, style: .continuous)
                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
        }
    }

    @ViewBuilder
    private func organiza(_ evento: EventoDetalleDto) -> some View {
        if let autor = evento.autor, let handle = autor.handle {
            Button {
                onPerfil(handle)
            } label: {
                HStack(spacing: 10) {
                    AvatarD(nombre: autor.nombre ?? handle, fotoUrl: autor.fotoUrl, tamano: 38)
                    (Text("Organiza ").foregroundColor(AgoraDesign.Colors.textoMedio)
                        + Text(autor.nombre ?? handle).bold().foregroundColor(AgoraDesign.Colors.texto))
                        .font(.outfit(.subheadline))
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .font(.outfit(.caption))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }
            }
            .buttonStyle(.agoraPlain)
        }
    }

    /// Barra fija de B «Cholula»: `superficie` con borde y sombra; Calendario, Me interesa y Voy en `boton`
    /// (ya vas: Talavera con la palomita).
    private func barraAcciones(_ evento: EventoDetalleDto) -> some View {
        let voy = evento.miRespuesta == "VOY"
        let meInteresa = evento.miRespuesta == "ME_INTERESA"
        return HStack(spacing: 8) {
            Button {
                Task { await abrirCalendario() }
            } label: {
                Image(systemName: "calendar.badge.plus")
                    .font(.system(size: 20, weight: .regular))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .frame(width: 50, height: 50)
                    .background(AgoraDesign.Colors.superficie2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.agoraPlain)
            .accessibilityLabel("Agregar a mi calendario")
            if evento.esMio == true {
                Text("Tú organizas este evento")
                    .font(.outfit(.subheadline))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .frame(maxWidth: .infinity, minHeight: 50)
            } else {
                Button {
                    Task { await responder("ME_INTERESA") }
                } label: {
                    Label("Me interesa", systemImage: meInteresa ? "checkmark" : "star")
                        .font(.outfit(.subheadline, .semibold))
                        .foregroundStyle(meInteresa ? AgoraDesign.Colors.naranjaTinta : AgoraDesign.Colors.texto)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 50)
                        .background(meInteresa ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie2,
                                    in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.agoraPlain)
                .accessibilityAddTraits(meInteresa ? .isSelected : [])

                Button {
                    Task { await responder("VOY") }
                } label: {
                    HStack(spacing: 6) {
                        if voy { Image(systemName: "checkmark") }
                        Text(voy ? "Vas" : "Voy")
                    }
                    .font(.outfit(.body, .bold))
                    .foregroundStyle(voy ? Color.white : AgoraDesign.Colors.sobreBoton)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(voy ? AgoraDesign.Colors.talavera : AgoraDesign.Colors.boton,
                                in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.agoraPlain)
                .accessibilityLabel(voy ? "Vas a este evento. Toca para quitarlo" : "Voy")
            }
        }
        .disabled(respondiendo)
        .padding(8)
        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.12), radius: 9, y: 6)
        .padding(.horizontal, 14)
        .padding(.bottom, 8)
    }

    /// En iOS 17 el editor del sistema no pide permiso; en iOS 16 hay que pedirlo antes.
    private func abrirCalendario() async {
        if #available(iOS 17.0, *) {
            agregandoCalendario = true
            return
        }
        let permitido = (try? await EKEventStore().requestAccess(to: .event)) ?? false
        if permitido {
            agregandoCalendario = true
        } else {
            error = "Ágora no tiene permiso para tu calendario. Actívalo en Ajustes del iPhone."
        }
    }

    // MARK: - Formatos

    private static func fecha(_ iso: String) -> Date? {
        let conFraccion = ISO8601DateFormatter()
        conFraccion.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return conFraccion.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    }

    private static func formato(_ fecha: Date, _ patron: String) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_MX")
        f.timeZone = TimeZone(identifier: "America/Mexico_City")
        f.dateFormat = patron
        return f.string(from: fecha).replacingOccurrences(of: ".", with: "")
    }

    /// «Sábado 25 de octubre · 22:00 a 03:00 · $150 · cupo 40»: solo lo que la API manda.
    private static func detalles(_ evento: EventoDetalleDto) -> String {
        var partes: [String] = []
        if let inicio = fecha(evento.inicioAt) {
            let dia = formato(inicio, "EEEE d 'de' MMMM")
            partes.append(dia.prefix(1).uppercased() + dia.dropFirst())
            let hora = formato(inicio, "HH:mm")
            if let finIso = evento.finAt, let fin = fecha(finIso) {
                partes.append("\(hora) a \(formato(fin, "HH:mm"))")
            } else {
                partes.append(hora)
            }
        }
        if let costo = evento.costoMxn {
            partes.append(costo == 0 ? "Gratis" : "$" + FormatUtils.formatearPrecio(costo))
        }
        if let cupo = evento.cupo { partes.append("cupo \(cupo)") }
        return partes.joined(separator: " · ")
    }

    // MARK: - Acciones

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            evento = try await AgoraApi.eventoDetalle(id: eventoId)
        } catch {
            if evento == nil { self.error = FormatUtils.mensajeDe(error) }
        }
    }

    private func responder(_ valor: String) async {
        error = nil
        respondiendo = true
        defer { respondiendo = false }
        do {
            try await AgoraApi.responderEvento(id: eventoId, respuesta: valor)
            AgoraAnalytics.eventoAsistencia(["eventoId": eventoId, "respuesta": valor])
            Haptics.success()
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func borrar() async {
        error = nil
        do {
            try await AgoraApi.borrarEvento(id: eventoId)
            onBorrado()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

/// Editor de eventos del sistema con los datos del evento ya puestos: la persona elige el
/// calendario y lo guarda (o lo cancela) sin salir de Ágora.
private struct EditorCalendario: UIViewControllerRepresentable {
    let titulo: String
    let inicio: Date
    let fin: Date?
    let lugar: String?
    let notas: String?
    let url: URL?
    let alTerminar: () -> Void

    func makeCoordinator() -> Coordinador { Coordinador(alTerminar: alTerminar) }

    func makeUIViewController(context: Context) -> EKEventEditViewController {
        let almacen = EKEventStore()
        let evento = EKEvent(eventStore: almacen)
        evento.title = titulo
        evento.startDate = inicio
        evento.endDate = fin ?? inicio.addingTimeInterval(2 * 3600)
        evento.location = lugar
        evento.notes = notas
        evento.url = url
        let editor = EKEventEditViewController()
        editor.eventStore = almacen
        editor.event = evento
        editor.editViewDelegate = context.coordinator
        return editor
    }

    func updateUIViewController(_ editor: EKEventEditViewController, context: Context) {}

    final class Coordinador: NSObject, EKEventEditViewDelegate {
        let alTerminar: () -> Void

        init(alTerminar: @escaping () -> Void) {
            self.alTerminar = alTerminar
        }

        func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
            alTerminar()
        }
    }
}
