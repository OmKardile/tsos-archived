using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using TSOS.POS.Models;

namespace TSOS.POS.Services;

public class ApiService
{
    private static readonly HttpClient _http = new();
    private static string? _token;
    private static string _baseUrl = "https://tsos-backend.onrender.com";

    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public static void SetToken(string? token)
    {
        _token = token;
        if (token != null)
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        else
            _http.DefaultRequestHeaders.Authorization = null;
    }

    public static string? GetToken() => _token;

    private static async Task<T> Get<T>(string path)
    {
        var res = await _http.GetAsync($"{_baseUrl}/api{path}");
        if (res.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("Session expired");
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<T>(_json))!;
    }

    private static async Task<T> Post<T>(string path, object body)
    {
        var res = await _http.PostAsJsonAsync($"{_baseUrl}/api{path}", body, _json);
        if (res.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("Session expired");
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<T>(_json))!;
    }

    private static async Task<T> Patch<T>(string path, object body)
    {
        var res = await _http.PatchAsJsonAsync($"{_baseUrl}/api{path}", body, _json);
        if (res.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("Session expired");
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<T>(_json))!;
    }

    private static async Task Delete(string path)
    {
        var res = await _http.DeleteAsync($"{_baseUrl}/api{path}");
        if (res.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("Session expired");
        res.EnsureSuccessStatusCode();
    }

    // Auth
    public static async Task<LoginResponse> Login(string email, string password)
    {
        var result = await Post<LoginResponse>("/auth/login", new { email, password });
        SetToken(result.Token);
        return result;
    }

    public static async Task<LoginResponse> PinLogin(string email, string pin)
    {
        var result = await Post<LoginResponse>("/auth/pin-login", new { email, pinCode = pin });
        SetToken(result.Token);
        return result;
    }

    // Locations
    public static Task<List<Location>> GetLocations() => Get<List<Location>>("/locations");

    // Dashboard
    public static Task<DashboardSummary> GetDashboardSummary(string locationId) =>
        Get<DashboardSummary>($"/locations/{locationId}/dashboard-summary?range=today");

    // Menu
    public static Task<List<MenuCategory>> GetCategories(string locationId) =>
        Get<List<MenuCategory>>($"/menu/categories?locationId={locationId}");

    public static Task<List<MenuItem>> GetMenuItems(string locationId) =>
        Get<List<MenuItem>>($"/menu/items?locationId={locationId}");

    public static Task<List<MenuItem>> GetAddons(string locationId) =>
        Get<List<MenuItem>>($"/menu/addons?locationId={locationId}");

    // Orders
    public static Task<List<Order>> GetOrders(string locationId) =>
        Get<List<Order>>($"/orders?locationId={locationId}");

    public static Task<Order> CreateOrder(object body) =>
        Post<Order>("/orders", body);

    public static Task<Order> UpdateOrderStatus(string orderId, string status) =>
        Patch<Order>($"/orders/{orderId}/status", new { status });

    public static Task<Order> UpdateOrderPayment(string orderId, string method) =>
        Patch<Order>($"/orders/{orderId}/payment", new { paymentMethod = method });

    // Inventory
    public static Task<List<InventoryItem>> GetIngredients(string locationId) =>
        Get<List<InventoryItem>>($"/inventory/ingredients?locationId={locationId}");

    // Tables
    public static Task<List<DineTable>> GetTables(string locationId) =>
        Get<List<DineTable>>($"/tables?locationId={locationId}");

    // Settings
    public static Task<object> GetSettings(string locationId) =>
        Get<object>($"/settings?locationId={locationId}");

    public static Task<object> UpdateSettings(string locationId, object body) =>
        Patch<object>($"/settings?locationId={locationId}", body);
}
