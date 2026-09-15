package com.tsos.app.ui.tables

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.data.api.models.DineTable
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TablesScreen(
    modifier: Modifier = Modifier,
    viewModel: TablesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAdd by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxSize().background(Slate900)) {
        TopAppBar(
            title = { Text("Tables", color = Color.White) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate800),
            actions = {
                IconButton(onClick = { showAdd = true }) { Icon(Icons.Default.Add, "Add Table", tint = Color.White) }
            }
        )

        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Emerald500) }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.tables) { table ->
                    TableCard(table = table, onDelete = { viewModel.deleteTable(table.id) })
                }
            }
        }
    }

    if (showAdd) {
        AddTableDialog(onDismiss = { showAdd = false }, onConfirm = { label, seats ->
            viewModel.createTable(label, seats)
            showAdd = false
        })
    }
}

@Composable
fun TableCard(table: DineTable, onDelete: () -> Unit) {
    val statusColor = when (table.status) {
        "free" -> Emerald500
        "occupied" -> Amber500
        "reserved" -> Purple500
        else -> Slate400
    }

    Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(table.label, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Default.Delete, null, tint = Red500, modifier = Modifier.size(16.dp))
                }
            }
            Spacer(Modifier.height(8.dp))
            Text("${table.seats} seats", fontSize = 12.sp, color = Slate400)
            Spacer(Modifier.height(4.dp))
            Text(table.status.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = statusColor,
                modifier = Modifier.background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 2.dp))
        }
    }
}

@Composable
fun AddTableDialog(onDismiss: () -> Unit, onConfirm: (String, Int) -> Unit) {
    var label by remember { mutableStateOf("") }
    var seats by remember { mutableStateOf("4") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Table") },
        text = {
            Column {
                OutlinedTextField(value = label, onValueChange = { label = it }, label = { Text("Table Label") }, modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = seats, onValueChange = { seats = it }, label = { Text("Seats") }, modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate800, unfocusedContainerColor = Slate800))
            }
        },
        confirmButton = { TextButton(onClick = { if (label.isNotBlank()) onConfirm(label, seats.toIntOrNull() ?: 4) }) { Text("Add") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
