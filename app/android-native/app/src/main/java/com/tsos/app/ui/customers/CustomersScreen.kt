package com.tsos.app.ui.customers

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.data.api.models.Customer
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomersScreen(modifier: Modifier = Modifier, viewModel: CustomersViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = modifier.fillMaxSize().background(Slate900)) {
        TopAppBar(title = { Text("Customers", color = Color.White) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800))

        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald500) }
        } else {
            LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(uiState.customers) { customer ->
                    Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(customer.name ?: "Guest", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White)
                                Text(customer.phone, fontSize = 12.sp, color = Slate400)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("${customer.totalOrders} orders", fontSize = 12.sp, color = Slate400)
                                Text("₹${customer.totalSpent.toInt()}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Orange500)
                                Text("${customer.loyaltyPoints} pts", fontSize = 11.sp, color = Emerald500)
                            }
                        }
                    }
                }
            }
        }
    }
}
