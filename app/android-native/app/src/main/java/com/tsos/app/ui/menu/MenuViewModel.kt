package com.tsos.app.ui.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.*
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.MenuRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MenuUiState(
    val isLoading: Boolean = true,
    val categories: List<Category> = emptyList(),
    val items: List<MenuItem> = emptyList()
)

@HiltViewModel
class MenuViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val menuRepository: MenuRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(MenuUiState())
    val uiState: StateFlow<MenuUiState> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            val cats = menuRepository.getCategories(locId).getOrDefault(emptyList())
            val items = menuRepository.getItems(locId).getOrDefault(emptyList())
            _uiState.value = MenuUiState(isLoading = false, categories = cats, items = items)
        }
    }

    fun createCategory(name: String) {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            menuRepository.createCategory(CreateCategoryRequest(name)).onSuccess { load() }
        }
    }

    fun createItem(name: String, categoryId: String, price: Double, veg: Boolean) {
        viewModelScope.launch {
            menuRepository.createItem(CreateMenuItemRequest(categoryId, name, price = price, veg = veg)).onSuccess { load() }
        }
    }

    fun deleteItem(id: String) {
        viewModelScope.launch { menuRepository.deleteItem(id).onSuccess { load() } }
    }

    fun toggleAvailability(id: String) {
        viewModelScope.launch { menuRepository.toggleAvailability(id).onSuccess { load() } }
    }
}
