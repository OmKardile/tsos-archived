package com.tsos.app.ui.offers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.CreateCustomerOfferRequest
import com.tsos.app.data.api.models.Offer
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.CustomerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OffersUiState(val isLoading: Boolean = true, val offers: List<Offer> = emptyList())

@HiltViewModel
class OffersViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(OffersUiState())
    val uiState: StateFlow<OffersUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            customerRepository.getOffers(locId)
                .onSuccess { _uiState.value = OffersUiState(isLoading = false, offers = it) }
                .onFailure { _uiState.value = OffersUiState(isLoading = false) }
        }
    }

    fun createOffer(title: String, type: String, value: Double, minOrder: Double) {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            customerRepository.createOffer(CreateCustomerOfferRequest(locId, title, type, value, minOrder))
                .onSuccess {
                    val offers = customerRepository.getOffers(locId).getOrDefault(emptyList())
                    _uiState.value = OffersUiState(isLoading = false, offers = offers)
                }
        }
    }
}
