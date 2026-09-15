package com.tsos.app.ui.customers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.Customer
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.CustomerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CustomersUiState(val isLoading: Boolean = true, val customers: List<Customer> = emptyList())

@HiltViewModel
class CustomersViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(CustomersUiState())
    val uiState: StateFlow<CustomersUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            customerRepository.getCustomers(locId)
                .onSuccess { _uiState.value = CustomersUiState(isLoading = false, customers = it) }
                .onFailure { _uiState.value = CustomersUiState(isLoading = false) }
        }
    }
}
