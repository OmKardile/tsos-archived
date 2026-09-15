package com.tsos.app.ui.orders

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

data class OrdersUiState(
    val isLoading: Boolean = true,
    val orders: List<Order> = emptyList(),
    val filteredOrders: List<Order> = emptyList(),
    val selectedStatus: String? = null
)

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = OrdersUiState(isLoading = true)
            val locId = authRepository.getActiveLocationId() ?: return@launch
            orderRepository.getOrders(locId)
                .onSuccess { orders ->
                    _uiState.value = OrdersUiState(
                        isLoading = false,
                        orders = orders,
                        filteredOrders = orders
                    )
                }
                .onFailure { _uiState.value = OrdersUiState(isLoading = false) }
        }
    }

    fun filterByStatus(status: String?) {
        val filtered = if (status == null) _uiState.value.orders
        else _uiState.value.orders.filter { it.status == status }
        _uiState.value = _uiState.value.copy(selectedStatus = status, filteredOrders = filtered)
    }

    fun advanceStatus(order: Order) {
        val next = when (order.status) {
            "new" -> "preparing"
            "preparing" -> "ready"
            "ready" -> "served"
            "served" -> "completed"
            else -> return
        }
        viewModelScope.launch {
            orderRepository.updateStatus(order.id, next)
                .onSuccess { load() }
        }
    }
}
