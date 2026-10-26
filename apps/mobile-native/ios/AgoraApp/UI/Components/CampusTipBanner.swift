import SwiftUI
import UIKit

/// Tips rotativos del campus — paridad con `CampusTipBanner.kt`.
struct CampusTipBanner: View {
    @AppStorage("campusTipDismissed") private var dismissed = false
    @State private var tipIndex = CampusTips.randomIndex()
    @State private var pulse = false

    var body: some View {
        if !dismissed {
            HStack(alignment: .top, spacing: AgoraDesign.Spacing.xs) {
                Text("💡")
                    .font(.outfit(.title3))

                Text(CampusTips.tips[tipIndex])
                    .font(.outfit(.caption, .medium))
                    .foregroundStyle(AgoraDesign.Colors.texto)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Button {
                    dismissed = true
                } label: {
                    Image(systemName: "xmark")
                        .font(.outfit(.caption, .semibold))
                        .foregroundStyle(AgoraDesign.Colors.textoMedio)
                        .padding(6)
                }
                .buttonStyle(.agoraPlain)
                .accessibilityLabel("Cerrar tip")
            }
            .padding(.horizontal, AgoraDesign.Spacing.sm + 2)
            .padding(.vertical, 10)
            .background(AgoraDesign.Colors.naranjaSuave)
            .clipShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
            .scaleEffect(pulse ? 1.02 : 1)
            .animation(AgoraDesign.Animation.spring, value: pulse)
            .contentShape(RoundedRectangle(cornerRadius: AgoraDesign.Radii.medium))
            .onTapGesture { rotateTip() }
            .background(ShakeDetectorView(onShake: rotateTip))
        }
    }

    private func rotateTip() {
        tipIndex = CampusTips.randomIndex(excluding: tipIndex)
        Haptics.light()
        pulse = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            pulse = false
        }
    }
}

private enum CampusTips {
    static let tips = [
        "Tip: La biblioteca cierra tarde los jueves — aprovecha para estudiar en silencio.",
        "Tip: Doble tap en una foto = 🧡 Me late",
        "Tip: Responde la pregunta del día 7 veces y ganas insignia",
        "Tip: Filtra por tu carrera en el feed para ver lo más relevante.",
        "Tip: Mantén tu racha activa entrando un ratito cada día.",
        "Tip: Los jueves hay más movimiento en el feed — buen momento para publicar.",
        "Tip: Desliza en Trending para descubrir hashtags del campus.",
        "Tip: Saluda a quien cumple años hoy — aparecen arriba en el feed.",
        "Tip: Guarda posts útiles con el bookmark para encontrarlos después.",
        "Tip: Usa # para conectar tu publicación con el resto del campus.",
        "Tip: El Centro Estudiantil tiene WiFi estable si tu señal falla.",
        "Tip: Agita el teléfono aquí para otro tip del campus 📱",
    ]

    static func randomIndex(excluding: Int? = nil) -> Int {
        guard tips.count > 1 else { return 0 }
        var next = Int.random(in: 0..<tips.count)
        while next == excluding {
            next = Int.random(in: 0..<tips.count)
        }
        return next
    }
}

private struct ShakeDetectorView: UIViewControllerRepresentable {
    let onShake: () -> Void

    func makeUIViewController(context: Context) -> ShakeDetectorViewController {
        let controller = ShakeDetectorViewController()
        controller.onShake = onShake
        return controller
    }

    func updateUIViewController(_ uiViewController: ShakeDetectorViewController, context: Context) {
        uiViewController.onShake = onShake
    }
}

private final class ShakeDetectorViewController: UIViewController {
    var onShake: (() -> Void)?

    override var canBecomeFirstResponder: Bool { true }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        becomeFirstResponder()
    }

    override func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
        if motion == .motionShake {
            onShake?()
        }
    }
}
