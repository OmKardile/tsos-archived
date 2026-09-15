package com.tsos.app.ui.inventory

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
import com.tsos.app.data.api.models.Ingredient
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryScreen(
    modifier: Modifier = Modifier,
    viewModel: InventoryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAdd by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxSize().background(Slate900)) {
        TopAppBar(
            title = { Text("Inventory", color = Color.White) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
            actions = {
                IconButton(onClick = { showAdd = true }) { Icon(Icons.Default.Add, "Add", tint = Color.White) }
            }
        )

        if (uiState.lowStock.isNotEmpty()) {
            Card(colors = CardDefaults.cardColors(containerColor = Amber500.copy(alpha = 0.15f)),
                modifier = Modifier.fillMaxWidth().padding(12.dp), shape = RoundedCornerShape(12.dp)) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, null, tint = Amber500)
                    Spacer(Modifier.width(8.dp))
                    Text("${uiState.lowStock.size} items low on stock", color = Amber500, fontSize = 13.sp)
                }
            }
        }

        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald500) }
        } else {
            LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(uiState.ingredients) { ing ->
                    IngredientCard(ing = ing, onRestock = { viewModel.restock(ing.id) }, onDelete = { viewModel.deleteIngredient(ing.id) })
                }
            }
        }
    }

    if (showAdd) {
        AddIngredientDialog(onDismiss = { showAdd = false }, onConfirm = { name, unit, stock, threshold ->
            viewModel.createIngredient(name, unit, stock, threshold)
            showAdd = false
        })
    }
}

@Composable
fun IngredientCard(ing: Ingredient, onRestock: () -> Unit, onDelete: () -> Unit) {
    val isLow = ing.lowStockThreshold > 0 && ing.stockQty <= ing.lowStockThreshold
    Card(
        colors = CardDefaults.cardColors(containerColor = if (isLow) Red500.copy(alpha = 0.1f) else Slate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(ing.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White)
                Text("${ing.stockQty} ${ing.unit}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = if (isLow) Red500 else Emerald500)
                if (isLow) Text("Low stock!", fontSize = 11.sp, color = Red500)
            }
            FilledTonalButton(onClick = onRestock) { Text("Restock", fontSize = 11.sp) }
            Spacer(Modifier.width(4.dp))
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, null, tint = Red500) }
        }
    }
}

@Composable
fun AddIngredientDialog(onDismiss: () -> Unit, onConfirm: (String, String, Double, Double) -> Unit) {
    var name by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("g") }
    var stock by remember { mutableStateOf("0") }
    var threshold by remember { mutableStateOf("0") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Ingredient") },
        text = {
            Column {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = stock, onValueChange = { stock = it }, label = { Text("Stock Qty") }, modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = threshold, onValueChange = { threshold = it }, label = { Text("Low Stock Threshold") }, modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
            }
        },
        confirmButton = {
            TextButton(onClick = { if (name.isNotBlank()) onConfirm(name, unit, stock.toDoubleOrNull() ?: 0.0, threshold.toDoubleOrNull() ?: 0.0) }) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
