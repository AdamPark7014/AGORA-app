// Generado por packages/design-tokens (pnpm --filter @agora/design-tokens generar). No editar a mano.
package mx.agora.mobile.nativeapp.ui.theme

object AgoraTokens {
    data class Par(val claro: Long, val oscuro: Long)

    /** Fondo de pantalla (cantera de día, obsidiana de noche). */
    val Fondo = Par(0xFFF6F0E7, 0xFF14100D)

    /** Tarjetas, boleto, píldoras. */
    val Superficie = Par(0xFFFFFFFF, 0xFF1E1814)

    /** Chips inactivos, cartel neutro, base del esqueleto de carga. */
    val Superficie2 = Par(0xFFEDE4D6, 0xFF2A221C)

    /** Texto principal. */
    val Tinta = Par(0xFF1B140F, 0xFFF6F0E7)

    /** Texto secundario (>= 4.5:1 sobre fondo y superficie). */
    val Secundario = Par(0xFF6B5D50, 0xFFC2B4A4)

    /** Bordes de 1. */
    val Borde = Par(0xFFE2D6C5, 0xFF3A2F27)

    /** Separadores dentro de una tarjeta. */
    val BordeSutil = Par(0xFFEDE4D6, 0xFF2A221C)

    /** Barras oscuras (acciones del evento, tarjeta de la pregunta). */
    val Oscuro = Par(0xFF1B140F, 0xFF2A221C)

    /** Marca (Pantone 166 C), terrazas, punto de avisos. No lleva texto blanco encima. */
    val Naranja = Par(0xFFE35205, 0xFFFF6B26)

    /** Etiquetas y fondo de «PREGUNTA DEL DÍA». */
    val NaranjaSuave = Par(0xFFFBE6D9, 0xFF2E1A0F)

    /** Texto sobre naranjaSuave y #hashtags. */
    val NaranjaTinta = Par(0xFF9A3503, 0xFFFFB385)

    /** Publicar y botones primarios. */
    val Boton = Par(0xFFB83C0B, 0xFFFF7A3D)

    /** Texto sobre boton (>= 4.5:1). */
    val SobreBoton = Par(0xFFFFFFFF, 0xFF1A0E07)

    /** Azul Talavera de relleno, con texto blanco. */
    val Talavera = Par(0xFF1E3A8A, 0xFF1E3A8A)

    /** Azul Talavera como texto. */
    val TalaveraTexto = Par(0xFF1E3A8A, 0xFFA9C0FF)

    /** Rojo adobe, con texto blanco. */
    val Adobe = Par(0xFFB5400F, 0xFFB5400F)

    /** Verde jade, con texto blanco. */
    val Jade = Par(0xFF0F766E, 0xFF0F766E)

    /** Amarillo maíz, con texto sobreMaiz. */
    val Maiz = Par(0xFFE0A82E, 0xFFE0A82E)

    /** Texto sobre maíz. */
    val SobreMaiz = Par(0xFF1B140F, 0xFF1B140F)

    /** En vivo / a tiempo. */
    val Vivo = Par(0xFF15803D, 0xFF22C55E)

    /** Confirmaciones (2A7449 da >= 4.5:1 sobre exitoSuave). */
    val Exito = Par(0xFF2A7449, 0xFF7FC9A8)

    /** Errores y acciones destructivas. */
    val Peligro = Par(0xFFC62828, 0xFFF26161)

    /** Fondo de avisos de error. */
    val PeligroSuave = Par(0xFFFDECEA, 0xFF3A1414)
}
