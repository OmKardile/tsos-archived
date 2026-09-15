package com.tsos.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tsos.app.data.api.models.FeeConfig
import com.tsos.app.data.repository.AuthRepository
import com.tsos.app.data.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val isLoading: Boolean = true,
    val config: FeeConfig? = null,
    val currentBaseUrl: String = "",
    val saved: Boolean = false
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val settingsRepository: SettingsRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            val config = settingsRepository.getSettings(locId).getOrNull()
            val url = authRepository.getBaseUrl()
            _uiState.value = SettingsUiState(isLoading = false, config = config, currentBaseUrl = url)
        }
    }

    fun saveSettings(fee: Double, payer: String) {
        viewModelScope.launch {
            val locId = authRepository.getActiveLocationId() ?: return@launch
            settingsRepository.updateSettings(locId, mapOf("perOrderFee" to fee, "defaultFeePayer" to payer))
                .onSuccess {
                    _uiState.value = _uiState.value.copy(config = it, saved = true)
                }
        }
    }

    fun saveBaseUrl(url: String) {
        viewModelScope.launch {
            authRepository.saveBaseUrl(url)
            _uiState.value = _uiState.value.copy(currentBaseUrl = url)
        }
    }
}
