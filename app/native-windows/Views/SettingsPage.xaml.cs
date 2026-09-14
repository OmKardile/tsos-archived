using System.Windows;
using System.Windows.Controls;
using TSOS.POS.Services;

namespace TSOS.POS.Views;

public partial class SettingsPage : Page
{
    public SettingsPage()
    {
        InitializeComponent();
        Loaded += (_, _) => LoadSettings();
    }

    private async void LoadSettings()
    {
        UserName.Text = AppState.CurrentUser?.Name ?? "";
        UserEmail.Text = AppState.CurrentUser?.Email ?? "";
        UserRole.Text = AppState.CurrentUser?.Role ?? "";
        LocationText.Text = AppState.ActiveLocation?.Name ?? "";

        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;

        try
        {
            var settings = await ApiService.GetSettings(locId);
            if (settings is System.Text.Json.JsonElement el)
            {
                if (el.TryGetProperty("perOrderFee", out var fee))
                    FeeAmountBox.Text = fee.GetDecimal().ToString("F2");
                if (el.TryGetProperty("defaultFeePayer", out var payer))
                {
                    foreach (ComboBoxItem item in FeePayerCombo.Items)
                    {
                        if (item.Tag?.ToString() == payer.GetString())
                        {
                            FeePayerCombo.SelectedItem = item;
                            break;
                        }
                    }
                }
                if (el.TryGetProperty("customerPaidOrderLimit", out var limit) && limit.ValueKind != System.Text.Json.JsonValueKind.Null)
                    AutoFlipBox.Text = limit.GetInt32().ToString();
            }
        }
        catch
        {
            // Keep defaults if load fails
        }
    }

    private async void SaveSettings_Click(object sender, RoutedEventArgs e)
    {
        var locId = AppState.ActiveLocation?.Id;
        if (locId == null) return;

        try
        {
            var feePayer = (FeePayerCombo.SelectedItem as ComboBoxItem)?.Tag?.ToString() ?? "customer";
            var feeAmount = decimal.TryParse(FeeAmountBox.Text, out var f) ? f : 1;
            var autoFlip = int.TryParse(AutoFlipBox.Text, out var a) ? a : 5;

            await ApiService.UpdateSettings(locId, new
            {
                locationId = locId,
                defaultFeePayer = feePayer,
                perOrderFee = feeAmount,
                customerPaidOrderLimit = autoFlip,
            });

            MessageBox.Show("Settings saved!", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed: {ex.Message}", "Error");
        }
    }
}
