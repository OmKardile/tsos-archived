using System.Windows;
using System.Windows.Controls;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class InventoryPage : Page, IRefreshable
{
    public InventoryPage()
    {
        InitializeComponent();
        Loaded += async (_, _) => await LoadInventory();
    }

    public async void Refresh() => await LoadInventory();

    private async Task LoadInventory()
    {
        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;
        try
        {
            var items = await ApiService.GetIngredients(locId);
            InventoryList.ItemsSource = items;
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed: {ex.Message}", "Error");
        }
    }
}
