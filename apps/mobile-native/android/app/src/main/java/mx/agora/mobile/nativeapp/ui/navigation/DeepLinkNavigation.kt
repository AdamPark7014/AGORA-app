package mx.agora.mobile.nativeapp.ui.navigation

import androidx.navigation.NavHostController

fun navigateToDeepLinkRoute(navController: NavHostController, route: String) {
    if (route == AgoraRoutes.EVENTOS) {
        // Pestaña, no destino: se regresa al MainShell que ya existe (conserva
        // el feed) y se le pide la pestaña Eventos.
        PestanaBus.solicitar(PestanaBus.EVENTOS)
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
