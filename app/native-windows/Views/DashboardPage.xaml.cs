using System.Windows;
using System.Windows.Controls;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class DashboardPage : Page, IRefreshable
{
    public DashboardPage()
    {
        InitializeComponent();
        Loaded += async (_, _) => await LoadData();
    }

    public async void Refresh() => await LoadData();

    private async Task LoadData()
    {
        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;

        try
        {
            var summary = await ApiService.GetDashboardSummary(locId);
            TotalOrders.Text = summary.TotalOrders.ToString();
            Revenue.Text = $"₹{summary.TotalRevenue:N0}";
            PendingOrders.Text = summary.PendingOrders.ToString();
            ActiveCustomers.Text = summary.ActiveCustomers.ToString();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to load dashboard: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
        }

        try
        {
            var orders = await ApiService.GetOrders(locId);
            var recent = orders.OrderByDescending(o => o.CreatedAt).Take(10).ToList();
            OrdersList.ItemsSource = recent;
            NoOrdersText.Visibility = recent.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        }
        catch { }
    }
}
