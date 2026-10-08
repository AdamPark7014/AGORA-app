package mx.agora.mobile.nativeapp.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DynamicFeed
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.agora.mobile.nativeapp.ui.components.AgoraMarcaHorizontal
import mx.agora.mobile.nativeapp.ui.components.AgoraProgressDots
import mx.agora.mobile.nativeapp.ui.theme.AgoraColors

private data class WelcomePage(
    val icon: @Composable () -> Unit,
    val title: String,
    val description: String,
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun WelcomeScreen(
    onFinished: () -> Unit,
) {
    val pages = listOf(
        WelcomePage(
            icon = {
                Icon(
                    Icons.Outlined.DynamicFeed,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = AgoraColors.Naranja,
                )
            },
            title = "Tu feed del campus",
            description = "Descubre lo que pasa en la UDLAP: posts, encuestas y conversaciones de tu comunidad verificada.",
        ),
        WelcomePage(
            icon = {
                Icon(
                    Icons.Outlined.Verified,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = AgoraColors.Naranja,
                )
            },
            title = "Comunidades verificadas",
            description = "Carreras, colegios y grupos oficiales con badge verificado. Solo gente real de la UDLAP.",
        ),
        WelcomePage(
            icon = {
                Icon(
                    Icons.Outlined.CalendarMonth,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = AgoraColors.Naranja,
                )
            },
            title = "Eventos en vivo",
            description = "Fiestas, charlas, torneos y más. RSVP y no te pierdas nada del campus.",
        ),
    )

    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()
    val isLastPage = pagerState.currentPage == pages.lastIndex

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AgoraMarcaHorizontal(isotipo = 32.dp)
            TextButton(onClick = onFinished) {
                Text("Saltar", color = AgoraColors.TextoMedio)
            }
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
        ) { page ->
            val item = pages[page]
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    modifier = Modifier
                        .size(96.dp)
                        .clip(CircleShape)
                        .background(AgoraColors.NaranjaSuave),
                    contentAlignment = Alignment.Center,
                ) {
                    item.icon()
                }
                Spacer(Modifier.height(32.dp))
                Text(
                    item.title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    item.description,
                    style = MaterialTheme.typography.bodyLarge,
                    color = AgoraColors.TextoMedio,
                    textAlign = TextAlign.Center,
                )
            }
        }

        AgoraProgressDots(
            pageCount = pages.size,
            currentPage = pagerState.currentPage,
            modifier = Modifier.padding(vertical = 24.dp),
        )

        Button(
            onClick = {
                if (isLastPage) {
                    onFinished()
                } else {
                    scope.launch {
                        pagerState.animateScrollToPage(pagerState.currentPage + 1)
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (isLastPage) "¡Empezar!" else "Siguiente")
        }
    }
}
