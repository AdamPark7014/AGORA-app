package mx.agora.mobile.nativeapp.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

object AgoraRadii {
    val Card = 16.dp
    val Button = 12.dp
    val Chip = 999.dp
    val Small = 8.dp
    val Medium = 12.dp
    val Large = 16.dp
}

val AgoraShapes = Shapes(
    extraSmall = RoundedCornerShape(AgoraRadii.Small),
    small = RoundedCornerShape(AgoraRadii.Small),
    medium = RoundedCornerShape(AgoraRadii.Medium),
    large = RoundedCornerShape(AgoraRadii.Card),
    extraLarge = RoundedCornerShape(AgoraRadii.Card),
)

val AgoraCardShape = RoundedCornerShape(AgoraRadii.Card)
val AgoraButtonShape = RoundedCornerShape(AgoraRadii.Button)
val AgoraChipShape = RoundedCornerShape(AgoraRadii.Chip)
