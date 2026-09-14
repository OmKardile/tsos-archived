using TSOS.POS.Models;

namespace TSOS.POS.Services;

public static class AppState
{
    public static User? CurrentUser { get; set; }
    public static Location? ActiveLocation { get; set; }
    public static List<Location> Locations { get; set; } = new();

    public static event Action? OnStateChanged;

    public static void NotifyStateChanged() => OnStateChanged?.Invoke();
}
