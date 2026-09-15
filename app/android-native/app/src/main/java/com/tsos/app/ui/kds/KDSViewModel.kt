package com.tsos.app.ui.kds

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.Order
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KDSUiState(
    val isLoading: Boolean = true,
    val newOrders: List<Order> = emptyList(),
    val preparingOrders: List<Order> = emptyList(),
    val readyOrders: List<Order> = emptyList()
)

@HiltViewModel
class KDSViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(KDSUiState())
    val uiState: StateFlow<KDSUiState> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = KDSUiState(isLoading = true)
            val locId = authRepository.getActiveLocationId() ?: return@launch
            orderRepository.getOrders(locId)
                .onSuccess { orders ->
                    _uiState.value = KDSUiState(
                        isLoading = false,
                        newOrders = orders.filter { it.status == "new" },
                        preparingOrders = orders.filter { it.status == "preparing" },
                        readyOrders = orders.filter { it.status == "ready" }
                    )
                }
                .onFailure { _uiState.value = KDSUiState(isLoading = false) }
        }
    }

    fun advanceStatus(order: Order) {
        val next = when (order.status) {
            "new" -> "preparing"
            "preparing" -> "ready"
            "ready" -> "served"
            else -> return
        }
        viewModelScope.launch {
            orderRepository.updateStatus(order.id, next).onSuccess { load() }
        }
    }
}
