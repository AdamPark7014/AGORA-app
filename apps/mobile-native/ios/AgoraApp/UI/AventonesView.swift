import SwiftUI

private struct FiltroSentido: Identifiable {
    var id: String { valor }
    let valor: String
    let etiqueta: String
}

private let filtrosSentido: [FiltroSentido] = [
    FiltroSentido(valor: "", etiqueta: "Todos"),
    FiltroSentido(valor: "A_CAMPUS", etiqueta: "→ Campus"),
    FiltroSentido(valor: "DESDE_CAMPUS", etiqueta: "← Desde campus"),
]

/// Valores de `SENTIDOS_AVENTON` en `packages/contracts`.
private let sentidosAventon: [(valor: String, etiqueta: String)] = [
    ("A_CAMPUS", "Hacia el campus"),
    ("DESDE_CAMPUS", "Desde el campus"),
]

private struct NuevoAventonForm {
    var sentido = "A_CAMPUS"
    var origen = ""
    var destino = "Campus UDLAP"
    var salidaAt: Date = mananaTemprano()
    var lugares = "3"
    var cuotaMxn = "25"
    var nota = ""
}

/// Aventones de B «Cholula» (artboard WowB-Aventones): «Boletos de ida y vuelta», cada viaje como un
/// boleto con talón de color, precio y apartar — paridad con `AventonesScreen.kt`.
struct AventonesView: View {
    var onPerfil: (String) -> Void = { _ in }
    /// Abre el chat con el conductor (id de conversación de `POST mensajes/abrir`).
    var onMensaje: (String) -> Void = { _ in }

    @State private var aventones: [AventonDto] = []
    @State private var sentido = ""
    @State private var cargando = true
    @State private var error: String?
    @State private var mostrarModal = false
    @State private var enviando = false
    @State private var nuevo = NuevoAventonForm()
    @State private var contactando: String?

    var body: some View {
        VStack(spacing: 0) {
            CabezaCholula(titulo: "Aventones", subtitulo: "Boletos de ida y vuelta") {
                BotonCabeza(titulo: "Ofrecer") { mostrarModal = true }
                    .accessibilityLabel("Ofrecer un aventón")
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(filtrosSentido) { filtro in
                        filtroChip(filtro.etiqueta, selected: sentido == filtro.valor) {
                            sentido = filtro.valor
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }

            Group {
                if cargando && aventones.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if aventones.isEmpty {
                    if let error {
                        AgoraErrorState(message: error) {
                            Task { await cargar() }
                        }
                    } else {
                        AgoraEmptyState(
                            emoji: "",
                            title: AgoraCopy.aventonesEmptyTitle,
                            subtitle: AgoraCopy.aventonesEmptySubtitle,
                            actionLabel: AgoraCopy.ctaPublicarAlgo,
                            onAction: { mostrarModal = true }
                        )
                    }
                } else {
                    List(aventones) { aventon in
                        AventonCardView(
                            aventon: aventon,
                            onApartar: { Task { await apartar(aventon) } },
                            onCancelar: { Task { await cancelar(aventon) } },
                            onPerfil: onPerfil,
                            onContactar: { handle in Task { await contactar(handle: handle, aventonId: aventon.id) } },
                            contactando: contactando == aventon.id
                        )
                        .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 12, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await cargar() }
        .onChange(of: sentido) { _ in Task { await cargar() } }
        .task { await cargar() }
        .sheet(isPresented: $mostrarModal) {
            NavigationStack {
                formularioNuevoAventon
            }
            .presentationDetents([.medium, .large])
        }
    }

    private var formularioNuevoAventon: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AgoraDesign.Spacing.sm) {
                Text("Nuevo aventón")
                    .font(.bricolage(.title2, extra: false))

                // Agrupado: en iOS 16 un ViewBuilder admite como máximo 10 hijos por bloque.
                Group {
                    Picker("Sentido", selection: Binding(
                        get: { nuevo.sentido },
                        set: { cambiarSentido($0) }
                    )) {
                        ForEach(sentidosAventon, id: \.valor) { opcion in
                            Text(opcion.etiqueta).tag(opcion.valor)
                        }
                    }
                    .pickerStyle(.segmented)

                    TextField("Salgo de", text: $nuevo.origen)
                        .textFieldStyle(.roundedBorder)
                    TextField("Llego a", text: $nuevo.destino)
                        .textFieldStyle(.roundedBorder)

                    // La API acepta hasta 15 min en el pasado; aquí se pide desde ahora.
                    DatePicker(
                        "Salida",
                        selection: $nuevo.salidaAt,
                        in: Date()...,
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    .tint(AgoraDesign.Colors.naranja)
                }

                TextField("Lugares", text: Binding(
                    get: { nuevo.lugares },
                    set: { nuevo.lugares = $0.filter(\.isNumber) }
                ))
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.numberPad)
                TextField("Cuota MXN", text: Binding(
                    get: { nuevo.cuotaMxn },
                    set: { nuevo.cuotaMxn = $0.filter(\.isNumber) }
                ))
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.numberPad)
                TextField("Nota (opcional)", text: $nuevo.nota)
                    .textFieldStyle(.roundedBorder)

                if let error {
                    Text(error)
                        .font(.outfit(.footnote))
                        .foregroundStyle(AgoraDesign.Colors.danger)
                }

                Button {
                    Task { await crear() }
                } label: {
                    HStack {
                        Spacer()
                        if enviando { ProgressView().tint(.white) }
                        else { Text("Publicar").fontWeight(.semibold) }
                        Spacer()
                    }
                    .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(AgoraDesign.Colors.naranja)
                .disabled(
                    enviando
                        || nuevo.origen.trimmingCharacters(in: .whitespacesAndNewlines).count < 2
                        || nuevo.destino.trimmingCharacters(in: .whitespacesAndNewlines).count < 2
                )

                Button("Cancelar") { mostrarModal = false }
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)
            }
            .padding(AgoraDesign.Spacing.md)
        }
        .navigationTitle("Ofrecer ride")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func filtroChip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        // Píldora de B «Cholula»: radio 10, activa en `tinta`.
        Button(action: action) {
            Text(label)
                .font(.outfit(.footnote, .semibold))
                .lineLimit(1)
                .padding(.horizontal, 14)
                .frame(minHeight: 34)
                .foregroundStyle(selected ? AgoraDesign.Colors.fondo : AgoraDesign.Colors.texto)
                .background(selected ? AgoraDesign.Colors.texto : AgoraDesign.Colors.superficie,
                            in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(selected ? AgoraDesign.Colors.texto : AgoraDesign.Colors.borde, lineWidth: 1)
                }
        }
        .buttonStyle(.agoraPlain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func cargar() async {
        cargando = true
        error = nil
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.aventones(sentido: sentido.isEmpty ? nil : sentido)
            aventones = resp.aventones ?? []
        } catch {
            self.error = FormatUtils.mensajeDe(error)
            aventones = []
        }
    }

    /// Como la web: al invertir el sentido se intercambian origen y destino,
    /// para no volver a escribir «Campus UDLAP».
    private func cambiarSentido(_ valor: String) {
        guard valor != nuevo.sentido else { return }
        let origen = nuevo.origen
        nuevo.origen = nuevo.destino
        nuevo.destino = origen
        nuevo.sentido = valor
    }

    private func crear() async {
        guard let lugares = Int(nuevo.lugares), let cuota = Int(nuevo.cuotaMxn) else { return }
        enviando = true
        error = nil
        defer { enviando = false }
        do {
            let resp = try await AgoraApi.crearAventon(
                CrearAventonRequest(
                    sentido: nuevo.sentido,
                    origen: nuevo.origen.trimmingCharacters(in: .whitespacesAndNewlines),
                    destino: nuevo.destino.trimmingCharacters(in: .whitespacesAndNewlines),
                    salidaAt: FormatUtils.isoConZona(nuevo.salidaAt),
                    lugares: lugares,
                    cuotaMxn: cuota,
                    nota: nuevo.nota.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : nuevo.nota.trimmingCharacters(in: .whitespacesAndNewlines)
                )
            )
            GamificacionEvents.notifyPingResult(nuevas: resp.nuevasInsignias ?? [])
            mostrarModal = false
            nuevo = NuevoAventonForm()
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func apartar(_ aventon: AventonDto) async {
        do {
            _ = try await AgoraApi.apartarAsiento(aventonId: aventon.id)
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func contactar(handle: String, aventonId: String) async {
        guard contactando == nil else { return }
        contactando = aventonId
        error = nil
        defer { contactando = nil }
        do {
            let chat = try await AgoraApi.abrirConversacion(handle: handle)
            onMensaje(chat.id)
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func cancelar(_ aventon: AventonDto) async {
        do {
            try await AgoraApi.cancelarAventon(id: aventon.id)
            await cargar()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

private struct AventonCardView: View {
    let aventon: AventonDto
    let onApartar: () -> Void
    let onCancelar: () -> Void
    let onPerfil: (String) -> Void
    var onContactar: (String) -> Void = { _ in }
    var contactando = false
    @Environment(\.colorScheme) private var esquema

    private var libres: Int { max(0, aventon.lugares - aventon.ocupados) }

    /// Talón por sentido: al campus Talavera, desde el campus adobe, otro maíz.
    private var colorTalon: (fondo: Color, tinta: Color) {
        switch aventon.sentido {
        case "A_CAMPUS": return (AgoraDesign.Colors.talavera, .white)
        case "DESDE_CAMPUS": return (AgoraDesign.Colors.adobe, .white)
        default: return (AgoraDesign.Colors.maiz, AgoraDesign.Colors.sobreMaiz)
        }
    }

    /// «MAR 27 OCT · 7:00» con la hora del campus.
    private var salida: String {
        guard let fecha = FormatUtils.parseISO(aventon.salidaAt) else { return FormatUtils.formatearFecha(aventon.salidaAt) }
        let formato = DateFormatter()
        formato.locale = Locale(identifier: "es_MX")
        formato.timeZone = FormatUtils.zona
        formato.dateFormat = "EEE d MMM"
        let dia = formato.string(from: fecha).replacingOccurrences(of: ".", with: "").uppercased()
        formato.dateFormat = "H:mm"
        return "\(dia) · \(formato.string(from: fecha))"
    }

    private var precio: String { aventon.cuotaMxn > 0 ? "$\(aventon.cuotaMxn)" : "Gratis" }

    var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text(salida)
                    .font(.outfit(.caption2, .bold))
                    .tracking(1)
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                (Text(aventon.origen) + Text("\n→ ").foregroundColor(AgoraDesign.Colors.naranjaTinta) + Text(aventon.destino))
                    .font(.bricolage(20, relativeTo: .title3))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityLabel("De \(aventon.origen) a \(aventon.destino)")
                HStack(spacing: 8) {
                    if let conductor = aventon.conductor {
                        Button {
                            if let handle = conductor.handle { onPerfil(handle) }
                        } label: {
                            HStack(spacing: 6) {
                                AvatarD(nombre: conductor.nombre ?? conductor.handle ?? "?", fotoUrl: conductor.fotoUrl, tamano: 26)
                                Text(conductor.handle ?? conductor.nombre ?? "Conductor")
                                    .font(.outfit(.caption, .medium))
                                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                                    .lineLimit(1)
                            }
                        }
                        .buttonStyle(.agoraPlain)
                    }
                    Spacer(minLength: 4)
                    lugaresVista
                }
                if let nota = aventon.nota, !nota.isEmpty {
                    Text(nota)
                        .font(.outfit(.footnote))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if aventon.esMio == true {
                    Button("Cancelar aventón", role: .destructive, action: onCancelar)
                        .font(.outfit(.footnote, .semibold))
                        .frame(minHeight: 32)
                } else if let handle = aventon.conductor?.handle {
                    Button {
                        onContactar(handle)
                    } label: {
                        HStack(spacing: 6) {
                            if contactando {
                                ProgressView()
                            } else {
                                Image(systemName: "bubble.left")
                                Text("Contactar")
                            }
                        }
                        .font(.outfit(.footnote, .semibold))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 32)
                        .background(AgoraDesign.Colors.superficie2, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .buttonStyle(.agoraPlain)
                    .disabled(contactando)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)

            talon
        }
        .fixedSize(horizontal: false, vertical: true)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(esquema == .dark ? 0.5 : 0.10), radius: 9, y: 6)
    }

    /// Barras de lugares, cada vez más altas; las libres en el color del talón.
    private var lugaresVista: some View {
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(0..<max(aventon.lugares, 1), id: \.self) { i in
                UnevenEscalon()
                    .fill(i >= aventon.ocupados ? colorTalon.fondo : AgoraDesign.Colors.borde)
                    .frame(width: 14, height: CGFloat(6 + min(i, 5) * 3))
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(libres == 1 ? "1 lugar libre" : "\(libres) lugares libres")
    }

    /// Talón de 84 con el precio y lo que toca: apartar, soltar tu lugar, lleno o tuyo.
    @ViewBuilder
    private var talon: some View {
        let accion: String = {
            if aventon.esMio == true { return "Tuyo" }
            if aventon.voyYo == true { return "Vas ✓" }
            return libres > 0 ? "Apartar" : "Lleno"
        }()
        let puedeTocar = aventon.esMio != true && (aventon.voyYo == true || libres > 0)
        Button(action: onApartar) {
            VStack(spacing: 4) {
                Text(precio)
                    .font(.bricolage(22, relativeTo: .title3))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text(accion)
                    .font(.outfit(.caption, .semibold))
            }
            .foregroundStyle(colorTalon.tinta)
            .padding(.horizontal, 6)
            .frame(width: 84)
            .frame(maxHeight: .infinity)
            .background(colorTalon.fondo)
            .overlay(alignment: .leading) {
                GeometryReader { geo in
                    Path { p in
                        p.move(to: CGPoint(x: 1, y: 0))
                        p.addLine(to: CGPoint(x: 1, y: geo.size.height))
                    }
                    .stroke(Color.white.opacity(0.55), style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
                }
                .frame(width: 2)
            }
            .overlay(alignment: .topLeading) { muesca.offset(x: -8, y: -8) }
            .overlay(alignment: .bottomLeading) { muesca.offset(x: -8, y: 8) }
        }
        .buttonStyle(.agoraPlain)
        .disabled(!puedeTocar)
        .accessibilityLabel("\(precio), \(accion)")
        .accessibilityHint(aventon.voyYo == true ? "Toca para soltar tu lugar" : "")
    }

    private var muesca: some View {
        Circle()
            .fill(AgoraDesign.Colors.fondo)
            .frame(width: 16, height: 16)
            .accessibilityHidden(true)
    }
}

/// Barra de lugar con las esquinas de arriba redondas.
private struct UnevenEscalon: Shape {
    func path(in r: CGRect) -> Path {
        let k = min(3, r.width / 2, r.height)
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX, y: r.minY + k))
        p.addQuadCurve(to: CGPoint(x: r.minX + k, y: r.minY), control: CGPoint(x: r.minX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX - k, y: r.minY))
        p.addQuadCurve(to: CGPoint(x: r.maxX, y: r.minY + k), control: CGPoint(x: r.maxX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}

/// Salida sugerida: mañana a las 7:30 (hora del centro de México).
private func mananaTemprano() -> Date {
    let respaldo = Date().addingTimeInterval(24 * 60 * 60)
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "America/Mexico_City") ?? .current
    guard let manana = cal.date(byAdding: .day, value: 1, to: Date()) else { return respaldo }
    var components = cal.dateComponents([.year, .month, .day], from: manana)
    components.hour = 7
    components.minute = 30
    components.second = 0
    return cal.date(from: components) ?? respaldo
}
