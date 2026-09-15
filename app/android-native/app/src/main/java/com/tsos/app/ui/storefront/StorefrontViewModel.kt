package com.tsos.app.ui.storefront

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.*
import com.tsos.app.data.repository.PublicRepository
import com.tsos.app.ui.pos.CartItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StorefrontUiState(
    val isLoading: Boolean = true,
    val locationName: String? = null,
    val categories: List<Category> = emptyList(),
    val items: List<MenuItem> = emptyList(),
    val filteredItems: List<MenuItem> = emptyList(),
    val selectedCategory: String? = null,
    val cart: Map<String, CartItem> = emptyMap(),
    val grandTotal: Double = 0.0,
    val isPlacing: Boolean = false,
    val orderPlaced: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class StorefrontViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val publicRepository: PublicRepository
) : ViewModel() {
    private val slug: String = savedStateHandle["slug"] ?: ""
    private val _uiState = MutableStateFlow(StorefrontUiState())
    val uiState: StateFlow<StorefrontUiState> = _uiState.asStateFlow()

    init { loadMenu() }

    private fun loadMenu() {
        viewModelScope.launch {
            publicRepository.getMenu(slug)
                .onSuccess { resp ->
                    _uiState.value = StorefrontUiState(
                        isLoading = false,
                        locationName = resp.location.name,
                        categories = resp.categories,
                        items = resp.items,
                        filteredItems = resp.items
                    )
                }
                .onFailure { _uiState.value = StorefrontUiState(isLoading = false, error = it.message) }
        }
    }

    fun selectCategory(catId: String?) {
        val filtered = if (catId == null) _uiState.value.items else _uiState.value.items.filter { it.categoryId == catId }
        _uiState.value = _uiState.value.copy(selectedCategory = catId, filteredItems = filtered)
    }

    fun addToCart(item: MenuItem) {
        val cart = _uiState.value.cart.toMutableMap()
        val existing = cart[item.id]
        cart[item.id] = if (existing != null) existing.copy(qty = existing.qty + 1)
        else CartItem(item.id, item.name, item.price)
        val total = cart.values.sumOf { it.price * it.qty } + 1.0
        _uiState.value = _uiState.value.copy(cart = cart, grandTotal = total)
    }

    fun placeOrder() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPlacing = true)
            val request = PublicOrderRequest("takeaway", "+910000000000", "Walk-in",
                _uiState.value.cart.values.map { OrderItemRequest(it.id, it.qty) })
            publicRepository.placeOrder(slug, request)
                .onSuccess { _uiState.value = _uiState.value.copy(isPlacing = false, orderPlaced = true, cart = emptyMap(), grandTotal = 0.0) }
                .onFailure { _uiState.value = _uiState.value.copy(isPlacing = false, error = it.message) }
        }
    }
}
