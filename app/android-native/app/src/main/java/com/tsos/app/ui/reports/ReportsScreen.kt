package com.tsos.app.ui.reports

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(modifier: Modifier = Modifier, viewModel: ReportsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    var period by remember { mutableStateOf("week") }

    LaunchedEffect(period) { viewModel.load(period) }

    Column(modifier = modifier.fillMaxSize().background(Slate900).verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("Reports", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(Modifier.height(16.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("week" to "This Week", "month" to "This Month").forEach { (p, label) ->
                FilterChip(selected = period == p, onClick = { period = p }, label = { Text(label, fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Emerald500, selectedLabelColor = Color.White))
            }
        }

        Spacer(Modifier.height(20.dp))

        if (uiState.isLoading) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald500) }
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiCard("Orders", "${uiState.summary?.totalOrders ?: 0}", Emerald500, Modifier.weight(1f))
                KpiCard("Revenue", "₹${(uiState.summary?.totalRevenue ?: 0.0).toInt()}", Orange500, Modifier.weight(1f))
            }
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiCard("Pending", "${uiState.summary?.pendingOrders ?: 0}", Amber500, Modifier.weight(1f))
                KpiCard("Customers", "${uiState.summary?.totalCustomers ?: 0}", Purple500, Modifier.weight(1f))
            }

            Spacer(Modifier.height(24.dp))
            Text("Top Items", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(Modifier.height(8.dp))
            uiState.topItems.forEachIndexed { idx, item ->
                Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("${idx + 1}.", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Slate400, modifier = Modifier.width(30.dp))
                        Column(Modifier.weight(1f)) {
                            Text(item.menuItemName, fontSize = 14.sp, color = Color.White)
                            Text("${item.totalQty} sold", fontSize = 12.sp, color = Slate400)
                        }
                        Text("₹${item.totalRevenue.toInt()}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Orange500)
                    }
                }
            }

            Spacer(Modifier.height(24.dp))
            Text("Sales Overview", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(Modifier.height(8.dp))
            uiState.sales.forEach { sale ->
                Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Text(sale.date.take(10), fontSize = 13.sp, color = Slate400, modifier = Modifier.weight(1f))
                    Text("${sale.orders} orders", fontSize = 13.sp, color = Slate200, modifier = Modifier.weight(1f))
                    Text("₹${sale.revenue.toInt()}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Orange500)
                }
            }
        }
    }
}

@Composable
fun KpiCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(12.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = color)
            Text(label, fontSize = 13.sp, color = Slate400)
        }
    }
}
