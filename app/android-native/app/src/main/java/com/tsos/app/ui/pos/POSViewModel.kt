package com.tsos.app.ui.pos

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.*
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.MenuRepository
import com.tsos.app.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class POSUiState(
    val isLoading: Boolean = true,
    val categories: List<Category> = emptyList(),
    val items: List<MenuItem> = emptyList(),
    val filteredItems: List<MenuItem> = emptyList(),
    val selectedCategory: String? = null,
    val cart: Map<String, CartItem> = emptyMap(),
    val grandTotal: Double = 0.0,
    val isPlacing: Boolean = false,
    val orderPlacedId: String? = null
)

@HiltViewModel
class POSViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val menuRepository: MenuRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    var orderType by mutableStateOf("dine_in")
    var paymentMethod by mutableStateOf("cash")

    private val _uiState = MutableStateFlow(POSUiState())
    val uiState: StateFlow<POSUiState> = _uiState.asStateFlow()

    init { loadData() }

    private fun loadData() {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            val cats = menuRepository.getCategories(locId).getOrDefault(emptyList())
            val items = menuRepository.getItems(locId).getOrDefault(emptyList())
            _uiState.value = POSUiState(
                isLoading = false,
                categories = cats,
                items = items,
                filteredItems = items,
                selectedCategory = null
            )
        }
    }

    fun selectCategory(catId: String?) {
        val filtered = if (catId == null) _uiState.value.items
        else _uiState.value.items.filter { it.categoryId == catId }
        _uiState.value = _uiState.value.copy(
            selectedCategory = catId,
            filteredItems = filtered
        )
    }

    fun addToCart(item: MenuItem) {
        val cart = _uiState.value.cart.toMutableMap()
        val existing = cart[item.id]
        if (existing != null) {
            cart[item.id] = existing.copy(qty = existing.qty + 1)
        } else {
            cart[item.id] = CartItem(item.id, item.name, item.price)
        }
        updateCart(cart)
    }

    fun incrementCart(id: String) {
        val cart = _uiState.value.cart.toMutableMap()
        cart[id]?.let { cart[id] = it.copy(qty = it.qty + 1) }
        updateCart(cart)
    }

    fun decrementCart(id: String) {
        val cart = _uiState.value.cart.toMutableMap()
        cart[id]?.let {
            if (it.qty <= 1) cart.remove(id) else cart[id] = it.copy(qty = it.qty - 1)
        }
        updateCart(cart)
    }

    fun removeFromCart(id: String) {
        val cart = _uiState.value.cart.toMutableMap()
        cart.remove(id)
        updateCart(cart)
    }

    private fun updateCart(cart: Map<String, CartItem>) {
        val subtotal = cart.values.sumOf { it.price * it.qty }
        val tax = subtotal * 0.05
        val fee = 1.0
        _uiState.value = _uiState.value.copy(
            cart = cart,
            grandTotal = subtotal + tax + fee
        )
    }

    fun placeOrder() {
        val cart = _uiState.value.cart
        if (cart.isEmpty()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPlacing = true)
            val locId = authRepository.getActiveLocationId() ?: return@launch
            val request = CreateOrderRequest(
                locationId = locId,
                orderType = orderType,
                items = cart.values.map { OrderItemRequest(it.id, it.qty) },
                paymentMethod = paymentMethod
            )
            orderRepository.createOrder(request)
                .onSuccess { order ->
                    _uiState.value = _uiState.value.copy(
                        isPlacing = false,
                        cart = emptyMap(),
                        grandTotal = 0.0,
                        orderPlacedId = order.id
                    )
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(isPlacing = false)
                }
        }
    }

    fun clearOrderPlaced() {
        _uiState.value = _uiState.value.copy(orderPlacedId = null)
    }
}
