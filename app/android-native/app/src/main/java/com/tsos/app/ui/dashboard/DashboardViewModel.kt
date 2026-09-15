package com.tsos.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.LocationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = true,
    val totalOrders: Int = 0,
    val totalRevenue: Double = 0.0,
    val pendingOrders: Int = 0,
    val totalCustomers: Int = 0,
    val periodLabel: String = "Today"
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val locationRepository: LocationRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState(isLoading = true)
            val locId = authRepository.getActiveLocationId() ?: return@launch
            locationRepository.getDashboardSummary(locId)
                .onSuccess { s ->
                    _uiState.value = DashboardUiState(
                        isLoading = false,
                        totalOrders = s.totalOrders,
                        totalRevenue = s.totalRevenue,
                        pendingOrders = s.pendingOrders,
                        totalCustomers = s.totalCustomers,
                        periodLabel = s.periodLabel
                    )
                }
                .onFailure { _uiState.value = DashboardUiState(isLoading = false) }
        }
    }
}
