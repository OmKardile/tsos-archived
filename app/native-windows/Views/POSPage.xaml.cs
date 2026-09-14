using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using TSOS.POS.Models;
using TSOS.POS.Services;
using MenuItem = TSOS.POS.Models.MenuItem;

namespace TSOS.POS.Views;

public partial class POSPage : Page
{
    private List<MenuItem> _allItems = new();
    private List<MenuCategory> _categories = new();
    private List<CartItem> _cart = new();
    private string? _selectedCategoryId;

    public POSPage()
    {
        InitializeComponent();
        Loaded += async (_, _) => await LoadMenu();
    }

    private async Task LoadMenu()
    {
        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;

        try
        {
            _categories = await ApiService.GetCategories(locId);
            _allItems = await ApiService.GetMenuItems(locId);

            // Build category tabs
            CategoryTabs.Children.Clear();
            var allTab = CreateCategoryTab("All", null);
            allTab.IsChecked = true;
            CategoryTabs.Children.Add(allTab);

            foreach (var cat in _categories)
                CategoryTabs.Children.Add(CreateCategoryTab(cat.Name, cat.Id));

            FilterMenu();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to load menu: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    private RadioButton CreateCategoryTab(string label, string? categoryId)
    {
        var rb = new RadioButton
        {
            Content = label,
            Tag = categoryId,
            FontSize = 12,
            Padding = new Thickness(14, 6, 14, 6),
            Margin = new Thickness(0, 0, 6, 0),
            GroupName = "Category",
            Cursor = Cursors.Hand,
        };
        rb.Checked += (_, _) =>
        {
            _selectedCategoryId = categoryId;
            FilterMenu();
        };
        return rb;
    }

    private void FilterMenu()
    {
        var items = _selectedCategoryId == null
            ? _allItems.Where(i => i.IsAvailable).ToList()
            : _allItems.Where(i => i.IsAvailable && i.CategoryId == _selectedCategoryId).ToList();

        var search = SearchBox.Text.Trim().ToLower();
        if (!string.IsNullOrEmpty(search))
            items = items.Where(i => i.Name.ToLower().Contains(search)).ToList();

        MenuGrid.ItemsSource = items;
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) => FilterMenu();

    private void MenuItem_Click(object sender, MouseButtonEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is MenuItem item)
        {
            var existing = _cart.FirstOrDefault(c => c.Item.Id == item.Id);
            if (existing != null)
                existing.Quantity++;
            else
                _cart.Add(new CartItem { Item = item, Quantity = 1 });

            RefreshCart();
        }
    }

    private void IncreaseQty_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is CartItem item)
        {
            item.Quantity++;
            RefreshCart();
        }
    }

    private void DecreaseQty_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is CartItem item)
        {
            if (item.Quantity > 1)
                item.Quantity--;
            else
                _cart.Remove(item);
            RefreshCart();
        }
    }

    private void ClearCart_Click(object sender, RoutedEventArgs e)
    {
        _cart.Clear();
        RefreshCart();
    }

    private void RefreshCart()
    {
        CartList.ItemsSource = null;
        CartList.ItemsSource = _cart;

        var subtotal = _cart.Sum(c => c.Total);
        var tax = _cart.Sum(c => c.Total * (c.Item.TaxRatePct / 100m));
        SubtotalText.Text = $"₹{subtotal:N0}";
        TaxText.Text = $"₹{tax:N0}";
        TotalText.Text = $"₹{subtotal + tax:N0}";
    }

    private async void PlaceOrder_Click(object sender, RoutedEventArgs e)
    {
        if (_cart.Count == 0)
        {
            MessageBox.Show("Cart is empty", "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;

        try
        {
            var orderType = TypeDineIn.IsChecked == true ? "dine_in" : TypeTakeaway.IsChecked == true ? "takeaway" : "delivery";
            var items = _cart.Select(c => new
            {
                menuItemId = c.Item.Id,
                qty = c.Quantity,
            }).ToList();

            await ApiService.CreateOrder(new
            {
                locationId = locId,
                orderType,
                placedBy = "staff",
                items,
            });

            _cart.Clear();
            RefreshCart();
            MessageBox.Show("Order placed!", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to place order: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
}
