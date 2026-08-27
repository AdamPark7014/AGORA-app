package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import mx.agora.mobile.nativeapp.ui.theme.AgoraChipShape
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors
import mx.agora.mobile.nativeapp.ui.theme.AgoraSpacing

data class AgoraChipItem(
    val id: String,
    val label: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgoraChipRow(
    chips: List<AgoraChipItem>,
    selectedId: String?,
    onChipSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(bottom = AgoraSpacing.Xs),
        horizontalArrangement = Arrangement.spacedBy(AgoraSpacing.Xs),
    ) {
        chips.forEach { chip ->
            val selected = chip.id == selectedId
            val containerColor by animateColorAsState(
                targetValue = if (selected) AgoraColors.ChipSelected else Color.Transparent,
                animationSpec = spring(stiffness = Spring.StiffnessMedium),
                label = "chipContainer",
            )
            val labelColor by animateColorAsState(
                targetValue = if (selected) AgoraColors.ChipSelectedText else AgoraColors.TextoMedio,
                animationSpec = spring(stiffness = Spring.StiffnessMedium),
                label = "chipLabel",
            )

            FilterChip(
                selected = selected,
                onClick = { onChipSelected(chip.id) },
                label = {
                    Text(
                        text = chip.label,
                        maxLines = 1,
                        style = MaterialTheme.typography.labelLarge,
                    )
                },
                shape = AgoraChipShape,
                colors = FilterChipDefaults.filterChipColors(
                    containerColor = Color.Transparent,
                    selectedContainerColor = containerColor,
                    labelColor = AgoraColors.TextoMedio,
                    selectedLabelColor = labelColor,
                ),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = selected,
                    borderColor = AgoraColors.Borde,
                    selectedBorderColor = AgoraColors.Naranja.copy(alpha = 0.3f),
                ),
            )
        }
    }
}
