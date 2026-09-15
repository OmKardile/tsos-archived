package com.tsos.app.ui.kds

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
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
import com.tsos.app.ui.orders.StatusBadge
import com.tsos.app.ui.theme.*
import java.time.Instant
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KDSScreen(
    modifier: Modifier = Modifier,
    viewModel: KDSViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = modifier.fillMaxSize().background(Slate900)) {
        TopAppBar(
            title = { Text("Kitchen Display", color = Color.White) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
            actions = {
                IconButton(onClick = { viewModel.load() }) {
                    Icon(Icons.Default.Refresh, "Refresh", tint = Color.White)
                }
            }
        )

        Row(Modifier.fillMaxSize().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            KdsColumn(Modifier.weight(1f), "NEW", uiState.newOrders, Emerald500) { viewModel.advanceStatus(it) }
            KdsColumn(Modifier.weight(1f), "PREPARING", uiState.preparingOrders, Amber500) { viewModel.advanceStatus(it) }
            KdsColumn(Modifier.weight(1f), "READY", uiState.readyOrders, Color(0xFF3B82F6)) { viewModel.advanceStatus(it) }
        }
    }
}

@Composable
fun KdsColumn(modifier: Modifier, title: String, orders: List<Order>, accentColor: Color, onNext: (Order) -> Unit) {
    Column(modifier = modifier) {
        Text(title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = accentColor)
        Spacer(Modifier.height(8.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(orders) { order ->
                KdsOrderCard(order = order, accentColor = accentColor, onNext = { onNext(order) })
            }
        }
    }
}

@Composable
fun KdsOrderCard(order: Order, accentColor: Color, onNext: () -> Unit) {
    val elapsedMinutes = try {
        ChronoUnit.MINUTES.between(Instant.parse(order.createdAt), Instant.now())
    } catch (_: Exception) { 0L }
    val isUrgent = elapsedMinutes > 10

    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isUrgent) Red500.copy(alpha = 0.1f) else Slate800
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("#${order.id.take(8)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.weight(1f))
                StatusBadge(order.status)
            }
            if (order.tableLabel != null) {
                Text("Table: ${order.tableLabel}", fontSize = 12.sp, color = Slate400)
            }
            Text("${elapsedMinutes}m ago", fontSize = 11.sp, color = if (isUrgent) Red500 else Slate400)
            Spacer(Modifier.height(8.dp))
            order.items?.forEach { item ->
                Row {
                    Text("${item.qty}x ", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                    Text(item.menuItemName ?: "Item", color = Slate200, fontSize = 14.sp)
                }
                item.notes?.let {
                    Text("  Note: $it", fontSize = 12.sp, color = Slate400)
                }
            }
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = onNext,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Next", fontSize = 12.sp)
            }
        }
    }
}
