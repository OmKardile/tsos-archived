using System.Text.Json.Serialization;

namespace TSOS.POS.Models;

public class User
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public string Role { get; set; } = "";
    public string? BusinessId { get; set; }
    public List<string> LocationIds { get; set; } = new();
}

public class Location
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
}

public class LoginResponse
{
    public string Token { get; set; } = "";
    public User User { get; set; } = new();
}

public class MenuCategory
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
}

public class MenuItem
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public bool IsAvailable { get; set; } = true;
    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public decimal TaxRatePct { get; set; }
}

public class CartItem
{
    public MenuItem Item { get; set; } = new();
    public int Quantity { get; set; } = 1;
    public List<CartAddon> Addons { get; set; } = new();
    public string? Notes { get; set; }
    public decimal UnitPrice => Item.Price + Addons.Sum(a => a.Price);
    public decimal Total => UnitPrice * Quantity;
}

public class CartAddon
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
}

public class Order
{
    public string Id { get; set; } = "";
    public string OrderType { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal FeeAmount { get; set; }
    [JsonPropertyName("grandTotal")]
    public decimal Total { get; set; }
    public string? TableId { get; set; }
    public string? CustomerId { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<OrderItem> Items { get; set; } = new();
}

public class OrderItem
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "";
}

public class DashboardSummary
{
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public int PendingOrders { get; set; }
    public int ActiveCustomers { get; set; }
    public double OrdersChange { get; set; }
    public double RevenueChange { get; set; }
}

public class InventoryItem
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal StockQty { get; set; }
    public decimal LowStockThreshold { get; set; }
}

public class DineTable
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public string Status { get; set; } = "free";
    public int Seats { get; set; }
}
