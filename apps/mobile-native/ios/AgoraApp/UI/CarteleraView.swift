import SwiftUI

// MARK: - Eventos: «Cartelera» (B «Cholula», docs/diseno-cholula.md §4, artboard WowB-Eventos)

/// Colores de un cartel por tipo de evento: FIESTA adobe, DEPORTIVO talavera, CULTURAL jade,
/// ACADEMICO maíz y ORGANIZACION/OTRO `superficie2`.
private struct ColoresCartel {
    let fondo: Color
    let tinta: Color

    static func de(tipo: String) -> ColoresCartel {
        switch tipo {
        case "FIESTA": return ColoresCartel(fondo: AgoraDesign.Colors.adobe, tinta: .white)
        case "DEPORTIVO": return ColoresCartel(fondo: AgoraDesign.Colors.talavera, tinta: .white)
        case "CULTURAL": return ColoresCartel(fondo: AgoraDesign.Colors.jade, tinta: .white)
        case "ACADEMICO": return ColoresCartel(fondo: AgoraDesign.Colors.maiz, tinta: AgoraDesign.Colors.sobreMaiz)
        default: return ColoresCartel(fondo: AgoraDesign.Colors.superficie2, tinta: AgoraDesign.Colors.texto)
        }
    }
}

/// Filtro por tipo (`GET eventos?tipo=`), igual que el select de la web; cuadrito del color del cartel.
private let filtrosCartelera: [(valor: String, etiqueta: String)] = [
    ("", "Todos"),
    ("FIESTA", "Fiesta"),
    ("DEPORTIVO", "Deportivo"),
    ("CULTURAL", "Cultural"),
    ("ACADEMICO", "Académico"),
    ("ORGANIZACION", "Organización"),
    ("OTRO", "Otro"),
]

struct EventosView: View {
    var onEventoTap: (String) -> Void = { _ in }
    var onCreateTap: () -> Void = {}

    @State private var eventos: [EventoDto] = []
    @State private var cargando = true
    @State private var error: String?
    @State private var tipo = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                encabezado
                filtros
                contenido
                    .padding(.horizontal, 12)
                    .padding(.bottom, 16)
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .barraDeEstadoOpaca(AgoraDesign.Colors.fondo)
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await cargar() }
        .task(id: tipo) { await cargar() }
    }

    /// «Octubre» del mes en curso (sin «semana N» hasta que exista la API del semestre).
    private static func mesActual() -> String {
        let formato = DateFormatter()
        formato.locale = Locale(identifier: "es_MX")
        formato.timeZone = FormatUtils.zona
        formato.dateFormat = "LLLL"
        let mes = formato.string(from: Date())
        return mes.prefix(1).uppercased() + mes.dropFirst()
    }

    private var encabezado: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Cartelera")
                    .font(.bricolage(32, relativeTo: .largeTitle))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .accessibilityAddTraits(.isHeader)
                Text(Self.mesActual())
                    .font(.outfit(.footnote, .medium))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
            Spacer(minLength: 8)
            Button(action: onCreateTap) {
                Image(systemName: "plus")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(AgoraDesign.Colors.sobreBoton)
                    .frame(width: 44, height: 44)
                    .background(AgoraDesign.Colors.boton, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.agoraPlain)
            .accessibilityLabel("Crear evento")
            .accessibilityIdentifier("eventos.crear")
        }
        .padding(.leading, 16)
        .padding(.trailing, 10)
        .padding(.top, 16)
        .padding(.bottom, 12)
    }

    private var filtros: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(filtrosCartelera, id: \.valor) { filtro in
                    let activo = tipo == filtro.valor
                    Button {
                        tipo = filtro.valor
                    } label: {
                        HStack(spacing: 6) {
                            if !filtro.valor.isEmpty {
                                RoundedRectangle(cornerRadius: 2, style: .continuous)
                                    .fill(ColoresCartel.de(tipo: filtro.valor).fondo)
                                    .frame(width: 8, height: 8)
                                    .overlay {
                                        RoundedRectangle(cornerRadius: 2, style: .continuous)
                                            .stroke(AgoraDesign.Colors.borde, lineWidth: filtro.valor == "ORGANIZACION" || filtro.valor == "OTRO" ? 1 : 0)
                                    }
                                    .accessibilityHidden(true)
                            }
                            Text(filtro.etiqueta)
                                .font(.outfit(.footnote, .semibold))
                                .lineLimit(1)
                        }
                        .foregroundStyle(activo ? AgoraDesign.Colors.fondo : AgoraDesign.Colors.texto)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 34)
                        .background(activo ? AgoraDesign.Colors.texto : AgoraDesign.Colors.superficie,
                                    in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(activo ? AgoraDesign.Colors.texto : AgoraDesign.Colors.borde, lineWidth: 1)
                        }
                    }
                    .buttonStyle(.agoraPlain)
                    .accessibilityAddTraits(activo ? .isSelected : [])
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
        }
    }

    @ViewBuilder
    private var contenido: some View {
        if cargando && eventos.isEmpty {
            ProgressView()
                .tint(AgoraDesign.Colors.naranja)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 60)
        } else if let error, eventos.isEmpty {
            AgoraErrorState(message: error) {
                Task { await cargar() }
            }
        } else if eventos.isEmpty {
            AgoraEmptyState(
                emoji: "",
                title: AgoraCopy.eventosEmptyTitle,
                subtitle: AgoraCopy.eventosEmptySubtitle
            )
        } else {
            VStack(spacing: 10) {
                if let primero = eventos.first {
                    CartelEvento(evento: primero, grande: true) { onEventoTap(primero.id) }
                }
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    ForEach(eventos.dropFirst()) { evento in
                        CartelEvento(evento: evento, grande: false) { onEventoTap(evento.id) }
                    }
                }
            }
            .animation(AgoraDesign.Animation.spring, value: eventos.map(\.id))
        }
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.eventosProximos(tipo: tipo.isEmpty ? nil : tipo)
            eventos = resp.eventos ?? []
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

// MARK: - Cartel

/// Un cartel de la cartelera: número del día gigante, día (y hora en el grande), título y lugar.
/// El grande es el próximo evento; si es hoy, lleva la cuenta regresiva y quién va.
private struct CartelEvento: View {
    let evento: EventoDto
    let grande: Bool
    let onTap: () -> Void

    private var colores: ColoresCartel { ColoresCartel.de(tipo: evento.tipo) }
    private var inicio: Date? { FormatUtils.parseISO(evento.inicioAt) }

    private var esHoy: Bool {
        guard let inicio else { return false }
        var calendario = Calendar(identifier: .gregorian)
        calendario.timeZone = FormatUtils.zona
        return calendario.isDateInToday(inicio) && inicio > Date()
    }

    /// «JUE · 22:00» en el grande; «SÁB» (y el mes si no es el actual) en los chicos.
    private var etiquetaDia: String {
        guard let partes = FormatUtils.partesFecha(evento.inicioAt) else { return "" }
        if grande { return "\(partes.dia) · \(partes.hora)" }
        guard let inicio else { return partes.dia }
        var calendario = Calendar(identifier: .gregorian)
        calendario.timeZone = FormatUtils.zona
        if calendario.isDate(inicio, equalTo: Date(), toGranularity: .month) { return partes.dia }
        let formato = DateFormatter()
        formato.locale = Locale(identifier: "es_MX")
        formato.timeZone = FormatUtils.zona
        formato.dateFormat = "MMM"
        let mes = formato.string(from: inicio).replacingOccurrences(of: ".", with: "").uppercased()
        return "\(partes.dia) · \(mes)"
    }

    private var detalle: String {
        var partes: [String] = []
        if let lugar = evento.lugar, !lugar.isEmpty { partes.append(lugar) }
        if grande {
            if let costo = evento.costoMxn, costo > 0 {
                partes.append("$" + FormatUtils.formatearPrecio(costo))
            } else {
                partes.append("Gratis")
            }
        } else if let hora = FormatUtils.partesFecha(evento.inicioAt)?.hora {
            partes.append(hora)
        }
        return partes.joined(separator: " · ")
    }

    private var descripcionAccesible: String {
        var texto = "\(evento.titulo), \(FormatUtils.formatearFecha(evento.inicioAt))"
        if let lugar = evento.lugar, !lugar.isEmpty { texto += ", \(lugar)" }
        if let van = evento.vanAIr, van > 0 { texto += ", \(van) van" }
        return texto
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(FormatUtils.partesFecha(evento.inicioAt)?.numero ?? "")
                        .font(.bricolage(grande ? 110 : 70, relativeTo: .largeTitle))
                        .tracking(-3)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                    Text(etiquetaDia)
                        .font(.outfit(.caption, .bold))
                        .tracking(1.4)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                VStack(alignment: .leading, spacing: 4) {
                    if grande && esHoy, let inicio {
                        cuentaRegresiva(hasta: inicio)
                    }
                    Text(evento.titulo)
                        .font(.bricolage(grande ? 24 : 17, relativeTo: grande ? .title2 : .headline))
                        .lineLimit(grande ? 2 : 3)
                        .multilineTextAlignment(.leading)
                    if !detalle.isEmpty {
                        Text(detalle)
                            .font(.outfit(.caption, .medium))
                            .opacity(0.92)
                            .lineLimit(2)
                    }
                    if grande {
                        quienVa
                    }
                }
            }
            .foregroundStyle(colores.tinta)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .padding(16)
            .frame(height: grande ? 250 : 200)
            .background(colores.fondo)
            .background(alignment: .topLeading) { motivo }
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(.agoraPlain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(descripcionAccesible)
        .accessibilityAddTraits(.isButton)
    }

    /// Motivo de cada tipo: terrazas en fiesta y cultural, franja de azulejo en deportivo,
    /// terrazas naranjas chicas en organización y otro, nada en académico (como el artboard).
    @ViewBuilder
    private var motivo: some View {
        switch evento.tipo {
        case "FIESTA":
            Terrazas(niveles: 4)
                .fill(Color.white.opacity(0.25))
                .frame(width: grande ? 210 : 120, height: grande ? 120 : 68)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .offset(x: 14, y: 6)
        case "DEPORTIVO":
            Talavera(lado: 18)
                .frame(height: 18)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        case "CULTURAL":
            Terrazas(niveles: 3)
                .fill(Color.white.opacity(0.25))
                .frame(width: 90, height: 50)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .offset(x: 8, y: 10)
        case "ACADEMICO":
            EmptyView()
        default:
            Terrazas(niveles: 3)
                .fill(AgoraDesign.Colors.naranja)
                .frame(width: 40, height: 22)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(.top, 12)
                .padding(.trailing, 10)
        }
    }

    /// «EMPIEZA EN 2:14:08» con el punto vivo, solo para el evento de hoy que aún no empieza.
    private func cuentaRegresiva(hasta inicio: Date) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { contexto in
            let falta = max(0, Int(inicio.timeIntervalSince(contexto.date).rounded(.up)))
            HStack(spacing: 6) {
                Circle()
                    .fill(colores.tinta)
                    .frame(width: 7, height: 7)
                Text("EMPIEZA EN \(falta / 3600):" + String(format: "%02d:%02d", (falta % 3600) / 60, falta % 60))
                    .font(.outfit(.caption, .bold).monospacedDigit())
                    .tracking(1)
            }
            .padding(.horizontal, 10)
            .frame(height: 26)
            .background(colores.tinta.opacity(0.18), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .padding(.bottom, 4)
        }
    }

    /// Hasta tres de los que van (primero gente que sigues) y «N van».
    @ViewBuilder
    private var quienVa: some View {
        let van = evento.vanAIr ?? 0
        if van > 0 {
            HStack(spacing: 8) {
                HStack(spacing: -6) {
                    ForEach(Array((evento.asistentes ?? []).prefix(3).enumerated()), id: \.offset) { _, persona in
                        AvatarD(nombre: persona.nombre ?? persona.handle ?? "?", fotoUrl: persona.fotoUrl, tamano: 24)
                            .overlay {
                                RoundedRectangle(cornerRadius: 24 * AgoraDesign.Radii.avatar / 40, style: .continuous)
                                    .stroke(colores.fondo, lineWidth: 2)
                            }
                    }
                }
                Text(van == 1 ? "1 va" : "\(van) van")
                    .font(.outfit(.caption, .semibold))
            }
            .padding(.top, 6)
        }
    }
}
