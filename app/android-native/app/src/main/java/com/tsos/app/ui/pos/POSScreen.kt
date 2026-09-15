package com.tsos.app.ui.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.data.api.models.MenuItem
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POSScreen(
    modifier: Modifier = Modifier,
    viewModel: POSViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCart by remember { mutableStateOf(false) }

    Row(modifier = modifier.fillMaxSize().background(Slate900)) {
        Column(modifier = Modifier.weight(1f)) {
            TopAppBar(
                title = { Text("POS", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
                actions = {
                    BadgedBox(badge = { if (uiState.cart.isNotEmpty()) Badge { Text("${uiState.cart.size}") } }) {
                        IconButton(onClick = { showCart = !showCart }) {
                            Icon(Icons.Default.ShoppingCart, "Cart", tint = Color.White)
                        }
                    }
                }
            )

            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                uiState.categories.forEach { cat ->
                    FilterChip(
                        selected = uiState.selectedCategory == cat.id,
                        onClick = { viewModel.selectCategory(cat.id) },
                        label = { Text(cat.name, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Emerald500,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.filteredItems) { item ->
                    MenuItemCard(item = item, onClick = { viewModel.addToCart(item) })
                }
            }
        }

        if (showCart) {
            CartPanel(
                cart = uiState.cart,
                grandTotal = uiState.grandTotal,
                onIncrement = { viewModel.incrementCart(it) },
                onDecrement = { viewModel.decrementCart(it) },
                onRemove = { viewModel.removeFromCart(it) },
                onPlaceOrder = { viewModel.placeOrder() },
                onDismiss = { showCart = false },
                isPlacing = uiState.isPlacing,
                orderType = viewModel.orderType,
                onOrderTypeChange = { viewModel.orderType = it },
                paymentMethod = viewModel.paymentMethod,
                onPaymentMethodChange = { viewModel.paymentMethod = it }
            )
        }
    }

    uiState.orderPlacedId?.let { id ->
        AlertDialog(
            onDismissRequest = { viewModel.clearOrderPlaced() },
            title = { Text("Order Placed!") },
            text = { Text("Order #$id\nTotal: ₹${uiState.grandTotal}") },
            confirmButton = {
                TextButton(onClick = { viewModel.clearOrderPlaced() }) { Text("OK") }
            }
        )
    }
}

@Composable
fun MenuItemCard(item: MenuItem, onClick: () -> Unit) {
    Card(
        modifier = Modifier.clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Slate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row {
                Text(
                    if (item.veg) "V" else "N",
                    color = if (item.veg) Emerald500 else Red500,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .size(20.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(if (item.veg) Emerald500.copy(alpha = 0.1f) else Red500.copy(alpha = 0.1f))
                        .padding(2.dp)
                )
                Spacer(Modifier.weight(1f))
                if (!item.available) Text("N/A", color = Red500, fontSize = 10.sp)
            }
            Spacer(Modifier.height(8.dp))
            Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(4.dp))
            Text("₹${item.price.toInt()}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Orange500)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartPanel(
    cart: Map<String, CartItem>,
    grandTotal: Double,
    onIncrement: (String) -> Unit,
    onDecrement: (String) -> Unit,
    onRemove: (String) -> Unit,
    onPlaceOrder: () -> Unit,
    onDismiss: () -> Unit,
    isPlacing: Boolean,
    orderType: String,
    onOrderTypeChange: (String) -> Unit,
    paymentMethod: String,
    onPaymentMethodChange: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxHeight().width(320.dp),
        colors = CardDefaults.cardColors(containerColor = Slate800),
        shape = RoundedCornerShape(topStart = 16.dp, bottomStart = 16.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Cart", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.weight(1f))
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, null, tint = Slate400) }
            }

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("dine_in", "takeaway", "delivery").forEach { type ->
                    FilterChip(
                        selected = orderType == type,
                        onClick = { onOrderTypeChange(type) },
                        label = { Text(type.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 11.sp) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Emerald500, selectedLabelColor = Color.White)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            if (cart.isEmpty()) {
                Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    Text("Cart is empty", color = Slate400)
                }
            } else {
                LazyColumn(modifier = Modifier.weight(1f)) {
                    lazyItems(cart.entries.toList()) { (id, item) ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.name, color = Color.White, fontSize = 14.sp)
                                Text("₹${item.price.toInt()} x ${item.qty}", color = Slate400, fontSize = 12.sp)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(onClick = { onDecrement(id) }, modifier = Modifier.size(32.dp)) {
                                    Icon(Icons.Default.Remove, null, tint = Slate400, modifier = Modifier.size(16.dp))
                                }
                                Text("${item.qty}", color = Color.White, modifier = Modifier.padding(horizontal = 8.dp))
                                IconButton(onClick = { onIncrement(id) }, modifier = Modifier.size(32.dp)) {
                                    Icon(Icons.Default.Add, null, tint = Emerald500, modifier = Modifier.size(16.dp))
                                }
                                IconButton(onClick = { onRemove(id) }, modifier = Modifier.size(32.dp)) {
                                    Icon(Icons.Default.Delete, null, tint = Red500, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }
            }

            HorizontalDivider(color = Slate700)
            Spacer(Modifier.height(12.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Grand Total", color = Slate400)
                Text("₹${grandTotal.toInt()}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }

            Spacer(Modifier.height(8.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("cash", "upi", "card").forEach { method ->
                    FilterChip(
                        selected = paymentMethod == method,
                        onClick = { onPaymentMethodChange(method) },
                        label = { Text(method.uppercase(), fontSize = 11.sp) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Orange500, selectedLabelColor = Color.White)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = onPlaceOrder,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = cart.isNotEmpty() && !isPlacing,
                colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isPlacing) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Place Order", fontWeight = FontWeight.Bold)
            }
        }
    }
}

data class CartItem(
    val id: String,
    val name: String,
    val price: Double,
    val qty: Int = 1
)
