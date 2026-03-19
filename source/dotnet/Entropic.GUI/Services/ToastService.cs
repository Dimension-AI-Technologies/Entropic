using System;
using System.Threading.Tasks;

namespace Entropic.GUI.Services;

// @must_test(REQ-GUI-008)
public class ToastService
{
    public event Action<string>? ToastRequested;
    private const int AutoDismissMs = 2500;

    public void Show(string message)
    {
        ToastRequested?.Invoke(message);
    }

    public async Task ShowAsync(string message)
    {
        Show(message);
        await Task.Delay(AutoDismissMs);
    }
}
