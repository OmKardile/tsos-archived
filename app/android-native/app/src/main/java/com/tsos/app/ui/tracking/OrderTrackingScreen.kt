package com.tsos.app.ui.tracking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTrackingScreen(onBack: () -> Unit, viewModel: TrackingViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize().background(Slate900).verticalScroll(rememberScrollState()).padding(16.dp)) {
        TopAppBar(
            title = { Text("Order Tracking", color = Color.White) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = Color.White) } }
        )

        Spacer(Modifier.height(24.dp))

        if (uiState.isLoading) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald500) }
        } else {
            uiState.order?.let { order ->
                Text("Order #${order.id.take(8)}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.height(8.dp))
                Text(order.status.replaceFirstChar { it.uppercase() }, fontSize = 16.sp, color = Emerald500)
                Spacer(Modifier.height(24.dp))

                val steps = listOf("new" to "Order Placed", "preparing" to "Preparing", "ready" to "Ready", "served" to "Served")
                val currentIdx = steps.indexOfFirst { it.first == order.status }.coerceAtLeast(0)

                steps.forEachIndexed { idx, (status, label) ->
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 8.dp)) {
                        Box(
                            modifier = Modifier.size(32.dp).clip(CircleShape)
                                .background(if (idx <= currentIdx) Emerald500 else Slate700),
                            contentAlignment = Alignment.Center
                        ) {
                            if (idx < currentIdx) Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(18.dp))
                            else Text("${idx + 1}", color = if (idx <= currentIdx) Color.White else Slate400, fontSize = 12.sp)
                        }
                        Spacer(Modifier.width(12.dp))
                        Text(label, fontSize = 14.sp, color = if (idx <= currentIdx) Color.White else Slate400)
                    }
                    if (idx < steps.lastIndex) {
                        Box(modifier = Modifier.padding(start = 15.dp).width(2.dp).height(24.dp)
                            .background(if (idx < currentIdx) Emerald500 else Slate700))
                    }
                }

                Spacer(Modifier.height(24.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(12.dp)) {
                    Column(Modifier.padding(16.dp)) {
                        order.items?.forEach { item ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                Text("${item.qty}x ", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                                Text(item.menuItemName ?: "Item", color = Slate200, fontSize = 14.sp, modifier = Modifier.weight(1f))
                                Text("₹${item.unitPrice.toInt()}", color = Slate400, fontSize = 14.sp)
                            }
                        }
                        HorizontalDivider(color = Slate700, modifier = Modifier.padding(vertical = 8.dp))
                        Row(Modifier.fillMaxWidth()) {
                            Text("Total", color = Slate400, modifier = Modifier.weight(1f))
                            Text("₹${order.grandTotal.toInt()}", color = Orange500, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    }
                }
            } ?: run {
                Text("Order not found", color = Slate400, modifier = Modifier.fillMaxWidth().padding(top = 48.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
    }
}
