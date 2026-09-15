package com.tsos.app.ui.inventory

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.CreateIngredientRequest
import com.tsos.app.data.api.models.Ingredient
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.InventoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InventoryUiState(
    val isLoading: Boolean = true,
    val ingredients: List<Ingredient> = emptyList(),
    val lowStock: List<Ingredient> = emptyList()
)

@HiltViewModel
class InventoryViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val inventoryRepository: InventoryRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(InventoryUiState())
    val uiState: StateFlow<InventoryUiState> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            val ings = inventoryRepository.getIngredients(locId).getOrDefault(emptyList())
            val low = inventoryRepository.getLowStock(locId).getOrDefault(emptyList())
            _uiState.value = InventoryUiState(isLoading = false, ingredients = ings, lowStock = low)
        }
    }

    fun createIngredient(name: String, unit: String, stock: Double, threshold: Double) {
        viewModelScope.launch {
            inventoryRepository.createIngredient(CreateIngredientRequest(name, unit, stock, threshold)).onSuccess { load() }
        }
    }

    fun deleteIngredient(id: String) {
        viewModelScope.launch { inventoryRepository.deleteIngredient(id).onSuccess { load() } }
    }

    fun restock(id: String) {
        viewModelScope.launch { inventoryRepository.restock(id, 100.0).onSuccess { load() } }
    }
}
