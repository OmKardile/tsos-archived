package com.tsos.app.ui.settings

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
fun SettingsScreen(modifier: Modifier = Modifier, viewModel: SettingsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    var perOrderFee by remember { mutableStateOf("") }
    var feePayer by remember { mutableStateOf("customer") }
    var baseUrl by remember { mutableStateOf("") }

    LaunchedEffect(uiState.config) {
        uiState.config?.let {
            perOrderFee = it.perOrderFee.toString()
            feePayer = it.defaultFeePayer
        }
    }
    LaunchedEffect(uiState.currentBaseUrl) { baseUrl = uiState.currentBaseUrl }

    Column(modifier = modifier.fillMaxSize().background(Slate900).verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("Settings", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(Modifier.height(24.dp))

        Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text("Fee Configuration", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.height(12.dp))

                OutlinedTextField(value = perOrderFee, onValueChange = { perOrderFee = it }, label = { Text("Per Order Fee (₹)") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate700, unfocusedContainerColor = Slate700))
                Spacer(Modifier.height(12.dp))

                Text("Fee Payer", color = Slate400, fontSize = 13.sp)
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("customer" to "Customer", "cafe" to "Cafe").forEach { (value, label) ->
                        FilterChip(selected = feePayer == value, onClick = { feePayer = value }, label = { Text(label) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Emerald500, selectedLabelColor = Color.White))
                    }
                }

                Spacer(Modifier.height(16.dp))
                Button(onClick = { viewModel.saveSettings(perOrderFee.toDoubleOrNull() ?: 1.0, feePayer) },
                    modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                    shape = RoundedCornerShape(12.dp)) {
                    Text("Save Settings")
                }

                if (uiState.saved) {
                    Spacer(Modifier.height(8.dp))
                    Text("Settings saved!", color = Emerald500, fontSize = 13.sp)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        Card(colors = CardDefaults.cardColors(containerColor = Slate800), shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text("Server URL", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(value = baseUrl, onValueChange = { baseUrl = it }, label = { Text("Backend URL") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500, focusedTextColor = Color.White, cursorColor = Emerald500, focusedContainerColor = Slate700, unfocusedContainerColor = Slate700))
                Spacer(Modifier.height(12.dp))
                Button(onClick = { viewModel.saveBaseUrl(baseUrl) },
                    modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Orange500),
                    shape = RoundedCornerShape(12.dp)) {
                    Text("Update URL")
                }
            }
        }
    }
}
