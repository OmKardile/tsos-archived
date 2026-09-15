package com.tsos.app.data.repository

import com.tsos.app.data.api.RetrofitClient
import com.tsos.app.data.api.models.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getLocations(): Result<List<Location>> {
        return try {
            val response = api.getLocations()
            if (response.isSuccessful) Result.success(response.body()!!)
            else Result.failure(Exception("Failed: ${response.message()}"))
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun getDashboardSummary(locationId: String): Result<DashboardSummary> {
        return try {
            val response = api.getDashboardSummary(locationId)
            if (response.isSuccessful) Result.success(response.body()!!)
            else Result.failure(Exception("Failed: ${response.message()}"))
        } catch (e: Exception) { Result.failure(e) }
    }
}

@Singleton
class MenuRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getCategories(locationId: String) = try {
        val r = api.getCategories(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun getItems(locationId: String) = try {
        val r = api.getItems(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun createCategory(request: CreateCategoryRequest) = try {
        val r = api.createCategory(request)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun deleteCategory(id: String) = try {
        val r = api.deleteCategory(id)
        if (r.isSuccessful) Result.success(Unit) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun createItem(request: CreateMenuItemRequest) = try {
        val r = api.createItem(request)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun deleteItem(id: String) = try {
        val r = api.deleteItem(id)
        if (r.isSuccessful) Result.success(Unit) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun toggleAvailability(id: String) = try {
        val r = api.toggleAvailability(id)
        if (r.isSuccessful) Result.success(Unit) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }
}

@Singleton
class OrderRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getOrders(locationId: String, status: String? = null) = try {
        val r = api.getOrders(locationId, status)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun getOrder(id: String) = try {
        val r = api.getOrder(id)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun createOrder(request: CreateOrderRequest) = try {
        val r = api.createOrder(request)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun updateStatus(id: String, status: String) = try {
        val r = api.updateOrderStatus(id, mapOf("status" to status))
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }
}

@Singleton
class TableRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getTables(locationId: String) = try {
        val r = api.getTables(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun createTable(request: CreateTableRequest) = try {
        val r = api.createTable(request)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun deleteTable(id: String) = try {
        val r = api.deleteTable(id)
        if (r.isSuccessful) Result.success(Unit) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }
}

@Singleton
class InventoryRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getIngredients(locationId: String) = try {
        val r = api.getIngredients(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun getLowStock(locationId: String) = try {
        val r = api.getLowStock(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun getRecipes(locationId: String) = try {
        val r = api.getRecipes(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun createIngredient(request: CreateIngredientRequest) = try {
        val r = api.createIngredient(request)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun deleteIngredient(id: String) = try {
        val r = api.deleteIngredient(id)
        if (r.isSuccessful) Result.success(Unit) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun restock(ingredientId: String, qty: Double) = try {
        val r = api.restock(RestockRequest(ingredientId, qty))
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }
}

@Singleton
class CustomerRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getCustomers(locationId: String) = try {
        val r = api.getCustomers(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun getOffers(locationId: String) = try {
        val r = api.getOffers(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun createOffer(request: CreateCustomerOfferRequest) = try {
        val r = api.createOffer(request)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }
}

@Singleton
class ReportRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getSummary(locationId: String, period: String = "week") = try {
        val r = api.getReportSummary(locationId, period)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun getSalesOverview(locationId: String, period: String = "week") = try {
        val r = api.getSalesOverview(locationId, period)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun getTopItems(locationId: String, period: String = "week") = try {
        val r = api.getTopItems(locationId, period)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }
}

@Singleton
class SettingsRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getSettings(locationId: String) = try {
        val r = api.getSettings(locationId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun updateSettings(locationId: String, body: Map<String, Any>) = try {
        val r = api.updateSettings(locationId, body)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }
}

@Singleton
class PublicRepository @Inject constructor(
    private val retrofitClient: RetrofitClient
) {
    private val api get() = retrofitClient.getApiService()

    suspend fun getMenu(slug: String) = try {
        val r = api.getPublicMenu(slug)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun placeOrder(slug: String, request: PublicOrderRequest) = try {
        val r = api.placePublicOrder(slug, request)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }

    suspend fun trackOrder(slug: String, orderId: String) = try {
        val r = api.trackPublicOrder(slug, orderId)
        if (r.isSuccessful) Result.success(r.body()!!) else Result.failure(Exception(r.message()))
    } catch (e: Exception) { Result.failure(e) }
}
