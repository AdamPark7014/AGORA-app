// Generado por packages/design-tokens (pnpm --filter @agora/design-tokens generar). No editar a mano.

enum AgoraTokens {
    struct Par {
        let claro: (Int, Int, Int)
        let oscuro: (Int, Int, Int)
    }

    /// Fondo de pantalla (cantera de día, obsidiana de noche).
    static let fondo = Par(claro: (246, 240, 231), oscuro: (20, 16, 13))

    /// Tarjetas, boleto, píldoras.
    static let superficie = Par(claro: (255, 255, 255), oscuro: (30, 24, 20))

    /// Chips inactivos, cartel neutro, base del esqueleto de carga.
    static let superficie2 = Par(claro: (237, 228, 214), oscuro: (42, 34, 28))

    /// Texto principal.
    static let tinta = Par(claro: (27, 20, 15), oscuro: (246, 240, 231))

    /// Texto secundario (>= 4.5:1 sobre fondo y superficie).
    static let secundario = Par(claro: (107, 93, 80), oscuro: (194, 180, 164))

    /// Bordes de 1.
    static let borde = Par(claro: (226, 214, 197), oscuro: (58, 47, 39))

    /// Separadores dentro de una tarjeta.
    static let bordeSutil = Par(claro: (237, 228, 214), oscuro: (42, 34, 28))

    /// Barras oscuras (acciones del evento, tarjeta de la pregunta).
    static let oscuro = Par(claro: (27, 20, 15), oscuro: (42, 34, 28))

    /// Marca (Pantone 166 C), terrazas, punto de avisos. No lleva texto blanco encima.
    static let naranja = Par(claro: (227, 82, 5), oscuro: (255, 107, 38))

    /// Etiquetas y fondo de «PREGUNTA DEL DÍA».
    static let naranjaSuave = Par(claro: (251, 230, 217), oscuro: (46, 26, 15))

    /// Texto sobre naranjaSuave y #hashtags.
    static let naranjaTinta = Par(claro: (154, 53, 3), oscuro: (255, 179, 133))

    /// Publicar y botones primarios.
    static let boton = Par(claro: (184, 60, 11), oscuro: (255, 122, 61))

    /// Texto sobre boton (>= 4.5:1).
    static let sobreBoton = Par(claro: (255, 255, 255), oscuro: (26, 14, 7))

    /// Azul Talavera de relleno, con texto blanco.
    static let talavera = Par(claro: (30, 58, 138), oscuro: (30, 58, 138))

    /// Azul Talavera como texto.
    static let talaveraTexto = Par(claro: (30, 58, 138), oscuro: (169, 192, 255))

    /// Rojo adobe, con texto blanco.
    static let adobe = Par(claro: (181, 64, 15), oscuro: (181, 64, 15))

    /// Verde jade, con texto blanco.
    static let jade = Par(claro: (15, 118, 110), oscuro: (15, 118, 110))

    /// Amarillo maíz, con texto sobreMaiz.
    static let maiz = Par(claro: (224, 168, 46), oscuro: (224, 168, 46))

    /// Texto sobre maíz.
    static let sobreMaiz = Par(claro: (27, 20, 15), oscuro: (27, 20, 15))

    /// En vivo / a tiempo.
    static let vivo = Par(claro: (21, 128, 61), oscuro: (34, 197, 94))

    /// Confirmaciones (2A7449 da >= 4.5:1 sobre exitoSuave).
    static let exito = Par(claro: (42, 116, 73), oscuro: (127, 201, 168))

    /// Errores y acciones destructivas.
    static let peligro = Par(claro: (198, 40, 40), oscuro: (242, 97, 97))

    /// Fondo de avisos de error.
    static let peligroSuave = Par(claro: (253, 236, 234), oscuro: (58, 20, 20))
}
