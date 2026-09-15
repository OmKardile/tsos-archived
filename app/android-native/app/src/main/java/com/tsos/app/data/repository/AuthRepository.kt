package com.tsos.app.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.tsos.app.data.api.RetrofitClient
import com.tsos.app.data.api.interceptors.AuthInterceptor
import com.tsos.app.data.api.models.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "tsos_prefs")

@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val retrofitClient: RetrofitClient,
    private val authInterceptor: AuthInterceptor
) {
    companion object {
        private val TOKEN_KEY = stringPreferencesKey("auth_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
        private val USER_EMAIL_KEY = stringPreferencesKey("user_email")
        private val USER_ROLE_KEY = stringPreferencesKey("user_role")
        private val LOCATION_ID_KEY = stringPreferencesKey("location_id")
        private val BUSINESS_ID_KEY = stringPreferencesKey("business_id")
        private val BASE_URL_KEY = stringPreferencesKey("base_url")
    }

    private var cachedToken: String? = null

    suspend fun login(email: String, password: String): Result<AuthResponse> {
        return try {
            val response = retrofitClient.getApiService().login(LoginRequest(email, password))
            if (response.isSuccessful) {
                val body = response.body()!!
                saveAuthData(body)
                Result.success(body)
            } else {
                Result.failure(Exception("Login failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun pinLogin(pin: String, email: String): Result<AuthResponse> {
        return try {
            val response = retrofitClient.getApiService().pinLogin(PinLoginRequest(pin, email))
            if (response.isSuccessful) {
                val body = response.body()!!
                saveAuthData(body)
                Result.success(body)
            } else {
                Result.failure(Exception("PIN login failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun saveAuthData(response: AuthResponse) {
        context.dataStore.edit { prefs ->
            prefs[TOKEN_KEY] = response.token
            response.user?.let { user ->
                prefs[USER_ID_KEY] = user.id
                prefs[USER_NAME_KEY] = user.name
                prefs[USER_EMAIL_KEY] = user.email
                prefs[USER_ROLE_KEY] = user.role
                val locIds = user.locationIds ?: user.locationIdsAlt ?: emptyList()
                if (locIds.isNotEmpty()) {
                    prefs[LOCATION_ID_KEY] = locIds.first()
                }
                user.businessId?.let { prefs[BUSINESS_ID_KEY] = it }
            }
        }
        cachedToken = response.token
        authInterceptor.token = response.token
    }

    suspend fun getToken(): String? {
        if (cachedToken != null) return cachedToken
        cachedToken = context.dataStore.data.map { it[TOKEN_KEY] }.first()
        authInterceptor.token = cachedToken
        return cachedToken
    }

    fun getTokenSync(): String? = cachedToken

    suspend fun isLoggedIn(): Boolean {
        return getToken() != null
    }

    suspend fun logout() {
        cachedToken = null
        authInterceptor.token = null
        context.dataStore.edit { it.clear() }
    }

    suspend fun getActiveLocationId(): String? {
        return context.dataStore.data.map { it[LOCATION_ID_KEY] }.first()
    }

    suspend fun setActiveLocationId(locationId: String) {
        context.dataStore.edit { it[LOCATION_ID_KEY] = locationId }
    }

    suspend fun getUserName(): String? {
        return context.dataStore.data.map { it[USER_NAME_KEY] }.first()
    }

    suspend fun getUserRole(): String? {
        return context.dataStore.data.map { it[USER_ROLE_KEY] }.first()
    }

    suspend fun getBusinessId(): String? {
        return context.dataStore.data.map { it[BUSINESS_ID_KEY] }.first()
    }

    suspend fun saveBaseUrl(url: String) {
        context.dataStore.edit { it[BASE_URL_KEY] = url }
        retrofitClient.setBaseUrl(url)
    }

    suspend fun getBaseUrl(): String {
        return context.dataStore.data.map { it[BASE_URL_KEY] ?: "https://tsos-frontend.onrender.com/" }.first()
    }

    suspend fun initBaseUrl() {
        val url = getBaseUrl()
        retrofitClient.setBaseUrl(url)
        cachedToken = getToken()
        authInterceptor.token = cachedToken
    }
}
