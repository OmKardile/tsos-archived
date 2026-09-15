package com.tsos.app.ui.tables

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.CreateTableRequest
import com.tsos.app.data.api.models.DineTable
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.TableRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TablesUiState(val isLoading: Boolean = true, val tables: List<DineTable> = emptyList())

@HiltViewModel
class TablesViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tableRepository: TableRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(TablesUiState())
    val uiState: StateFlow<TablesUiState> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            tableRepository.getTables(locId)
                .onSuccess { _uiState.value = TablesUiState(isLoading = false, tables = it) }
                .onFailure { _uiState.value = TablesUiState(isLoading = false) }
        }
    }

    fun createTable(label: String, seats: Int) {
        viewModelScope.launch {
            tableRepository.createTable(CreateTableRequest(label, seats)).onSuccess { load() }
        }
    }

    fun deleteTable(id: String) {
        viewModelScope.launch { tableRepository.deleteTable(id).onSuccess { load() } }
    }
}
