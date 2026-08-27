import SwiftUI

/// Diálogo global de sesión expirada — paridad con `SessionExpiredHost.kt`.
struct SessionExpiredHost<Content: View>: View {
    @ViewBuilder var content: () -> Content

    @State private var showDialog = false

    var body: some View {
        content()
            .onReceive(SessionEvents.expired) { _ in
                showDialog = true
            }
            .alert("Sesión expirada", isPresented: $showDialog) {
                Button("Entrar de nuevo") {
                    AuthRepository.shared.logout()
                }
            } message: {
                Text("Tu sesión ya no es válida. Inicia sesión de nuevo para continuar.")
            }
    }
}
