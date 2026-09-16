using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class MainWindow : Window
{
    private readonly Dictionary<string, (string title, Func<Page> pageFactory)> _pages = new();

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
    }

    private void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        UserName.Text = AppState.CurrentUser?.Name ?? "";
        UserRole.Text = AppState.CurrentUser?.Role ?? "";

        if (AppState.Locations.Count > 1)
        {
            LocationCombo.ItemsSource = AppState.Locations;
            LocationCombo.DisplayMemberPath = "Name";
            LocationCombo.SelectedIndex = 0;
            LocationCombo.Visibility = Visibility.Visible;
        }
        else if (AppState.Locations.Count == 1)
        {
            LocationLabel.Text = AppState.Locations[0].Name;
            LocationLabel.Visibility = Visibility.Visible;
        }

        _pages["dashboard"] = ("Dashboard", () => new DashboardPage());
        _pages["pos"] = ("Point of Sale", () => new POSPage());
        _pages["orders"] = ("Orders", () => new OrdersPage());
        _pages["kds"] = ("Kitchen Display", () => new KDSPage());
        _pages["menu"] = ("Menu Management", () => new MenuPage());
        _pages["inventory"] = ("Inventory", () => new InventoryPage());
        _pages["tables"] = ("Tables", () => new TablesPage());
        _pages["settings"] = ("Settings", () => new SettingsPage());

        var navItems = new (string key, string icon, string label)[]
        {
            ("dashboard", "📊", "Dashboard"),
            ("pos", "🛒", "POS"),
            ("orders", "📋", "Orders"),
            ("kds", "👨‍🍳", "Kitchen Display"),
            ("menu", "🍽️", "Menu"),
            ("inventory", "📦", "Inventory"),
            ("tables", "🪑", "Tables"),
            ("settings", "⚙️", "Settings"),
        };

        NavPanel.Children.Clear();
        foreach (var (key, icon, label) in navItems)
        {
            var btn = new Button
            {
                Tag = key,
                Padding = new Thickness(12, 10, 12, 10),
                Margin = new Thickness(0, 2, 0, 2),
                HorizontalContentAlignment = HorizontalAlignment.Left,
                Cursor = Cursors.Hand,
            };

            var sp = new StackPanel { Orientation = Orientation.Horizontal };
            sp.Children.Add(new TextBlock { Text = icon, FontSize = 16, Margin = new Thickness(0, 0, 10, 0), VerticalAlignment = VerticalAlignment.Center });
            sp.Children.Add(new TextBlock { Text = label, FontSize = 13, FontWeight = FontWeights.Medium, Foreground = new SolidColorBrush(Colors.White), VerticalAlignment = VerticalAlignment.Center });
            btn.Content = sp;

            btn.Background = Brushes.Transparent;
            btn.BorderThickness = new Thickness(0);
            btn.Template = CreateNavButtonTemplate();

            btn.Click += NavBtn_Click;
            NavPanel.Children.Add(btn);
        }

        NavigateTo("dashboard");
    }

    private void NavBtn_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string key)
            NavigateTo(key);
    }

    public void NavigateTo(string key)
    {
        if (!_pages.TryGetValue(key, out var page)) return;

        PageTitle.Text = page.title;
        ContentFrame.Navigate(page.pageFactory());

        foreach (var child in NavPanel.Children)
        {
            if (child is Button navBtn)
            {
                var isActive = navBtn.Tag?.ToString() == key;
                navBtn.Background = isActive
                    ? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFF1E6"))
                    : Brushes.Transparent;
            }
        }
    }

    private void LocationCombo_Changed(object sender, SelectionChangedEventArgs e)
    {
        if (LocationCombo.SelectedItem is Models.Location loc)
        {
            AppState.ActiveLocation = loc;
            LocationLabel.Text = loc.Name;
            if (ContentFrame.Content is IRefreshable refreshable)
                refreshable.Refresh();
        }
    }

    private void LogoutBtn_Click(object sender, RoutedEventArgs e)
    {
        ApiService.SetToken(null);
        AppState.CurrentUser = null;
        AppState.ActiveLocation = null;
        var login = new LoginWindow();
        login.Show();
        Close();
    }

    private ControlTemplate CreateNavButtonTemplate()
    {
        var template = new ControlTemplate(typeof(Button));
        var border = new FrameworkElementFactory(typeof(Border));
        border.Name = "border";
        border.SetBinding(Border.BackgroundProperty, new System.Windows.Data.Binding("Background"));
        border.AppendChild(new FrameworkElementFactory(typeof(ContentPresenter)));
        template.VisualTree = border;
        return template;
    }
}

public interface IRefreshable
{
    void Refresh();
}
