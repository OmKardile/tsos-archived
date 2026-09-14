using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class LoginWindow : Window
{
    private bool _isPinMode;

    public LoginWindow()
    {
        InitializeComponent();
    }

    private void EmailTab_Click(object sender, MouseButtonEventArgs e)
    {
        _isPinMode = false;
        PasswordPanel.Visibility = Visibility.Visible;
        PinPanel.Visibility = Visibility.Collapsed;
        EmailTabBg.Background = new SolidColorBrush(Colors.White);
        PinTabBg.Background = Brushes.Transparent;
        ((TextBlock)PinTabBg.Child).Foreground = new SolidColorBrush(Colors.Gray);
    }

    private void PinTab_Click(object sender, MouseButtonEventArgs e)
    {
        _isPinMode = true;
        PasswordPanel.Visibility = Visibility.Collapsed;
        PinPanel.Visibility = Visibility.Visible;
        PinTabBg.Background = new SolidColorBrush(Colors.White);
        EmailTabBg.Background = Brushes.Transparent;
        ((TextBlock)EmailTabBg.Child).Foreground = new SolidColorBrush(Colors.Gray);
    }

    private async void LoginBtn_Click(object sender, RoutedEventArgs e)
    {
        var email = EmailBox.Text.Trim();
        var error = "";

        try
        {
            LoginBtn.IsEnabled = false;
            LoadingText.Visibility = Visibility.Visible;
            ErrorText.Text = "";

            Models.LoginResponse result;

            if (_isPinMode)
            {
                var pin = PinBox.Text;
                if (pin.Length != 4) { error = "PIN must be 4 digits"; return; }
                result = await ApiService.PinLogin(email, pin);
            }
            else
            {
                var password = PasswordBox.Password;
                if (string.IsNullOrEmpty(password)) { error = "Password required"; return; }
                result = await ApiService.Login(email, password);
            }

            AppState.CurrentUser = result.User;

            var locations = await ApiService.GetLocations();
            AppState.Locations = locations;
            if (locations.Count > 0)
                AppState.ActiveLocation = locations[0];

            var mainWindow = new MainWindow();
            mainWindow.Show();
            Close();
        }
        catch (Exception ex)
        {
            var msg = ex.Message;
            if (msg.Contains("Session expired") || msg.Contains("401"))
                ErrorText.Text = "Invalid credentials";
            else
                ErrorText.Text = msg;
        }
        finally
        {
            LoginBtn.IsEnabled = true;
            LoadingText.Visibility = Visibility.Collapsed;
            if (!string.IsNullOrEmpty(error))
                ErrorText.Text = error;
        }
    }
}
