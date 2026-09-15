package com.tsos.app.ui.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.*
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.ReportRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReportsUiState(
    val isLoading: Boolean = true,
    val summary: ReportSummary? = null,
    val sales: List<SalesOverview> = emptyList(),
    val topItems: List<TopItem> = emptyList()
)

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val reportRepository: ReportRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(ReportsUiState())
    val uiState: StateFlow<ReportsUiState> = _uiState.asStateFlow()

    init { load("week") }

    fun load(period: String) {
        viewModelScope.launch {
            _uiState.value = ReportsUiState(isLoading = true)
            val locId = authRepository.getActiveLocationId() ?: return@launch
            val summary = reportRepository.getSummary(locId, period).getOrNull()
            val sales = reportRepository.getSalesOverview(locId, period).getOrDefault(emptyList())
            val topItems = reportRepository.getTopItems(locId, period).getOrDefault(emptyList())
            _uiState.value = ReportsUiState(isLoading = false, summary = summary, sales = sales, topItems = topItems)
        }
    }
}
