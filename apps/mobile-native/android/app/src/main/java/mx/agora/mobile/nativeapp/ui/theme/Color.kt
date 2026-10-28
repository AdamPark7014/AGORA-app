package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Tokens de color con variante clara y oscura (la oscura es la misma paleta
 * que la web). `AgoraTheme` fija [oscuro] según el tema elegido (claro si no
 * hay elección); cambiar el modo
 * recrea la Activity, así que leer un flag simple basta y sirve también fuera
 * de funciones @Composable (lambdas de dibujo, valores por defecto).
 */
object AgoraColors {
    @Volatile
    var oscuro: Boolean = false

    private fun par(claro: Long, noche: Long): Color = Color(if (oscuro) noche else claro)

    // Diseño D (docs/diseno-d.md, aprobado el 23-10-2026). Los nombres de antes se
    // conservan para que todas las pantallas tomen la paleta nueva sin tocarlas.

    // Marca
    val Naranja get() = par(0xFFE35205, 0xFFFF6B26)
    /** `naranja-suave`: banda de comunidad, chip de reacción activo. */
    val NaranjaSuave get() = par(0xFFFDE8DC, 0xFF2A1509)
    /** `naranja-tinta`: texto sobre naranja-suave y #hashtags. */
    val NaranjaTinta get() = par(0xFF9A3503, 0xFFFFB385)
    val NaranjaOscuro get() = par(0xFFB84004, 0xFFFF8547)

    // Superficies: cantera de día y obsidiana de noche (B «Cholula», docs/diseno-cholula.md, 28-10-2026).
    val Fondo get() = par(0xFFF6F0E7, 0xFF14100D)
    val Superficie get() = par(0xFFFFFFFF, 0xFF1E1814)
    /** Las tarjetas de la D van en `superficie`. */
    val SurfaceElevated get() = par(0xFFFFFFFF, 0xFF1E1814)
    /** `superficie-2`: segmentos, chips inactivos y el cartel neutro. */
    val Superficie2 get() = par(0xFFEDE4D6, 0xFF2A221C)
    /** `oscuro`: tarjeta de la pregunta, barra de navegación flotante, barra del evento. */
    val Oscuro get() = par(0xFF14110F, 0xFF24201C)

    // Texto (`tinta-media` >= 4.5:1 sobre fondo y superficie en ambos modos)
    val Texto get() = par(0xFF1B140F, 0xFFF6F0E7)
    val TextoMedio get() = par(0xFF6B5D50, 0xFFC2B4A4)
    val TextMuted get() = par(0xFF6B5D50, 0xFFC2B4A4)

    // Bordes
    val Borde get() = par(0xFFE2D6C5, 0xFF3A2F27)
    val BordeSutil get() = par(0xFFEDE4D6, 0xFF2A221C)

    // Semánticos
    // Claro 2A7449: 2E7D4F daba 4.49:1 sobre SuccessSuave.
    val Success get() = par(0xFF2A7449, 0xFF7FC9A8)
    val SuccessSuave get() = par(0xFFE8F5EC, 0xFF0D2925)
    val Danger get() = par(0xFFC62828, 0xFFF26161)
    val DangerSuave get() = par(0xFFFDECEA, 0xFF3A1414)
    val Warning get() = par(0xFFE6A817, 0xFFF2C14E)
    val WarningSuave get() = par(0xFFFFF8E6, 0xFF2A2210)
    /** Ámbar para TEXTO («Apartado»): Warning da 2:1 sobre fondo claro. */
    val WarningTexto get() = par(0xFF8A5A00, 0xFFF2C14E)
    /** `vivo`: punto de «Ahora en el campus». */
    val Vivo get() = par(0xFF16A34A, 0xFF22C55E)

    // Interactivos
    val ChipSelected get() = NaranjaSuave
    val ChipSelectedText get() = NaranjaTinta
    val SkeletonBase get() = par(0xFFE9E5DF, 0xFF24201C)
    val SkeletonHighlight get() = par(0xFFF4F2EF, 0xFF2E2925)

    // Inicio y barra (estructura de Feed B) con la paleta de B «Cholula»: el inicio ya es cantera, no
    // blanco. Mismos valores que iOS (docs/diseno-cholula.md §1).
    val FondoFeed get() = Fondo
    val TintaFeed get() = Texto
    val SecundarioFeed get() = TextoMedio
    val BordeFeed get() = Borde
    /** Pregunta del día (artboard Main): fondo naranja muy suave y borde de sus opciones. */
    val PreguntaFondo get() = par(0xFFFBE6D9, 0xFF2E1A0F)
    val PreguntaBorde get() = par(0xFFE2D6C5, 0xFF3A2F27)
    /** Anillo de una historia ya vista y borde punteado de «Tu historia». */
    val AnilloVisto get() = Borde

    // B «Cholula»: Talavera poblana, adobe, jade y maíz. Llevan texto blanco salvo el maíz.
    val Talavera get() = Color(0xFF1E3A8A)
    /** Fondo del azulejo: blanco de día, azul noche en obsidiana (la franja no se vuelve un foco). */
    val AzulejoFondo get() = par(0xFFFFFFFF, 0xFF16224A)
    /** Azul Talavera como texto: en obsidiana se aclara para leerse. */
    val TalaveraTexto get() = par(0xFF1E3A8A, 0xFFA9C0FF)
    val Adobe get() = Color(0xFFB5400F)
    val Jade get() = Color(0xFF0F766E)
    val Maiz get() = Color(0xFFE0A82E)
    /** Texto sobre maíz. */
    val SobreMaiz get() = Color(0xFF1B140F)
    /** Botón primario (Publicar, Vender…): el naranja de marca no llega a 4.5:1 con blanco. */
    val Boton get() = par(0xFFB83C0B, 0xFFFF7A3D)
    val SobreBoton get() = par(0xFFFFFFFF, 0xFF1A0E07)
}
