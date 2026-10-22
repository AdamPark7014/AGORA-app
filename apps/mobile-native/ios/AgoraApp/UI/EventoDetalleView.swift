import SwiftUI

private let etiquetasTipoEvento: [String: String] = [
    "FIESTA": "Fiesta",
    "ACADEMICO": "Académico",
    "DEPORTIVO": "Deportivo",
    "CULTURAL": "Cultural",
    "ORGANIZACION": "Organización",
    "OTRO": "Otro",
]

/// La API solo acepta VOY / ME_INTERESA (`RESPUESTAS_ASISTENCIA`); repetir la
/// misma respuesta la retira, así que no hace falta un «No voy».
private let respuestasEvento: [(String, String)] = [
    ("VOY", "Voy"),
    ("ME_INTERESA", "Me interesa"),
]

/// Detalle de evento — paridad con `EventoDetalleScreen.kt`.
struct EventoDetalleView: View {
    let eventoId: String
    var onPerfil: (String) -> Void = { _ in }
    var onBorrado: () -> Void = {}

    @State private var evento: EventoDetalleDto?
    @State private var cargando = true
    @State private var error: String?

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
                    // Agrupado: en iOS 16 un ViewBuilder admite como máximo 10 hijos por bloque.
                    VStack(alignment: .leading, spacing: AgoraDesign.Spacing.xs) {
                        Group {
                            Text(etiquetasTipoEvento[evento.tipo] ?? evento.tipo)
                                .font(.subheadline.bold())
                                .foregroundStyle(AgoraDesign.Colors.naranja)

                            Text(evento.titulo)
                                .font(.title2.bold())

                            Text(FormatUtils.formatearFecha(evento.inicioAt))
                                .font(.subheadline)
                                .foregroundStyle(AgoraDesign.Colors.textoMedio)

                            if let lugar = evento.lugar, !lugar.isEmpty {
                                Text("📍 \(lugar)")
                                    .font(.subheadline)
                                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            }

                            if let comunidad = evento.comunidad {
                                Text(comunidad.nombre)
                                    .font(.subheadline)
                                    .foregroundStyle(AgoraDesign.Colors.textoMedio)
                            }

                            if let costo = evento.costoMxn {
                                Text("\(FormatUtils.formatearPrecio(costo)) MXN")
                                    .font(.headline)
                            }

                            if let descripcion = evento.descripcion, !descripcion.isEmpty {
                                Text(descripcion)
                                    .font(.body)
                                    .padding(.top, AgoraDesign.Spacing.xs)
                            }
                        }

                        Text("\(evento.vanAIr ?? 0) personas van")
                            .font(.caption)
                            .foregroundStyle(AgoraDesign.Colors.textoMedio)

                        if let cupo = evento.cupo {
                            let libres = max(0, cupo - (evento.vanAIr ?? 0))
                            Text(libres == 0 ? "Cupo lleno (\(cupo) lugares)" : "Cupo: \(cupo) · quedan \(libres) lugares")
                                .font(.caption.bold())
                                .foregroundStyle(libres == 0 ? AgoraDesign.Colors.danger : AgoraDesign.Colors.naranja)
                        }

                        respuestasChips(evento: evento)

                        if let autor = evento.autor, let handle = autor.handle {
                            Button {
                                onPerfil(handle)
                            } label: {
                                Text("Organiza \(autor.nombre ?? handle)")
                                    .font(.subheadline)
                            }
                        }

                        if evento.esMio == true {
                            Button(role: .destructive) {
                                Task { await borrar() }
                            } label: {
                                Text("Eliminar evento")
                                    .font(.subheadline)
                            }
                            .padding(.top, AgoraDesign.Spacing.xs)
                        }

                        if let error {
                            Text(error)
                                .font(.footnote)
                                .foregroundStyle(.red)
                        }
                    }
                    .padding(AgoraDesign.Spacing.sm)
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
    }

    @ViewBuilder
    private func respuestasChips(evento: EventoDetalleDto) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(respuestasEvento, id: \.0) { valor, etiqueta in
                    Button {
                        Task { await responder(valor) }
                    } label: {
                        Text(etiqueta)
                            .font(.subheadline)
                            .padding(.horizontal, AgoraDesign.Spacing.sm)
                            .padding(.vertical, AgoraDesign.Spacing.xs)
                            .background(evento.miRespuesta == valor ? AgoraDesign.Colors.naranjaSuave : AgoraDesign.Colors.superficie)
                            .foregroundStyle(evento.miRespuesta == valor ? AgoraDesign.Colors.naranja : AgoraDesign.Colors.texto)
                            .clipShape(Capsule())
                            .overlay {
                                Capsule()
                                    .stroke(
                                        evento.miRespuesta == valor ? AgoraDesign.Colors.naranja.opacity(0.3) : AgoraDesign.Colors.borde,
                                        lineWidth: 1
                                    )
                            }
                    }
                    .buttonStyle(.agoraPlain)
                }
            }
            .padding(.vertical, AgoraDesign.Spacing.xs)
        }
    }

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
        do {
            try await AgoraApi.responderEvento(id: eventoId, respuesta: valor)
            AgoraAnalytics.eventoAsistencia(["eventoId": eventoId, "respuesta": valor])
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
