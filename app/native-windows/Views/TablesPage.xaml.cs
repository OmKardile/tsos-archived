using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class TablesPage : Page, IRefreshable
{
    public TablesPage()
    {
        InitializeComponent();
        Loaded += async (_, _) => await LoadTables();
    }

    public async void Refresh() => await LoadTables();

    private async Task LoadTables()
    {
        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;

        try
        {
            var tables = await ApiService.GetTables(locId);
            TablesPanel.Children.Clear();

            foreach (var table in tables)
            {
                var bgColor = table.Status == "free"
                    ? ColorConverter.ConvertFromString("#E8F5EC")
                    : ColorConverter.ConvertFromString("#FFF4E5");

                var border = new Border
                {
                    Background = new SolidColorBrush((Color)bgColor),
                    CornerRadius = new CornerRadius(10),
                    Width = 140,
                    Height = 120,
                    Margin = new Thickness(6),
                    Padding = new Thickness(12),
                };

                var sp = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
                sp.Children.Add(new TextBlock
                {
                    Text = table.Label,
                    FontSize = 18,
                    FontWeight = FontWeights.Bold,
                    HorizontalAlignment = HorizontalAlignment.Center,
                });
                sp.Children.Add(new TextBlock
                {
                    Text = $"{table.Seats} seats",
                    FontSize = 12,
                    Foreground = new SolidColorBrush(Colors.Gray),
                    HorizontalAlignment = HorizontalAlignment.Center,
                    Margin = new Thickness(0, 4, 0, 0),
                });
                sp.Children.Add(new TextBlock
                {
                    Text = table.Status.ToUpper(),
                    FontSize = 11,
                    FontWeight = FontWeights.SemiBold,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    Margin = new Thickness(0, 8, 0, 0),
                    Foreground = new SolidColorBrush(
                        (Color)ColorConverter.ConvertFromString(table.Status == "free" ? "#17803D" : "#B45309")),
                });

                border.Child = sp;
                TablesPanel.Children.Add(border);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed: {ex.Message}", "Error");
        }
    }
}
