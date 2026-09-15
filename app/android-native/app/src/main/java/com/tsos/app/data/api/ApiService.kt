package com.tsos.app.data.api

import com.tsos.app.data.api.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/pin-login")
    suspend fun pinLogin(@Body request: PinLoginRequest): Response<AuthResponse>

    @POST("api/auth/signup")
    suspend fun signup(@Body request: SignupRequest): Response<AuthResponse>

    @GET("api/auth/me")
    suspend fun getMe(): Response<Map<String, Any>>

    @GET("api/locations")
    suspend fun getLocations(): Response<List<Location>>

    @GET("api/locations/{id}/dashboard-summary")
    suspend fun getDashboardSummary(@Path("id") locationId: String): Response<DashboardSummary>

    @GET("api/menu/categories")
    suspend fun getCategories(@Query("locationId") locationId: String): Response<List<Category>>

    @POST("api/menu/categories")
    suspend fun createCategory(@Body request: CreateCategoryRequest): Response<Category>

    @PATCH("api/menu/categories/{id}")
    suspend fun updateCategory(@Path("id") id: String, @Body body: Map<String, Any>): Response<Category>

    @DELETE("api/menu/categories/{id}")
    suspend fun deleteCategory(@Path("id") id: String): Response<Unit>

    @GET("api/menu/items")
    suspend fun getItems(@Query("locationId") locationId: String): Response<List<MenuItem>>

    @POST("api/menu/items")
    suspend fun createItem(@Body request: CreateMenuItemRequest): Response<MenuItem>

    @PATCH("api/menu/items/{id}")
    suspend fun updateItem(@Path("id") id: String, @Body body: Map<String, Any>): Response<MenuItem>

    @PATCH("api/menu/items/{id}/availability")
    suspend fun toggleAvailability(@Path("id") id: String): Response<Unit>

    @DELETE("api/menu/items/{id}")
    suspend fun deleteItem(@Path("id") id: String): Response<Unit>

    @GET("api/orders")
    suspend fun getOrders(
        @Query("locationId") locationId: String,
        @Query("status") status: String? = null
    ): Response<List<Order>>

    @GET("api/orders/{id}")
    suspend fun getOrder(@Path("id") id: String): Response<Order>

    @POST("api/orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): Response<Order>

    @PATCH("api/orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") id: String,
        @Body body: Map<String, String>
    ): Response<Order>

    @GET("api/tables")
    suspend fun getTables(@Query("locationId") locationId: String): Response<List<DineTable>>

    @POST("api/tables")
    suspend fun createTable(@Body request: CreateTableRequest): Response<DineTable>

    @DELETE("api/tables/{id}")
    suspend fun deleteTable(@Path("id") id: String): Response<Unit>

    @GET("api/inventory/ingredients")
    suspend fun getIngredients(@Query("locationId") locationId: String): Response<List<Ingredient>>

    @POST("api/inventory/ingredients")
    suspend fun createIngredient(@Body request: CreateIngredientRequest): Response<Ingredient>

    @PATCH("api/inventory/ingredients/{id}")
    suspend fun updateIngredient(@Path("id") id: String, @Body body: Map<String, Any>): Response<Ingredient>

    @DELETE("api/inventory/ingredients/{id}")
    suspend fun deleteIngredient(@Path("id") id: String): Response<Unit>

    @POST("api/inventory/restock")
    suspend fun restock(@Body request: RestockRequest): Response<Map<String, Boolean>>

    @GET("api/inventory/recipes")
    suspend fun getRecipes(@Query("locationId") locationId: String): Response<List<Recipe>>

    @GET("api/inventory/low-stock")
    suspend fun getLowStock(@Query("locationId") locationId: String): Response<List<Ingredient>>

    @GET("api/customers")
    suspend fun getCustomers(@Query("locationId") locationId: String): Response<List<Customer>>

    @GET("api/customers/offers/list")
    suspend fun getOffers(@Query("locationId") locationId: String): Response<List<Offer>>

    @POST("api/customers/offers")
    suspend fun createOffer(@Body request: CreateCustomerOfferRequest): Response<Offer>

    @GET("api/reports/summary")
    suspend fun getReportSummary(
        @Query("locationId") locationId: String,
        @Query("period") period: String = "week"
    ): Response<ReportSummary>

    @GET("api/reports/sales-overview")
    suspend fun getSalesOverview(
        @Query("locationId") locationId: String,
        @Query("period") period: String = "week"
    ): Response<List<SalesOverview>>

    @GET("api/reports/top-items")
    suspend fun getTopItems(
        @Query("locationId") locationId: String,
        @Query("period") period: String = "week"
    ): Response<List<TopItem>>

    @GET("api/settings")
    suspend fun getSettings(@Query("locationId") locationId: String): Response<FeeConfig>

    @PATCH("api/settings")
    suspend fun updateSettings(
        @Query("locationId") locationId: String,
        @Body body: Map<String, Any>
    ): Response<FeeConfig>

    @GET("api/public/{slug}/menu")
    suspend fun getPublicMenu(@Path("slug") slug: String): Response<PublicMenuResponse>

    @POST("api/public/{slug}/orders")
    suspend fun placePublicOrder(
        @Path("slug") slug: String,
        @Body request: PublicOrderRequest
    ): Response<CreateOrderResponse>

    @GET("api/public/{slug}/orders/{orderId}/status")
    suspend fun trackPublicOrder(
        @Path("slug") slug: String,
        @Path("orderId") orderId: String
    ): Response<Order>
}
