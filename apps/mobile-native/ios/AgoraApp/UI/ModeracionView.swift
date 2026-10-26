import SwiftUI

/// Cola de moderación staff — paridad con `ModeracionScreen.kt`.
struct ModeracionView: View {
    @ObservedObject private var session = SessionStore.shared

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
                            .font(.outfit(.caption))
                            .foregroundStyle(AgoraDesign.Colors.danger)
                    }
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(item.tipo)
                                .font(.outfit(.caption, .bold))
                                .foregroundStyle(AgoraDesign.Colors.naranja)
                            Text(item.texto)
                                .font(.outfit(.body))
                            Text("\(item.numReportes) reporte(s) · \(item.motivos.joined(separator: ", "))")
                                .font(.outfit(.caption))
                                .foregroundStyle(.secondary)
                            if let autor = item.autor {
                                Text("Autor: \(autor.nombre ?? autor.handle ?? "—")")
                                    .font(.outfit(.caption))
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
                                if session.currentUser?.puedeSuspender == true, item.autor != nil {
                                    Button("Suspender") {
                                        dialogoItem = item
                                        dialogoAccion = "SUSPENDER_USUARIO"
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(AgoraDesign.Colors.danger)
                                }
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
            TextField("Motivo (obligatorio)", text: $motivo)
            Button(dialogoAccion == "SUSPENDER_USUARIO" ? "Suspender cuenta" : "Confirmar", role: dialogoAccion == "SIN_ACCION" ? nil : .destructive) {
                // Se captura ya: al cerrarse la alerta el binding limpia `motivo`.
                let motivoEscrito = motivo
                if let item = dialogoItem, let accion = dialogoAccion {
                    Task { await resolver(item: item, accion: accion, motivo: motivoEscrito) }
                }
            }
            Button("Cancelar", role: .cancel) {
                dialogoItem = nil
                dialogoAccion = nil
                motivo = ""
            }
        } message: {
            Text(mensajeDialogo)
        }
    }

    private var mensajeDialogo: String {
        switch dialogoAccion ?? "" {
        case "RETIRAR_CONTENIDO":
            return "Se retira el contenido. El autor verá el motivo (mínimo 3 caracteres)."
        case "SUSPENDER_USUARIO":
            return "Se suspende la cuenta del autor, se cierran sus sesiones y se retira el contenido. Escribe el motivo."
        default:
            return "Se cierra el reporte sin acción. Escribe el motivo (mínimo 3 caracteres)."
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

    private func resolver(item: ModeracionColaItemDto, accion: String, motivo: String) async {
        let motivoLimpio = motivo.trimmingCharacters(in: .whitespacesAndNewlines)
        guard motivoLimpio.count >= 3 else {
            error = "Escribe el motivo (mínimo 3 caracteres)."
            return
        }
        resolviendo = item.reporteId
        defer { resolviendo = nil }
        do {
            try await AgoraApi.resolverReporte(id: item.reporteId, accion: accion, motivo: motivoLimpio)
            items.removeAll { $0.reporteId == item.reporteId }
            dialogoItem = nil
            dialogoAccion = nil
            self.motivo = ""
            error = nil
        } catch {
            self.error = FormatUtils.mensajeDe(error)
        }
    }
}
