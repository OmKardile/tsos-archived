package com.tsos.app.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Signup : Screen("signup")
    object Dashboard : Screen("dashboard")
    object POS : Screen("pos")
    object Orders : Screen("orders")
    object KDS : Screen("kds")
    object Menu : Screen("menu")
    object Inventory : Screen("inventory")
    object Tables : Screen("tables")
    object Customers : Screen("customers")
    object Offers : Screen("offers")
    object Reports : Screen("reports")
    object Settings : Screen("settings")
    object Storefront : Screen("storefront/{slug}") {
        fun createRoute(slug: String) = "storefront/$slug"
    }
    object OrderTracking : Screen("tracking/{slug}/{orderId}") {
        fun createRoute(slug: String, orderId: String) = "tracking/$slug/$orderId"
    }
}
