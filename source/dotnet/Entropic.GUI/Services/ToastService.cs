using System;
using System.Threading.Tasks;

namespace Entropic.GUI.Services;

public class ToastService
{
    public event Action<string>? ToastRequested;
    private const int AutoDismissMs = 2500;

    // @must_test(REQ-GUI-008)
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
