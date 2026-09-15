package com.tsos.app.ui.navigation

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.tsos.app.ui.auth.LoginScreen
import com.tsos.app.ui.auth.SignupScreen
import com.tsos.app.ui.dashboard.DashboardScreen
import com.tsos.app.ui.pos.POSScreen
import com.tsos.app.ui.orders.OrdersScreen
import com.tsos.app.ui.kds.KDSScreen
import com.tsos.app.ui.menu.MenuScreen
import com.tsos.app.ui.inventory.InventoryScreen
import com.tsos.app.ui.tables.TablesScreen
import com.tsos.app.ui.customers.CustomersScreen
import com.tsos.app.ui.offers.OffersScreen
import com.tsos.app.ui.reports.ReportsScreen
import com.tsos.app.ui.settings.SettingsScreen
import com.tsos.app.ui.storefront.StorefrontScreen
import com.tsos.app.ui.tracking.OrderTrackingScreen

data class NavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

val dashboardNavItems = listOf(
    NavItem(Screen.Dashboard.route, "Overview", Icons.Default.Dashboard),
    NavItem(Screen.POS.route, "POS", Icons.Default.ShoppingBag),
    NavItem(Screen.Orders.route, "Orders", Icons.Default.List),
    NavItem(Screen.KDS.route, "KDS", Icons.Default.Restaurant),
    NavItem(Screen.Menu.route, "Menu", Icons.Default.RestaurantMenu),
    NavItem(Screen.Inventory.route, "Inventory", Icons.Default.Inventory),
    NavItem(Screen.Tables.route, "Tables", Icons.Default.GridOn),
    NavItem(Screen.Customers.route, "Customers", Icons.Default.People),
    NavItem(Screen.Offers.route, "Offers", Icons.Default.CardGiftcard),
    NavItem(Screen.Reports.route, "Reports", Icons.Default.BarChart),
    NavItem(Screen.Settings.route, "Settings", Icons.Default.Settings),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScaffold(
    navController: NavHostController,
    currentRoute: String?,
    onLogout: () -> Unit,
    content: @Composable (PaddingValues) -> Unit
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                Spacer(Modifier.height(16.dp))
                Text(
                    "TSOS POS",
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    color = MaterialTheme.colorScheme.primary
                )
                HorizontalDivider()
                dashboardNavItems.forEach { item ->
                    NavigationDrawerItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = currentRoute == item.route,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(Screen.Dashboard.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                    )
                }
                Spacer(Modifier.weight(1f))
                NavigationDrawerItem(
                    icon = { Icon(Icons.Default.Logout, contentDescription = "Sign Out") },
                    label = { Text("Sign Out") },
                    selected = false,
                    onClick = onLogout,
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )
            }
        }
    ) {
        content(PaddingValues(0.dp))
    }
}

@Composable
fun AppNavGraph(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Login.route,
    onLogout: () -> Unit = {}
) {
    var currentRoute by remember { mutableStateOf(startDestination) }

    LaunchedEffect(navController) {
        navController.currentBackStackEntryFlow.collect { entry ->
            currentRoute = entry.destination.route ?: ""
        }
    }

    if (currentRoute.startsWith("storefront") || currentRoute.startsWith("tracking")) {
        NavHost(navController = navController, startDestination = startDestination) {
            composable(Screen.Storefront.route, arguments = listOf(navArgument("slug") { type = NavType.StringType })) {
                StorefrontScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.OrderTracking.route, arguments = listOf(
                navArgument("slug") { type = NavType.StringType },
                navArgument("orderId") { type = NavType.StringType }
            )) {
                OrderTrackingScreen(onBack = { navController.popBackStack() })
            }
        }
    } else {
        NavHost(navController = navController, startDestination = startDestination) {
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onSignup = { navController.navigate(Screen.Signup.route) }
                )
            }
            composable(Screen.Signup.route) {
                SignupScreen(
                    onSignupSuccess = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Screen.Dashboard.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    DashboardScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.POS.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    POSScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.Orders.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    OrdersScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.KDS.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    KDSScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.Menu.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    MenuScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.Inventory.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    InventoryScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.Tables.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    TablesScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.Customers.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    CustomersScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.Offers.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    OffersScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.Reports.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    ReportsScreen(Modifier.padding(padding))
                }
            }
            composable(Screen.Settings.route) {
                DashboardScaffold(navController, currentRoute, onLogout) { padding ->
                    SettingsScreen(Modifier.padding(padding))
                }
            }
        }
    }
}
