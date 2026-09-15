package com.tsos.app.di

import android.content.Context
import com.tsos.app.data.api.RetrofitClient
import com.tsos.app.data.api.interceptors.AuthInterceptor
import com.tsos.app.data.repository.*
import com.tsos.app.data.socket.SocketManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideAuthInterceptor(): AuthInterceptor {
        return AuthInterceptor()
    }

    @Provides
    @Singleton
    fun provideRetrofitClient(authInterceptor: AuthInterceptor): RetrofitClient {
        return RetrofitClient(authInterceptor)
    }

    @Provides
    @Singleton
    fun provideAuthRepository(
        @ApplicationContext context: Context,
        retrofitClient: RetrofitClient,
        authInterceptor: AuthInterceptor
    ): AuthRepository {
        return AuthRepository(context, retrofitClient, authInterceptor)
    }

    @Provides
    @Singleton
    fun provideLocationRepository(retrofitClient: RetrofitClient) = LocationRepository(retrofitClient)

    @Provides
    @Singleton
    fun provideMenuRepository(retrofitClient: RetrofitClient) = MenuRepository(retrofitClient)

    @Provides
    @Singleton
    fun provideOrderRepository(retrofitClient: RetrofitClient) = OrderRepository(retrofitClient)

    @Provides
    @Singleton
    fun provideTableRepository(retrofitClient: RetrofitClient) = TableRepository(retrofitClient)

    @Provides
    @Singleton
    fun provideInventoryRepository(retrofitClient: RetrofitClient) = InventoryRepository(retrofitClient)

    @Provides
    @Singleton
    fun provideCustomerRepository(retrofitClient: RetrofitClient) = CustomerRepository(retrofitClient)

    @Provides
    @Singleton
    fun provideReportRepository(retrofitClient: RetrofitClient) = ReportRepository(retrofitClient)

    @Provides
    @Singleton
    fun provideSettingsRepository(retrofitClient: RetrofitClient) = SettingsRepository(retrofitClient)

    @Provides
    @Singleton
    fun providePublicRepository(retrofitClient: RetrofitClient) = PublicRepository(retrofitClient)

    @Provides
    @Singleton
    fun provideSocketManager(retrofitClient: RetrofitClient) = SocketManager(retrofitClient)
}
