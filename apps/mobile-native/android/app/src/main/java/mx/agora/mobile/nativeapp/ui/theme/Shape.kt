package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/** Radios del diseño D (docs/diseno-d.md §2). */
object AgoraRadii {
    /** Tarjeta de publicación, pregunta, mini evento. */
    val Card = 22.dp
    /** Foto o video dentro de una tarjeta. */
    val Foto = 16.dp
    val Button = 14.dp
    val Chip = 12.dp
    /** Avatar: cuadrado redondeado (40 dp). En el perfil, 88 dp con radio 28. */
    val Avatar = 14.dp
    val AvatarPerfil = 28.dp
    /** Barra de navegación flotante. */
    val Barra = 24.dp
    val Small = 8.dp
    val Medium = 12.dp
    val Large = 16.dp
}

val AgoraShapes = Shapes(
    extraSmall = RoundedCornerShape(AgoraRadii.Small),
    small = RoundedCornerShape(AgoraRadii.Chip),
    medium = RoundedCornerShape(AgoraRadii.Button),
    large = RoundedCornerShape(AgoraRadii.Card),
    extraLarge = RoundedCornerShape(AgoraRadii.Card),
)

val AgoraCardShape = RoundedCornerShape(AgoraRadii.Card)
val AgoraFotoShape = RoundedCornerShape(AgoraRadii.Foto)
val AgoraButtonShape = RoundedCornerShape(AgoraRadii.Button)
val AgoraChipShape = RoundedCornerShape(AgoraRadii.Chip)
val AgoraAvatarShape = RoundedCornerShape(AgoraRadii.Avatar)
