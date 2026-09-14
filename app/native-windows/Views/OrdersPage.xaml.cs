using System.Windows;
using System.Windows.Controls;
using TSOS.POS.Models;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class OrdersPage : Page, IRefreshable
{
    private List<Order> _allOrders = new();
    private string _filter = "all";

    public OrdersPage()
    {
        InitializeComponent();
        Loaded += async (_, _) => await LoadOrders();
    }

    public async void Refresh() => await LoadOrders();

    private async Task LoadOrders()
    {
        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;
        try
        {
            _allOrders = await ApiService.GetOrders(locId);
            ApplyFilter();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to load orders: {ex.Message}", "Error");
        }
    }

    private void ApplyFilter()
    {
        var filtered = _filter == "all"
            ? _allOrders
            : _allOrders.Where(o => o.Status == _filter).ToList();
        OrdersList.ItemsSource = filtered.OrderByDescending(o => o.CreatedAt).ToList();
    }

    private void Filter_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string tag)
        {
            _filter = tag;
            ApplyFilter();
        }
    }

    private async void NextStatus_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is Order order)
        {
            var nextStatus = order.Status switch
            {
                "new" => "preparing",
                "preparing" => "ready",
                "ready" => "served",
                "served" => "completed",
                _ => order.Status
            };
            if (nextStatus == order.Status) return;

            try
            {
                await ApiService.UpdateOrderStatus(order.Id, nextStatus);
                await LoadOrders();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed: {ex.Message}", "Error");
            }
        }
    }

    private async void Refresh_Click(object sender, RoutedEventArgs e) => await LoadOrders();
}
