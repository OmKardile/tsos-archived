using System.Windows;
using System.Windows.Controls;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class MenuPage : Page, IRefreshable
{
    public MenuPage()
    {
        InitializeComponent();
        Loaded += async (_, _) => await LoadMenu();
    }

    public async void Refresh() => await LoadMenu();

    private async Task LoadMenu()
    {
        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;
        try
        {
            var items = await ApiService.GetMenuItems(locId);
            MenuList.ItemsSource = items;
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed: {ex.Message}", "Error");
        }
    }
}
