import SwiftUI
import UIKit

struct PostCardView: View {
    let post: PostDto
    var onTap: (() -> Void)?
    var onAuthorTap: (() -> Void)?
    var onHashtagTap: ((String) -> Void)?
    /// Toque en una @mención del texto (handle sin arroba).
    var onMencionTap: ((String) -> Void)?
    /// La publicación se borró o se retiró: el contenedor puede quitarla de la lista.
    var onEliminado: ((String) -> Void)?
    /// `.feedB` en el inicio (artboard FeedB); `.tarjeta` en el resto de las listas.
    var estilo: EstiloPublicacion = .tarjeta

    @ObservedObject private var session = SessionStore.shared

    @State private var miReaccion: String?
    @State private var totalReacciones = 0
    @State private var conteos: [String: Int] = [:]
    @State private var encuesta: EncuestaDto?
    @State private var votando = false
    @State private var heartTrigger = 0
    @State private var eligiendoMotivo = false
    @State private var avisoReporte: String?
    @State private var textoEditado: String?
    @State private var editando = false
    @State private var confirmandoBorrar = false
    @State private var retirando = false
    @State private var motivoRetiro = ""
    @State private var eliminado = false

    private var texto: String { textoEditado ?? post.texto }
    private var esAnonimo: Bool { post.anonimo == true }
    private var esMia: Bool {
        PublicacionPermisos.esMia(
            autorHandle: post.autor?.handle,
            anonimo: post.anonimo,
            miHandle: session.currentUser?.handle
        )
    }
    private var puedeRetirar: Bool {
        session.currentUser?.puedeModerar == true && !esMia
    }

    var body: some View {
        Group {
            if eliminado {
                Text("Publicación eliminada.")
                    .font(.outfit(.footnote))
                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(AgoraDesign.Spacing.sm + 2)
                    .background(AgoraDesign.Colors.superficie)
                    .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
            } else if estilo == .feedB {
                tarjetaB
            } else {
                tarjeta
            }
        }
        .confirmationDialog("¿Por qué la reportas?", isPresented: $eligiendoMotivo, titleVisibility: .visible) {
            ForEach(motivosReporte) { motivo in
                Button(motivo.etiqueta) {
                    Task { await reportar(motivo.id) }
                }
            }
            Button("Cancelar", role: .cancel) {}
        }
        .confirmationDialog("¿Borrar esta publicación?", isPresented: $confirmandoBorrar, titleVisibility: .visible) {
            Button("Borrar", role: .destructive) {
                Task { await borrar() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("No se puede deshacer.")
        }
        .alert("Retirar publicación", isPresented: $retirando) {
            TextField("Motivo (lo verá el autor)", text: $motivoRetiro)
            Button("Retirar", role: .destructive) {
                Task { await retirar() }
            }
            Button("Cancelar", role: .cancel) {
                motivoRetiro = ""
            }
        } message: {
            Text("Escribe el motivo: mínimo 3 caracteres.")
        }
        .alert(
            avisoReporte ?? "",
            isPresented: Binding(
                get: { avisoReporte != nil },
                set: { if !$0 { avisoReporte = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        }
        .sheet(isPresented: $editando) {
            EditarPublicacionSheet(postId: post.id, textoInicial: texto) { nuevo, aviso in
                textoEditado = nuevo
                if let aviso, !aviso.isEmpty {
                    avisoReporte = aviso
                }
            }
        }
        .onAppear {
            sincronizarEstado()
            encuesta = post.encuesta
        }
        .onChange(of: post.id) { _ in
            sincronizarEstado()
            encuesta = post.encuesta
            textoEditado = nil
            eliminado = false
        }
    }

    private var nombreVisible: String {
        esAnonimo ? (post.alias ?? "Sin nombre") : (post.autor?.nombre ?? "Usuario")
    }

    /// Diseño D (docs/diseno-d.md §3): banda de comunidad → autor → texto → fotos con esquinas →
    /// chips de reacción con número → comentarios y acciones.
    private var tarjeta: some View {
        VStack(alignment: .leading, spacing: 0) {
            bandaComunidad

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Button {
                        onAuthorTap?()
                    } label: {
                        HStack(spacing: 10) {
                            avatar
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 4) {
                                    Text(nombreVisible)
                                        .font(.outfit(.subheadline, .bold))
                                        .foregroundStyle(AgoraDesign.Colors.texto)
                                        .lineLimit(1)
                                    if post.autor?.verificado == true {
                                        Image(systemName: "checkmark.seal.fill")
                                            .font(.outfit(.caption2))
                                            .foregroundStyle(AgoraDesign.Colors.naranja)
                                            .accessibilityLabel("Verificado")
                                    }
                                }
                                Text(
                                    [post.autor?.handle.map { "@\($0)" }, FormatUtils.haceCuanto(post.createdAt)]
                                        .compactMap { $0 }
                                        .joined(separator: " · ")
                                )
                                .font(.outfit(.caption))
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                                .lineLimit(1)
                            }
                        }
                    }
                    .buttonStyle(.agoraPlain)
                    .disabled(onAuthorTap == nil || esAnonimo)

                    Spacer(minLength: 0)
                    menuOpciones
                }

                if !texto.isEmpty {
                    if let onHashtagTap {
                        TextoConHashtags(
                            texto: texto,
                            onHashtagTap: onHashtagTap,
                            onBackgroundTap: onTap,
                            onMencionTap: onMencionTap
                        )
                    } else {
                        Button {
                            onTap?()
                        } label: {
                            Text(texto)
                                .font(.outfit(.body))
                                .foregroundStyle(AgoraDesign.Colors.texto)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.agoraPlain)
                    }
                }

                if let media = post.media, !media.isEmpty {
                    ZStack {
                        PostMediaGrid(
                            media: media,
                            altura: 230,
                            onAbrir: onTap,
                            onDobleToque: {
                                heartTrigger += 1
                                Task { await reaccionar("ME_LATE") }
                            }
                        )

                        if heartTrigger > 0 {
                            FloatingHeartOverlay()
                                .id(heartTrigger)
                                .allowsHitTesting(false)
                        }
                    }
                    .padding(.horizontal, -4)
                }

                if let encuesta {
                    EncuestaBloque(
                        encuesta: encuesta,
                        onVotar: { opcionId in Task { await votar(opcionId: opcionId) } },
                        votando: votando
                    )
                }

                ReaccionesRow(
                    miReaccion: miReaccion,
                    totalReacciones: totalReacciones,
                    numComments: post.numComments ?? 0,
                    conteos: conteos,
                    onReaccionar: { tipo in Task { await reaccionar(tipo) } },
                    onCommentsTap: onTap
                )
                .padding(.top, 2)

                pie
            }
            .padding(.leading, 16)
            .padding(.trailing, 8)
            .padding(.top, 12)
            .padding(.bottom, 4)
        }
        .background(AgoraDesign.Colors.superficie)
        .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.card))
        .overlay {
            RoundedRectangle(cornerRadius: AgoraDesign.Radii.card)
                .stroke(AgoraDesign.Colors.borde, lineWidth: 1)
        }
    }

    // MARK: - Feed B

    /// Feed B (artboard FeedB, elegido por Adam el 26-10): a todo lo ancho y sin tarjeta. Autor con
    /// su comunidad, la foto de borde a borde con «1/3», corazón con número, comentar, compartir y
    /// guardar, el texto como pie con el @ en negritas y «Ver los N comentarios · hace…».
    /// Sin foto, el texto va arriba en grande (artboard Main, para publicaciones de texto).
    private var tarjetaB: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                Button {
                    onAuthorTap?()
                } label: {
                    HStack(spacing: 10) {
                        avatarCircular
                        VStack(alignment: .leading, spacing: 2) {
                            Text(nombreB)
                                .font(.outfit(.subheadline, .bold))
                                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                                .lineLimit(1)
                            Text(FormatUtils.haceCuanto(post.createdAt))
                                .font(.outfit(.caption))
                                .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
                                .lineLimit(1)
                        }
                    }
                }
                .buttonStyle(.agoraPlain)
                .disabled(onAuthorTap == nil || esAnonimo)
                Spacer(minLength: 0)
                // B «Cholula»: el sello de la comunidad, en su color (docs/diseno-cholula.md §3).
                Sello(comunidad: post.comunidad, alto: 24)
                    .accessibilityLabel("En \(post.comunidad.nombre)")
                menuOpciones
            }
            .padding(.leading, 16)
            .padding(.trailing, 4)
            .padding(.vertical, 6)

            if let media = post.media, !media.isEmpty {
                ZStack {
                    PostMediaCarousel(
                        media: media,
                        altura: Self.alturaFotoB,
                        radio: 0,
                        puntos: false,
                        onDobleToque: {
                            heartTrigger += 1
                            Task { await reaccionar("ME_LATE") }
                        }
                    )
                    if heartTrigger > 0 {
                        FloatingHeartOverlay()
                            .id(heartTrigger)
                            .allowsHitTesting(false)
                    }
                }
            } else if esTipografica {
                tarjetaTipografica
                    .padding(.horizontal, 12)
            } else if !texto.isEmpty {
                textoB(conAutor: false)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 4)
            }

            if let encuesta {
                EncuestaBloque(
                    encuesta: encuesta,
                    onVotar: { opcionId in Task { await votar(opcionId: opcionId) } },
                    votando: votando
                )
                .padding(.horizontal, 16)
                .padding(.top, 8)
            }

            if esTipografica {
                reaccionesChips
                    .padding(.top, 10)
                    .padding(.bottom, 12)
            } else {
                accionesB
                    .padding(.horizontal, 8)
                    .padding(.top, 2)

                if let media = post.media, !media.isEmpty, !texto.isEmpty {
                    textoB(conAutor: true)
                        .padding(.horizontal, 16)
                }

                Button {
                    onTap?()
                } label: {
                    Text(pieB)
                        .font(.outfit(.footnote))
                        .foregroundStyle(AgoraDesign.Colors.secundarioFeed)
                        .frame(maxWidth: .infinity, minHeight: 32, alignment: .leading)
                }
                .buttonStyle(.agoraPlain)
                .disabled(onTap == nil)
                .padding(.horizontal, 16)
                .padding(.bottom, 10)
            }
        }
        .background(AgoraDesign.Colors.fondoFeed)
    }

    /// Publicación solo de texto (sin fotos ni encuesta): tarjeta tipográfica en el color de su comunidad.
    private var esTipografica: Bool {
        (post.media ?? []).isEmpty && encuesta == nil && !texto.isEmpty
    }

    /// B «Cholula» (docs/diseno-cholula.md §3): radio 22 en el color de la comunidad, texto Bricolage 800 26
    /// blanco, esquina de Talavera arriba a la derecha y «Ver las N respuestas» abajo.
    private var tarjetaTipografica: some View {
        let color = ColorComunidad.de(slug: post.comunidad.slug)
        let respuestas = post.numComments ?? 0
        return Button {
            onTap?()
        } label: {
            VStack(alignment: .leading, spacing: 14) {
                Text(texto)
                    .font(.bricolage(26, relativeTo: .title2))
                    .foregroundStyle(color.tinta)
                    .multilineTextAlignment(.leading)
                    .lineLimit(8)
                    .padding(.trailing, 44)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(respuestas == 0 ? "Responder" : respuestas == 1 ? "Ver la respuesta" : "Ver las \(respuestas) respuestas")
                    .font(.outfit(.footnote, .semibold))
                    .foregroundStyle(color.tinta == .white ? AgoraDesign.Colors.sobreColorSuave : color.tinta.opacity(0.8))
            }
            .padding(.horizontal, 20)
            .padding(.top, 22)
            .padding(.bottom, 18)
            .background(color.fondo)
            .overlay(alignment: .topTrailing) {
                Talavera()
                    .frame(width: 86, height: 86)
                    .clipShape(EsquinaRedonda(radio: 28))
                    .opacity(0.9)
            }
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
        .buttonStyle(.agoraPlain)
        .disabled(onTap == nil)
        .accessibilityHint("Abre la publicación")
    }

    /// Reacciones de la publicación tipográfica como chips con su número («Me late 18», «Apoyo 9»).
    private var reaccionesChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Self.reaccionesB) { opcion in
                    let mia = miReaccion == opcion.tipo
                    let numero = conteos[opcion.tipo] ?? 0
                    Button {
                        Task { await reaccionar(opcion.tipo) }
                    } label: {
                        Text(numero > 0 ? "\(opcion.etiqueta) \(numero)" : opcion.etiqueta)
                            .font(.outfit(.footnote, .semibold))
                            .foregroundStyle(mia ? AgoraDesign.Colors.naranjaTinta : AgoraDesign.Colors.texto)
                            .padding(.horizontal, 12)
                            .frame(minHeight: 34)
                            .background(mia ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie,
                                        in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(mia ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.borde, lineWidth: 1)
                            }
                    }
                    .buttonStyle(.agoraPlain)
                    .accessibilityLabel(numero > 0 ? "\(opcion.etiqueta), \(numero)" : opcion.etiqueta)
                    .accessibilityAddTraits(mia ? .isSelected : [])
                }
            }
            .padding(.horizontal, 16)
        }
    }

    /// 330 de alto en el artboard de 390: misma proporción en cualquier iPhone.
    private static var alturaFotoB: CGFloat { UIScreen.main.bounds.width * 330 / 390 }

    /// El artboard muestra el @ (isa.ruiz), no el nombre completo.
    private var nombreB: String {
        if esAnonimo { return post.alias ?? "Sin nombre" }
        return post.autor?.handle ?? post.autor?.nombre ?? "Usuario"
    }

    /// La hora ya va bajo el nombre (B «Cholula»): el pie solo lleva a los comentarios.
    private var pieB: String {
        let comentarios = post.numComments ?? 0
        switch comentarios {
        case 0: return "Comentar"
        case 1: return "Ver el comentario"
        default: return "Ver los \(comentarios) comentarios"
        }
    }

    @ViewBuilder
    private func textoB(conAutor: Bool) -> some View {
        if let onHashtagTap {
            TextoConHashtags(
                texto: texto,
                onHashtagTap: onHashtagTap,
                onBackgroundTap: onTap,
                onMencionTap: onMencionTap,
                autor: conAutor ? nombreB : nil,
                fuente: conAutor ? .outfit(.subheadline) : .outfit(.body)
            )
        } else {
            Text(conAutor ? "\(nombreB) \(texto)" : texto)
                .font(conAutor ? .outfit(.subheadline) : .outfit(.body))
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// Corazón = «Me late» con el total de reacciones; las otras tres, con pulsación larga.
    private var accionesB: some View {
        let reaccione = miReaccion != nil
        let comentarios = post.numComments ?? 0
        return HStack(spacing: 2) {
            Button {
                Task { await reaccionar("ME_LATE") }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: reaccione ? "heart.fill" : "heart")
                        .font(.system(size: 22, weight: .regular))
                        .foregroundStyle(reaccione ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.tintaFeed)
                    if totalReacciones > 0 {
                        Text("\(totalReacciones)")
                            .font(.outfit(.subheadline, .semibold))
                            .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                    }
                }
                .padding(.horizontal, 8)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.agoraPlain)
            .contextMenu {
                ForEach(Self.reaccionesB) { opcion in
                    Button {
                        Task { await reaccionar(opcion.tipo) }
                    } label: {
                        Label(opcion.etiqueta, systemImage: miReaccion == opcion.tipo ? "checkmark" : opcion.icono)
                    }
                }
            }
            .accessibilityLabel(totalReacciones > 0 ? "Me late, \(totalReacciones)" : "Me late")
            .accessibilityHint("Mantén presionado para Me río, Apoyo o No mames")
            .accessibilityAddTraits(reaccione ? .isSelected : [])

            Button {
                onTap?()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 21, weight: .regular))
                    if comentarios > 0 {
                        Text("\(comentarios)")
                            .font(.outfit(.subheadline, .semibold))
                    }
                }
                .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                .padding(.horizontal, 8)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.agoraPlain)
            .disabled(onTap == nil)
            .accessibilityLabel(comentarios > 0 ? "Comentar, \(comentarios)" : "Comentar")

            if let url = EnlacesWeb.publicacion(post.id) {
                ShareLink(item: url) {
                    Image(systemName: "paperplane")
                        .font(.system(size: 21, weight: .regular))
                        .foregroundStyle(AgoraDesign.Colors.tintaFeed)
                        .padding(.horizontal, 8)
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Compartir")
            }

            Spacer(minLength: 0)

            GuardarButton(postId: post.id, guardado: post.miGuardado ?? false)
                .frame(width: 44, height: 44)
        }
    }

    private static let reaccionesB: [OpcionReaccionB] = [
        OpcionReaccionB(tipo: "ME_LATE", etiqueta: "Me late", icono: "heart"),
        OpcionReaccionB(tipo: "ME_RIO", etiqueta: "Me río", icono: "face.smiling"),
        OpcionReaccionB(tipo: "APOYO", etiqueta: "Apoyo", icono: "hands.clap"),
        OpcionReaccionB(tipo: "NO_MAMES", etiqueta: "No mames", icono: "exclamationmark.bubble"),
    ]

    @ViewBuilder
    private var avatarCircular: some View {
        if !esAnonimo, let url = ApiClient.shared.resolveUrl(post.autor?.fotoUrl) {
            AsyncImage(url: url) { phase in
                if case .success(let image) = phase {
                    image.resizable().scaledToFill()
                } else {
                    inicialCircular
                }
            }
            .frame(width: 36, height: 36)
            .clipShape(Circle())
        } else {
            inicialCircular
        }
    }

    private var inicialCircular: some View {
        Circle()
            .fill(esAnonimo ? AgoraDesign.Colors.superficie2 : AgoraDesign.Colors.naranjaSuave)
            .frame(width: 36, height: 36)
            .overlay {
                if esAnonimo {
                    Image(systemName: "theatermasks")
                        .font(.system(size: 14))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                } else {
                    Text(String((post.autor?.nombre ?? "?").prefix(1)).uppercased())
                        .font(.outfit(.subheadline, .bold))
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                }
            }
    }

    // MARK: - Tarjeta

    /// La comunidad manda (docs/diseno-d.md §1): dónde se dijo algo va antes que quién.
    private var bandaComunidad: some View {
        HStack(spacing: 8) {
            Image(systemName: iconoComunidad)
                .font(.outfit(.caption, .semibold))
                .accessibilityHidden(true)
            Text(post.comunidad.nombre.uppercased())
                .font(.outfit(.caption, .bold))
                .tracking(0.6)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
        .foregroundStyle(AgoraDesign.Colors.naranjaTinta)
        .padding(.horizontal, 16)
        .padding(.vertical, 9)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AgoraDesign.Colors.naranjaSuave)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("En \(post.comunidad.nombre)")
    }

    /// Ícono por tipo de comunidad: el slug empieza con el tipo (`carrera:`, `generacion:`…).
    private var iconoComunidad: String {
        switch post.comunidad.slug.split(separator: ":").first.map(String.init) ?? "" {
        case "carrera": return "graduationcap"
        case "generacion": return "person.2"
        case "colegio": return "house"
        case "escuela", "departamento": return "building.2"
        default: return "building.columns"
        }
    }

    private var pie: some View {
        let comentarios = post.numComments ?? 0
        return HStack(spacing: 0) {
            if comentarios > 0 {
                Button {
                    onTap?()
                } label: {
                    Text("\(comentarios) \(comentarios == 1 ? "comentario" : "comentarios")")
                        .font(.outfit(.footnote))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                }
                .buttonStyle(.agoraPlain)
                .disabled(onTap == nil)
            }
            Spacer(minLength: 0)
            if onTap != nil {
                Button {
                    onTap?()
                } label: {
                    Image(systemName: "bubble.left")
                        .font(.outfit(.body))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.agoraPlain)
                .accessibilityLabel("Comentar")
            }
            if let url = EnlacesWeb.publicacion(post.id) {
                ShareLink(item: url) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.outfit(.body))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Compartir")
            }
            GuardarButton(postId: post.id, guardado: post.miGuardado ?? false)
                .frame(width: 44, height: 44)
        }
    }

    private var menuOpciones: some View {
        Menu {
            if esMia {
                Button {
                    editando = true
                } label: {
                    Label("Editar", systemImage: "pencil")
                }
                Button(role: .destructive) {
                    confirmandoBorrar = true
                } label: {
                    Label("Borrar", systemImage: "trash")
                }
            } else {
                Button(role: .destructive) {
                    eligiendoMotivo = true
                } label: {
                    Label("Reportar", systemImage: "flag")
                }
            }
            if puedeRetirar {
                Button(role: .destructive) {
                    motivoRetiro = ""
                    retirando = true
                } label: {
                    Label("Retirar (moderación)", systemImage: "shield.lefthalf.filled")
                }
            }
        } label: {
            Image(systemName: "ellipsis")
                .font(.outfit(.subheadline))
                .foregroundStyle(AgoraDesign.Colors.textoMedio)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Más opciones")
    }

    @ViewBuilder
    private var avatar: some View {
        if !esAnonimo, let url = ApiClient.shared.resolveUrl(post.autor?.fotoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    avatarPlaceholder
                }
            }
            .frame(width: 40, height: 40)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.avatar))
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        RoundedRectangle(cornerRadius: AgoraDesign.Radii.avatar)
            .fill(esAnonimo ? AgoraDesign.Colors.superficie2 : AgoraDesign.Colors.naranjaSuave)
            .frame(width: 40, height: 40)
            .overlay {
                if esAnonimo {
                    Image(systemName: "theatermasks")
                        .font(.outfit(.subheadline))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                } else {
                    Text(String((post.autor?.nombre ?? "?").prefix(1)).uppercased())
                        .font(.outfit(.subheadline, .bold))
                        .foregroundStyle(AgoraDesign.Colors.naranja)
                }
            }
    }

    private func sincronizarEstado() {
        miReaccion = post.miReaccion
        totalReacciones = post.numReactions ?? 0
        conteos = post.reacciones ?? [:]
    }

    private func votar(opcionId: String) async {
        guard !votando else { return }
        votando = true
        defer { votando = false }
        Haptics.toggle()
        do {
            let resp = try await AgoraApi.votarEncuesta(postId: post.id, opcionId: opcionId)
            if let opts = resp.opciones, let pregunta = encuesta?.pregunta {
                encuesta = EncuestaDto(pregunta: pregunta, opciones: opts)
            }
            Haptics.success()
        } catch {
            // Silencioso.
        }
    }

    private func reportar(_ motivo: String) async {
        do {
            try await AgoraApi.reportar(postId: post.id, motivo: motivo)
            avisoReporte = "Gracias. Un moderador lo revisará."
        } catch {
            avisoReporte = FormatUtils.mensajeDe(error)
        }
    }

    private func borrar() async {
        do {
            try await AgoraApi.borrarPost(id: post.id)
            Haptics.success()
            eliminado = true
            onEliminado?(post.id)
        } catch {
            avisoReporte = FormatUtils.mensajeDe(error)
        }
    }

    private func retirar() async {
        let motivo = motivoRetiro.trimmingCharacters(in: .whitespacesAndNewlines)
        guard motivo.count >= 3 else {
            avisoReporte = "Escribe el motivo (mínimo 3 caracteres)."
            return
        }
        do {
            try await AgoraApi.retirarPost(id: post.id, motivo: motivo)
            motivoRetiro = ""
            eliminado = true
            onEliminado?(post.id)
        } catch {
            avisoReporte = FormatUtils.mensajeDe(error)
        }
    }

    private func reaccionar(_ tipo: String) async {
        Haptics.toggle()
        let activa = miReaccion == tipo
        let anterior = miReaccion
        let totalAnterior = totalReacciones
        let conteosAnteriores = conteos
        miReaccion = activa ? nil : tipo
        totalReacciones += activa ? -1 : (anterior != nil ? 0 : 1)
        // Solo si la ruta mandó los conteos por tipo: si no, se inventarían números.
        if post.reacciones != nil {
            conteos = moverReaccion(conteos, de: anterior, a: miReaccion)
        }
        do {
            let resp = try await AgoraApi.reaccionar(postId: post.id, tipo: tipo)
            miReaccion = resp.miReaccion
        } catch {
            miReaccion = anterior
            totalReacciones = totalAnterior
            conteos = conteosAnteriores
        }
    }
}

private struct FloatingHeartOverlay: View {
    @State private var scale: CGFloat = 0.4
    @State private var opacity: Double = 1

    var body: some View {
        Image(systemName: "heart.fill")
            .font(.system(size: 44))
            .foregroundStyle(AgoraDesign.Colors.naranja)
            .scaleEffect(scale)
            .opacity(opacity)
            .onAppear {
                withAnimation(.easeOut(duration: 0.25)) {
                    scale = 1.4
                }
                withAnimation(.easeOut(duration: 0.55).delay(0.25)) {
                    opacity = 0
                }
            }
    }
}

/// Cómo se pinta una publicación: tarjeta (guardados, hashtags, detalle) o feed B (inicio).
enum EstiloPublicacion {
    case tarjeta
    case feedB
}

private struct OpcionReaccionB: Identifiable {
    let tipo: String
    let etiqueta: String
    let icono: String
    var id: String { tipo }
}
