package mx.agora.mobile.nativeapp.ui.navigation

import androidx.navigation.NavHostController

fun navigateToDeepLinkRoute(navController: NavHostController, route: String) {
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
