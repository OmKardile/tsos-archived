package com.tsos.app.data.api.interceptors

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor() : Interceptor {

    @Volatile
    var token: String? = null

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val currentToken = token

        val authenticatedRequest = if (currentToken != null) {
            request.newBuilder()
                .addHeader("Authorization", "Bearer $currentToken")
                .build()
        } else {
            request
        }

        return chain.proceed(authenticatedRequest)
    }
}
