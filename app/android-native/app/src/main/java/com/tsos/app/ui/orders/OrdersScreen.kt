package com.tsos.app.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.data.api.models.Order
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    modifier: Modifier = Modifier,
    viewModel: OrdersViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = modifier.fillMaxSize().background(Slate900)) {
        TopAppBar(
            title = { Text("Orders", color = Color.White) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
            actions = {
                IconButton(onClick = { viewModel.load() }) {
                    Icon(Icons.Default.Refresh, "Refresh", tint = Color.White)
                }
            }
        )

        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(null, "new", "preparing", "ready", "served").forEach { status ->
                FilterChip(
                    selected = uiState.selectedStatus == status,
                    onClick = { viewModel.filterByStatus(status) },
                    label = { Text(status ?: "All", fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Emerald500,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }

        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Emerald500)
            }
        } else {
            LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(uiState.filteredOrders) { order ->
                    OrderCard(order = order, onNextStatus = { viewModel.advanceStatus(order) })
                }
            }
        }
    }
}

@Composable
fun OrderCard(order: Order, onNextStatus: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Slate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("#${order.id.take(8)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.weight(1f))
                StatusBadge(order.status)
            }
            if (order.tableLabel != null) {
                Text("Table: ${order.tableLabel}", fontSize = 12.sp, color = Slate400)
            }
            Spacer(Modifier.height(8.dp))
            order.items?.forEach { item ->
                Text("${item.qty}x ${item.menuItemName ?: "Item"}", fontSize = 13.sp, color = Slate200)
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("₹${order.grandTotal.toInt()}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Orange500)
                Spacer(Modifier.weight(1f))
                if (order.status != "completed" && order.status != "cancelled") {
                    FilledTonalButton(onClick = onNextStatus) {
                        Text("Next", fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun StatusBadge(status: String) {
    val (color, bg) = when (status) {
        "new" -> Emerald500 to Emerald500.copy(alpha = 0.15f)
        "preparing" -> Amber500 to Amber500.copy(alpha = 0.15f)
        "ready" -> Color(0xFF3B82F6) to Color(0xFF3B82F6).copy(alpha = 0.15f)
        "served" -> Purple500 to Purple500.copy(alpha = 0.15f)
        "completed" -> Slate400 to Slate700
        "cancelled" -> Red500 to Red500.copy(alpha = 0.15f)
        else -> Slate400 to Slate700
    }
    Text(
        status.uppercase(),
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        color = color,
        modifier = Modifier.background(bg, RoundedCornerShape(4.dp)).padding(horizontal = 8.dp, vertical = 2.dp)
    )
}
