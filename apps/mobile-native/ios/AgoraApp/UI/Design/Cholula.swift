import SwiftUI

// MARK: - B «Cholula» (docs/diseno-cholula.md §2 y §3): las piezas que comparten iOS y Android

/// Color de una comunidad por el prefijo de su slug (catálogo fijo en las apps, igual que Android).
struct ColorComunidad {
    let fondo: Color
    let tinta: Color

    static func de(slug: String?) -> ColorComunidad {
        let s = slug ?? ""
        if s.hasPrefix("carrera:") { return ColorComunidad(fondo: AgoraDesign.Colors.talavera, tinta: .white) }
        if s.hasPrefix("colegio:") { return ColorComunidad(fondo: AgoraDesign.Colors.maiz, tinta: AgoraDesign.Colors.sobreMaiz) }
        if s.hasPrefix("universidad:") { return ColorComunidad(fondo: AgoraDesign.Colors.adobe, tinta: .white) }
        // `generacion:` y cualquier otra.
        return ColorComunidad(fondo: AgoraDesign.Colors.jade, tinta: .white)
    }
}

/// Texto corto en mayúsculas para el sello de una comunidad: «Ingeniería en Sistemas Computacionales»
/// → «SISTEMAS», «Generación 2024» → «GEN 2024», «Colegio Cain Murray» → «CAIN MURRAY», la plaza →
/// «TODA LA UDLAP». Misma regla en Android.
enum NombreSello {
    /// Mismo orden que `prefijosCarrera` de Android: se quitan uno tras otro los que apliquen.
    private static let prefijosCarrera = ["Licenciatura en ", "Ingeniería en ", "Ingeniería ", "Lic. en ", "Licenciatura "]

    static func de(nombre: String, slug: String?) -> String {
        corto(nombre: nombre, slug: slug).uppercased()
    }

    /// El mismo nombre corto sin pasar a mayúsculas («Sistemas», «Gen 2024»): píldoras y el revelado.
    static func corto(nombre: String, slug: String?) -> String {
        let s = slug ?? ""
        let n = nombre.trimmingCharacters(in: .whitespaces)
        let corto: String
        if s.hasPrefix("universidad:") {
            corto = "Toda la UDLAP"
        } else if s.hasPrefix("generacion:") {
            corto = n.replacingOccurrences(of: "Generación ", with: "Gen ")
        } else if s.hasPrefix("colegio:") {
            corto = (n.hasPrefix("Colegio ") ? String(n.dropFirst("Colegio ".count)) : n).trimmingCharacters(in: .whitespaces)
        } else if s.hasPrefix("carrera:") {
            let sinPrefijo = prefijosCarrera.reduce(n) { acc, p in acc.hasPrefix(p) ? String(acc.dropFirst(p.count)) : acc }
            let palabras = sinPrefijo.split(whereSeparator: { $0 == " " || $0 == "," }).map(String.init)
            corto = palabras.first(where: { $0.count > 2 }) ?? sinPrefijo
        } else {
            corto = n
        }
        return corto
    }
}

/// Sello: rectángulo de radio 8 con el nombre corto en mayúsculas y el color de la comunidad.
struct Sello: View {
    let texto: String
    let fondo: Color
    var tinta: Color = .white
    var alto: CGFloat = 26

    var body: some View {
        Text(texto)
            .font(.outfit(.caption, .bold))
            .tracking(0.5)
            .foregroundStyle(tinta)
            .lineLimit(1)
            .padding(.horizontal, 10)
            .frame(height: alto)
            .background(fondo, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

extension Sello {
    init(comunidad: ComunidadDto, alto: CGFloat = 26) {
        let color = ColorComunidad.de(slug: comunidad.slug)
        self.init(texto: NombreSello.de(nombre: comunidad.nombre, slug: comunidad.slug), fondo: color.fondo,
                  tinta: color.tinta, alto: alto)
    }
}

/// Silueta escalonada de la pirámide de Cholula (logo, pestaña activa, base del avatar, carteles).
struct Terrazas: Shape {
    var niveles = 4

    func path(in r: CGRect) -> Path {
        let pasoX = r.width / CGFloat(2 * niveles + 2)
        let pasoY = r.height / CGFloat(niveles)
        var puntos: [CGPoint] = []
        for i in 0..<niveles {
            let x = r.minX + CGFloat(i) * pasoX
            let y0 = r.maxY - CGFloat(i) * pasoY
            puntos.append(CGPoint(x: x, y: y0))
            puntos.append(CGPoint(x: x, y: y0 - pasoY))
        }
        for i in stride(from: niveles - 1, through: 0, by: -1) {
            let x = r.maxX - CGFloat(i) * pasoX
            let y0 = r.maxY - CGFloat(i) * pasoY
            puntos.append(CGPoint(x: x, y: y0 - pasoY))
            puntos.append(CGPoint(x: x, y: y0))
        }
        var p = Path()
        p.addLines(puntos)
        p.closeSubpath()
        return p
    }
}

/// Azulejo de Talavera poblana dibujado: cuadro de 28 con flor de cuatro pétalos, esquinas en triángulo
/// y punto al centro. Franja bajo el encabezado, portada del perfil, esquina de la publicación tipográfica.
struct Talavera: View {
    var fondo: Color = .white
    var trazo: Color = AgoraDesign.Colors.azulejo
    var lado: CGFloat = 28

    var body: some View {
        Canvas { contexto, tamano in
            contexto.fill(Path(CGRect(origin: .zero, size: tamano)), with: .color(fondo))
            let columnas = Int((tamano.width / lado).rounded(.up))
            let filas = Int((tamano.height / lado).rounded(.up))
            let k = lado / 28
            for fila in 0..<max(filas, 1) {
                for columna in 0..<max(columnas, 1) {
                    let origen = CGPoint(x: CGFloat(columna) * lado, y: CGFloat(fila) * lado)
                    contexto.fill(Self.azulejo(en: origen, k: k), with: .color(trazo))
                    let centro = CGRect(x: origen.x + 12 * k, y: origen.y + 12 * k, width: 4 * k, height: 4 * k)
                    contexto.fill(Path(ellipseIn: centro), with: .color(fondo))
                }
            }
        }
        .accessibilityHidden(true)
    }

    private static func azulejo(en o: CGPoint, k: CGFloat) -> Path {
        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: o.x + x * k, y: o.y + y * k) }
        var p = Path()
        // Pétalos: arriba, abajo, izquierda y derecha.
        p.move(to: pt(14, 4))
        p.addCurve(to: pt(14, 14), control1: pt(17, 8), control2: pt(17, 10))
        p.addCurve(to: pt(14, 4), control1: pt(11, 10), control2: pt(11, 8))
        p.move(to: pt(14, 24))
        p.addCurve(to: pt(14, 14), control1: pt(11, 20), control2: pt(11, 18))
        p.addCurve(to: pt(14, 24), control1: pt(17, 18), control2: pt(17, 20))
        p.move(to: pt(4, 14))
        p.addCurve(to: pt(14, 14), control1: pt(8, 11), control2: pt(10, 11))
        p.addCurve(to: pt(4, 14), control1: pt(10, 17), control2: pt(8, 17))
        p.move(to: pt(24, 14))
        p.addCurve(to: pt(14, 14), control1: pt(20, 17), control2: pt(18, 17))
        p.addCurve(to: pt(24, 14), control1: pt(18, 11), control2: pt(20, 11))
        // Esquinas.
        p.addLines([pt(0, 0), pt(5, 0), pt(0, 5)])
        p.closeSubpath()
        p.addLines([pt(28, 0), pt(23, 0), pt(28, 5)])
        p.closeSubpath()
        p.addLines([pt(0, 28), pt(5, 28), pt(0, 23)])
        p.closeSubpath()
        p.addLines([pt(28, 28), pt(23, 28), pt(28, 23)])
        p.closeSubpath()
        return p
    }
}

/// Franja de azulejo de 10 de alto bajo el encabezado del inicio y de Mercado.
struct FranjaTalavera: View {
    var alto: CGFloat = 10

    var body: some View {
        Talavera()
            .frame(height: alto)
            .frame(maxWidth: .infinity)
            .clipped()
    }
}

/// Rectángulo con solo la esquina inferior izquierda redonda (esquina de Talavera de la publicación
/// tipográfica). `UnevenRoundedRectangle` es de iOS 17 y la app corre desde iOS 16.
struct EsquinaRedonda: Shape {
    var radio: CGFloat

    func path(in r: CGRect) -> Path {
        let k = min(radio, r.width / 2, r.height / 2)
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX + k, y: r.maxY))
        p.addQuadCurve(to: CGPoint(x: r.minX, y: r.maxY - k), control: CGPoint(x: r.minX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}
