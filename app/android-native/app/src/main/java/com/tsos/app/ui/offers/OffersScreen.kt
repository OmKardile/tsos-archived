package com.tsos.app.ui.offers

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
import com.tsos.app.data.api.models.Offer
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OffersScreen(modifier: Modifier = Modifier, viewModel: OffersViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    var showAdd by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxSize().background(Slate900)) {
        TopAppBar(
            title = { Text("Offers", color = Color.White) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
            actions = {
                IconButton(onClick = { showAdd = true }) { Icon(Icons.Default.Add, "Add", tint = Color.White) }
            }
        )

        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald500) }
        } else {
            LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(uiState.offers) { offer ->
                    Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(12.dp)) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Text(offer.title, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White)
                                Spacer(Modifier.weight(1f))
                                Text(offer.type.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold,
                                    color = if (offer.active) Emerald500 else Slate400,
                                    modifier = Modifier.background(if (offer.active) Emerald500.copy(alpha = 0.15f) else Slate700, RoundedCornerShape(4.dp))
                                        .padding(horizontal = 8.dp, vertical = 2.dp))
                            }
                            Text(
                                when (offer.type) {
                                    "flat" -> "₹${offer.value.toInt()} off"
                                    "percent" -> "${offer.value.toInt()}% off"
                                    else -> offer.type
                                },
                                fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Orange500
                            )
                            if (offer.minOrder > 0) Text("Min order: ₹${offer.minOrder.toInt()}", fontSize = 11.sp, color = Slate400)
                        }
                    }
                }
            }
        }
    }

    if (showAdd) {
        AddOfferDialog(onDismiss = { showAdd = false }, onConfirm = { title, type, value, minOrder ->
            viewModel.createOffer(title, type, value, minOrder)
            showAdd = false
        })
    }
}

@Composable
fun AddOfferDialog(onDismiss: () -> Unit, onConfirm: (String, String, Double, Double) -> Unit) {
    var title by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("flat") }
    var value by remember { mutableStateOf("") }
    var minOrder by remember { mutableStateOf("0") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Offer") },
        text = {
            Column {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("flat", "percent", "bogo").forEach { t ->
                        FilterChip(selected = type == t, onClick = { type = t }, label = { Text(t.uppercase(), fontSize = 11.sp) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Emerald500, selectedLabelColor = Color.White))
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = value, onValueChange = { value = it }, label = { Text("Value") }, modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = minOrder, onValueChange = { minOrder = it }, label = { Text("Min Order") }, modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
            }
        },
        confirmButton = { TextButton(onClick = { if (title.isNotBlank()) onConfirm(title, type, value.toDoubleOrNull() ?: 0.0, minOrder.toDoubleOrNull() ?: 0.0) }) { Text("Add") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
