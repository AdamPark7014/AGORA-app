package mx.agora.mobile.nativeapp.ui.navigation

import androidx.navigation.NavHostController

/** Rutas de deep link que en nativo son una pestaña de MainShell, no un destino. */
private val rutasDePestana = mapOf(
    AgoraRoutes.EVENTOS to PestanaBus.EVENTOS,
    AgoraRoutes.MARKETPLACE to PestanaBus.MERCADO,
    AgoraRoutes.PERFIL_YO to PestanaBus.PERFIL,
)

fun navigateToDeepLinkRoute(navController: NavHostController, route: String) {
    val pestana = rutasDePestana[route]
    if (pestana != null) {
        // Pestaña, no destino: se regresa al MainShell que ya existe (conserva
        // el feed) y se le pide la pestaña.
        PestanaBus.solicitar(pestana)
        if (!navController.popBackStack(AgoraRoutes.MAIN, inclusive = false)) {
            navController.navigate(AgoraRoutes.MAIN) { launchSingleTop = true }
        }
        return
    }
    if (route == AgoraRoutes.MAIN) {
        navController.navigate(AgoraRoutes.MAIN) {
            popUpTo(AgoraRoutes.MAIN) { inclusive = true }
            launchSingleTop = true
        }
        return
    }
    navController.navigate(route) {
        popUpTo(AgoraRoutes.MAIN) { inclusive = false }
        launchSingleTop = true
    }
}
