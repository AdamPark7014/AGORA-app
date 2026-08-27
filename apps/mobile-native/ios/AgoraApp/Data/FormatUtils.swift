import Foundation

enum FormatUtils {
  private static let zona = TimeZone(identifier: "America/Mexico_City") ?? .current

  private static let fechaCorta: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "es_MX")
    f.timeZone = zona
    f.dateFormat = "EEE d MMM · HH:mm"
    return f
  }()

  static func formatearFecha(_ iso: String) -> String {
    guard let date = parseISO(iso) else { return iso }
    return fechaCorta.string(from: date)
  }

  static func haceCuanto(_ iso: String) -> String {
    guard let date = parseISO(iso) else { return iso }
    let min = Int(Date().timeIntervalSince(date) / 60)
    switch min {
    case ..<1: return "ahora"
    case ..<60: return "hace \(min) min"
    case ..<(60 * 24): return "hace \(min / 60) h"
    case ..<(60 * 24 * 7): return "hace \(min / (60 * 24)) d"
    default: return formatearFecha(iso)
    }
  }

  static func formatearPrecio(_ monto: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.locale = Locale(identifier: "es_MX")
    return formatter.string(from: NSNumber(value: monto)) ?? "\(monto)"
  }

  static func mensajeDe(_ error: Error) -> String {
    if let api = error as? ApiError {
      switch api {
      case .http(let code, _):
        switch code {
        case 401: return "Sesión expirada. Vuelve a entrar."
        case 403: return "No tienes permiso para esto."
        case 404: return "No encontrado."
        default: return "Error del servidor (\(code))."
        }
      default:
        return api.localizedDescription
      }
    }
    return error.localizedDescription
  }

  private static func parseISO(_ iso: String) -> Date? {
    let f1 = ISO8601DateFormatter()
    f1.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = f1.date(from: iso) { return d }
    let f2 = ISO8601DateFormatter()
    f2.formatOptions = [.withInternetDateTime]
    return f2.date(from: iso)
  }
}
