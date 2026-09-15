package com.tsos.app.ui.tracking

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.Order
import com.tsos.app.data.repository.PublicRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TrackingUiState(val isLoading: Boolean = true, val order: Order? = null)

@HiltViewModel
class TrackingViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val publicRepository: PublicRepository
) : ViewModel() {
    private val slug: String = savedStateHandle["slug"] ?: ""
    private val orderId: String = savedStateHandle["orderId"] ?: ""
    private val _uiState = MutableStateFlow(TrackingUiState())
    val uiState: StateFlow<TrackingUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            publicRepository.trackOrder(slug, orderId)
                .onSuccess { _uiState.value = TrackingUiState(isLoading = false, order = it) }
                .onFailure { _uiState.value = TrackingUiState(isLoading = false) }
        }
    }
}
