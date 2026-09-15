package com.tsos.app.ui.menu

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
import com.tsos.app.data.api.models.Category
import com.tsos.app.data.api.models.MenuItem
import com.tsos.app.ui.theme.*

data class MenuItemWithCategory(val item: MenuItem, val categoryName: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuScreen(
    modifier: Modifier = Modifier,
    viewModel: MenuViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAddCategory by remember { mutableStateOf(false) }
    var showAddItem by remember { mutableStateOf(false) }

    val groupedItems = remember(uiState.items, uiState.categories) {
        uiState.categories.map { cat ->
            cat to uiState.items.filter { it.categoryId == cat.id }
        }
    }

    Column(modifier = modifier.fillMaxSize().background(Slate900)) {
        TopAppBar(
            title = { Text("Menu", color = Color.White) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
            actions = {
                IconButton(onClick = { showAddCategory = true }) { Icon(Icons.Default.Add, "Add Category", tint = Color.White) }
                IconButton(onClick = { showAddItem = true }) { Icon(Icons.Default.AddCircle, "Add Item", tint = Color.White) }
            }
        )

        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald500) }
        } else {
            LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                groupedItems.forEach { (cat, items) ->
                    item(key = "cat_${cat.id}") {
                        Text(cat.name, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.padding(vertical = 8.dp))
                    }
                    items(items, key = { it.id }) { item ->
                        MenuItemCard(item = item, onDelete = { viewModel.deleteItem(item.id) }, onToggle = { viewModel.toggleAvailability(item.id) })
                    }
                }
            }
        }
    }

    if (showAddCategory) {
        AddCategoryDialog(onDismiss = { showAddCategory = false }, onConfirm = { name ->
            viewModel.createCategory(name)
            showAddCategory = false
        })
    }
    if (showAddItem) {
        AddItemDialog(
            categories = uiState.categories,
            onDismiss = { showAddItem = false },
            onConfirm = { name, catId, price, veg ->
                viewModel.createItem(name, catId, price, veg)
                showAddItem = false
            }
        )
    }
}

@Composable
fun MenuItemCard(item: MenuItem, onDelete: () -> Unit, onToggle: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(12.dp)) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White)
                    Spacer(Modifier.width(8.dp))
                    Text(if (item.veg) "V" else "N", fontSize = 10.sp, fontWeight = FontWeight.Bold,
                        color = if (item.veg) Emerald500 else Red500)
                }
                Text("₹${item.price.toInt()}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Orange500)
            }
            Switch(checked = item.available, onCheckedChange = { onToggle() }, colors = SwitchDefaults.colors(checkedTrackColor = Emerald500))
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, null, tint = Red500) }
        }
    }
}

@Composable
fun AddCategoryDialog(onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Category") },
        text = {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Category Name") },
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
        },
        confirmButton = { TextButton(onClick = { if (name.isNotBlank()) onConfirm(name) }) { Text("Add") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun AddItemDialog(categories: List<Category>, onDismiss: () -> Unit, onConfirm: (String, String, Double, Boolean) -> Unit) {
    var name by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var selectedCat by remember { mutableStateOf<String?>(null) }
    var veg by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Menu Item") },
        text = {
            Column {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Item Name") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = price, onValueChange = { price = it }, label = { Text("Price") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Veg", color = Color.White)
                    Switch(checked = veg, onCheckedChange = { veg = it })
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val p = price.toDoubleOrNull() ?: 0.0
                if (name.isNotBlank() && selectedCat != null) onConfirm(name, selectedCat!!, p, veg)
            }) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
