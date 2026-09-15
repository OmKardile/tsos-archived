package com.tsos.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignupScreen(
    onSignupSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: SignupViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) onSignupSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate900)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
            }
            Text("Sign Up", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        Spacer(Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Slate800),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                val fields: List<Triple<String, String, (String) -> Unit>> = listOf(
                    Triple("Your Name", viewModel.name, { s -> viewModel.name = s }),
                    Triple("Business Name", viewModel.businessName, { s -> viewModel.businessName = s }),
                    Triple("Location Name", viewModel.locationName, { s -> viewModel.locationName = s }),
                    Triple("Location Slug (lowercase, hyphens)", viewModel.locationSlug, { s -> viewModel.locationSlug = s }),
                    Triple("Email", viewModel.email, { s -> viewModel.email = s }),
                )
                fields.forEach { (label, value, onValue) ->
                    OutlinedTextField(
                        value = value,
                        onValueChange = onValue,
                        label = { Text(label) },
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Emerald500, unfocusedBorderColor = Slate700,
                            focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                            focusedLabelColor = Emerald500, unfocusedLabelColor = Slate400,
                            cursorColor = Emerald500, focusedContainerColor = Slate700, unfocusedContainerColor = Slate700
                        )
                    )
                }

                OutlinedTextField(
                    value = viewModel.password,
                    onValueChange = { viewModel.password = it },
                    label = { Text("Password (min 6)") },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald500, unfocusedBorderColor = Slate700,
                        focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                        focusedLabelColor = Emerald500, unfocusedLabelColor = Slate400,
                        cursorColor = Emerald500, focusedContainerColor = Slate700, unfocusedContainerColor = Slate700
                    )
                )

                if (uiState.error != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(uiState.error!!, color = Red500, fontSize = 13.sp)
                }

                Spacer(Modifier.height(16.dp))

                Button(
                    onClick = { viewModel.signup() },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    enabled = !uiState.isLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                    else Text("Create Account", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
