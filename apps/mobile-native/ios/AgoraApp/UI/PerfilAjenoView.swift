import SwiftUI

/// Perfil de otro usuario — paridad con `PerfilAjenoScreen.kt`.
struct PerfilAjenoView: View {
    let handle: String
    var miHandle: String?
    var onMensaje: (String) -> Void = { _ in }
    var onAjustes: () -> Void = {}
    var onPostTap: (String) -> Void = { _ in }
    var onSeguidores: (String) -> Void = { _ in }
    var onSiguiendo: (String) -> Void = { _ in }
    var onEventoTap: (String) -> Void = { _ in }
    var onAventonesTap: () -> Void = {}
    /// Solo en «Tu perfil» (pestaña): el menú abre Campus (aventones, directorio, tu día, ajustes).
    var onCampus: (() -> Void)? = nil

    @State private var perfil: PerfilAjenoDto?
    @State private var gamificacion: GamificacionDto?
    @State private var publicaciones: [PerfilPublicacionDto] = []
    @State private var cursor: String?
    @State private var siguiendo = false
    @State private var bloqueado = false
    /// Silenciado: no ves sus publicaciones y no se le avisa.
    @State private var silenciado = false
    @State private var cargando = true
    @State private var ocupado = false
    @State private var error: String?
    @State private var puedeRetar = false
    @State private var mostrarSheetRetar = false
    @State private var enviandoReto = false
    @State private var mostrarExitoReto = false
    @State private var pestana = PestanaPerfil.publicaciones
    @State private var eventosPerfil: [EventoDto] = []
    @State private var aventonesPerfil: [AventonDto] = []

    private var esMio: Bool { miHandle == handle }

    var body: some View {
        Group {
            if cargando {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if error != nil, perfil == nil {
                AgoraErrorState(message: error ?? "No encontrado.") { }
            } else if let perfil {
                ScrollView {
                    VStack(spacing: AgoraDesign.Spacing.sm) {
                        tarjetaPerfil(perfil)
                        if perfil.restringido != true {
                            seccionPublicaciones
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, AgoraDesign.Spacing.sm)
                }
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("@\(handle)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                if esMio, let onCampus {
                    Button(action: onCampus) {
                        Image(systemName: "line.3.horizontal")
                    }
                    .accessibilityLabel("Campus y ajustes")
                    .accessibilityIdentifier("perfil.campus")
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                if let url = EnlacesWeb.perfil(handle) {
                    ShareLink(item: url) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Compartir perfil")
                }
            }
        }
        .refreshable { await cargar() }
        .task(id: handle) { await cargar() }
        .sheet(isPresented: $mostrarSheetRetar) {
            sheetElegirTipoReto
        }
        .alert("Reto enviado. A ver si le entra.", isPresented: $mostrarExitoReto) {
            Button("OK", role: .cancel) { }
        }
    }

    /// Perfil B «Cholula» (docs/diseno-cholula.md §4, artboard WowB-Perfil): portada de Talavera en el
    /// color de la carrera, avatar de 92 con terrazas debajo, nombre Bricolage 28, sellos de sus
    /// comunidades y «Sellos» (racha, pregunta de la semana e insignias). Solo Seguir y Mensaje a la
    /// vista; Retar, Silenciar y Bloquear en «…».
    @ViewBuilder
    private func tarjetaPerfil(_ p: PerfilAjenoDto) -> some View {
        let nombreCompleto = "\(p.nombre) \(p.apellidos)".trimmingCharacters(in: .whitespaces)
        let linea = ["@\(p.handle)", p.ciudadOrigen]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: " · ")

        VStack(alignment: .leading, spacing: 12) {
            ZStack(alignment: .bottomLeading) {
                portada(p)
                    .padding(.bottom, 52)
                VStack(spacing: -6) {
                    AvatarD(nombre: nombreCompleto, fotoUrl: p.fotoUrl, tamano: 88)
                        .padding(4)
                        .background(
                            AgoraDesign.Colors.fondo,
                            in: RoundedRectangle(cornerRadius: 32, style: .continuous)
                        )
                    Terrazas(niveles: 3)
                        .fill(AgoraDesign.Colors.naranja)
                        .frame(width: 70, height: 14)
                        .accessibilityHidden(true)
                }
                .padding(.leading, 16)
            }
            .overlay(alignment: .bottomTrailing) {
                acciones(p)
                    .padding(.bottom, 14)
                    .padding(.trailing, 16)
            }
            // La portada va de orilla a orilla, como el artboard.
            .padding(.horizontal, -14)
            .padding(.top, -AgoraDesign.Spacing.sm)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(nombreCompleto)
                        .font(.bricolage(28, relativeTo: .title))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                    if p.verificado == true {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.outfit(.subheadline))
                            .foregroundStyle(AgoraDesign.Colors.naranja)
                            .accessibilityLabel("Verificado")
                    }
                }
                .accessibilityAddTraits(.isHeader)
                Text(linea)
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }

            sellosComunidad(p)

            if let bio = p.bio, !bio.isEmpty {
                Text(bio)
                    .font(.outfit(.body))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .fixedSize(horizontal: false, vertical: true)
            }

            chips(p)

            cifras(p)

            enComun(p)

            if p.restringido == true {
                Text("Este perfil es privado o no comparten comunidades.")
                    .font(.outfit(.subheadline))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            } else if silenciado {
                Text("Silenciado: no verás sus publicaciones. No se le avisa.")
                    .font(.outfit(.caption))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }

            sellosLogros

            if let error {
                Text(error)
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.danger)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// Portada: la foto que haya subido o, si no, azulejo de Talavera en el color de su carrera.
    @ViewBuilder
    private func portada(_ p: PerfilAjenoDto) -> some View {
        Talavera(fondo: AgoraDesign.Colors.talavera, trazo: AgoraDesign.Colors.azulejoClaro)
            .frame(height: 150)
            .frame(maxWidth: .infinity)
            .overlay {
                if let url = ApiClient.shared.resolveUrl(p.portadaUrl) {
                    AsyncImage(url: url) { phase in
                        if case .success(let image) = phase {
                            image.resizable().scaledToFill()
                        }
                    }
                }
            }
            .clipped()
            .accessibilityHidden(true)
    }

    @ViewBuilder
    private func acciones(_ p: PerfilAjenoDto) -> some View {
        if esMio {
            Button(action: onAjustes) {
                Text("Editar perfil")
                    .font(.outfit(.footnote, .semibold))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .padding(.horizontal, 16)
                    .frame(minHeight: 40)
                    .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                    }
            }
            .buttonStyle(.agoraPlain)
        } else if p.restringido != true {
            HStack(spacing: 6) {
                Button {
                    Task { await alternarSeguir() }
                } label: {
                    Text(siguiendo ? "Siguiendo" : "Seguir")
                        .font(.outfit(.subheadline, .bold))
                        .foregroundStyle(siguiendo ? AgoraDesign.Colors.texto : AgoraDesign.Colors.fondo)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 44)
                        .background(
                            siguiendo ? AgoraDesign.Colors.superficie : AgoraDesign.Colors.texto,
                            in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                        )
                        .overlay {
                            if siguiendo {
                                RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                                    .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                            }
                        }
                }
                .buttonStyle(.agoraPlain)
                .disabled(ocupado || bloqueado)
                .accessibilityAddTraits(siguiendo ? .isSelected : [])

                Button {
                    Task { await escribir() }
                } label: {
                    Text("Mensaje")
                        .font(.outfit(.subheadline, .semibold))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 44)
                        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                        }
                }
                .buttonStyle(.agoraPlain)
                .disabled(ocupado || bloqueado)

                Menu {
                    if puedeRetar {
                        Button {
                            mostrarSheetRetar = true
                        } label: {
                            Label("Retar", systemImage: "flame")
                        }
                    }
                    Button {
                        Task { await alternarSilencio() }
                    } label: {
                        Label(silenciado ? "Dejar de silenciar" : "Silenciar", systemImage: "bell.slash")
                    }
                    Button(role: .destructive) {
                        Task { await alternarBloqueo() }
                    } label: {
                        Label(bloqueado ? "Desbloquear" : "Bloquear", systemImage: "hand.raised")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.outfit(.subheadline, .bold))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                        .frame(width: 44, height: 44)
                        .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                        }
                }
                .disabled(ocupado || enviandoReto)
                .accessibilityLabel("Más opciones: retar, silenciar o bloquear")
            }
        }
    }

    @ViewBuilder
    private func chips(_ p: PerfilAjenoDto) -> some View {
        let intereses = p.intereses ?? []
        if !intereses.isEmpty || p.busco?.isEmpty == false || p.instagram != nil {
            FlowWrapLayout(spacing: 6) {
                ForEach(intereses, id: \.self) { interes in
                    chip(interes)
                }
                if let busco = p.busco, !busco.isEmpty {
                    Text("Busca: \(busco)")
                        .font(.outfit(.footnote, .semibold))
                        .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(AgoraDesign.Colors.naranjaSuave, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                if let ig = p.instagram {
                    chip("Instagram @\(ig)")
                }
            }
        }
    }

    private func chip(_ texto: String) -> some View {
        Text(texto)
            .font(.outfit(.footnote))
            .foregroundStyle(AgoraDesign.Colors.texto)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
            }
    }

    private func cifras(_ p: PerfilAjenoDto) -> some View {
        HStack(spacing: 0) {
            cifra(p.publicaciones ?? 0, (p.publicaciones ?? 0) == 1 ? "publicación" : "publicaciones")
            Button {
                onSeguidores(p.handle)
            } label: {
                cifra(p.seguidores ?? 0, (p.seguidores ?? 0) == 1 ? "seguidor" : "seguidores")
            }
            .buttonStyle(.agoraPlain)
            .disabled(p.restringido == true)
            Button {
                onSiguiendo(p.handle)
            } label: {
                cifra(p.siguiendo ?? 0, "siguiendo")
            }
            .buttonStyle(.agoraPlain)
            .disabled(p.restringido == true)
        }
        .padding(.vertical, 6)
    }

    private func cifra(_ n: Int, _ etiqueta: String) -> some View {
        VStack(spacing: 0) {
            Text("\(n)")
                .font(.bricolage(22, relativeTo: .title3))
                .foregroundStyle(AgoraDesign.Colors.texto)
                .monospacedDigit()
            Text(etiqueta)
                .font(.outfit(.caption))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }

    /// Sellos de sus comunidades (carrera y generación), en el color de cada una.
    @ViewBuilder
    private func sellosComunidad(_ p: PerfilAjenoDto) -> some View {
        let carrera = p.carrera.flatMap { $0.isEmpty ? nil : $0 }
        if carrera != nil || p.generacion != nil {
            HStack(spacing: 6) {
                if let carrera {
                    Sello(texto: NombreSello.de(nombre: carrera, slug: "carrera:"),
                          fondo: ColorComunidad.de(slug: "carrera:").fondo)
                }
                if let generacion = p.generacion {
                    Sello(texto: "GEN \(generacion)", fondo: ColorComunidad.de(slug: "generacion:").fondo)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel([carrera, p.generacion.map { "Generación \($0)" }].compactMap { $0 }.joined(separator: ", "))
        }
    }

    /// «Sellos»: racha (adobe), la pregunta de la semana si es tu perfil (talavera) y las insignias
    /// que ya tenga (jade). Sin datos, no aparece.
    @ViewBuilder
    private var sellosLogros: some View {
        let racha = gamificacion?.rachaActual ?? 0
        let semana = esMio ? gamificacion?.semanaPregunta : nil
        let insignias = gamificacion?.badges ?? []
        if racha > 0 || (semana?.respondidas ?? 0) > 0 || !insignias.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text("Sellos")
                    .font(.bricolage(17, relativeTo: .headline))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .accessibilityAddTraits(.isHeader)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        if racha > 0 {
                            SelloRedondo(cifra: "\(racha)", texto: racha == 1 ? "día de racha" : "días de racha",
                                         color: AgoraDesign.Colors.adobe)
                        }
                        if let semana, semana.respondidas > 0 {
                            SelloRedondo(cifra: "\(semana.respondidas)/\(semana.meta)", texto: "preguntas esta semana",
                                         color: AgoraDesign.Colors.talavera)
                        }
                        ForEach(insignias) { insignia in
                            SelloRedondo(cifra: insignia.emoji, texto: insignia.etiqueta, color: AgoraDesign.Colors.jade)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
            .padding(.top, 4)
        }
    }

    /// «Lo siguen Renata e Isabella»: gente que sigues y que sigue a este perfil.
    @ViewBuilder
    private func enComun(_ p: PerfilAjenoDto) -> some View {
        let personas = p.seguidoresEnComun ?? []
        if !esMio, !personas.isEmpty {
            let primeros = personas.prefix(2).map { $0.nombre.split(separator: " ").first.map(String.init) ?? $0.nombre }
            let otros = max(0, (p.numSeguidoresEnComun ?? personas.count) - primeros.count)
            HStack(spacing: 8) {
                HStack(spacing: -6) {
                    ForEach(personas.prefix(3)) { persona in
                        AvatarD(nombre: persona.nombre, fotoUrl: persona.fotoUrl, tamano: 24, conBorde: true)
                    }
                }
                .accessibilityHidden(true)
                Text(Self.textoEnComun(primeros, otros: otros))
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AgoraDesign.Radii.button, style: .continuous)
                    .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
            }
        }
    }

    private static func textoEnComun(_ primeros: [String], otros: Int) -> String {
        guard let primero = primeros.first else { return "" }
        var texto = "Lo sigue\(primeros.count > 1 || otros > 0 ? "n" : "") \(primero)"
        if primeros.count > 1 {
            let segundo = primeros[1]
            // «y» se vuelve «e» antes de un nombre que suena a i (Isabella, Hilda).
            let conjuncion = segundo.lowercased().hasPrefix("i") || segundo.lowercased().hasPrefix("hi") ? "e" : "y"
            texto += otros > 0 ? ", \(segundo)" : " \(conjuncion) \(segundo)"
        }
        if otros > 0 {
            texto += " y \(otros) \(otros == 1 ? "persona más" : "personas más") que sigues"
        }
        return texto
    }

    private var sheetElegirTipoReto: some View {
        NavigationStack {
            VStack(spacing: AgoraDesign.Spacing.md) {
                Text("¿A qué le entramos?")
                    .font(.outfit(.headline))
                    .padding(.top, AgoraDesign.Spacing.sm)

                Button {
                    Task { await enviarReto(tipo: "RACHA") }
                } label: {
                    VStack(spacing: 4) {
                        Text("Racha diaria")
                            .font(.outfit(.subheadline, .bold))
                        Text("Quien mantenga más días seguidos gana.")
                            .font(.outfit(.caption))
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(AgoraDesign.Colors.fondo)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
                }
                .buttonStyle(.agoraPlain)
                .disabled(enviandoReto)

                Button {
                    Task { await enviarReto(tipo: "SEMANA_PREGUNTA") }
                } label: {
                    VStack(spacing: 4) {
                        Text("Semana de preguntas")
                            .font(.outfit(.subheadline, .bold))
                        Text("Quien responda más preguntas del día gana.")
                            .font(.outfit(.caption))
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(AgoraDesign.Colors.fondo)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
                }
                .buttonStyle(.agoraPlain)
                .disabled(enviandoReto)

                if enviandoReto {
                    ProgressView()
                }

                Spacer()
            }
            .padding(AgoraDesign.Spacing.md)
            .background(AgoraDesign.Colors.fondo)
            .navigationTitle("Retar a @\(handle)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        mostrarSheetRetar = false
                    }
                    .disabled(enviandoReto)
                }
            }
        }
        .presentationDetents([.medium])
    }

    /// Pestañas del perfil (docs/diseno-d.md §4). Eventos y Aventones salen de las listas
    /// generales filtradas por esta persona: la API no tiene una ruta por perfil.
    @ViewBuilder
    private var seccionPublicaciones: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(PestanaPerfil.allCases, id: \.self) { opcion in
                    Button {
                        pestana = opcion
                    } label: {
                        Text(opcion.titulo)
                            .font(.outfit(.subheadline, pestana == opcion ? .semibold : .medium))
                            .foregroundStyle(pestana == opcion ? AgoraDesign.Colors.fondo : AgoraDesign.Colors.texto)
                            .padding(.horizontal, 14)
                            .frame(minHeight: 38)
                            .background(
                                pestana == opcion ? AgoraDesign.Colors.texto : AgoraDesign.Colors.superficie,
                                in: RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous)
                            )
                            .overlay {
                                if pestana != opcion {
                                    RoundedRectangle(cornerRadius: AgoraDesign.Radii.small, style: .continuous)
                                        .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
                                }
                            }
                    }
                    .buttonStyle(.agoraPlain)
                    .accessibilityAddTraits(pestana == opcion ? .isSelected : [])
                }
            }
        }
        .padding(.top, 4)
        .task(id: pestana) { await cargarPestana() }

        switch pestana {
        case .publicaciones:
            listaPublicaciones
        case .fotos:
            cuadriculaFotos
        case .eventos:
            listaEventos
        case .aventones:
            listaAventones
        }
    }

    @ViewBuilder
    private var listaPublicaciones: some View {
        if publicaciones.isEmpty {
            AgoraEmptyState(
                emoji: "",
                title: AgoraCopy.perfilPublicacionesEmptyTitle,
                subtitle: AgoraCopy.perfilPublicacionesEmptySubtitle
            )
        }

        ForEach(publicaciones) { pub in
            PublicacionPerfilCard(pub: pub) {
                onPostTap(pub.id)
            }
        }

        if cursor != nil {
            Button("Cargar más") {
                Task { await cargarMas() }
            }
            .buttonStyle(.bordered)
            .frame(maxWidth: .infinity)
        }
    }

    /// Fotos de las publicaciones ya cargadas, en cuadrícula de tres.
    @ViewBuilder
    private var cuadriculaFotos: some View {
        let fotos = publicaciones.flatMap { pub in
            (pub.media ?? []).filter { $0.esVideo != true }.map { (pub.id, $0) }
        }
        if fotos.isEmpty {
            AgoraEmptyState(emoji: "", title: "Sin fotos todavía", subtitle: "Las fotos que publique aparecerán aquí.")
        } else {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3), spacing: 4) {
                ForEach(Array(fotos.enumerated()), id: \.offset) { _, par in
                    Button {
                        onPostTap(par.0)
                    } label: {
                        AsyncImage(url: ApiClient.shared.resolveUrl(par.1.thumbUrl ?? par.1.url)) { fase in
                            if case .success(let imagen) = fase {
                                imagen.resizable().scaledToFill()
                            } else {
                                AgoraDesign.Colors.skeletonBase
                            }
                        }
                        .frame(minWidth: 0, maxWidth: .infinity)
                        .aspectRatio(1, contentMode: .fill)
                        .clipped()
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.agoraPlain)
                    .accessibilityLabel("Foto de una publicación")
                }
            }
        }
    }

    @ViewBuilder
    private var listaEventos: some View {
        if eventosPerfil.isEmpty {
            AgoraEmptyState(emoji: "", title: "Sin eventos próximos", subtitle: "Cuando organice algo, lo verás aquí.")
        }
        ForEach(eventosPerfil) { evento in
            Button {
                onEventoTap(evento.id)
            } label: {
                let partes = FormatUtils.partesFecha(evento.inicioAt)
                HStack(spacing: 12) {
                    VStack(spacing: 0) {
                        Text(partes?.dia ?? "")
                            .font(.outfit(.caption2, .bold))
                        Text(partes?.numero ?? "")
                            .font(.bricolage(22, relativeTo: .title2))
                    }
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 58)
                    .background(AgoraDesign.Colors.naranja, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    VStack(alignment: .leading, spacing: 3) {
                        Text(evento.titulo)
                            .font(.outfit(.subheadline, .semibold))
                            .foregroundStyle(AgoraDesign.Colors.texto)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Text([partes?.hora, evento.lugar].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.outfit(.caption))
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                .padding(12)
                .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.agoraPlain)
        }
    }

    @ViewBuilder
    private var listaAventones: some View {
        if aventonesPerfil.isEmpty {
            AgoraEmptyState(emoji: "", title: "Sin aventones ahora", subtitle: "Cuando ofrezca uno, lo verás aquí.")
        }
        ForEach(aventonesPerfil) { aventon in
            Button(action: onAventonesTap) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(aventon.origen) → \(aventon.destino)")
                        .font(.outfit(.subheadline, .semibold))
                        .foregroundStyle(AgoraDesign.Colors.texto)
                    Text(FormatUtils.formatearFecha(aventon.salidaAt) + " · \(max(0, aventon.lugares - aventon.ocupados)) de \(aventon.lugares) lugares")
                        .font(.outfit(.caption))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(AgoraDesign.Colors.superficie, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.agoraPlain)
        }
    }

    private func cargarPestana() async {
        switch pestana {
        case .eventos:
            let todos = (try? await AgoraApi.eventosProximos())?.eventos ?? []
            eventosPerfil = todos.filter { $0.autor?.handle == handle }
        case .aventones:
            let todos = (try? await AgoraApi.aventones())?.aventones ?? []
            aventonesPerfil = todos.filter { $0.conductor?.handle == handle }
        default:
            break
        }
    }

    private func cargar() async {
        cargando = perfil == nil
        error = nil
        defer { cargando = false }
        do {
            let datos = try await AgoraApi.perfilPorHandle(handle)
            perfil = datos
            siguiendo = datos.yoLeSigo ?? false
            if let miHandle, miHandle != handle {
                let estado = try? await AgoraApi.estadoBloqueo(handle: handle)
                bloqueado = estado?.bloqueado ?? false
                silenciado = estado?.silenciado ?? false
            }
            if datos.restringido != true {
                let pubs = try await AgoraApi.publicacionesPerfil(handle: handle)
                publicaciones = pubs.publicaciones ?? []
                cursor = pubs.siguienteCursor
            } else {
                publicaciones = []
                cursor = nil
            }
            // La tuya trae además la pregunta de la semana (privada); la de otros, solo lo público.
            if esMio {
                gamificacion = try? await AgoraApi.gamificacionMio()
            } else {
                gamificacion = try? await AgoraApi.gamificacionPorHandle(handle)
            }
            if !esMio, datos.restringido != true {
                puedeRetar = (try? await AgoraApi.retosPuede(handle: handle).puedeRetar) ?? false
            } else {
                puedeRetar = false
            }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func alternarSeguir() async {
        ocupado = true
        let era = siguiendo
        siguiendo.toggle()
        defer { ocupado = false }
        do {
            let resp = try await AgoraApi.seguir(handle: handle)
            siguiendo = resp.siguiendo
        } catch {
            siguiendo = era
        }
    }

    private func alternarBloqueo() async {
        ocupado = true
        error = nil
        defer { ocupado = false }
        do {
            if bloqueado {
                try await AgoraApi.desbloquear(handle: handle)
                bloqueado = false
            } else {
                let resp = try await AgoraApi.bloquear(handle: handle)
                bloqueado = resp.bloqueado
                silenciado = resp.silenciado ?? false
            }
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    /// `POST bloqueos/:handle` con `soloSilencio: true`; quitarlo es `DELETE`.
    private func alternarSilencio() async {
        ocupado = true
        error = nil
        defer { ocupado = false }
        do {
            if silenciado {
                try await AgoraApi.desbloquear(handle: handle)
                silenciado = false
            } else {
                let resp = try await AgoraApi.bloquear(handle: handle, soloSilencio: true)
                silenciado = resp.silenciado ?? true
                bloqueado = resp.bloqueado
            }
            Haptics.toggle()
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func escribir() async {
        ocupado = true
        error = nil
        defer { ocupado = false }
        do {
            let resp = try await AgoraApi.abrirConversacion(handle: handle)
            onMensaje(resp.id)
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }

    private func cargarMas() async {
        guard let cursor else { return }
        do {
            let pubs = try await AgoraApi.publicacionesPerfil(handle: handle, cursor: cursor)
            publicaciones += pubs.publicaciones ?? []
            self.cursor = pubs.siguienteCursor
        } catch {
            // Silencioso.
        }
    }

    private func enviarReto(tipo: String) async {
        enviandoReto = true
        error = nil
        defer { enviandoReto = false }
        do {
            _ = try await AgoraApi.crearReto(retadoHandle: handle, tipo: tipo)
            mostrarSheetRetar = false
            puedeRetar = false
            mostrarExitoReto = true
            Haptics.success()
            GamificacionEvents.notifyPingResult(nuevas: [])
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}

/// Tarjeta de una publicación en el perfil: texto, fotos/videos y contadores.
/// Todo abre el detalle; el carrusel va fuera del `Button` para que se pueda
/// deslizar y reproducir video (como en `PostCardView`).
/// Sello redondo de 92 (B «Cholula»): cifra en Bricolage y texto corto, con un aro claro adentro.
private struct SelloRedondo: View {
    let cifra: String
    let texto: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(cifra)
                .font(.bricolage(26, relativeTo: .title2))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(texto)
                .font(.outfit(.caption2, .semibold))
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .minimumScaleFactor(0.8)
                .frame(maxWidth: 64)
        }
        .foregroundStyle(.white)
        .frame(width: 92, height: 92)
        .background(color, in: Circle())
        .overlay {
            Circle()
                .stroke(Color.white.opacity(0.7), lineWidth: 1)
                .padding(5)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(cifra) \(texto)")
    }
}

private struct PublicacionPerfilCard: View {
    let pub: PerfilPublicacionDto
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button(action: onTap) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(FormatUtils.haceCuanto(pub.createdAt)) · \(pub.comunidad)")
                        .font(.outfit(.caption))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    if !pub.texto.isEmpty {
                        Text(pub.texto)
                            .font(.outfit(.subheadline))
                            .foregroundStyle(.primary)
                            .lineLimit(4)
                            .multilineTextAlignment(.leading)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.agoraPlain)

            if let media = pub.media, !media.isEmpty {
                PostMediaCarousel(media: media, altura: 200, onToque: onTap)
            }

            Button(action: onTap) {
                Text("\(pub.numReactions ?? 0) reacciones · \(pub.numComments ?? 0) comentarios")
                    .font(.outfit(.caption, .bold))
                    .foregroundStyle(AgoraDesign.Colors.naranja)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.agoraPlain)
        }
        .padding(AgoraDesign.Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
    }
}

/// Layout simple para chips de intereses.
private struct FlowWrapLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY),
                proposal: ProposedViewSize(frame.size)
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var frames: [CGRect] = []
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            frames.append(CGRect(origin: CGPoint(x: x, y: y), size: size))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return (CGSize(width: maxWidth, height: y + rowHeight), frames)
    }
}

/// «1 seguidor» / «3 seguidores»: el plural en español solo cuando no es uno.
func cuenta(_ n: Int, _ singular: String, _ plural: String) -> String {
    "\(n) \(n == 1 ? singular : plural)"
}

private enum PestanaPerfil: CaseIterable {
    case publicaciones, fotos, eventos, aventones

    var titulo: String {
        switch self {
        case .publicaciones: return "Publicaciones"
        case .fotos: return "Fotos"
        case .eventos: return "Eventos"
        case .aventones: return "Aventones"
        }
    }
}
