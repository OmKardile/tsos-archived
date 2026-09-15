package com.tsos.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tsos.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onSignup: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) onLoginSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate900)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.Coffee,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = Orange500
        )
        Spacer(Modifier.height(16.dp))
        Text("TSOS POS", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Point of Sale System", fontSize = 14.sp, color = Slate400)
        Spacer(Modifier.height(40.dp))

        var isPinMode by remember { mutableStateOf(false) }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Slate800),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        "Email",
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { isPinMode = false }
                            .background(if (!isPinMode) Emerald500 else Color.Transparent)
                            .padding(horizontal = 24.dp, vertical = 8.dp),
                        color = if (!isPinMode) Color.White else Slate400,
                        fontWeight = if (!isPinMode) FontWeight.Bold else FontWeight.Normal
                    )
                    Spacer(Modifier.width(16.dp))
                    Text(
                        "PIN",
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { isPinMode = true }
                            .background(if (isPinMode) Emerald500 else Color.Transparent)
                            .padding(horizontal = 24.dp, vertical = 8.dp),
                        color = if (isPinMode) Color.White else Slate400,
                        fontWeight = if (isPinMode) FontWeight.Bold else FontWeight.Normal
                    )
                }

                Spacer(Modifier.height(24.dp))

                OutlinedTextField(
                    value = viewModel.email,
                    onValueChange = { viewModel.email = it },
                    label = { Text("Email") },
                    leadingIcon = { Icon(Icons.Default.Email, null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald500,
                        unfocusedBorderColor = Slate700,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedLabelColor = Emerald500,
                        unfocusedLabelColor = Slate400,
                        cursorColor = Emerald500,
                        focusedContainerColor = Slate700,
                        unfocusedContainerColor = Slate700
                    )
                )

                Spacer(Modifier.height(16.dp))

                if (!isPinMode) {
                    var passwordVisible by remember { mutableStateOf(false) }
                    OutlinedTextField(
                        value = viewModel.password,
                        onValueChange = { viewModel.password = it },
                        label = { Text("Password") },
                        leadingIcon = { Icon(Icons.Default.Lock, null) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    null
                                )
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Emerald500,
                            unfocusedBorderColor = Slate700,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedLabelColor = Emerald500,
                            unfocusedLabelColor = Slate400,
                            cursorColor = Emerald500,
                            focusedContainerColor = Slate700,
                            unfocusedContainerColor = Slate700
                        )
                    )
                } else {
                    OutlinedTextField(
                        value = viewModel.pin,
                        onValueChange = { if (it.length <= 4) viewModel.pin = it },
                        label = { Text("4-Digit PIN") },
                        leadingIcon = { Icon(Icons.Default.Pin, null) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Emerald500,
                            unfocusedBorderColor = Slate700,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedLabelColor = Emerald500,
                            unfocusedLabelColor = Slate400,
                            cursorColor = Emerald500,
                            focusedContainerColor = Slate700,
                            unfocusedContainerColor = Slate700
                        )
                    )
                }

                if (uiState.error != null) {
                    Spacer(Modifier.height(12.dp))
                    Text(uiState.error!!, color = Red500, fontSize = 13.sp)
                }

                Spacer(Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (isPinMode) viewModel.pinLogin() else viewModel.login()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    enabled = !uiState.isLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Sign In", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(Modifier.height(16.dp))
                Text(
                    "New owner? Sign up",
                    color = Emerald500,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSignup() },
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
