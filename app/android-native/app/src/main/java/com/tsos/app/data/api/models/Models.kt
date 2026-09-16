package com.tsos.app.data.api.models

import com.google.gson.annotations.SerializedName

data class LoginRequest(val email: String, val password: String)
data class PinLoginRequest(val pinCode: String, val email: String)
data class AuthResponse(
    val token: String,
    val user: User?
)

data class User(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    @SerializedName("business_id") val businessId: String? = null,
    @SerializedName("location_ids") val locationIds: List<String>? = null,
    @SerializedName("locationIds") val locationIdsAlt: List<String>? = null
)

data class Location(
    val id: String,
    val name: String,
    val slug: String,
    val address: String? = null,
    val phone: String? = null,
    val active: Boolean = true
)

data class Category(
    val id: String,
    @SerializedName("location_id") val locationId: String,
    val name: String,
    @SerializedName("sort_order") val sortOrder: Int = 0,
    val active: Boolean = true
)

data class MenuItem(
    val id: String,
    @SerializedName("location_id") val locationId: String,
    @SerializedName("category_id") val categoryId: String,
    val name: String,
    val description: String? = null,
    val price: Double,
    val veg: Boolean = false,
    @SerializedName("tax_rate") val taxRate: Double = 0.05,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("sort_order") val sortOrder: Int = 0,
    val available: Boolean = true,
    @SerializedName("category_name") val categoryName: String? = null,
    val variants: List<Variant>? = null,
    val addons: List<Addon>? = null
)

data class Variant(
    val id: String,
    val name: String,
    @SerializedName("price_delta") val priceDelta: Double = 0.0
)

data class Addon(
    val id: String,
    val name: String,
    val price: Double
)

data class Ingredient(
    val id: String,
    @SerializedName("location_id") val locationId: String,
    val name: String,
    val unit: String,
    @SerializedName("stock_qty") val stockQty: Double,
    @SerializedName("low_stock_threshold") val lowStockThreshold: Double = 0.0
)

data class Recipe(
    val id: String,
    @SerializedName("menu_item_id") val menuItemId: String,
    @SerializedName("ingredient_id") val ingredientId: String,
    @SerializedName("qty_consumed") val qtyConsumed: Double,
    @SerializedName("item_name") val itemName: String? = null,
    @SerializedName("ingredient_name") val ingredientName: String? = null,
    val unit: String? = null
)

data class DineTable(
    val id: String,
    @SerializedName("location_id") val locationId: String,
    val label: String,
    val seats: Int = 4,
    val status: String = "free",
    @SerializedName("qr_token") val qrToken: String? = null
)

data class Order(
    val id: String,
    @SerializedName("location_id") val locationId: String,
    @SerializedName("table_id") val tableId: String? = null,
    @SerializedName("customer_id") val customerId: String? = null,
    @SerializedName("order_type") val orderType: String,
    val status: String,
    @SerializedName("placed_by") val placedBy: String,
    val subtotal: Double,
    @SerializedName("tax_total") val taxTotal: Double,
    @SerializedName("discount_total") val discountTotal: Double,
    @SerializedName("platform_fee") val platformFee: Double = 0.0,
    @SerializedName("grand_total") val grandTotal: Double,
    @SerializedName("payment_status") val paymentStatus: String = "pending",
    @SerializedName("payment_method") val paymentMethod: String? = null,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("updated_at") val updatedAt: String,
    val items: List<OrderItem>? = null,
    @SerializedName("table_label") val tableLabel: String? = null
)

data class OrderItem(
    val id: String,
    @SerializedName("menu_item_id") val menuItemId: String,
    @SerializedName("menu_item_name") val menuItemName: String? = null,
    val qty: Int,
    @SerializedName("unit_price") val unitPrice: Double,
    @SerializedName("tax_rate") val taxRate: Double = 0.05,
    val notes: String? = null,
    val addons: List<OrderItemAddon>? = null
)

data class OrderItemAddon(
    val id: String,
    @SerializedName("addon_id") val addonId: String,
    @SerializedName("addon_name") val addonName: String? = null,
    val price: Double
)

data class Customer(
    val id: String,
    val name: String? = null,
    val phone: String,
    @SerializedName("total_orders") val totalOrders: Int = 0,
    @SerializedName("total_spent") val totalSpent: Double = 0.0,
    @SerializedName("loyalty_points") val loyaltyPoints: Int = 0
)

data class Offer(
    val id: String,
    @SerializedName("location_id") val locationId: String,
    val title: String,
    val type: String,
    val value: Double,
    @SerializedName("min_order") val minOrder: Double = 0.0,
    @SerializedName("valid_from") val validFrom: String? = null,
    @SerializedName("valid_to") val validTo: String? = null,
    val active: Boolean = true
)

data class DashboardSummary(
    @SerializedName("total_orders") val totalOrders: Int = 0,
    @SerializedName("total_revenue") val totalRevenue: Double = 0.0,
    @SerializedName("pending_orders") val pendingOrders: Int = 0,
    @SerializedName("total_customers") val totalCustomers: Int = 0,
    @SerializedName("period_label") val periodLabel: String? = null
)

data class ReportSummary(
    @SerializedName("total_orders") val totalOrders: Int,
    @SerializedName("total_revenue") val totalRevenue: Double,
    @SerializedName("pending_orders") val pendingOrders: Int,
    @SerializedName("total_customers") val totalCustomers: Int,
    @SerializedName("orders_change") val ordersChange: Double = 0.0,
    @SerializedName("revenue_change") val revenueChange: Double = 0.0
)

data class SalesOverview(
    val date: String,
    val orders: Int,
    val revenue: Double
)

data class TopItem(
    @SerializedName("menu_item_name") val menuItemName: String,
    @SerializedName("total_qty") val totalQty: Int,
    @SerializedName("total_revenue") val totalRevenue: Double
)

data class FeeConfig(
    @SerializedName("monthlyFee") val monthlyFee: Double = 0.0,
    @SerializedName("perOrderFee") val perOrderFee: Double = 1.0,
    @SerializedName("defaultFeePayer") val defaultFeePayer: String = "customer",
    @SerializedName("customerPaidOrderLimit") val customerPaidOrderLimit: Int? = null,
    @SerializedName("periodOrderCount") val periodOrderCount: Int = 0
)

data class CreateOrderRequest(
    @SerializedName("location_id") val locationId: String,
    @SerializedName("order_type") val orderType: String,
    @SerializedName("placed_by") val placedBy: String = "staff",
    val items: List<OrderItemRequest>,
    @SerializedName("payment_method") val paymentMethod: String = "cash",
    @SerializedName("table_id") val tableId: String? = null,
    val discount: Double? = null
)

data class OrderItemRequest(
    @SerializedName("menu_item_id") val menuItemId: String,
    val qty: Int,
    @SerializedName("addon_ids") val addonIds: List<String> = emptyList(),
    val notes: String? = null
)

data class PublicOrderRequest(
    @SerializedName("order_type") val orderType: String,
    @SerializedName("customer_phone") val customerPhone: String,
    @SerializedName("customer_name") val customerName: String? = null,
    val items: List<OrderItemRequest>,
    @SerializedName("table_id") val tableId: String? = null
)

data class CreateOrderResponse(
    @SerializedName("orderId") val orderId: String,
    val status: String,
    @SerializedName("grandTotal") val grandTotal: Double
)

data class PublicMenuResponse(
    val location: Location,
    val categories: List<Category>,
    val items: List<MenuItem>
)

data class RestockRequest(
    @SerializedName("ingredient_id") val ingredientId: String,
    val qty: Double,
    val reason: String? = null
)

data class CreateIngredientRequest(
    val name: String,
    val unit: String,
    @SerializedName("stock_qty") val stockQty: Double = 0.0,
    @SerializedName("low_stock_threshold") val lowStockThreshold: Double = 0.0
)

data class CreateCategoryRequest(
    val name: String,
    @SerializedName("sort_order") val sortOrder: Int = 0
)

data class CreateMenuItemRequest(
    @SerializedName("category_id") val categoryId: String,
    val name: String,
    val description: String? = null,
    val price: Double,
    val veg: Boolean = false,
    @SerializedName("tax_rate") val taxRate: Double = 0.05
)

data class CreateTableRequest(
    val label: String,
    val seats: Int = 4
)

data class CreateCustomerOfferRequest(
    @SerializedName("location_id") val locationId: String,
    val title: String,
    val type: String,
    val value: Double,
    @SerializedName("min_order") val minOrder: Double = 0.0,
    @SerializedName("valid_from") val validFrom: String? = null,
    @SerializedName("valid_to") val validTo: String? = null
)

data class SignupRequest(
    val email: String,
    val password: String,
    val name: String,
    @SerializedName("businessName") val businessName: String,
    @SerializedName("locationName") val locationName: String,
    @SerializedName("locationSlug") val locationSlug: String
)
