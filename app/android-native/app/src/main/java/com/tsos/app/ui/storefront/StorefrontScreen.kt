package com.tsos.app.ui.storefront

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.data.api.models.MenuItem
import com.tsos.app.ui.theme.*
import androidx.navigation.NavBackStackEntry

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StorefrontScreen(
    onBack: () -> Unit,
    viewModel: StorefrontViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize().background(Slate900)) {
        TopAppBar(
            title = { Text(uiState.locationName ?: "Menu", color = Color.White) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = Color.White) } }
        )

        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = uiState.selectedCategory == null, onClick = { viewModel.selectCategory(null) },
                label = { Text("All", fontSize = 12.sp) }, colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Emerald500, selectedLabelColor = Color.White))
            uiState.categories.forEach { cat ->
                FilterChip(selected = uiState.selectedCategory == cat.id, onClick = { viewModel.selectCategory(cat.id) },
                    label = { Text(cat.name, fontSize = 12.sp) }, colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Emerald500, selectedLabelColor = Color.White))
            }
        }

        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald500) }
        } else {
            LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(uiState.filteredItems) { item ->
                    Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White)
                                    Spacer(Modifier.width(8.dp))
                                    Text(if (item.veg) "V" else "N", fontSize = 10.sp, fontWeight = FontWeight.Bold,
                                        color = if (item.veg) Emerald500 else Red500)
                                }
                                item.description?.let { Text(it, fontSize = 12.sp, color = Slate400) }
                                Text("₹${item.price.toInt()}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Orange500)
                            }
                            FilledTonalButton(onClick = { viewModel.addToCart(item) }) { Text("Add") }
                        }
                    }
                }
            }
        }
    }

    if (uiState.cart.isNotEmpty()) {
        BottomAppBar(containerColor = Slate800) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("${uiState.cart.size} items", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("₹${uiState.grandTotal.toInt()}", color = Orange500, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                Button(onClick = { viewModel.placeOrder() }, colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                    enabled = !uiState.isPlacing) { Text("Place Order") }
            }
        }
    }
}
