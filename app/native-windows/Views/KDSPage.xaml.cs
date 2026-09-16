using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using TSOS.POS.Models;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class KDSPage : Page, IRefreshable
{
    public KDSPage()
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
            var orders = await ApiService.GetOrders(locId);
            var active = orders.Where(o => o.Status is "new" or "preparing" or "ready").ToList();

            OrdersPanel.Children.Clear();
            foreach (var order in active)
            {
                var card = CreateOrderCard(order);
                OrdersPanel.Children.Add(card);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed: {ex.Message}", "Error");
        }
    }

    private Border CreateOrderCard(Order order)
    {
        var bgColor = order.Status switch
        {
            "new" => (Color)ColorConverter.ConvertFromString("#EFF6FF"),
            "preparing" => (Color)ColorConverter.ConvertFromString("#FFF4E5"),
            "ready" => (Color)ColorConverter.ConvertFromString("#E8F5EC"),
            _ => (Color)ColorConverter.ConvertFromString("#F5F5F4"),
        };

        var border = new Border
        {
            Background = new SolidColorBrush(bgColor),
            CornerRadius = new CornerRadius(10),
            Padding = new Thickness(16),
            Margin = new Thickness(6),
            Width = 240,
        };

        var sp = new StackPanel();

        sp.Children.Add(new TextBlock
        {
            Text = order.OrderType.Replace("_", " ").ToUpper(),
            FontSize = 11,
            FontWeight = FontWeights.Bold,
            Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#B45309")),
        });

        sp.Children.Add(new TextBlock
        {
            Text = $"#{order.Id[..8]}",
            FontSize = 12,
            Foreground = new SolidColorBrush(Colors.Gray),
            Margin = new Thickness(0, 2, 0, 8),
        });

        foreach (var item in order.Items)
        {
            sp.Children.Add(new TextBlock
            {
                Text = $"{item.Quantity}x {item.Name}",
                FontSize = 14,
                FontWeight = FontWeights.Medium,
                Margin = new Thickness(0, 2, 0, 2),
            });
        }

        var btn = new Button
        {
            Content = order.Status switch
            {
                "new" => "Start Preparing",
                "preparing" => "Mark Ready",
                "ready" => "Mark Served",
                _ => "Advance",
            },
            FontSize = 13,
            FontWeight = FontWeights.SemiBold,
            Margin = new Thickness(0, 12, 0, 0),
            Padding = new Thickness(12, 8, 12, 8),
            Cursor = Cursors.Hand,
            Tag = order,
        };
        btn.Click += async (_, _) =>
        {
            var next = order.Status switch
            {
                "new" => "preparing",
                "preparing" => "ready",
                "ready" => "served",
                _ => order.Status,
            };
            try
            {
                await ApiService.UpdateOrderStatus(order.Id, next);
                await LoadOrders();
            }
            catch { }
        };
        sp.Children.Add(btn);

        border.Child = sp;
        return border;
    }

    private async void Refresh_Click(object sender, RoutedEventArgs e) => await LoadOrders();
}
