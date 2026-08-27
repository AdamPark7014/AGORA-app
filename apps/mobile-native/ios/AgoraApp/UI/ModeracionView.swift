import SwiftUI

/// Cola de moderación staff — paridad con `ModeracionScreen.kt`.
struct ModeracionView: View {
    @State private var items: [ModeracionColaItemDto] = []
    @State private var cargando = true
    @State private var error: String?
    @State private var resolviendo: String?
    @State private var dialogoItem: ModeracionColaItemDto?
    @State private var dialogoAccion: String?
    @State private var motivo = ""

    var body: some View {
        Group {
            if cargando && items.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error, items.isEmpty {
                AgoraErrorState(message: error) { Task { await recargar() } }
            } else if items.isEmpty {
                AgoraEmptyState(
                    emoji: "✅",
                    title: "Cola al día",
                    subtitle: "No hay reportes pendientes por ahora."
                )
            } else {
                List {
                    if let error {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(AgoraDesign.Colors.danger)
                    }
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(item.tipo)
                                .font(.caption.bold())
                                .foregroundStyle(AgoraDesign.Colors.naranja)
                            Text(item.texto)
                                .font(.body)
                            Text("\(item.numReportes) reporte(s) · \(item.motivos.joined(separator: ", "))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if let autor = item.autor {
                                Text("Autor: \(autor.nombre ?? autor.handle ?? "—")")
                                    .font(.caption)
                            }
                            HStack {
                                Button("Retirar") {
                                    dialogoItem = item
                                    dialogoAccion = "RETIRAR_CONTENIDO"
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(AgoraDesign.Colors.danger)
                                Button("Sin acción") {
                                    dialogoItem = item
                                    dialogoAccion = "SIN_ACCION"
                                }
                                .buttonStyle(.bordered)
                            }
                            .disabled(resolviendo == item.reporteId)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Moderación")
        .agoraScreenBackground()
        .refreshable { await recargar() }
        .task { await recargar() }
        .alert("Resolver reporte", isPresented: Binding(
            get: { dialogoItem != nil },
            set: { if !$0 { dialogoItem = nil; dialogoAccion = nil; motivo = "" } }
        )) {
            TextField("Motivo (opcional)", text: $motivo)
            Button("Confirmar") {
                if let item = dialogoItem, let accion = dialogoAccion {
                    Task { await resolver(item: item, accion: accion) }
                }
            }
            Button("Cancelar", role: .cancel) {
                dialogoItem = nil
                dialogoAccion = nil
                motivo = ""
            }
        } message: {
            Text("Acción: \(dialogoAccion ?? "")")
        }
    }

    private func recargar() async {
        cargando = true
        defer { cargando = false }
        do {
            let resp = try await AgoraApi.moderacionCola()
            items = resp.lista
            error = nil
        } catch {
            if items.isEmpty { self.error = FormatUtils.mensajeDe(error) }
        }
    }

    private func resolver(item: ModeracionColaItemDto, accion: String) async {
        resolviendo = item.reporteId
        defer { resolviendo = nil }
        do {
            try await AgoraApi.resolverReporte(id: item.reporteId, accion: accion, motivo: motivo)
            items.removeAll { $0.reporteId == item.reporteId }
            dialogoItem = nil
            dialogoAccion = nil
            motivo = ""
            error = nil
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}
