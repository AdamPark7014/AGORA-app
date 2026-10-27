package mx.agora.mobile.nativeapp.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.layout.LocalPinnableContainer

/**
 * Mantiene compuesto el item de la LazyColumn que lo llama aunque salga de
 * pantalla, para que su estado (datos ya cargados, scroll del carril, cuenta
 * regresiva) sobreviva al scroll. No pinta nada: llámalo antes de cualquier
 * `return` temprano.
 *
 * Antes vivía con «Ahora en el campus», la fila de clips y el mini evento del inicio
 * D; con el Feed B (docs/diseno-d.md §0) esas piezas salieron del inicio y se quitaron.
 */
@Composable
internal fun AnclarEnLaLista() {
    val anclable = LocalPinnableContainer.current
    DisposableEffect(anclable) {
        val ancla = anclable?.pin()
        onDispose { ancla?.release() }
    }
}
