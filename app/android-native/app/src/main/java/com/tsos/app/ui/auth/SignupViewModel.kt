package com.tsos.app.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.RetrofitClient
import com.tsos.app.data.api.models.SignupRequest
import com.tsos.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SignupUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class SignupViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val retrofitClient: RetrofitClient
) : ViewModel() {

    var name by mutableStateOf("")
    var businessName by mutableStateOf("")
    var locationName by mutableStateOf("")
    var locationSlug by mutableStateOf("")
    var email by mutableStateOf("")
    var password by mutableStateOf("")

    private val _uiState = MutableStateFlow(SignupUiState())
    val uiState: StateFlow<SignupUiState> = _uiState.asStateFlow()

    fun signup() {
        if (listOf(name, businessName, locationName, locationSlug, email, password).any { it.isBlank() }) {
            _uiState.value = SignupUiState(error = "All fields are required")
            return
        }
        if (password.length < 6) {
            _uiState.value = SignupUiState(error = "Password must be at least 6 characters")
            return
        }
        viewModelScope.launch {
            _uiState.value = SignupUiState(isLoading = true)
            try {
                val response = retrofitClient.getApiService().signup(
                    SignupRequest(email, password, name, businessName, locationName, locationSlug)
                )
                if (response.isSuccessful) {
                    val body = response.body()!!
                    authRepository.login(email, password)
                    _uiState.value = SignupUiState(isSuccess = true)
                } else {
                    _uiState.value = SignupUiState(error = "Signup failed: ${response.message()}")
                }
            } catch (e: Exception) {
                _uiState.value = SignupUiState(error = e.message ?: "Signup failed")
            }
        }
    }
}
